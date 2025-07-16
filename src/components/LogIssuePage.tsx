import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { useUserProfileContext } from '@/context/UserProfileContext';
import { Moon, Sun, Paperclip, Loader2, CheckCircle } from 'lucide-react';
import { useDarkMode } from '@/components/shared/DarkModeProvider';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { STATUS_OPTIONS } from '@/lib/types';
import type { ShiftReportFormValues, StatusOption, DisplayIssue } from '@/lib/types';
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';
import PhotoUploader from '@/components/PhotoUploader';
import { useRouter } from 'next/navigation';

// Inline DarkModeToggle (copied from NavigationBar for reuse)
function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  return (
    <button
      onClick={toggleDarkMode}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-accent transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary ml-2"
      aria-label="Toggle dark mode"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? <Moon className="h-6 w-6 text-blue-400" /> : <Sun className="h-6 w-6 text-yellow-400" />}
    </button>
  );
}

const LogIssuePage = () => {
  const { user, logout } = useAuth();
  const { profile, loading: profileLoading } = useUserProfileContext();
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pmun, setPmun] = useState('');
  const [title, setTitle] = useState('');
  const [aiSuggestedTitle, setAiSuggestedTitle] = useState('');
  const [allIssues, setAllIssues] = useState<DisplayIssue[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ [id: string]: StatusOption }>({});
  const [savedStatus, setSavedStatus] = useState<{ [id: string]: boolean }>({});
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [faults, setFaults] = useState('');
  const [slots, setSlots] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ date?: string; title?: string; description?: string }>({});

  const isOperator = profile?.role === 'operator';
  const isTechnician = profile?.role === 'technician';

  const router = useRouter();

  // Fetch issues
  useEffect(() => {
    if (!user) return;
    setIssuesLoading(true);
    const fetchReports = async () => {
      const snap = await getDocs(collection(db, "shiftReports"));
      const issues: DisplayIssue[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as ShiftReportFormValues;
        const repDate = (data.reportDate as any)?.toDate ? (data.reportDate as any).toDate() : new Date(data.reportDate);
        if (Array.isArray(data.issues)) {
          data.issues.forEach((issue, idx) => {
            if (issue && typeof issue === 'object' && issue.issue) {
              issues.push({
                ...issue,
                id: `${docSnap.id}-${idx}`,
                reportId: docSnap.id,
                issueIndex: idx,
                reportDate: repDate,
                submittedBy: data.submittedBy,
              });
            }
          });
        }
      });
      setAllIssues(issues);
      setIssuesLoading(false);
    };
    fetchReports();
  }, [user]);

  // Log Issue form handlers
  const handleAISuggestions = async () => {
    try {
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!response.ok) throw new Error('AI API error');
      const data = await response.json();
      setDescription(typeof data.cleaned_description === 'string' ? data.cleaned_description : '');
      setPmun(typeof data.pmun === 'string' ? data.pmun : '');
      if (typeof data.title === 'string' && (!title.trim() || title === aiSuggestedTitle)) {
        setAiSuggestedTitle(data.title);
        setTitle(data.title);
      }
    } catch (err) {
      alert('AI suggestion failed. Please try again.');
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  const getTitleValue = () => title || aiSuggestedTitle;

  const handlePhotoUpload = (urls: string[]) => {
    setPhotos(urls);
  };

  // Status update handlers
  const handleStatusChange = (issue: DisplayIssue, newStatus: StatusOption) => {
    setPendingStatus(prev => ({ ...prev, [issue.id]: newStatus }));
    setSavedStatus(prev => ({ ...prev, [issue.id]: false }));
  };

  const handleSaveStatus = async (issue: DisplayIssue) => {
    setUpdating(issue.id);
    const newStatus = pendingStatus[issue.id];
    const reportRef = doc(db, "shiftReports", issue.reportId);
    try {
      const reportSnap = await getDoc(reportRef);
      const reportData = reportSnap.data();
      if (!reportData || !Array.isArray(reportData.issues)) throw new Error('No issues array');
      const updatedIssues = [...reportData.issues];
      updatedIssues[issue.issueIndex] = {
        ...updatedIssues[issue.issueIndex],
        status: newStatus,
      };
      await updateDoc(reportRef, { issues: updatedIssues });
      setAllIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: newStatus } : i));
      setSavedStatus(prev => ({ ...prev, [issue.id]: true }));
    } catch (err) {
      setSavedStatus(prev => ({ ...prev, [issue.id]: false }));
    } finally {
      setUpdating(null);
    }
  };

  // Log Issue form submission (add new issue)
  const handleLogIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { date?: string; title?: string; description?: string } = {};
    if (!date) newErrors.date = 'Please select a date.';
    if (!title.trim()) newErrors.title = 'Please enter an issue title.';
    if (!description.trim()) newErrors.description = 'Please enter a description.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (!user || !profile) return;
    // Find or create today's shift report
    if (!date) return; // extra guard for typescript
    const todayStr = date.toDateString();
    let reportDocId: string | null = null;
    let reportData: any = null;
    const snap = await getDocs(collection(db, "shiftReports"));
    snap.forEach((docSnap) => {
      const data = docSnap.data() as ShiftReportFormValues;
      const repDate = (data.reportDate as any)?.toDate ? (data.reportDate as any).toDate() : new Date(data.reportDate);
      if (repDate.toDateString() === todayStr && data.submittedBy === profile.name) {
        reportDocId = docSnap.id;
        reportData = data;
      }
    });
    let issuesArr = reportData?.issues || [];
    const newIssue = {
      issue: title,
      pmun,
      description,
      faults,
      slots,
      status: 'Open',
      photos: photos || [],
      actions: '',
    };
    if (reportDocId) {
      // Update existing report
      const reportRef = doc(db, "shiftReports", reportDocId);
      await updateDoc(reportRef, {
        issues: [...issuesArr, newIssue],
      });
    } else {
      // Create new report
      const { addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, "shiftReports"), {
        submittedBy: profile.name,
        reportDate: date,
        issues: [newIssue],
        createdAt: serverTimestamp(),
      });
    }
    // Reset form
    setTitle('');
    setPmun('');
    setDescription('');
    setFaults('');
    setSlots('');
    setPhotos([]);
    setDate(undefined);
    setAiSuggestedTitle('');
    // Refresh issues
    const refreshSnap = await getDocs(collection(db, "shiftReports"));
    const issues: DisplayIssue[] = [];
    refreshSnap.forEach((docSnap) => {
      const data = docSnap.data() as ShiftReportFormValues;
      const repDate = (data.reportDate as any)?.toDate ? (data.reportDate as any).toDate() : new Date(data.reportDate);
      if (Array.isArray(data.issues)) {
        data.issues.forEach((issue, idx) => {
          if (issue && typeof issue === 'object' && issue.issue) {
            issues.push({
              ...issue,
              id: `${docSnap.id}-${idx}`,
              reportId: docSnap.id,
              issueIndex: idx,
              reportDate: repDate,
              submittedBy: data.submittedBy,
            });
          }
        });
      }
    });
    setAllIssues(issues);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user || profileLoading) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground font-[SF Pro Display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif] flex flex-col items-center px-1 sm:px-2 md:px-6 py-4 md:py-10 overflow-x-hidden w-full">
      {/* Sticky, blurred, rounded header */}
      <header className="sticky top-0 z-30 w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-0 sm:px-2 pt-3 pb-2 bg-card/80 backdrop-blur-md rounded-b-3xl shadow-lg border-b border-border flex flex-col items-center transition-all duration-300">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 px-1 sm:px-4">
          <span className="text-primary font-semibold text-xs sm:text-base md:text-lg break-all">{user?.email}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="text-red-500 font-semibold px-2 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-xs sm:text-base md:text-lg"
            >
              Log Out
            </button>
            <DarkModeToggle />
          </div>
        </div>
        <h1 className="text-xl sm:text-3xl md:text-5xl font-bold text-primary tracking-tight mb-1 sm:mb-2" style={{ letterSpacing: '-0.02em' }}>
          ShiftWise
        </h1>
        <span className="text-sm sm:text-lg md:text-xl text-primary/70 font-medium tracking-wide mb-1 sm:mb-2">
          {isOperator ? 'Log Issue & View Issues' : 'View Issues'}
        </span>
      </header>
      {/* Animated background blobs */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        {/* Blobs */}
        <div className="absolute bg-blue-300 opacity-20 rounded-full blur-3xl animate-blob1" style={{width:'30vw',height:'12vw',top:'8%',left:'10%',minWidth:'340px',minHeight:'180px'}} />
        <div className="absolute bg-yellow-200 opacity-20 rounded-full blur-3xl animate-blob2" style={{width:'18vw',height:'8vw',top:'60%',left:'70%',minWidth:'220px',minHeight:'120px'}} />
        <div className="absolute bg-sky-200 opacity-20 rounded-full blur-2xl animate-blob3" style={{width:'14vw',height:'6vw',top:'30%',left:'60%',minWidth:'180px',minHeight:'90px'}} />
        <div className="absolute bg-indigo-200 opacity-20 rounded-full blur-2xl animate-blob4" style={{width:'10vw',height:'4vw',top:'75%',left:'20%',minWidth:'120px',minHeight:'60px'}} />
        {/* Animated dots/particles */}
        {[...Array(12)].map((_,i)=>(
          <div key={i} className={`absolute rounded-full bg-blue-400 opacity-30 animate-particle${i%4+1}`} style={{width:'10px',height:'10px',top:`${10+Math.random()*80}%`,left:`${5+Math.random()*90}%`}} />
        ))}
      </div>
      {/* Only show the Log Issue form for operators */}
      {isOperator && (
        <form onSubmit={handleLogIssue} className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl bg-card rounded-3xl shadow-xl p-2 sm:p-4 md:p-8 flex flex-col gap-4 sm:gap-6 border border-border mt-6 mb-6 mx-auto">
        <div className="mb-2">
          <label className="block mb-1 font-semibold text-lg text-foreground">Date</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                  className={`w-full justify-start text-left font-medium text-lg py-3 rounded-xl bg-input border ${errors.date ? 'border-red-500' : 'border-border'} shadow-sm hover:bg-secondary/80 dark:hover:bg-secondary/40 text-foreground dark:text-foreground`}
              >
                {date ? date.toLocaleDateString() : "Pick a date"}
              </Button>
            </PopoverTrigger>
              <PopoverContent align="start" className="p-0 w-auto bg-card dark:bg-card border rounded-2xl shadow-2xl mt-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={d => { setDate(d); setOpen(false); }}
                initialFocus
                  className="rounded-2xl bg-card dark:bg-card text-foreground dark:text-foreground"
              />
            </PopoverContent>
          </Popover>
            {errors.date && <div className="text-red-500 text-sm mt-1">{errors.date}</div>}
          {date && (
            <div className="mt-2 text-base text-muted-foreground text-center">Selected: {date.toLocaleDateString()}</div>
          )}
        </div>
        <input
          type="text"
          value={getTitleValue()}
          onChange={handleTitleChange}
          placeholder="Issue Title"
            className={`w-full border rounded-2xl p-3 text-lg bg-input dark:bg-input text-foreground dark:text-foreground focus:bg-input dark:focus:bg-input focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm mb-2 ${errors.title ? 'border-red-500' : 'border-border'}`}
            required
        />
          {errors.title && <div className="text-red-500 text-sm mb-2">{errors.title}</div>}
        <input
          type="text"
          value={pmun}
          onChange={e => setPmun(e.target.value)}
          placeholder="PMUN Number (if any)"
            className="w-full border border-border rounded-2xl p-3 text-lg bg-input dark:bg-input text-foreground dark:text-foreground focus:bg-input dark:focus:bg-input focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm mb-2"
          />
          <input
            type="text"
            value={slots}
            onChange={e => setSlots(e.target.value)}
            placeholder="Slots (if any)"
            className="w-full border border-border rounded-2xl p-3 text-lg bg-input dark:bg-input text-foreground dark:text-foreground focus:bg-input dark:focus:bg-input focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm mb-2"
          />
          <textarea
            value={faults}
            onChange={e => setFaults(e.target.value)}
            className="w-full border border-border rounded-2xl p-3 text-lg bg-input dark:bg-input text-foreground dark:text-foreground focus:bg-input dark:focus:bg-input focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm mb-2 min-h-[60px]"
            placeholder="Faults (if any)"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
            className={`w-full border rounded-2xl p-4 text-lg bg-input dark:bg-input text-foreground dark:text-foreground focus:bg-input dark:focus:bg-input focus:outline-none focus:ring-2 focus:ring-primary transition-all min-h-[120px] resize-y shadow-sm ${errors.description ? 'border-red-500' : 'border-border'}`}
          placeholder="Describe the issue..."
            required
        />
          {errors.description && <div className="text-red-500 text-sm mb-2">{errors.description}</div>}
          <PhotoUploader onUploadComplete={handlePhotoUpload} />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <Button
          type="button"
          onClick={handleAISuggestions}
              className="w-full sm:w-auto py-2 sm:py-3 rounded-xl text-base sm:text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-98 transition-transform"
        >
          AI Suggestions
        </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto py-2 sm:py-3 rounded-xl text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-500 to-green-400 text-white shadow-md hover:from-blue-600 hover:to-green-500 active:scale-98 transition-transform"
            >
              Log Issue
            </Button>
          </div>
        </form>
      )}
      {/* Issues Table (All users) */}
      <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto mb-24">
        <Card className="shadow-2xl rounded-3xl border border-border bg-card/80 dark:bg-card/80 p-1 sm:p-4 md:p-8">
          <CardHeader className="bg-transparent text-foreground dark:text-foreground pb-2 sm:pb-4">
            <CardTitle className="text-lg sm:text-2xl md:text-3xl font-extrabold text-primary dark:text-primary tracking-tight mb-2">All Issues ({allIssues.length})</CardTitle>
          </CardHeader>
          <CardContent className="bg-transparent text-foreground dark:text-foreground">
            {issuesLoading ? (
              <div className="flex justify-center items-center py-8 sm:py-12">
                <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary dark:text-primary" />
              </div>
            ) : allIssues.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 sm:py-12 text-base sm:text-lg font-medium">
                No issues found.
              </p>
            ) : (
              <div className="overflow-x-auto w-full">
                <div className="rounded-2xl shadow-xl border border-border bg-card/80 dark:bg-card/80 overflow-auto w-full min-w-[520px]">
                  <Table className="min-w-full text-foreground dark:text-foreground text-xs sm:text-base md:text-lg">
                    <TableHeader className="sticky top-0 z-10 bg-card/80 dark:bg-card/80 backdrop-blur-md">
                      <TableRow>
                        <TableHead className="font-extrabold text-primary dark:text-primary text-xs sm:text-lg px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-center">Issue Title</TableHead>
                        <TableHead className="font-extrabold text-primary dark:text-primary text-xs sm:text-lg px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-center">PMUN</TableHead>
                        <TableHead className="font-extrabold text-primary dark:text-primary text-xs sm:text-lg px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-center">Attachments</TableHead>
                        <TableHead className="font-extrabold text-primary dark:text-primary text-xs sm:text-lg px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-center">Status</TableHead>
                        <TableHead className="font-extrabold text-primary dark:text-primary text-xs sm:text-lg px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-center">Submitted By</TableHead>
                        <TableHead className="font-extrabold text-primary dark:text-primary text-xs sm:text-lg px-2 sm:px-4 md:px-6 py-2 sm:py-4 whitespace-nowrap text-center">Report Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allIssues.map((issue, idx) => {
                        const currentStatus = pendingStatus[issue.id] ?? issue.status;
                        return (
                          <TableRow
                            key={issue.id}
                            className={`transition-colors ${idx % 2 === 0 ? 'bg-card/60 dark:bg-card/40' : 'bg-card/80 dark:bg-card/60'} hover:bg-card/40 dark:hover:bg-card/60`}
                          >
                            <TableCell className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 text-xs sm:text-base md:text-lg whitespace-nowrap text-center text-foreground dark:text-foreground font-semibold">
                              <span className="font-medium max-w-[120px] sm:max-w-xs truncate" title={issue.issue}>{issue.issue}</span>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 text-xs sm:text-base md:text-lg whitespace-nowrap text-center text-foreground dark:text-foreground font-semibold">{issue.pmun || '-'}</TableCell>
                            <TableCell className="text-center px-2 sm:px-4 md:px-6 py-2 sm:py-4 text-xs sm:text-base md:text-lg whitespace-nowrap">
                              {issue.photos && issue.photos.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-xs md:text-sm shadow-sm border border-blue-200 dark:border-blue-700">
                                  <Paperclip className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                                  {issue.photos.length}
                                  <span className="sr-only">attachments</span>
                                </span>
                              ) : (
                                <span className="inline-block px-2 sm:px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-medium text-xs md:text-sm border border-gray-200 dark:border-gray-700">-</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 text-xs sm:text-base md:text-lg whitespace-nowrap flex items-center gap-2 justify-center">
                              <Select
                                value={currentStatus}
                                onValueChange={(val) => handleStatusChange(issue, val as StatusOption)}
                                disabled={updating === issue.id}
                              >
                                <SelectTrigger className={`w-[90px] sm:w-[140px] md:w-[180px] rounded-lg border-blue-400 focus:ring-2 focus:ring-blue-400 bg-white dark:bg-blue-950 font-bold shadow-md text-blue-500 border-2 ${currentStatus ? 'text-blue-500' : 'text-foreground'}`}>
                                  <span className="font-bold text-blue-500">{currentStatus}</span>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-blue-300 bg-white dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold shadow-lg">
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s} className="capitalize px-4 py-2 focus:bg-blue-100 dark:focus:bg-blue-900 focus:text-blue-700 dark:focus:text-blue-300 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white font-bold">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                className="ml-1 sm:ml-2 px-2 sm:px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-base"
                                onClick={() => handleSaveStatus(issue)}
                                disabled={updating === issue.id || !pendingStatus[issue.id] || pendingStatus[issue.id] === issue.status}
                                aria-label="Save status update"
                                type="button"
                              >
                                {updating === issue.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </button>
                              {savedStatus[issue.id] && (
                                <CheckCircle className="ml-1 sm:ml-2 h-5 w-5 text-green-500" aria-label="Status saved" />
                              )}
                              {savedStatus[issue.id] === false && (
                                <span className="ml-1 sm:ml-2 text-red-500 text-xs sm:text-sm" aria-label="Save failed">Error saving!</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 text-xs sm:text-base md:text-lg whitespace-nowrap text-center text-primary dark:text-primary font-extrabold">{issue.submittedBy}</TableCell>
                            <TableCell className="px-2 sm:px-4 md:px-6 py-2 sm:py-4 text-xs sm:text-base md:text-lg whitespace-nowrap text-center text-foreground dark:text-foreground font-semibold">{format(new Date(issue.reportDate), 'PPp')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNavigationBar />
    </div>
  );
};

export default LogIssuePage;