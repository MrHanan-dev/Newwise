import React, { useState } from 'react';
import { collection, getDocs, query, where, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ReportData = DocumentData & {
  id: string;
  reportDate?: any;
  submittedBy?: string;
  issues?: any[];
};

export function EmailDailyReport() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendReport = async () => {
    setLoading(true);
    try {
      // Get yesterday's date (midnight to midnight)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      // Query all reports from yesterday
      const q = query(
        collection(db, "shiftReports"),
        where("reportDate", ">=", Timestamp.fromDate(yesterday)),
        where("reportDate", "<=", Timestamp.fromDate(yesterdayEnd))
      );
      
      const snapshot = await getDocs(q);
      
      // If no reports, notify user
      if (snapshot.empty) {
        toast({
          title: "No reports found",
          description: "There were no issues reported yesterday.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
        // Collect all reports data with simplified structure to avoid circular references
      const reportsData: ReportData[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Fix: Ensure 'issues' is an array before mapping to prevent crashes from malformed data.
        const issues = Array.isArray(data.issues) ? data.issues.map((issue: any) => ({
          status: issue.status || 'Unknown',
          issue: issue.issue || 'Untitled Issue',
          description: issue.description || '',
          pmun: issue.pmun || '',
          actions: issue.actions || '',
          photos: issue.photos || []
        })) : [];
        
        reportsData.push({
          id: doc.id,
          submittedBy: data.submittedBy || 'Unknown',
          // Fix: Convert Firestore Timestamp to a serializable ISO string.
          // This prevents an error when sending the data to the API.
          reportDate: data.reportDate?.toDate().toISOString(),
          issues: issues
        });
      });
      
      // Add retry logic for API request
      let retries = 3;
      let response;
      
      while (retries > 0) {
        try {
          // Send to API endpoint that will generate PDF and email it
          response = await fetch('/api/email-report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reports: reportsData }),
          });
          
          // If successful, break out of retry loop
          if (response.ok) break;
          
          // If failed, decrement retry count
          retries--;
          
          if (retries > 0) {
            console.log(`Retrying API call, ${retries} attempts left`);
            // Wait a bit before retrying (500ms, 1000ms, etc.)
            await new Promise(r => setTimeout(r, (4 - retries) * 500));
          }
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);
          retries--;
          if (retries <= 0) throw fetchError;
          await new Promise(r => setTimeout(r, (4 - retries) * 500));
        }
      }
        if (!response || !response.ok) {
        const errorData = response ? await response.json() : { error: 'No response from server' };
        throw new Error(errorData.error || 'Failed to send email');
      }
        toast({
        title: "Email sent!",
        description: "The daily report with photos has been emailed successfully.",
      });
    } catch (error) {
      console.error("Error sending report email:", error);
      toast({
        title: "Failed to send email",
        description: "There was a problem generating or sending the report.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSendReport} 
      disabled={loading}
      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending Report with Photos...
        </>
      ) : (
        <>
          <Mail className="h-4 w-4" />
          Email Daily Report with Photos
        </>
      )}
    </Button>
  );
}
