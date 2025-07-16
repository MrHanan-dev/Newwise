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
// Remove Tabs, TabsList, TabsTrigger, TabsContent imports

// ===== Props for the dialog =====
interface IssueDetailDialogProps {
  issue: DisplayIssue | null; // The issue to display
  open: boolean; // Whether the dialog is open
  onOpenChange: (open: boolean) => void; // Callback to close dialog
  // Add callback for when an issue is updated
  onIssueUpdated?: (updatedIssue: DisplayIssue) => void;
  userRole: 'technician' | 'operator'; // <-- Add userRole prop
}

// ===============================
// Main Component: IssueDetailDialog
// ===============================
export function IssueDetailDialog({ issue, open, onOpenChange, onIssueUpdated, userRole }: IssueDetailDialogProps) {
  const { user } = useAuth();
  // editMode: Whether the dialog is in edit mode
  // formState: Local state for editing fields
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState<IssueBlockFormValues | null>(null);
  // Separate state for the report date since it's not part of IssueBlockFormValues
  const [reportDate, setReportDate] = useState<Date | null>(null);
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
      });
      // Set the report date separately
      setReportDate(issue.reportDate);
    }
  }, [issue]);

  // Remove useEffect for comments
  
  // If no issue or form state, render nothing
  if (!issue || !formState) return null;

  // ========== Handle field changes in edit mode ==========
  const handleChange = (field: keyof IssueBlockFormValues, value: any) => {
    setFormState((prev) => ({ ...(prev as IssueBlockFormValues), [field]: value }));
  };  // ========== Save changes to Firestore ==========
  // This updates the entire issues array in the parent shift report
  const saveChanges = async () => {
    if (!formState || !reportDate) return;
    
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
    
    // Update the relevant issue in the array, preserving existing fields
    const updatedIssues = [...reportData.issues];
    const existingIssue = reportData.issues[issue.issueIndex];

    updatedIssues[issue.issueIndex] = {
      ...existingIssue, // Preserve all existing fields
      ...formState, // Overwrite with edited fields
      subscribers: existingIssue.subscribers || [], // Ensure subscribers array is preserved
    };
    
    // Create a timestamp from the selected date
    const reportTimestamp = Timestamp.fromDate(reportDate);
    
    // Write the array and updated date back
    await updateDoc(reportRef, { 
      issues: updatedIssues,
      reportDate: reportTimestamp
    });
    
    // Call the callback to update local state in parent
    if (onIssueUpdated) {
      onIssueUpdated({ 
        ...issue, 
        ...formState,
        reportDate: reportDate
      });
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
    <Dialog open={open} onOpenChange={(o) => { setEditMode(false); onOpenChange(o); }}>
      <DialogContent className="w-full max-w-xs sm:max-w-lg md:max-w-2xl bg-gradient-to-br from-white via-blue-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl border-2 border-blue-200 dark:border-blue-900 p-2 sm:p-6 max-h-[80vh] overflow-y-auto">
        {/* Only render the details UI as before, no tabs or comments */}
        {editMode ? (
          <div className="space-y-4">
            <Input
              value={formState.issue}
              onChange={(e) => handleChange("issue", e.target.value)}
              placeholder="Issue title"
              className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400"
              disabled={userRole === 'operator'} // Disable editing for operator
            />
            <Input
              value={formState.pmun ?? ""}
              onChange={(e) => handleChange("pmun", e.target.value)}
              placeholder="PMUN"
              className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400"
              disabled={userRole === 'operator'}
            />
            <Textarea
              value={formState.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Description"
              className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400 min-h-[100px]"
              disabled={userRole === 'operator'}
            />
            <Textarea
              value={formState.actions ?? ""}
              onChange={(e) => handleChange("actions", e.target.value)}
              placeholder="Actions"
              className="rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400 min-h-[80px]"
              disabled={userRole === 'operator'}
            />            <Select
              value={formState.status}
              onValueChange={(val) => handleChange("status", val as StatusOption)}
              disabled={userRole === 'operator'}
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-700 dark:text-blue-200">Report Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400 justify-start text-left font-normal",
                      !reportDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {reportDate ? format(reportDate, "PPP") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">                  <Calendar
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Report Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left rounded-lg border-blue-300",
                      !reportDate && "text-gray-400"
                    )}
                  >
                    {reportDate ? format(reportDate, "PPP") : "Select a date"}
                    <CalendarIcon className="w-5 h-5 ml-auto text-blue-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4">                  <Calendar
                    mode="single"
                    selected={reportDate || undefined}
                    onSelect={(date) => {
                      setReportDate(date || null);
                    }}
                    className="w-full"
                  />
                </PopoverContent>
              </Popover>
            </div>            {formState.photos && formState.photos.length > 0 && (
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
            </div><DialogFooter className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)} className="rounded-lg px-6 py-2 text-base font-semibold">Cancel</Button>
              <Button 
                onClick={saveChanges} 
                disabled={!reportDate}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-green-400 text-white font-bold px-6 py-2 text-base shadow hover:from-blue-600 hover:to-green-500"
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
              <p className="text-base text-gray-800 dark:text-gray-200">{format(new Date(issue.reportDate), 'PPP')}</p>
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
              <Button onClick={() => userRole === 'technician' && setEditMode(true)} disabled={userRole === 'operator'} className="rounded-lg bg-gradient-to-r from-blue-500 to-green-400 text-white font-bold px-6 py-2 text-base shadow hover:from-blue-600 hover:to-green-500">Edit</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
