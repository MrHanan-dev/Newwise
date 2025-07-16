// @ts-nocheck
'use client';

// ================================
//      IMPORTS AND DEPENDENCIES
// ================================
import type * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient"; // your initialized Firestore instance
import PhotoUploader from "@/components/PhotoUploader";
import { useUserProfileContext } from '@/context/UserProfileContext';
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';

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
import { Calendar as CalendarIcon, User, PlusCircle, Send, Loader2 } from 'lucide-react';
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
  //   AUTO-SAVE DRAFT TO LOCAL STORAGE
  // ================================
  useEffect(() => {
    if (!isMounted) return;
    // Listen for form changes and save them
    const subscription = form.watch((value) => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    });
    // Clean up the subscription
    return () => subscription.unsubscribe();
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
  //   ADD OR REMOVE ISSUE BLOCKS
  // ================================
  const addIssueBlock = () => {
    const newIssueId = generateIssueId();
    setIssueIds(prev => [...prev, newIssueId]);
    append(defaultIssueBlock);
  };
  const removeIssueBlock = (index: number) => {
    if (fields.length > 1) {
      // Remove issue from form and remove its ID from our tracking array
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
    <div className="flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated background for dark mode only */}
      <div className="hidden dark:block absolute inset-0 w-full h-full z-0 pointer-events-none">
        {/* Animated Blobs - scale up for desktop, scale down for mobile */}
        <div className="absolute bg-blue-700 opacity-30 rounded-full blur-3xl animate-blob1" style={{width:'60vw',height:'18vw',top:'-8vw',left:'-10vw',minWidth:'320px',minHeight:'120px'}} />
        <div className="absolute bg-purple-700 opacity-20 rounded-full blur-3xl animate-blob2" style={{width:'40vw',height:'14vw',top:'60%',left:'70%',minWidth:'180px',minHeight:'80px'}} />
        <div className="absolute bg-cyan-500 opacity-20 rounded-full blur-2xl animate-blob3" style={{width:'24vw',height:'8vw',top:'30%',left:'60%',minWidth:'120px',minHeight:'60px'}} />
        <div className="absolute bg-indigo-500 opacity-20 rounded-full blur-2xl animate-blob4" style={{width:'18vw',height:'6vw',top:'75%',left:'20%',minWidth:'80px',minHeight:'40px'}} />
        {/* Animated Particles */}
        {[...Array(18)].map((_,i)=>(
          <div key={i} className={`absolute rounded-full bg-blue-400 opacity-20 animate-particle${i%4+1}`} style={{width:'2.5vw',height:'2.5vw',minWidth:'8px',minHeight:'8px',top:`${10+Math.random()*80}%`,left:`${5+Math.random()*90}%`}} />
        ))}
        {/* Animated Lines */}
        <div className="absolute left-1/4 top-0 w-1 h-full bg-gradient-to-b from-blue-500/10 via-transparent to-purple-500/10 animate-fadein" />
        <div className="absolute right-1/4 bottom-0 w-1 h-full bg-gradient-to-t from-cyan-400/10 via-transparent to-indigo-400/10 animate-fadein delay-200" />
      </div>
      <main className="flex-1 container mx-auto p-2 sm:p-4 md:p-8 max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
        <FormProvider {...form}>
          <div
            className="relative w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto min-h-screen flex flex-col items-center justify-start bg-card text-card-foreground rounded-3xl shadow-2xl p-2 sm:p-4 md:p-8 gap-4 sm:gap-8 border border-border mt-4 sm:mt-8 mb-20"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
          >
            {/* Animated, beautiful ShiftWise header */}
            <header
              className="sticky top-0 z-30 w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-0 sm:px-2 pt-6 pb-4 bg-gradient-to-br from-blue-50/90 via-blue-100/80 to-indigo-100/80 dark:from-blue-900/80 dark:via-indigo-900/70 dark:to-slate-900/80 backdrop-blur-xl rounded-b-3xl shadow-2xl border-b border-border flex flex-col items-center animate-fadein-down"
              style={{
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.13)',
                borderBottomLeftRadius: '2.5rem',
                borderBottomRightRadius: '2.5rem',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '140px',
              }}
            >
              {/* Animated gradient orb */}
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-gradient-to-br from-blue-400/30 via-indigo-300/20 to-transparent rounded-full blur-3xl animate-pulse-slow z-0" />
              <div className="absolute -bottom-8 right-0 w-32 h-32 bg-gradient-to-tr from-sky-300/20 via-blue-200/10 to-transparent rounded-full blur-2xl animate-pulse-slower z-0" />
              <div className="relative z-10 w-full flex flex-col sm:flex-row justify-between items-center gap-2 px-2 sm:px-6">
                <span className="text-blue-600 dark:text-blue-300 font-bold text-lg sm:text-xl md:text-2xl tracking-wide animate-fadein-left drop-shadow-lg select-all" style={{letterSpacing: '0.01em'}}>
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-red-500 font-bold text-base sm:text-lg md:text-xl px-3 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 animate-fadein-right"
                  style={{letterSpacing: '0.02em'}}
                >
                  Log Out
                </button>
              </div>
              <div className="relative z-10 flex flex-col items-center mt-2 mb-1 w-full">
                <h1
                  className="text-4xl sm:text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 bg-clip-text text-transparent drop-shadow-xl animate-gradient-x tracking-tight"
                  style={{letterSpacing: '-0.03em'}}
                >
                  ShiftWise
                </h1>
                <span className="text-lg sm:text-2xl md:text-3xl font-semibold text-blue-400 dark:text-blue-200/80 tracking-wide animate-fadein-up mt-1" style={{letterSpacing: '0.01em'}}>
                  <span className="inline-block animate-wiggle">Shift Report</span>
                </span>
              </div>
            </header>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full px-2 pt-2 pb-24 flex flex-col items-center">
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
                {fields.map((item, index) => (
                  <IssueBlockCard
                    key={item.id}
                    index={index}
                    onRemove={removeIssueBlock}
                    isOnlyBlock={fields.length === 1}
                    photoUrls={photoUploads[index] || []}
                    onPhotoUpload={(urls) => {
                      setPhotoUploads((prev) => ({ ...prev, [index]: urls }));
                      form.setValue(`issues.${index}.photos`, urls);
                    }}
                    photoUploaderRef={el => (photoUploaderRefs.current[index] = el)}
                    issueId={issueIds[index] || generateIssueId()}
                    reportId={tempReportId}
                  />
                ))}
              </div>

              {/* ========== ADD NEW ISSUE BLOCK BUTTON (FAB) ========== */}
              <Button
                type="button"
                onClick={addIssueBlock}
                variant="outline"
                size="lg"
                className="fixed bottom-24 right-6 h-16 w-16 md:h-20 md:w-20 rounded-full shadow-2xl bg-gradient-to-br from-blue-400 to-green-400 text-white text-4xl flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-95 focus:ring-4 focus:ring-blue-300 z-50 border-4 border-white"
                aria-label="Add new issue block"
                style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}
              >
                <PlusCircle className="h-10 w-10 md:h-14 md:w-14" />
              </Button>

              {/* ========== SUBMIT BUTTON ========== */}
              <div className="w-full flex justify-center mt-8">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-blue-500 to-green-400 text-white shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:ring-4 focus:ring-blue-300 animated-glow"
                  disabled={isSubmittingForm}
                >
                  {isSubmittingForm ? (
                    <Loader2 className="h-8 w-8 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-8 w-8 mr-2" />
                  )}
                  Submit Report
                </Button>
              </div>
            </form>
          </div>
        </FormProvider>
      </main>
    </div>
  );
}
