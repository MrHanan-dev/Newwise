// ===============================
// Issue Detail Dialog (Popup)
// ===============================
// This component displays a popup dialog for viewing and editing a single issue.
// It is used by the IssueHistoryPage and receives the selected issue as a prop.
// Allows editing of all fields and shows attached photos.

"use client";

// ===== Imports =====
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"; // UI dialog components
import { Button } from "@/components/ui/button"; // Button component
import { Input } from "@/components/ui/input"; // Input field
import { Textarea } from "@/components/ui/textarea"; // Textarea field
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Dropdown select
import { STATUS_OPTIONS, StatusOption, IssueBlockFormValues, DisplayIssue } from "@/lib/types"; // Types
import { db } from "@/lib/firebaseClient"; // Firestore instance
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore"; // Firestore update and fetch
import { Calendar } from "@/components/ui/calendar"; // Calendar component
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Popover component
import { CalendarIcon, BellIcon } from "lucide-react"; // Icons
import { format } from "date-fns"; // Date formatting
import { cn } from "@/lib/utils"; // Utility for class name merging
import { NotificationToggle } from "@/components/ui/notification-toggle"; // Notification toggle component
import { useAuth } from "@/context/AuthContext";
import { useUserProfileContext } from "@/context/UserProfileContext";
// Remove Tabs, TabsList, TabsTrigger, TabsContent imports

// Add a helper to robustly convert Firestore Timestamp, string, or Date to JS Date
function toDateSafe(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (val.seconds && typeof val.seconds === 'number') {
    // Firestore Timestamp
    return new Date(val.seconds * 1000);
  }
  return null;
}

// ===== Props for the dialog =====
interface IssueDetailDialogProps {
  issue: DisplayIssue | null; // The issue to display
  open: boolean; // Whether the dialog is open
  onOpenChange: (open: boolean) => void; // Callback to close dialog
  // Add callback for when an issue is updated
  onIssueUpdated?: (updatedIssue: DisplayIssue) => void;
  userRole: string; // Allow any role
}

// ===============================
// Main Component: IssueDetailDialog
// ===============================
export function IssueDetailDialog({ issue, open, onOpenChange, onIssueUpdated, userRole }: IssueDetailDialogProps) {
  const { user } = useAuth();
  const { profile: userProfile } = useUserProfileContext();
  // editMode: Whether the dialog is in edit mode
  // formState: Local state for editing fields
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState<IssueBlockFormValues | null>(null);
  // Separate state for the report date since it's not part of IssueBlockFormValues
  const [reportDate, setReportDate] = useState<Date | null>(null);
  // Track comment for status change
  const [statusChangeComment, setStatusChangeComment] = useState("");
  const [statusChanged, setStatusChanged] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Remove activeTab, comments, newComment state
  
  // ========== Load issue data into local state when opened ==========
  useEffect(() => {
    if (issue) {
      setFormState({
        issue: issue.issue,
        pmun: issue.pmun ?? "",
        description: issue.description,
        actions: issue.actions ?? "",
        status: issue.status,
        photos: issue.photos ?? [],
        history: issue.history ?? [],
      });
      setReportDate(issue.reportDate);
      setStatusChangeComment("");
      setStatusChanged(false);
      setSaveError("");
    }
  }, [issue]);

  // Remove useEffect for comments
  
  // If no issue or form state, render nothing
  if (!issue || !formState) return null;

  // ========== Handle field changes in edit mode ==========
  const handleChange = (field: keyof IssueBlockFormValues, value: any) => {
    setFormState((prev) => {
      const updated = { ...(prev as IssueBlockFormValues), [field]: value };
      if (field === "status" && issue) {
        setStatusChanged(value !== issue.status);
        if (value !== issue.status) {
          setSaveError("");
        }
      }
      return updated;
    });
  };  // ========== Save changes to Firestore ==========
  // This updates the entire issues array in the parent shift report
  const saveChanges = async () => {
    setSaveError("");
    if (!formState || !reportDate) return;
    // Validate reportDate is a valid date and not in the future
    if (!(reportDate instanceof Date) || isNaN(reportDate.getTime())) {
      setSaveError("Please select a valid report date.");
      return;
    }
    if (reportDate > new Date()) {
      setSaveError("Report date cannot be in the future.");
      return;
    }
    // Require comment if status changed
    if (issue && formState.status !== issue.status && !statusChangeComment.trim()) {
      setSaveError("Please provide a comment explaining the status change.");
      return;
    }
    // Determine what has changed
    const changes = [];
    if (issue.issue !== formState.issue) changes.push("title");
    if (issue.description !== formState.description) changes.push("description");
    if (issue.status !== formState.status) changes.push("status");
    if (issue.pmun !== formState.pmun) changes.push("pmun");
    if (issue.actions !== formState.actions) changes.push("actions");
    if (issue.reportDate.getTime() !== reportDate.getTime()) changes.push("date");
    
    // Fetch the parent shift report document
    const reportRef = doc(db, "shiftReports", issue.reportId);
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) return;
    const reportData = reportSnap.data();
    if (!Array.isArray(reportData.issues)) return;
    
    // Add a new history entry for this change
    const prevHistory = Array.isArray(formState.history) ? formState.history : [];
    const userName = userProfile?.name || user?.displayName || user?.email || user?.uid || 'Unknown';
    const newHistoryEntry = {
      status: formState.status,
      changedBy: userName,
      changedAt: new Date(),
      role: userProfile?.role || userRole,
      ...(issue && formState.status !== issue.status && statusChangeComment.trim() ? { note: statusChangeComment.trim() } : {})
    };
    const updatedHistory = [...prevHistory, newHistoryEntry];

    // Update the relevant issue in the array, preserving existing fields
    const updatedIssues = [...reportData.issues];
    const existingIssue = reportData.issues[issue.issueIndex];

    updatedIssues[issue.issueIndex] = {
      ...existingIssue, // Preserve all existing fields
      ...formState, // Overwrite with edited fields
      history: updatedHistory,
      subscribers: existingIssue.subscribers || [], // Ensure subscribers array is preserved
    };
    
    // Create a timestamp from the selected date
    const reportTimestamp = Timestamp.fromDate(reportDate);
    
    // Write the array and updated date back
    await updateDoc(reportRef, { 
      issues: updatedIssues,
      reportDate: reportTimestamp
    });

    // Fetch the latest issue data from Firestore to ensure up-to-date timeline
    const refreshedSnap = await getDoc(reportRef);
    let refreshedIssue = null;
    if (refreshedSnap.exists()) {
      const refreshedData = refreshedSnap.data();
      if (Array.isArray(refreshedData.issues) && refreshedData.issues[issue.issueIndex]) {
        refreshedIssue = {
          ...refreshedData.issues[issue.issueIndex],
          reportId: issue.reportId,
          issueIndex: issue.issueIndex,
          id: issue.id,
          reportDate: refreshedData.reportDate,
          submittedBy: refreshedData.submittedBy,
        };
      }
    }

    // Call the callback to update local state in parent
    if (onIssueUpdated && refreshedIssue) {
      onIssueUpdated(refreshedIssue);
    }

    // Send notification if changes were made
    if (changes.length > 0) {
      try {
        // Send notification to all subscribers
        const changeType = changes.join(", ");
        const title = `Issue Updated: ${formState.issue}`;
        const body = `Status: ${formState.status}${changes.includes("status") ? " (changed)" : ""} - Updates: ${changeType}`;
        
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            issueId: issue.id,
            reportId: issue.reportId,
            changeType,
            title,
            body
          }),
        });
      } catch (error) {
        console.error("Error sending notifications:", error);
        // Don't block the UI for notification errors
      }
    }
    
    setEditMode(false);
    onOpenChange(false);
  };

  return (
    <Dialog key={issue?.id} open={open} onOpenChange={(o) => {
      if (!o) setEditMode(false); // Only reset editMode when closing
      onOpenChange(o);
    }}>
      <DialogContent
        className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex flex-col overflow-y-auto bg-gradient-to-br from-white via-blue-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-none sm:rounded-2xl shadow-2xl border-2 border-blue-200 dark:border-blue-900 p-2 sm:p-4 md:p-6 cursor-default text-sm h-full max-h-full"
      >
        <DialogTitle className="text-2xl font-bold mb-4 text-blue-700 dark:text-blue-200">{issue?.issue || 'Issue Details'}</DialogTitle>
        {/* Only render the details UI as before, no tabs or comments */}
        {editMode ? (
          <div className="space-y-4">
            <Input
              value={formState.issue}
              onChange={(e) => handleChange("issue", e.target.value)}
              placeholder="Issue title"
              className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400"
              // Always editable in edit mode
            />
            <Input
              value={formState.pmun ?? ""}
              onChange={(e) => handleChange("pmun", e.target.value)}
              placeholder="PMUN"
              className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400"
              // Always editable in edit mode
            />
            <Textarea
              value={formState.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Description"
              className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400 min-h-[100px]"
              // Always editable in edit mode
            />
            <Textarea
              value={formState.actions ?? ""}
              onChange={(e) => handleChange("actions", e.target.value)}
              placeholder="Actions"
              className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400 min-h-[80px]"
              // Always editable in edit mode
            />            <Select
              value={formState.status}
              onValueChange={(val) => handleChange("status", val as StatusOption)}
              // Always editable in edit mode
            >
              <SelectTrigger className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}            </SelectContent>
            </Select>
            
            {/* Show comment input if status changed */}
            {statusChanged && (
              <div>
                <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-1">Comment for status change <span className="text-red-500">*</span></label>
                <Textarea
                  value={statusChangeComment}
                  onChange={e => setStatusChangeComment(e.target.value)}
                  placeholder="Please explain why you are changing the status."
                  className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400 min-h-[60px]"
                  required
                />
                {saveError && <div className="text-red-600 text-xs mt-1">{saveError}</div>}
              </div>
            )}
            {/* Remove any Input for report date in edit mode. Only keep the Popover/Button/Calendar for date selection. */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-700 dark:text-blue-200">Report Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400 justify-start text-left font-normal text-blue-700 dark:text-blue-200",
                      // Remove text-muted-foreground
                    )}
                    // Ensure the button is always enabled in edit mode
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {reportDate ? format(reportDate, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reportDate as Date}
                    onSelect={(date) => {
                      setReportDate(date ?? null);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {formState.photos && formState.photos.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-200">Attachments</h3>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {formState.photos.map((url) => (
                    <img key={url} src={url} alt="attachment" className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow" />
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <BellIcon className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-700 dark:text-blue-200">Issue Notifications</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Get notified when this issue is updated.</p>
                  {user && <NotificationToggle
                    userId={user.uid}
                    issueId={issue.id}
                    reportId={issue.reportId}
                    variant="switch"
                    label="Receive notifications"
                    className="w-full"
                  />}
                </div>
              </div>
            </div><DialogFooter className="sticky bottom-0 left-0 right-0 w-full z-50 bg-gradient-to-t from-white/95 via-white/80 to-transparent dark:from-gray-900/95 dark:via-gray-900/80 dark:to-transparent border-t border-blue-200 dark:border-blue-900 p-3 flex gap-2 justify-center items-center rounded-b-2xl shadow-lg" style={{paddingBottom: 'env(safe-area-inset-bottom, 1.5rem)'}}>
              <Button variant="outline" onClick={() => setEditMode(false)} className="rounded-lg px-8 py-3 text-base font-semibold text-blue-700 dark:text-blue-200">Cancel</Button>
              <Button 
                onClick={saveChanges} 
                disabled={!reportDate || (statusChanged && !statusChangeComment.trim())}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-green-400 text-white font-bold px-8 py-3 text-base shadow hover:from-blue-600 hover:to-green-500"
              >
                Save
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-200">Issue</h3>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{issue.issue}</p>
            </div>
            {issue.pmun && (
              <div>
                <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-200">PMUN</h3>
                <p className="text-base text-gray-800 dark:text-gray-200">{issue.pmun}</p>
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-200">Description</h3>
              <p className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-line">{issue.description}</p>
            </div>
            {issue.actions && (
              <div>
                <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-200">Actions</h3>
                <p className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-line">{issue.actions}</p>
              </div>
            )}            <div>
              <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-200">Status</h3>
              <p className="text-base text-gray-800 dark:text-gray-200">{issue.status}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-200">Report Date</h3>
              {(() => { const d = toDateSafe(issue.reportDate); return d instanceof Date && !isNaN(d.getTime()) ? <p className="text-base text-gray-800 dark:text-gray-200">{format(d, 'PPP')}</p> : <p className="text-base text-gray-800 dark:text-gray-200">N/A</p>; })()}
            </div>
            
            {/* Timeline Section */}
            <div>
              <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-200">Timeline</h3>
              <div className="max-h-60 overflow-y-auto pr-2">
                {(issue.history ?? []).length > 0 ? (
                  <ul className="timeline-list space-y-4">
                    {(issue.history ?? []).map((entry, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`w-3 h-3 rounded-full border-2 ${entry.status === 'Completed' ? 'bg-green-500 border-green-700' : entry.status === 'In Progress' ? 'bg-yellow-400 border-yellow-600' : entry.status === 'Open' ? 'bg-blue-400 border-blue-600' : 'bg-gray-400 border-gray-600'}`}></span>
                          {idx < (issue.history ?? []).length - 1 && <span className="h-8 w-px bg-gray-300 dark:bg-gray-700"></span>}
                        </div>
                        <div>
                          <div className="font-semibold text-base text-foreground">{entry.status}</div>
                          <div className="text-xs text-muted-foreground">By: {entry.changedBy} {entry.role && (<span className='ml-1 text-[10px] text-blue-600 dark:text-blue-300 font-semibold'>({entry.role})</span>)}</div>
                          {(() => { const d = toDateSafe(entry.changedAt); return d instanceof Date && !isNaN(d.getTime()) ? <div className="text-xs text-muted-foreground">{format(d, 'PPP p')}</div> : <div className="text-xs text-muted-foreground">N/A</div>; })()}
                          {entry.note && <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{entry.note}</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">No history available for this issue.</div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-1 text-blue-700 dark:text-blue-200">Report Date</h3>
              {(() => { const d = toDateSafe(issue.reportDate); return d instanceof Date && !isNaN(d.getTime()) ? <p className="text-base text-gray-800 dark:text-gray-200">{format(d, 'PPP')}</p> : <p className="text-base text-gray-800 dark:text-gray-200">N/A</p>; })()}
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <BellIcon className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-700 dark:text-blue-200">Issue Notifications</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Get notified when this issue is updated.</p>
                  {user && <NotificationToggle
                    userId={user.uid}
                    issueId={issue.id}
                    reportId={issue.reportId}
                    variant="switch"
                    label="Receive notifications"
                    className="w-full"
                  />}
                </div>
              </div>
            </div>
            {issue.photos && issue.photos.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-200">Attachments</h3>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {issue.photos.map((url) => (
                    <img key={url} src={url} alt="attachment" className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow" />
                  ))}
                </div>
              </div>
            )}
            <DialogFooter className="mt-4 flex justify-end">
              <Button onClick={() => setEditMode(true)} className="rounded-lg bg-gradient-to-r from-blue-500 to-green-400 text-white font-bold px-6 py-2 text-base shadow hover:from-blue-600 hover:to-green-500">Edit</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
