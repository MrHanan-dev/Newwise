// @ts-nocheck
'use client';

// ================================
//      IMPORTS AND DEPENDENCIES
// ================================
import type * as React from 'react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient"; // your initialized Firestore instance
import PhotoUploader from "@/components/PhotoUploader";
import { useUserProfileContext } from '@/context/UserProfileContext';
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';
import { useSWRConfig } from 'swr';

// --- UI COMPONENTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { IssueBlockCard } from "./IssueBlockCard";

// --- TYPES AND SCHEMA ---
import type { ShiftReportFormValues, IssueBlockFormValues } from '@/lib/types';
import { shiftReportSchema } from '@/lib/schemas';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, User, PlusCircle, Send, Loader2, Plus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// ================================
//      CONSTANTS AND DEFAULTS
// ================================

// Key for saving drafts in localStorage
const DRAFT_KEY = 'shiftwise_draft';

// Generate unique ID for a new issue
const generateIssueId = () => `temp-issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateReportId = () => `temp-report-${Date.now()}`;

// Default empty issue block
const defaultIssueBlock: IssueBlockFormValues = {
  issue: '',
  pmun: '',
  description: '',
  actions: '',
  status: 'Open',
  photos: [],
};

// ================================
//      MAIN COMPONENT
// ================================

export default function ShiftReportClientPage() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { profile } = useUserProfileContext();
  const { mutate } = useSWRConfig();
  // --- Mounting and loading states ---
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  // NEW: Track photo uploads for each issue block
  const [photoUploads, setPhotoUploads] = useState<{ [key: number]: string[] }>({});
  // Refs for each PhotoUploader
  const photoUploaderRefs = useRef<any>({});
  const [profileName, setProfileName] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string>("");
  const [issueDirty, setIssueDirty] = useState(false);
  const [tempReportId] = useState(generateReportId()); // Temporary report ID
  const [issueIds, setIssueIds] = useState<string[]>([]); // Track issue IDs

  useEffect(() => {
    async function fetchName() {
      setProfileLoading(true);
      setProfileError("");
      if (!user?.uid) {
        setProfileName("No user");
        setProfileLoading(false);
        setProfileError("User not logged in");
        return;
      }
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfileName(data.name || "No name");
        } else {
          setProfileName("No name");
        }
      } catch (err) {
        setProfileName("Error");
        setProfileError("Firestore error: " + (err?.message || err));
        console.error("Firestore error fetching user name:", err);
      }
      setProfileLoading(false);
    }
    fetchName();
  }, [user]);

  // ================================
  //   FORM SETUP (React Hook Form)
  // ================================
  const form = useForm<ShiftReportFormValues>({
    resolver: zodResolver(shiftReportSchema), // Validation with zod
    defaultValues: {
      submittedBy: '',
      reportDate: new Date(),
      issues: [defaultIssueBlock], // At least one issue block present
    },
  });

  // Set submittedBy in form when profileName is loaded (must be after form is defined)
  useEffect(() => {
    if (profileName && !profileLoading && !profileError) {
      form.setValue('submittedBy', profileName);
    }
  }, [profileName, profileLoading, profileError, form]);

  // For adding/removing dynamic issue blocks
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "issues",
  });

  // Initialize issue IDs for existing fields when component mounts
  useEffect(() => {
    if (fields.length > 0 && issueIds.length === 0) {
      const initialIds = fields.map(() => generateIssueId());
      setIssueIds(initialIds);
    }
  }, [fields.length]);

  // Memoize addIssueBlock
  const addIssueBlock = useCallback(() => {
    const newIssueId = generateIssueId();
    setIssueIds(prev => [...prev, newIssueId]);
    append(defaultIssueBlock);
  }, [append]);

  // Memoize removeIssueBlock
  const removeIssueBlock = useCallback((index: number) => {
    if (fields.length > 1) {
      setIssueIds(prev => {
        const newIds = [...prev];
        newIds.splice(index, 1);
        return newIds;
      });
      remove(index);
    } else {
      toast({
        title: "Cannot Remove",
        description: "At least one issue block is required.",
        variant: "destructive",
      });
    }
  }, [fields.length, remove, toast]);

  // Memoize handlers for each IssueBlockCard
  const getOnPhotoUpload = useCallback((index) => (urls) => {
    setPhotoUploads((prev) => ({ ...prev, [index]: urls }));
    form.setValue(`issues.${index}.photos`, urls);
  }, [form]);

  const getPhotoUploaderRef = useCallback((index) => (el) => {
    photoUploaderRefs.current[index] = el;
  }, []);

  // Memoize the list of IssueBlockCards
  const issueBlockCards = useMemo(() => fields.map((item, index) => (
    <IssueBlockCard
      key={item.id}
      index={index}
      onRemove={removeIssueBlock}
      isOnlyBlock={fields.length === 1}
      photoUrls={photoUploads[index] || []}
      onPhotoUpload={getOnPhotoUpload(index)}
      photoUploaderRef={getPhotoUploaderRef(index)}
      issueId={issueIds[index] || generateIssueId()}
      reportId={tempReportId}
    />
  )), [fields, removeIssueBlock, photoUploads, getOnPhotoUpload, getPhotoUploaderRef, issueIds, tempReportId]);

  // ================================
  //   UNSAVED CHANGES WARNING
  // ================================
  useUnsavedChangesWarning(form.formState.isDirty && !isSubmittingForm);

  // ================================
  //   LOAD DRAFT FROM LOCAL STORAGE
  // ================================
  useEffect(() => {
    setIsMounted(true); // Only run in browser
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        // Convert reportDate to JS Date if needed
        if (draftData.reportDate) {
          draftData.reportDate = new Date(draftData.reportDate);
        }
        form.reset(draftData); // Set draft into form
        toast({ title: "Draft Loaded", description: "Your previous unsaved draft has been loaded." });
      } catch (error) {
        // If draft is corrupted, remove it
        console.error("Failed to parse draft from local storage:", error);
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [form, toast]);

  // ================================
  //   AUTO-SAVE DRAFT TO LOCAL STORAGE (DEBOUNCED)
  // ================================
  useEffect(() => {
    if (!isMounted) return;
    let timeout: NodeJS.Timeout | null = null;
    const subscription = form.watch((value) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      }, 700); // Debounce for 700ms
    });
    return () => {
      if (timeout) clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [form, form.watch, isMounted]);

  // ================================
  //   FORM SUBMISSION HANDLER
  // ================================
  const onSubmit = async (data: ShiftReportFormValues) => {
    setIsSubmittingForm(true);
    try {
      // Upload all pending photos before submitting
      const uploadPromises = fields.map((_, idx) => {
        const ref = photoUploaderRefs.current[idx];
        if (ref && ref.hasPendingFiles && ref.hasPendingFiles()) {
          return ref.uploadFiles();
        }
        return Promise.resolve(photoUploads[idx] || []);
      });
      const photoResults = await Promise.all(uploadPromises);

      // Once all uploads are done, we can submit the form
      const issuesWithPhotos = data.issues.map((issue, idx) => ({
        ...issue,
        photos: photoResults[idx] || issue.photos || []
      }));
      
      const reportData = {
        ...data,
        issues: issuesWithPhotos,
        reportId: tempReportId, // Include the temporary report ID
        issueIds: issueIds, // Include the issue IDs for notification references
        submittedAt: serverTimestamp(),
        submittedBy: user?.uid || "unknown"
      };

      // Add the new report to the "shiftReports" collection
      await addDoc(collection(db, "shiftReports"), reportData);
      mutate(['issues', user?.uid]);
      toast({
        title: "Report Submitted!",
        description: "Your shift report has been successfully recorded.",
      });
      localStorage.removeItem(DRAFT_KEY);
      form.reset({
        submittedBy: '',
        reportDate: new Date(),
        issues: [defaultIssueBlock],
      });
      setPhotoUploads({});
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error saving your report.",
        variant: "destructive",
      });
    }
    setIsSubmittingForm(false);
  };
  // ================================
  //   STYLES
  // ================================
  const inputStyle = "h-12 text-base px-4 py-3";

  // ================================
  //   LOADING STATE WHILE MOUNTING
  // ================================
  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // ================================
  //   MAIN RENDER
  // ================================
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden" style={{ backgroundImage: 'url(/bg-professional.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <main className="flex-1 container mx-auto p-2 sm:p-4 md:p-8 max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
        <FormProvider {...form}>
          <div
            className="relative w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto min-h-screen flex flex-col items-center justify-start bg-card text-card-foreground rounded-3xl shadow-2xl p-2 sm:p-4 md:p-8 gap-4 sm:gap-8 border border-border mt-4 sm:mt-8"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
          >
            {/* Professional, static ShiftWise header */}
            <header
              className="sticky top-0 z-30 w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-0 sm:px-2 pt-6 pb-4 bg-neutral-verylight rounded-b-3xl shadow-2xl border-b border-border flex flex-col items-center"
              style={{
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.13)',
                borderBottomLeftRadius: '2.5rem',
                borderBottomRightRadius: '2.5rem',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '140px',
              }}
            >
              <div className="relative z-10 w-full flex flex-col sm:flex-row justify-between items-center gap-2 px-2 sm:px-6">
                <span className="text-core-corporate font-bold text-lg sm:text-xl md:text-2xl tracking-wide select-all" style={{letterSpacing: '0.01em'}}>
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-core-corporate font-bold text-base sm:text-lg md:text-xl px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-core-corporate"
                  style={{letterSpacing: '0.02em'}}>
                  Log Out
                </button>
              </div>
              <div className="relative z-10 flex flex-col items-center mt-2 mb-1 w-full">
                <h1
                  className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-core-corporate text-center tracking-tight"
                  style={{letterSpacing: '-0.03em'}}>
                  ShiftWise
                </h1>
                <span className="text-2xl sm:text-3xl md:text-4xl font-semibold text-core-corporate tracking-wide mt-1" style={{letterSpacing: '0.01em'}}>
                  Shift Report
                </span>
              </div>
            </header>

            <div className="w-full max-w-2xl mx-auto mt-4 mb-8 p-4 bg-white rounded-2xl shadow-lg pb-32"> {/* Add pb-32 for bottom padding */}
              <form id="shift-report-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full px-2 pt-2 flex flex-col items-center">
                {/* ========== TOP SECTION: REPORT HEADER ========== */}
                <div className="w-full rounded-2xl bg-card dark:bg-card shadow-md p-2 sm:p-6 md:p-8 mb-4 sm:mb-6 flex flex-col gap-4 sm:gap-6">
                  <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
                    <FormField
                      control={form.control}
                      name="submittedBy"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="flex items-center text-base font-semibold text-muted-foreground">
                            <User className="h-5 w-5 mr-2" />
                            Your Name
                          </FormLabel>
                          <FormControl>
                            <div className="rounded-xl h-12 text-lg px-4 bg-input dark:bg-input text-foreground dark:text-foreground border-blue-200 flex items-center min-h-[3rem]">
                              {profileLoading ? "Loading..." : profileError ? profileError : profileName}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reportDate"
                      render={({ field }) => {
                        const [open, setOpen] = useState(false);
                        return (
                          <FormItem className="flex flex-col w-full">
                            <FormLabel className="flex items-center text-base font-semibold text-muted-foreground">
                              <CalendarIcon className="h-5 w-5 mr-2" />
                              Report Date
                            </FormLabel>
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "rounded-xl h-12 w-full justify-start text-left font-normal bg-input dark:bg-input border-blue-200 text-lg text-foreground dark:text-foreground",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-xl border-blue-200 bg-white/95">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={date => {
                                    field.onChange(date);
                                    setOpen(false); // Close popover on date select
                                  }}
                                  disabled={date =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </div>          {/* ========== ISSUE BLOCKS (DYNAMIC) ========== */}
                <div className="w-full flex flex-col gap-6">
                  {issueBlockCards}
                </div>

                {/* Add Issue button inside the form, as before */}
                <div className="w-full flex justify-center mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="rounded-xl bg-core-bright text-core-white text-lg font-semibold border-2 border-core-bright"
                    aria-label="Add new issue block"
                    onClick={addIssueBlock}
                  >
                    <PlusCircle className="h-6 w-6 mr-2" /> Add Issue
                  </Button>
                </div>

                {/* Submit Report button inside the form, as before */}
                {profile?.role === 'operator' && (
                  <div className="w-full flex justify-center mt-12 mb-8">
                    <button
                      type="submit"
                      className="w-full h-16 text-2xl font-extrabold rounded-2xl bg-blue-600 text-white shadow-lg flex items-center justify-center gap-3 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 hover:bg-blue-700"
                      disabled={isSubmittingForm}
                      form="shift-report-form"
                      style={{ zIndex: 10 }}
                    >
                      {isSubmittingForm ? (
                        <Loader2 className="h-8 w-8 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-8 w-8 mr-2" />
                      )}
                      Submit Report
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </FormProvider>
        </main>
    </div>
  );
}
