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
        
        // Extract issues and make sure they're serializable
        const issues = data.issues?.map((issue: any) => ({
          status: issue.status || 'Unknown',
          issue: issue.issue || 'Untitled Issue',
          description: issue.description || '',
          pmun: issue.pmun || '',
          actions: issue.actions || '',
          photos: issue.photos || []
        })) || [];
        
        reportsData.push({
          id: doc.id,
          submittedBy: data.submittedBy || 'Unknown',
          reportDate: data.reportDate,
          issues: issues
        });
      });
        // Send to API endpoint that will generate PDF and email it
      const response = await fetch('/api/email-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reports: reportsData }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
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
      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-2 sm:px-4 py-2 rounded-xl shadow-md flex items-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base"
    >      {loading ? (
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
