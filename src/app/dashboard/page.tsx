"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';
import NotificationInitializer from '@/components/NotificationInitializer';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { EmailDailyReport } from "@/components/EmailDailyReport";
import { Loader2 } from "lucide-react";
import { BarProps } from 'recharts';
import { useUserProfileContext } from '@/context/UserProfileContext';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { IssueDetailDialog } from '@/components/shiftwise/IssueDetailDialog';
import type { StatusOption } from "@/lib/types";
import useSWR from 'swr';
// REMOVE: import { Skeleton } from '@/components/ui/skeleton';

const STATUS_OPTIONS = ["Open", "In Progress", "Completed", "Escalated"];
const DURATION_OPTIONS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

function getStartDate(duration: string) {
  const now = new Date();
  if (duration === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  } else if (duration === "week") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else if (duration === "month") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  }
  return new Date(0);
}

type Issue = {
  status: string;
  issue: string;
  submittedBy?: string;
  reportDate?: any;
  reportId?: string;
  [key: string]: any;
};

// Custom active bar for bounce effect
const BounceActiveBar = (props: BarProps & { dataKey?: string }) => {
  const { fill, x, y, width, height } = props;
  return (
    <g>
      <rect
        x={x}
        y={typeof y === 'number' ? y - 8 : 0}
        rx={6}
        ry={6}
        width={width}
        height={typeof height === 'number' ? height + 8 : 0}
        fill={fill}
        style={{ filter: 'drop-shadow(0 0 8px #3b82f6aa)' }}
      />
    </g>
  );
};

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

// SWR fetcher for issues
const fetchIssuesSWR = async (user) => {
  if (!user) return [];
  const q = collection(db, "shiftReports");
  const snapshot = await getDocs(q);
  const allIssues = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const issuesArray = Array.isArray(data.issues) ? data.issues : [];
    issuesArray.forEach((issue, idx) => {
      allIssues.push({
        ...issue,
        reportId: doc.id,
        reportDate: data.reportDate,
        submittedBy: data.submittedBy,
        issueIndex: idx,
        id: `${doc.id}-${idx}`,
      });
    });
  });
  return allIssues;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();

  // Early return for loading/auth state BEFORE any other hooks
  if (authLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
          <div className="h-12 w-full rounded-xl bg-gray-200 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
            <div className="h-24 rounded-xl bg-gray-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 rounded-xl bg-gray-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-gray-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-gray-200 animate-pulse" />
          </div>
          <div className="h-64 w-full rounded-2xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // Now it's safe to call all other hooks
  const router = useRouter();
  const { profile: userProfile } = useUserProfileContext();
  const { data: issuesRaw = [], isLoading: loading, mutate } = useSWR(
    user ? ['issues', user.uid] : null,
    () => fetchIssuesSWR(user),
    { revalidateOnFocus: true }
  );
  // Sort issues by reportDate descending (newest first)
  const issues = [...issuesRaw].sort((a, b) => {
    const dateA = a.reportDate?.seconds ? new Date(a.reportDate.seconds * 1000) : new Date(a.reportDate);
    const dateB = b.reportDate?.seconds ? new Date(b.reportDate.seconds * 1000) : new Date(b.reportDate);
    return dateB.getTime() - dateA.getTime();
  });
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("");
  const [duration, setDuration] = useState("day");
  const [showTour, setShowTour] = useState(false);
  const { toast } = useToast();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Status counts
  const statusCounts = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = issues.filter(i => i.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  // Filtered issues
  const filteredIssues = statusFilter && STATUS_OPTIONS.includes(statusFilter)
    ? issues.filter(i => i.status === statusFilter)
    : issues;

  // Calculate percentage change for each status
  const statusPercentages = useMemo(() => {
    const now = new Date();
    const start = getStartDate(duration);
    const prevStart = getStartDate(duration === "day" ? "day" : duration === "week" ? "week" : "month");
    // Issues in current period
    const issuesInPeriod = issues.filter(i => {
      if (!i.reportDate) return false;
      const d = i.reportDate.seconds ? new Date(i.reportDate.seconds * 1000) : new Date(i.reportDate);
      return d >= start && d <= now;
    });
    // Issues in previous period
    const issuesInPrevPeriod = issues.filter(i => {
      if (!i.reportDate) return false;
      const d = i.reportDate.seconds ? new Date(i.reportDate.seconds * 1000) : new Date(i.reportDate);
      return d >= prevStart && d < start;
    });
    const result: Record<string, { count: number; prev: number; percent: number }> = {};
    STATUS_OPTIONS.forEach(status => {
      const count = issuesInPeriod.filter(i => i.status === status).length;
      const prev = issuesInPrevPeriod.filter(i => i.status === status).length;
      let percent = 0;
      if (prev === 0 && count > 0) percent = 100;
      else if (prev === 0 && count === 0) percent = 0;
      else percent = ((count - prev) / prev) * 100;
      result[status] = { count, prev, percent };
    });
    // Total
    const totalCount = issuesInPeriod.length;
    const totalPrev = issuesInPrevPeriod.length;
    let totalPercent = 0;
    if (totalPrev === 0 && totalCount > 0) totalPercent = 100;
    else if (totalPrev === 0 && totalCount === 0) totalPercent = 0;
    else totalPercent = ((totalCount - totalPrev) / totalPrev) * 100;
    result["Total"] = { count: totalCount, prev: totalPrev, percent: totalPercent };
    return result;
  }, [issues, duration]);

  // Prepare chart data for issues by status
  const chartData = STATUS_OPTIONS.map(status => ({
    status,
    count: statusCounts[status] || 0,
  }));

  // Prepare chart data for issues by day (last 7 days)
  const issuesByDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map(day => {
      const dayStr = day.toLocaleDateString();
      const count = issues.filter(i => {
        if (!i.reportDate) return false;
        const d = i.reportDate.seconds ? new Date(i.reportDate.seconds * 1000) : new Date(i.reportDate);
        return d.toLocaleDateString() === dayStr;
      }).length;
      return { date: dayStr, count };
    });
  }, [issues]);

  // Helper: Filter issues by user
  const myIssues = useMemo(() => {
    if (!userProfile || !user) return [];
    return issues.filter(i =>
      (i.submittedBy && (i.submittedBy === user.uid || i.submittedBy === user.email || i.submittedBy === userProfile.name))
    );
  }, [issues, userProfile, user]);
  const assignedIssues = userProfile ? issues.filter(i =>
    i.assignedTo === userProfile.uid ||
    i.assignedTo === userProfile.email ||
    i.assignedTo === userProfile.name
  ) : [];
  const inProgressIssues = userProfile ? issues.filter(i =>
    i.status === 'In Progress' && (
      i.assignedTo === userProfile.uid ||
      i.assignedTo === userProfile.email ||
      i.assignedTo === userProfile.name
    )
  ) : [];

  // Memoize the mapped selectedIssue for IssueDetailDialog
  const mappedSelectedIssue = useMemo(() => {
    if (
      selectedIssue &&
      typeof selectedIssue.issue === 'string' &&
      typeof selectedIssue.status === 'string' &&
      selectedIssue.reportId
    ) {
      const safeDate = toDateSafe(selectedIssue.reportDate) || new Date(0);
      return {
        id: selectedIssue.id || selectedIssue.reportId + '-' + (selectedIssue.issueIndex ?? 0),
        issue: selectedIssue.issue,
        pmun: selectedIssue.pmun || '',
        description: selectedIssue.description || '',
        actions: selectedIssue.actions || '',
        status: selectedIssue.status as StatusOption,
        photos: selectedIssue.photos || [],
        history: selectedIssue.history || [],
        reportId: selectedIssue.reportId || '',
        issueIndex: selectedIssue.issueIndex ?? 0,
        reportDate: safeDate as Date,
        submittedBy: selectedIssue.submittedBy || '',
      };
    }
    return null;
  }, [selectedIssue]);

  // Helper to fetch the latest issue data from Firestore
  async function fetchLatestIssue(issue: any) {
    if (!issue?.reportId || typeof issue.issueIndex !== 'number') return issue;
    const reportRef = doc(db, 'shiftReports', issue.reportId);
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) return issue;
    const reportData = reportSnap.data();
    if (!Array.isArray(reportData.issues) || !reportData.issues[issue.issueIndex]) return issue;
    return {
      ...reportData.issues[issue.issueIndex],
      reportId: issue.reportId,
      issueIndex: issue.issueIndex,
      id: issue.id,
      reportDate: reportData.reportDate,
      submittedBy: reportData.submittedBy,
    };
  }

  // Fetch user names for all unique submittedBy UIDs whenever issues change
  useEffect(() => {
    const fetchNames = async () => {
      const uids = Array.from(new Set(issues.map(i => i.submittedBy).filter(Boolean)));
      const nameMap: Record<string, string> = {};
      await Promise.all(uids.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData && userData.name) {
              nameMap[uid] = userData.name;
            }
          }
        } catch (e) { /* ignore */ }
      }));
      setUserNameMap(nameMap);
    };
    if (issues.length > 0) fetchNames();
  }, [issues]);

  return (
    <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-7xl mx-auto py-4 sm:py-8 px-2 sm:px-4 md:px-0 bg-transparent">
      {user && <NotificationInitializer />}
      {/* Onboarding Tour Modal (UI only for now) */}
      {showTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl shadow border border-border p-8 max-w-md w-full flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2 text-primary">Welcome to ShiftWise!</h2>
            <p className="mb-4 text-foreground text-center">This quick tour will show you how to log issues, view reports, and use all the features of your dashboard.</p>
            <ul className="mb-4 text-left text-foreground list-disc pl-6">
              <li>Log new issues with all required details</li>
              <li>View and update existing issues</li>
              <li>Use filters and search to find issues fast</li>
              <li>Switch between light and dark mode</li>
              <li>Access your profile and more</li>
            </ul>
            <button
              className="mt-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow"
              onClick={() => setShowTour(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      {/* Take a Tour button */}
      <div className="flex justify-end mb-2">
        <button
          className="px-4 py-2 rounded-lg bg-muted text-foreground border border-border shadow text-sm font-semibold"
          onClick={() => setShowTour(true)}
        >
          🎉 Take a Tour
        </button>
      </div>
      {/* Role badge */}
      {userProfile && (
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block px-4 py-1 rounded-full font-semibold text-sm shadow bg-card border border-border text-core-bright bg-neutral-verylight">
            {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
          </span>
          <span className="text-muted-foreground">Welcome, {userProfile.name || user.email}!</span>
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-primary">Dashboard</h1>
      {/* Duration Selector */}
      <div className="flex justify-end mb-2">
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger className="w-28 sm:w-32">
            <SelectValue placeholder="Duration" />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Role-based widgets */}
      {userProfile?.role === 'operator' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Issues I’ve logged */}
          <div className="bg-card rounded-xl shadow-md p-4 border border-border">
            <h3 className="text-lg font-semibold mb-2">Issues I’ve Logged</h3>
            <div className="text-4xl font-bold text-core-bright">{myIssues?.length ?? 0}</div>
          </div>
          {/* All open issues */}
          <div className="bg-card rounded-xl shadow-md p-4 border border-border">
            <h3 className="text-lg font-semibold mb-2">All Open Issues</h3>
            <div className="text-4xl font-bold text-secondary-orange">{issues.filter(i => i.status === 'Open').length}</div>
          </div>
          {/* Quick log new issue with tooltip */}
          <div className="col-span-1 md:col-span-2 flex justify-center mt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="px-6 py-3 rounded-xl bg-core-bright text-core-white font-bold shadow"
                    onClick={() => {
                      toast({ title: 'Navigating to Log Issue', description: 'Shortcut: L' });
                      router.push('/');
                    }}
                  >
                    + Log New Issue
                  </button>
                </TooltipTrigger>
                <TooltipContent>Log a new issue with all required details <span className="ml-2 text-xs text-muted-foreground">[L]</span></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ) : userProfile?.role === 'technician' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Issues assigned to me */}
          <div className="bg-card rounded-xl shadow-md p-4 border border-border">
            <h3 className="text-lg font-semibold mb-2">Issues Assigned to Me</h3>
            <div className="text-4xl font-bold text-secondary-green">{assignedIssues?.length ?? 0}</div>
          </div>
          {/* Issues in progress */}
          <div className="bg-card rounded-xl shadow-md p-4 border border-border">
            <h3 className="text-lg font-semibold mb-2">Issues In Progress</h3>
            <div className="text-4xl font-bold text-secondary-yellow">{inProgressIssues?.length ?? 0}</div>
          </div>
          {/* Quick update status with tooltip */}
          <div className="col-span-1 md:col-span-2 flex justify-center mt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="px-6 py-3 rounded-xl bg-secondary-green text-core-white font-bold shadow"
                    onClick={() => {
                      toast({ title: 'Navigating to View Issues', description: 'Shortcut: V' });
                      router.push('/view-issues');
                    }}
                  >
                    Update Issue Status
                  </button>
                </TooltipTrigger>
                <TooltipContent>View and update issues assigned to you <span className="ml-2 text-xs text-muted-foreground">[V]</span></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ) : null}
      {/* Summary Tiles as Filters with Percentage Change */}
      <div className="w-full min-w-0 overflow-x-auto relative pb-2">
        <div className="grid grid-flow-col auto-cols-[minmax(140px,1fr)] sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-8 min-w-0">
        {STATUS_OPTIONS.map(status => (
          <Card
            key={status}
            className={`group flex flex-col justify-between items-stretch shadow border border-border bg-card cursor-pointer min-w-[140px] max-w-[180px] sm:max-w-none min-w-0 ${statusFilter === status ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            style={{ minWidth: 0, minHeight: 0 }}
            onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setStatusFilter(statusFilter === status ? '' : status); }}
            aria-pressed={statusFilter === status}
            role="button"
          >
            <CardHeader className="pb-2 flex flex-col items-center justify-center">
              <CardTitle className="text-sm xs:text-base md:text-lg font-semibold text-primary text-center break-words whitespace-normal w-full flex flex-col items-center">
                <span className="break-words whitespace-normal w-full">{status}</span>
                <span className={`mt-1 text-xs xs:text-sm md:text-base font-medium flex items-center text-center break-words whitespace-normal ${statusPercentages[status]?.percent >= 0 ? 'text-secondary-green' : 'text-destructive'}`}> 
                  {statusPercentages[status]?.percent >= 0 ? '↑' : '↓'}
                  {Math.abs(statusPercentages[status]?.percent || 0).toFixed(1)}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              <span className="text-2xl xs:text-3xl md:text-4xl font-bold text-foreground text-center break-words whitespace-normal w-full">{statusCounts[status] || 0}</span>
            </CardContent>
          </Card>
        ))}
        <Card
          className={`group flex flex-col justify-between items-stretch shadow border border-border bg-card cursor-pointer min-w-[140px] max-w-[180px] sm:max-w-none min-w-0 ${statusFilter === '' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          style={{ minWidth: 0, minHeight: 0 }}
          onClick={() => setStatusFilter("")}
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setStatusFilter(""); }}
          aria-pressed={statusFilter === ''}
          role="button"
        >
          <CardHeader className="pb-2 flex flex-col items-center justify-center">
            <CardTitle className="text-sm xs:text-base md:text-lg font-semibold text-primary text-center break-words whitespace-normal w-full flex flex-col items-center">
              <span className="break-words whitespace-normal w-full">Total</span>
              <span className={`mt-1 text-xs xs:text-sm md:text-base font-medium flex items-center text-center break-words whitespace-normal ${statusPercentages["Total"]?.percent >= 0 ? 'text-secondary-green' : 'text-destructive'}`}> 
                {statusPercentages["Total"]?.percent >= 0 ? '↑' : '↓'}
                {Math.abs(statusPercentages["Total"]?.percent || 0).toFixed(1)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <span className="text-2xl xs:text-3xl md:text-4xl font-bold text-foreground text-center break-words whitespace-normal w-full">{issues.length}</span>
          </CardContent>
        </Card>
        </div>
      </div>
      {/* Charts Section */}
      {/* Charts are now static, no animation or drop-shadows */}
      {!loading && Array.isArray(chartData) && Array.isArray(issuesByDay) && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 order-2 md:order-none">
          {/* Issues by Status Bar Chart */}
          <div className="bg-card rounded-3xl shadow-md p-6 border border-border relative overflow-hidden">
            <h3 className="text-xl font-extrabold mb-4 text-primary tracking-tight z-10 relative">Issues by Status</h3>
            <ChartContainer config={{}}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis dataKey="status" tick={{ fontSize: 16, fontWeight: 600, fill: '#1b2536' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 14, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 16, boxShadow: '0 4px 24px #3b82f633', fontSize: 16, background: 'rgba(255,255,255,0.97)' }} cursor={{ fill: '#3b82f611' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 15, fontWeight: 600, color: '#3b82f6', marginTop: 8 }} />
                  <Bar
                    dataKey="count"
                    fill="#00B6F0"
                    radius={[12, 12, 0, 0]}
                    isAnimationActive={false}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          {/* Issues by Day Bar Chart */}
          <div className="bg-card rounded-3xl shadow-md p-6 border border-border relative overflow-hidden">
            <h3 className="text-xl font-extrabold mb-4 text-secondary-green tracking-tight z-10 relative">Issues Created (Last 7 Days)</h3>
            <ChartContainer config={{}}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={issuesByDay} barCategoryGap="20%">
                  <XAxis dataKey="date" tick={{ fontSize: 15, fontWeight: 600, fill: '#1b2536' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 14, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 16, boxShadow: '0 4px 24px #10b98133', fontSize: 16, background: 'rgba(255,255,255,0.97)' }} cursor={{ fill: '#10b98111' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 15, fontWeight: 600, color: '#10b981', marginTop: 8 }} />
                  <Bar
                    dataKey="count"
                    fill="#8CD211"
                    radius={[12, 12, 0, 0]}
                    isAnimationActive={false}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      )}
      {/* Filter Bar (removed status dropdown) */}
      <div className="flex flex-wrap gap-4 mb-6 items-center bg-background">
        <EmailDailyReport />
      </div>
      {/* Recent Issues List */}
      <Card className="rounded-2xl border border-border bg-card mt-8">
        <CardHeader className="bg-card text-foreground">
          <CardTitle className="text-primary">Recent Issues</CardTitle>
        </CardHeader>
        <CardContent className="bg-card text-foreground">
          <div className="overflow-x-auto">
            <table className="min-w-full text-foreground text-base md:text-lg">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Issue</th>
                  <th className="px-4 py-2 text-left">Submitted By</th>
                  <th className="px-4 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue, idx) => (
                  <tr
                    key={issue.id || idx}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    onClick={async () => {
                      const latest = await fetchLatestIssue(issue);
                      setSelectedIssue(latest);
                      setDialogOpen(true);
                    }}
                  >
                    <td className="px-4 py-2 text-left">
                      <span className={
                        issue.status === 'Completed' ? 'text-green-600 font-semibold' :
                        issue.status === 'In Progress' ? 'text-yellow-600 font-semibold' :
                        issue.status === 'Open' ? 'text-blue-600 font-semibold' :
                        'text-gray-600 font-semibold'
                      }>
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-left max-w-xs truncate" title={issue.issue}>{issue.issue}</td>
                    <td className="px-4 py-2 text-left max-w-xs truncate" title={userNameMap[issue.submittedBy] || issue.submittedBy}>{userNameMap[issue.submittedBy] || issue.submittedBy}</td>
                    <td className="px-4 py-2 text-left">{issue.reportDate && (issue.reportDate.seconds ? new Date(issue.reportDate.seconds * 1000).toLocaleDateString() : new Date(issue.reportDate).toLocaleDateString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Always render the IssueDetailDialog at the root of the page */}
      <IssueDetailDialog
        issue={mappedSelectedIssue}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onIssueUpdated={async updated => {
          setSelectedIssue(updated);
          await mutate(); // Re-fetch all issues after update
        }}
        userRole={'technician'}
      />
      {/* Bottom navigation bar */}
      <BottomNavigationBar />
    </div>
  );
}
