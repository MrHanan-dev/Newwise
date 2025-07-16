"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { profile: userProfile } = useUserProfileContext();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState("day");
  const [showTour, setShowTour] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return; // Guard against running fetch without a user

    async function fetchIssues() {
      setLoading(true);
      const q = collection(db, "shiftReports");
      const snapshot = await getDocs(q);
      const allIssues: Issue[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const issuesArray = Array.isArray(data.issues) ? data.issues : [];
        issuesArray.forEach((issue: any) => {
          allIssues.push({ ...issue, reportId: doc.id, reportDate: data.reportDate, submittedBy: data.submittedBy });
        });
      });
      setIssues(allIssues);
      setLoading(false);
    }
    fetchIssues();
  }, [user]); // Depend on user to re-fetch if the user changes

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
  const myIssues = user ? issues.filter(i => i.submittedBy === user.email) : [];
  const assignedIssues = user ? issues.filter(i => i.assignedTo === user.email) : [];
  const inProgressIssues = user ? issues.filter(i => i.status === 'In Progress' && i.assignedTo === user.email) : [];

  // Return a loading indicator while auth state is being determined or if there is no user.
  // This is done after all hooks are called to comply with the Rules of Hooks.
  if (authLoading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  return (    <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-7xl mx-auto py-4 sm:py-8 px-2 sm:px-4 md:px-0">
      {user && <NotificationInitializer />}
      {/* Onboarding Tour Modal (UI only for now) */}
      {showTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-8 max-w-md w-full flex flex-col items-center">
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
              className="mt-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90"
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
          className="px-4 py-2 rounded-lg bg-muted text-foreground border border-border shadow hover:bg-primary/10 transition text-sm font-semibold"
          onClick={() => setShowTour(true)}
        >
          🎉 Take a Tour
        </button>
      </div>
      {/* Role badge */}
      {userProfile && (
        <div className="mb-4 flex items-center gap-3">
          <span className={`inline-block px-4 py-1 rounded-full font-semibold text-sm shadow bg-card border border-border ${userProfile.role === 'operator' ? 'text-blue-700 bg-blue-50' : 'text-green-700 bg-green-50'}`}>
            {userProfile.role === 'operator' ? 'Operator' : 'Technician'}
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
            <div className="text-4xl font-bold text-blue-600">{myIssues?.length ?? 0}</div>
          </div>
          {/* All open issues */}
          <div className="bg-card rounded-xl shadow-md p-4 border border-border">
            <h3 className="text-lg font-semibold mb-2">All Open Issues</h3>
            <div className="text-4xl font-bold text-orange-500">{issues.filter(i => i.status === 'Open').length}</div>
          </div>
          {/* Quick log new issue with tooltip */}
          <div className="col-span-1 md:col-span-2 flex justify-center mt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-green-400 text-white font-bold shadow-lg hover:from-blue-600 hover:to-green-500 transition text-lg"
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
            <div className="text-4xl font-bold text-green-600">{assignedIssues?.length ?? 0}</div>
          </div>
          {/* Issues in progress */}
          <div className="bg-card rounded-xl shadow-md p-4 border border-border">
            <h3 className="text-lg font-semibold mb-2">Issues In Progress</h3>
            <div className="text-4xl font-bold text-yellow-500">{inProgressIssues?.length ?? 0}</div>
          </div>
          {/* Quick update status with tooltip */}
          <div className="col-span-1 md:col-span-2 flex justify-center mt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-400 text-white font-bold shadow-lg hover:from-green-600 hover:to-blue-500 transition text-lg"
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
        {/* Horizontal scroll indicator for mobile */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background via-background/80 to-transparent z-10 hidden sm:block" />
        <div className="grid grid-flow-col auto-cols-[minmax(140px,1fr)] sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-8 min-w-0">
        {STATUS_OPTIONS.map(status => (
          <Card
            key={status}
            className={`group flex flex-col justify-between items-stretch shadow border border-border bg-card transition-all duration-150 cursor-pointer hover:shadow-lg active:scale-95 min-w-[140px] max-w-[180px] sm:max-w-none min-w-0 ${statusFilter === status ? 'ring-2 ring-primary ring-offset-2' : ''}`}
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
                <span className={`mt-1 text-xs xs:text-sm md:text-base font-medium flex items-center text-center break-words whitespace-normal ${statusPercentages[status]?.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}> 
                  {statusPercentages[status]?.percent >= 0 ? '↑' : '↓'}
                  {Math.abs(statusPercentages[status]?.percent || 0).toFixed(1)}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              <span className="text-2xl xs:text-3xl md:text-4xl font-bold text-foreground group-hover:scale-110 transition-transform duration-150 text-center break-words whitespace-normal w-full">{statusCounts[status] || 0}</span>
            </CardContent>
          </Card>
        ))}
        <Card
          className={`group flex flex-col justify-between items-stretch shadow border border-border bg-card transition-all duration-150 cursor-pointer hover:shadow-lg active:scale-95 min-w-[140px] max-w-[180px] sm:max-w-none min-w-0 ${statusFilter === '' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
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
              <span className={`mt-1 text-xs xs:text-sm md:text-base font-medium flex items-center text-center break-words whitespace-normal ${statusPercentages["Total"]?.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}> 
                {statusPercentages["Total"]?.percent >= 0 ? '↑' : '↓'}
                {Math.abs(statusPercentages["Total"]?.percent || 0).toFixed(1)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <span className="text-2xl xs:text-3xl md:text-4xl font-bold text-foreground group-hover:scale-110 transition-transform duration-150 text-center break-words whitespace-normal w-full">{issues.length}</span>
          </CardContent>
        </Card>
        </div>
      </div>
      {/* Charts Section */}
      {!loading && Array.isArray(chartData) && Array.isArray(issuesByDay) && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 order-2 md:order-none">
          {/* Issues by Status Bar Chart */}
          <div className="bg-card dark:bg-card rounded-3xl shadow-2xl p-6 border border-border relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-400/20 via-indigo-300/10 to-transparent rounded-full blur-3xl animate-pulse-slow z-0" />
            <h3 className="text-xl font-extrabold mb-4 text-blue-600 dark:text-blue-300 drop-shadow-lg animate-fadein-down tracking-tight z-10 relative">Issues by Status</h3>
            <ChartContainer config={{}}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis dataKey="status" tick={{ fontSize: 16, fontWeight: 600, fill: '#1b2536' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 14, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 16, boxShadow: '0 4px 24px #3b82f633', fontSize: 16, background: 'rgba(255,255,255,0.97)' }} cursor={{ fill: '#3b82f611' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 15, fontWeight: 600, color: '#3b82f6', marginTop: 8 }} />
                  <Bar
                    dataKey="count"
                    fill="url(#statusGradient)"
                    radius={[12, 12, 0, 0]}
                    animationDuration={1200}
                    animationEasing="ease"
                    isAnimationActive={true}
                    animationBegin={200}
                    activeBar={<BounceActiveBar fill="#3b82f6" dataKey="count" />}
                    style={{ filter: 'drop-shadow(0 6px 18px #3b82f633)' }}
                    barSize={32}
                  />
                  <defs>
                    <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          {/* Issues by Day Bar Chart */}
          <div className="bg-card dark:bg-card rounded-3xl shadow-2xl p-6 border border-border relative overflow-hidden">
            <div className="absolute -bottom-10 right-0 w-32 h-32 bg-gradient-to-tr from-green-300/20 via-emerald-200/10 to-transparent rounded-full blur-2xl animate-pulse-slower z-0" />
            <h3 className="text-xl font-extrabold mb-4 text-emerald-600 dark:text-emerald-300 drop-shadow-lg animate-fadein-down tracking-tight z-10 relative">Issues Created (Last 7 Days)</h3>
            <ChartContainer config={{}}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={issuesByDay} barCategoryGap="20%">
                  <XAxis dataKey="date" tick={{ fontSize: 15, fontWeight: 600, fill: '#1b2536' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 14, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 16, boxShadow: '0 4px 24px #10b98133', fontSize: 16, background: 'rgba(255,255,255,0.97)' }} cursor={{ fill: '#10b98111' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 15, fontWeight: 600, color: '#10b981', marginTop: 8 }} />
                  <Bar
                    dataKey="count"
                    fill="url(#dayGradient)"
                    radius={[12, 12, 0, 0]}
                    animationDuration={1200}
                    animationEasing="ease"
                    isAnimationActive={true}
                    animationBegin={400}
                    activeBar={<BounceActiveBar fill="#10b981" dataKey="count" />}
                    style={{ filter: 'drop-shadow(0 6px 18px #10b98133)' }}
                    barSize={32}
                  />
                  <defs>
                    <linearGradient id="dayGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      )}
      {/* Filter Bar (removed status dropdown) */}
      <div className="flex flex-wrap gap-4 mb-6 items-center bg-background dark:bg-background">
        {/* Add more filters here (date, user, etc.) */}
        <div className="flex-1 transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-xl focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2">
          <EmailDailyReport />
        </div>
        <Button
          onClick={() => router.push("/")}
          className="transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-xl focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 bg-blue-500 text-white font-bold px-6 py-3 rounded-2xl shadow-md hover:bg-blue-600 focus:outline-none"
        >
          Log New Issue
        </Button>
      </div>
      {/* Recent Issues List */}
      <div className="bg-card dark:bg-card rounded-xl shadow-md p-4">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Recent Issues</h2>
        {loading ? (
          <div className="text-foreground">Loading...</div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-muted-foreground">No issues found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-foreground">
              <thead>
                <tr className="bg-muted dark:bg-muted text-foreground">
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Issue</th>
                  <th className="px-3 py-2 text-left">Submitted By</th>
                  <th className="px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.slice(0, 10).map((issue, idx) => (
                  <tr key={idx} className="border-b dark:border-border last:border-0">
                    <td className="px-3 py-2 font-semibold text-blue-700 dark:text-blue-400">{issue.status}</td>
                    <td className="px-3 py-2">{issue.issue}</td>
                    <td className="px-3 py-2">{issue.submittedBy}</td>
                    <td className="px-3 py-2">{issue.reportDate ? new Date(issue.reportDate.seconds ? issue.reportDate.seconds * 1000 : issue.reportDate).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Bottom navigation bar */}
      <BottomNavigationBar />
    </div>
  );
}
