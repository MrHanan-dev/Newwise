"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserProfileContext } from '@/context/UserProfileContext';
import { useDarkMode } from '@/components/shared/DarkModeProvider';
import { Moon, Sun } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Paperclip, Loader2, CheckCircle } from 'lucide-react';
import type { ShiftReportFormValues, StatusOption, DisplayIssue } from '@/lib/types';
import { STATUS_OPTIONS } from '@/lib/types';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';

export default function ViewIssuesPage() {
  const { user, loading, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const router = useRouter();
  const { profile: userProfile } = useUserProfileContext();
  const [allIssues, setAllIssues] = useState<DisplayIssue[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ [id: string]: StatusOption }>({});
  const [savedStatus, setSavedStatus] = useState<{ [id: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusOption | 'all'>('all');
  const [pmunFilter, setPmunFilter] = useState('all');
  const [submittedByFilter, setSubmittedByFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const FILTERS_KEY = 'viewIssuesFilters';

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, userProfile, router]);

  useEffect(() => {
    if (!user) return;
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
    };
    fetchReports();
  }, [user]);

  const handleStatusChange = (issue: DisplayIssue, newStatus: StatusOption) => {
    setPendingStatus(prev => ({ ...prev, [issue.id]: newStatus }));
    setSavedStatus(prev => ({ ...prev, [issue.id]: false }));
  };

  const handleSaveStatus = async (issue: DisplayIssue) => {
    setUpdating(issue.id);
    const newStatus = pendingStatus[issue.id];
    // Fetch the parent shift report document
    const reportRef = doc(db, "shiftReports", issue.reportId);
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) return setUpdating(null);
    const reportData = reportSnap.data();
    if (!Array.isArray(reportData.issues)) return setUpdating(null);
    // Update the relevant issue in the array
    const updatedIssues = [...reportData.issues];
    updatedIssues[issue.issueIndex] = {
      ...updatedIssues[issue.issueIndex],
      status: newStatus,
    };
    await updateDoc(reportRef, { issues: updatedIssues });
    setAllIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: newStatus } : i));
    setUpdating(null);
    setSavedStatus(prev => ({ ...prev, [issue.id]: true }));
  };

  // Extract unique PMUNs and submitters for dropdowns
  const uniquePMUNs = Array.from(new Set(allIssues.map(i => i.pmun).filter(Boolean)));
  const uniqueSubmitters = Array.from(new Set(allIssues.map(i => i.submittedBy).filter(Boolean)));

  // Filtered issues logic
  const filteredIssues = allIssues.filter(issue => {
    // Search
    const matchesSearch =
      !searchTerm ||
      issue.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.description && issue.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (issue.pmun && issue.pmun.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (issue.submittedBy && issue.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()));
    // Status
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    // PMUN
    const matchesPMUN = pmunFilter === 'all' || issue.pmun === pmunFilter;
    // Submitted By
    const matchesSubmitter = submittedByFilter === 'all' || issue.submittedBy === submittedByFilter;
    // Date range
    const matchesDate = (!dateRange.start || new Date(issue.reportDate) >= dateRange.start) && (!dateRange.end || new Date(issue.reportDate) <= dateRange.end);
    return matchesSearch && matchesStatus && matchesPMUN && matchesSubmitter && matchesDate;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPmunFilter('all');
    setSubmittedByFilter('all');
    setDateRange({ start: null, end: null });
  };

  if (loading || !user || !userProfile) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Sticky header bar for email, logout, and dark mode toggle */}
      <div className="sticky top-0 z-40 w-full bg-card border-b border-border shadow-md flex items-center justify-between px-4 py-3 mb-6 rounded-b-2xl">
        <span className="text-primary font-semibold text-base sm:text-lg md:text-xl truncate">{user?.email}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-accent transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Toggle dark mode"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Moon className="h-6 w-6 text-primary" /> : <Sun className="h-6 w-6 text-yellow-400" />}
          </button>
          <button
            onClick={logout}
            className="text-red-500 font-semibold px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm sm:text-base md:text-lg"
          >
            Log Out
          </button>
        </div>
      </div>
      {/* Sticky, beautiful filter bar */}
      <div className="sticky top-0 z-30 w-full bg-background/80 dark:bg-background/80 backdrop-blur-md border-b border-border shadow-md flex flex-wrap gap-2 sm:gap-4 items-center px-2 sm:px-4 py-3 mb-4 rounded-b-2xl">
        <Input
          type="text"
          placeholder="Search issues, PMUN, description, or submitter..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full sm:w-56 md:w-64 lg:w-80 bg-card text-foreground border border-border rounded-xl px-3 py-2 shadow-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card text-foreground border border-border rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pmunFilter} onValueChange={setPmunFilter}>
          <SelectTrigger className="w-32 bg-card text-foreground border border-border rounded-xl">
            <SelectValue placeholder="PMUN" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PMUNs</SelectItem>
            {uniquePMUNs.map(pmun => (
              <SelectItem key={pmun} value={pmun}>{pmun}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={submittedByFilter} onValueChange={setSubmittedByFilter}>
          <SelectTrigger className="w-32 bg-card text-foreground border border-border rounded-xl">
            <SelectValue placeholder="Submitted By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {uniqueSubmitters.map(sub => (
              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Date range picker (assume you have a DateRangePicker component) */}
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <button
          onClick={resetFilters}
          className="ml-auto px-4 py-2 rounded-xl bg-muted text-foreground border border-border shadow hover:bg-primary/10 transition"
        >
          Clear Filters
        </button>
      </div>
      {/* Centered main heading */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-primary drop-shadow-md text-center mb-8">
        View & Update Issues
      </h1>
      <Card className="shadow-2xl rounded-2xl border border-border bg-card dark:bg-card">
        <CardHeader className="bg-card dark:bg-card text-foreground dark:text-foreground">
          <CardTitle className="text-xl sm:text-2xl font-bold text-primary dark:text-blue-300">All Issues ({allIssues.length})</CardTitle>
        </CardHeader>
        <CardContent className="bg-card dark:bg-card text-foreground dark:text-foreground">
          {allIssues.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No issues found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="rounded-2xl shadow-xl border border-border bg-card dark:bg-card overflow-auto w-full">
                <Table className="min-w-full text-foreground dark:text-foreground">
                  <TableHeader className="sticky top-0 z-10 bg-card/95 dark:bg-card/95 backdrop-blur-md">
                    <TableRow>
                      <TableHead className="font-semibold text-primary dark:text-blue-300 text-base px-6 py-4 whitespace-nowrap">Issue Title</TableHead>
                      <TableHead className="font-semibold text-primary dark:text-blue-300 text-base px-6 py-4 whitespace-nowrap">PMUN</TableHead>
                      <TableHead className="font-semibold text-primary dark:text-blue-300 text-base px-6 py-4 whitespace-nowrap">Attachments</TableHead>
                      <TableHead className="font-semibold text-primary dark:text-blue-300 text-base px-6 py-4 whitespace-nowrap">Status</TableHead>
                      <TableHead className="font-semibold text-primary dark:text-blue-300 text-base px-6 py-4 whitespace-nowrap">Submitted By</TableHead>
                      <TableHead className="font-semibold text-primary dark:text-blue-300 text-base px-6 py-4 whitespace-nowrap">Report Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map((issue, idx) => {
                      const currentStatus = pendingStatus[issue.id] ?? issue.status;
                      return (
                        <TableRow
                          key={issue.id}
                          className={`transition-colors ${idx % 2 === 0 ? 'bg-muted/60 dark:bg-blue-900/30' : 'bg-card dark:bg-card'}`}
                        >
                          <TableCell className="px-6 py-4 text-base whitespace-nowrap text-foreground dark:text-foreground">
                            <span className="font-medium max-w-xs truncate" title={issue.issue}>{issue.issue}</span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-base whitespace-nowrap text-foreground dark:text-foreground">{issue.pmun || '-'}</TableCell>
                          <TableCell className="text-center px-6 py-4 text-base whitespace-nowrap">
                            {issue.photos && issue.photos.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-xs shadow-sm border border-blue-200 dark:border-blue-700">
                                <Paperclip className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                                {issue.photos.length}
                                <span className="sr-only">attachments</span>
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-medium text-xs border border-gray-200 dark:border-gray-700">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-base whitespace-nowrap flex items-center gap-2">
                            <Select
                              value={currentStatus}
                              onValueChange={(val) => handleStatusChange(issue, val as StatusOption)}
                              disabled={updating === issue.id}
                            >
                              <SelectTrigger className="w-[140px] rounded-lg border-blue-300 focus:ring-2 focus:ring-blue-400">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize">
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {pendingStatus[issue.id] && pendingStatus[issue.id] !== issue.status && (
                              <button
                                className="ml-2 px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={() => handleSaveStatus(issue)}
                                disabled={updating === issue.id}
                              >
                                {updating === issue.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </button>
                            )}
                            {savedStatus[issue.id] && (
                              <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-base whitespace-nowrap text-foreground dark:text-foreground">{issue.submittedBy}</TableCell>
                          <TableCell className="px-6 py-4 text-base whitespace-nowrap text-foreground dark:text-foreground">{format(new Date(issue.reportDate), 'PPp')}</TableCell>
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
      <BottomNavigationBar />
    </div>
  );
} 