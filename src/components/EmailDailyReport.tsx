import React, { useState } from 'react';
import { collection, getDocs, query, where, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Calendar, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProfileContext } from '@/context/UserProfileContext';

type ReportData = DocumentData & {
  id: string;
  reportDate?: any;
  submittedBy?: string;
  issues?: any[];
};

type DateRange = {
  startDate: string;
  endDate: string;
};

export function EmailDailyReport() {
  const [loading, setLoading] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    startDate: '',
    endDate: ''
  });
  const [reportType, setReportType] = useState<'all' | 'my-issues'>('all');
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile: userProfile } = useUserProfileContext();

  // Helper function to get date range for different periods
  const getDateRange = (period: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'): DateRange => {
    const now = new Date();
    
    switch (period) {
      case 'today':
        return {
          startDate: now.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0]
        };
      case 'last7days':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return {
          startDate: sevenDaysAgo.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      case 'last30days':
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      case 'custom':
        return selectedDateRange;
      default:
        return {
          startDate: now.toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
    }
  };

  // Helper function to check if an issue was created by the current user
  const isIssueCreatedByMe = (issue: any, reportSubmittedBy: string) => {
    if (!user) return false;
    
    // Get all possible user identifiers
    const userIdentifiers = [
      user.uid,
      user.email,
      userProfile?.name
    ].filter(Boolean); // Remove null/undefined values
    
    // Check if the report was submitted by the current user
    const isReportByMe = userIdentifiers.some(identifier => 
      reportSubmittedBy === identifier
    );
    
    // Check if the issue has a specific creator field
    const issueCreator = issue.createdBy || issue.submittedBy || issue.userId;
    const isIssueByMe = issueCreator && userIdentifiers.some(identifier => 
      issueCreator === identifier
    );
    
    return isReportByMe || isIssueByMe;
  };

  // Helper function to fetch reports for a date range
  const fetchReportsForDateRange = async (dateRange: DateRange, type: 'all' | 'my-issues') => {
    const startDate = new Date(dateRange.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    // Query reports from the date range
    const q = query(
      collection(db, "shiftReports"),
      where("reportDate", ">=", Timestamp.fromDate(startDate)),
      where("reportDate", "<=", Timestamp.fromDate(endDate))
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return [];
    }

    const reportsData: ReportData[] = [];
    let totalIssuesFound = 0;
    let myIssuesFound = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      let issues = Array.isArray(data.issues) ? data.issues.map((issue: any) => ({
        status: issue.status || 'Unknown',
        issue: issue.issue || 'Untitled Issue',
        description: issue.description || '',
        pmun: issue.pmun || '',
        actions: issue.actions || '',
        photos: issue.photos || [],
        createdBy: issue.createdBy || data.submittedBy,
        submittedBy: data.submittedBy
      })) : [];

      totalIssuesFound += issues.length;

      // Filter issues based on report type
      if (type === 'my-issues' && user) {
        const originalIssuesCount = issues.length;
        issues = issues.filter((issue: any) => {
          const isMyIssue = isIssueCreatedByMe(issue, data.submittedBy);
          if (isMyIssue) myIssuesFound++;
          return isMyIssue;
        });
        
        console.log(`Report ${doc.id}: Found ${originalIssuesCount} total issues, ${issues.length} are mine`);
        console.log(`Report submitted by: ${data.submittedBy}`);
        console.log(`Current user: ${user.email} (${user.uid})`);
        console.log(`User profile: ${userProfile?.name}`);
      }

      if (issues.length > 0) {
        reportsData.push({
          id: doc.id,
          submittedBy: data.submittedBy || 'Unknown',
          reportDate: data.reportDate?.toDate().toISOString(),
          issues: issues
        });
      }
    });

    console.log(`Total issues found: ${totalIssuesFound}, My issues: ${myIssuesFound}`);
    return reportsData;
  };

  // Send report with custom date range
  const handleSendReport = async (period: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom') => {
    setLoading(true);
    try {
      const dateRange = getDateRange(period);
      const reportsData = await fetchReportsForDateRange(dateRange, reportType);

      if (reportsData.length === 0) {
        const periodText = period === 'custom' ? 'selected date range' : 
                          period === 'today' ? 'today' :
                          period === 'yesterday' ? 'yesterday' :
                          period === 'last7days' ? 'last 7 days' : 'last 30 days';
        
        toast({
          title: "No reports found",
          description: `There were no issues reported for ${periodText}.`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Send to API endpoint with optimized timeout
      const response = await fetch('/api/email-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reports: reportsData,
          userInfo: {
            name: userProfile?.name || user?.displayName || 'Unknown User',
            email: user?.email || 'unknown@example.com',
            reportType: reportType
          }
        }),
        // Vercel compatible timeout
        signal: AbortSignal.timeout(30000) // 30 seconds timeout for Vercel
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const periodText = period === 'custom' ? 'selected date range' : 
                        period === 'today' ? 'today' :
                        period === 'yesterday' ? 'yesterday' :
                        period === 'last7days' ? 'last 7 days' : 'last 30 days';

      // Show success message for Vercel
      toast({
        title: "Report Generated!",
        description: `Your ${reportType === 'my-issues' ? 'personal ' : ''}report for ${periodText} has been generated and emailed successfully.`,
      });

      setShowDateDialog(false);
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

  // Handle All Issues Report with date selection
  const handleAllIssuesReport = () => {
    setReportType('all');
    setShowDateDialog(true);
  };

  // Handle My Issues Report with date selection
  const handleMyIssuesReport = () => {
    setReportType('my-issues');
    setShowDateDialog(true);
  };

  return (
    <div className="flex flex-col gap-2 bg-transparent">
      {/* All Issues Report Button */}
      <Button 
        onClick={handleAllIssuesReport}
        disabled={loading}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            Email Daily Report with Photos
          </>
        )}
      </Button>

      {/* My Issues Report Button */}
      <Button
        onClick={handleMyIssuesReport}
        disabled={loading}
        className="bg-gradient-to-r from-green-500 to-blue-400 hover:from-green-600 hover:to-blue-500 text-white font-semibold px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            Email My Issues (Created/Fixed/Logged)
          </>
        )}
      </Button>

      {/* Date Selection Dialog */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select Date Range for {reportType === 'all' ? 'All Issues' : 'My Issues'} Report
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Quick Date Options */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleSendReport('today')}
                disabled={loading}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-100 dark:border-blue-700 text-sm font-medium"
              >
                Today
              </Button>
              <Button
                onClick={() => handleSendReport('yesterday')}
                disabled={loading}
                className="bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-100 dark:border-green-700 text-sm font-medium"
              >
                Yesterday
              </Button>
              <Button
                onClick={() => handleSendReport('last7days')}
                disabled={loading}
                className="bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 dark:bg-purple-900 dark:hover:bg-purple-800 dark:text-purple-100 dark:border-purple-700 text-sm font-medium"
              >
                Last 7 Days
              </Button>
              <Button
                onClick={() => handleSendReport('last30days')}
                disabled={loading}
                className="bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 dark:bg-orange-900 dark:hover:bg-orange-800 dark:text-orange-100 dark:border-orange-700 text-sm font-medium"
              >
                Last 30 Days
              </Button>
            </div>

            {/* Custom Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={selectedDateRange.startDate}
                  onChange={(e) => setSelectedDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <Input
                  type="date"
                  value={selectedDateRange.endDate}
                  onChange={(e) => setSelectedDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Send Custom Range Button */}
            <Button
              onClick={() => handleSendReport('custom')}
              disabled={loading || !selectedDateRange.startDate || !selectedDateRange.endDate}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Custom Range Report
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
