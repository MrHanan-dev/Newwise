// ===============================
// Issue History Page
// ===============================
// This page displays a searchable, sortable table of all logged issues.
// Users can click on an issue to view or edit it in a popup dialog.
// Data is fetched from Firestore. Authentication is required.

"use client";

// ===== Imports =====
import React, { useState, useEffect } from 'react'; // React core and hooks
import { useRouter } from "next/navigation"; // For navigation
import { useAuth } from "@/context/AuthContext"; // Custom auth context
import NotificationInitializer from '@/components/NotificationInitializer'; // Notification initializer
import { useUserProfileContext } from '@/context/UserProfileContext';

// UI components for table, cards, buttons, etc.
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker'; // (Assume this exists or will be created)

import { format, isValid, parseISO } from 'date-fns'; // For date formatting and validation
import { ExternalLink, Filter, Search, ChevronDown, ChevronUp, Paperclip, Bell, Loader2 } from 'lucide-react'; // Icons
import { NotificationToggle } from '@/components/ui/notification-toggle'; // Notification toggle component
import type { ShiftReportFormValues, StatusOption, DisplayIssue } from '@/lib/types'; // Types
import { STATUS_OPTIONS } from '@/lib/types'; // Status options
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'; // Firestore functions
import { db } from '@/lib/firebaseClient'; // Firestore instance
import { IssueDetailDialog } from '@/components/shiftwise/IssueDetailDialog'; // Popup dialog for issue details
import { BottomNavigationBar } from '@/components/shared/BottomNavigationBar';

// ===== Types for sorting =====
type SortField = 'reportDate' | 'submittedBy' | 'issue' | 'status';
type SortDirection = 'asc' | 'desc';

// ===============================
// Main Component: IssueHistoryPage
// ===============================
export default function IssueHistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { profile: userProfile } = useUserProfileContext();

  // State management for issues, dialog, and filters
  const [allIssues, setAllIssues] = useState<DisplayIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<DisplayIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<DisplayIssue | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('reportDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pmunFilter, setPmunFilter] = useState('all');
  const [submittedByFilter, setSubmittedByFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});

  const FILTERS_KEY = 'historyFilters';

  // Extract unique PMUNs and submitters for dropdowns
  const uniquePMUNs = Array.from(new Set(allIssues.map(i => i.pmun).filter(Boolean)));
  const uniqueSubmitters = Array.from(new Set(allIssues.map(i => i.submittedBy).filter(Boolean)));

  // Enhanced filtered issues logic
  const enhancedFilteredIssues = filteredIssues.filter(issue => {
    // PMUN
    const matchesPMUN = pmunFilter === 'all' || issue.pmun === pmunFilter;
    // Submitted By
    const matchesSubmitter = submittedByFilter === 'all' || issue.submittedBy === submittedByFilter;
    // Date range
    const matchesDate = (!dateRange.start || new Date(issue.reportDate) >= dateRange.start) && (!dateRange.end || new Date(issue.reportDate) <= dateRange.end);
    return matchesPMUN && matchesSubmitter && matchesDate;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPmunFilter('all');
    setSubmittedByFilter('all');
    setDateRange({ start: null, end: null });
  };

  // ========== Auth Redirect ==========
  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // ========== Fetch Issues from Firestore ==========
  // This effect runs when the user is authenticated to fetch all shift reports
  useEffect(() => {
    if (!user) return; // Do not fetch if there is no user

    const fetchReports = async () => {
      const snap = await getDocs(collection(db, "shiftReports")); // Fetch all shiftReports
      const issues: DisplayIssue[] = [];
      const uids = new Set<string>();
      snap.forEach((docSnap) => {
        const data = docSnap.data() as ShiftReportFormValues;
        const repDate = (data.reportDate as any)?.toDate ? (data.reportDate as any).toDate() : new Date(data.reportDate);
        
        // Defensive: Only process if issues is an array
        if (Array.isArray(data.issues)) {
          data.issues.forEach((issue, idx) => {
            // Only include valid, non-null issues
            if (issue && typeof issue === 'object' && issue.issue) {
              issues.push({
                ...issue,
                id: `${docSnap.id}-${idx}`,
                reportId: docSnap.id,
                issueIndex: idx,
                reportDate: repDate,
                submittedBy: data.submittedBy,
              });
              if (data.submittedBy && typeof data.submittedBy === 'string') {
                uids.add(data.submittedBy);
              }
            }
          });
        }
      });
      setAllIssues(issues);
      // Fetch user names for all unique UIDs
      const uidArr = Array.from(uids);
      const nameMap: Record<string, string> = {};
      await Promise.all(uidArr.map(async (uid) => {
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
    fetchReports();
  }, [user]); // Rerun when user changes

  // ========== Search, Filter, Sort Logic ==========
  // This effect runs whenever allIssues, searchTerm, statusFilter, sortField, or sortDirection changes
  useEffect(() => {
    let currentIssues = [...allIssues];

    // Search filter
    if (searchTerm) {
      currentIssues = currentIssues.filter(issue =>
        issue.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (issue.pmun && issue.pmun.toLowerCase().includes(searchTerm.toLowerCase())) ||
        issue.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      currentIssues = currentIssues.filter(issue => issue.status === statusFilter);
    }    // Sort
    currentIssues.sort((a, b) => {
      if (sortField === 'reportDate') {
        // For dates, ensure we're comparing Date objects
        const dateA = a.reportDate instanceof Date ? a.reportDate : new Date(a.reportDate);
        const dateB = b.reportDate instanceof Date ? b.reportDate : new Date(b.reportDate);
        return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      } else {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        return 0;
      }
    });

    setFilteredIssues(currentIssues);
  }, [allIssues, searchTerm, statusFilter, sortField, sortDirection]);

  // ========== Status Badge Variant ==========
  // Returns the variant for the status badge based on the status
  const getStatusBadgeVariant = (status: StatusOption) => {
    switch (status) {
      case 'Open': return 'secondary';
      case 'In Progress': return 'default';
      case 'Completed': return 'outline';
      case 'Escalated': return 'destructive';
      default: return 'default';
    }
  };

  // ========== Sort Handler ==========
  // Handles sorting when a table header is clicked
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ========== Sort Indicator Component ==========
  // Displays an up or down chevron icon based on the sort direction
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  // Helper: Update a single issue in allIssues and filteredIssues
  const updateIssueInState = (updatedIssue: DisplayIssue) => {
    setAllIssues(prev => prev.map(issue =>
      issue.id === updatedIssue.id ? { ...issue, ...updatedIssue } : issue
    ));
    setFilteredIssues(prev => prev.map(issue =>
      issue.id === updatedIssue.id ? { ...issue, ...updatedIssue } : issue
    ));
  };

  // Helper function to safely parse and validate dates
  function getValidDate(date: any): Date | null {
    if (!date) return null;
    if (date instanceof Date && isValid(date)) return date;
    if (typeof date === 'string') {
      const parsed = parseISO(date);
      return isValid(parsed) ? parsed : null;
    }
    if (typeof date === 'object' && typeof date.toDate === 'function') {
      const d = date.toDate();
      return isValid(d) ? d : null;
    }
    return null;
  }

  // ========== Render Loading State ==========
  // Display a loader while authentication is in progress or user is not available
  if (loading || !user) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary" />
      </div>
    );
  }

  // ========== Main Render ==========
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {user && <NotificationInitializer />}
      <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto flex-1 py-4 sm:py-8 px-2 sm:px-4 lg:px-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-primary">
            Issue History
          </h1>
        </header>
        {/* Sticky, beautiful filter bar */}
        <div className="sticky top-0 z-30 w-full bg-background border-b border-border flex flex-wrap gap-2 sm:gap-4 items-center px-2 sm:px-4 py-3 mb-4 rounded-b-2xl">
          <Input
            type="text"
            placeholder="Search issues, PMUN, description, or submitter..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full sm:w-56 md:w-64 lg:w-80 bg-card text-foreground border border-border rounded-xl px-3 py-2"
          />
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as string)}>
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
          <Select value={pmunFilter} onValueChange={v => setPmunFilter(v as string)}>
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
          <Select value={submittedByFilter} onValueChange={v => setSubmittedByFilter(v as string)}>
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
            className="ml-auto px-4 py-2 rounded-xl bg-muted text-foreground border border-border"
          >
            Clear Filters
          </button>
        </div>
        {/* Responsive Issue List: Cards on mobile, table on desktop */}
        <Card className="rounded-2xl">
          <CardHeader className="bg-card text-foreground">
            <CardTitle className="text-primary">Logged Issues ({enhancedFilteredIssues.length})</CardTitle>
          </CardHeader>
          <CardContent className="bg-card text-foreground">
            {enhancedFilteredIssues.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No issues found matching your criteria.
              </p>
            ) : (
              <>
                {/* Card list for mobile */}
                <div className="md:hidden space-y-4">
                  {enhancedFilteredIssues.map((issue) => (
                    <Card 
                      key={issue.id} 
                      className="overflow-hidden"
                      onClick={() => {
                        setSelectedIssue(issue);
                        setDialogOpen(true);
                      }}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-md leading-tight flex-1 break-words pr-2">{issue.issue}</h3>
                          <Badge variant={getStatusBadgeVariant(issue.status)} className="flex-shrink-0 whitespace-nowrap">{issue.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          <span className="font-medium text-foreground">PMUN: {issue.pmun || 'N/A'}</span>
                          <span className="mx-1.5">·</span>
                          <span>By: {userNameMap[issue.submittedBy] || issue.submittedBy}</span>
                        </div>
                      </div>
                      <div className="bg-neutral-verylight px-4 py-2 border-t border-border flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                          {(() => { const d = getValidDate(issue.reportDate); return d ? format(d, 'MMM d, yyyy, h:mm a') : 'Invalid date'; })()}
                        </div>
                        <div className="flex items-center gap-3">
                          {issue.photos && issue.photos.length > 0 && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Paperclip className="h-4 w-4 text-core-bright" />
                              <span className="ml-1 font-medium">{issue.photos.length}</span>
                            </div>
                          )}
                          <NotificationToggle
                            userId={user.uid}
                            issueId={issue.id}
                            reportId={issue.reportId}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {/* Table for desktop */}
                <div className="overflow-x-auto hidden md:block">
                  <div className="rounded-2xl border border-border bg-card overflow-auto w-full">
                    <Table className="min-w-full text-foreground text-base md:text-lg">
                      <TableHeader className="sticky top-0 z-10 bg-card/95">
                        <TableRow>
                          <TableHead onClick={() => handleSort('issue')} className="cursor-pointer font-semibold text-primary text-base md:text-lg px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">Issue Title <SortIndicator field="issue" /></div>
                          </TableHead>
                          <TableHead className="font-semibold text-primary text-base md:text-lg px-6 py-4 whitespace-nowrap">PMUN</TableHead>
                          <TableHead className="font-semibold text-primary text-base md:text-lg px-6 py-4 whitespace-nowrap">Attachments</TableHead>
                          <TableHead onClick={() => handleSort('status')} className="cursor-pointer font-semibold text-primary text-base md:text-lg px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">Status <SortIndicator field="status" /></div>
                          </TableHead>
                          <TableHead onClick={() => handleSort('submittedBy')} className="cursor-pointer font-semibold text-primary text-base md:text-lg px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">Submitted By <SortIndicator field="submittedBy" /></div>
                          </TableHead>
                          <TableHead onClick={() => handleSort('reportDate')} className="cursor-pointer font-semibold text-primary text-base md:text-lg px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">Report Date <SortIndicator field="reportDate" /></div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enhancedFilteredIssues.map((issue, idx) => (
                          <TableRow
                            key={issue.id}
                            className={
                              `cursor-pointer ${idx % 2 === 0 ? 'bg-neutral-verylight' : 'bg-card'}`}
                            style={{ borderBottom: '1px solid var(--border)' }}
                            onClick={() => { setSelectedIssue(issue); setDialogOpen(true); }}
                          >
                            <TableCell className="px-6 py-4 text-base md:text-lg whitespace-nowrap text-foreground">
                              <div className="flex items-center gap-2">
                                <NotificationToggle
                                  userId={user.uid}
                                  issueId={issue.id}
                                  reportId={issue.reportId}
                                  variant="icon"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="font-medium max-w-xs truncate" title={issue.issue}>{issue.issue}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-base md:text-lg whitespace-nowrap text-foreground">{issue.pmun || '-'}</TableCell>
                            <TableCell className="text-center px-6 py-4 text-base md:text-lg whitespace-nowrap">
                              {issue.photos && issue.photos.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-verylight text-core-bright font-semibold text-xs md:text-sm border border-border">
                                  <Paperclip className="h-4 w-4 text-core-bright" />
                                  {issue.photos.length}
                                  <span className="sr-only">attachments</span>
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full bg-neutral-light text-neutral-medium font-medium text-xs md:text-sm border border-border">-</span>
                              )}
                            </TableCell>
                            <TableCell className={
                              `inline-flex items-center justify-center px-4 py-1 rounded-full font-bold text-xs md:text-sm shadow-sm border-0 transition-colors duration-150 ` +
                              (issue.status === 'Open' ? 'bg-green-500 text-white' :
                                issue.status === 'In Progress' ? 'bg-yellow-400 text-black' :
                                issue.status === 'Completed' ? 'bg-blue-500 text-white' :
                                issue.status === 'Escalated' ? 'bg-red-600 text-white' :
                                'bg-gray-200 text-gray-700')
                            } style={{ minWidth: '110px' }}>
                              {issue.status}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-base md:text-lg whitespace-nowrap text-foreground">{userNameMap[issue.submittedBy] || issue.submittedBy}</TableCell>
                            <TableCell className="px-6 py-4 text-base md:text-lg whitespace-nowrap text-foreground">{(() => { const d = getValidDate(issue.reportDate); return d ? format(d, 'PPp') : 'Invalid date'; })()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <IssueDetailDialog
          issue={selectedIssue}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onIssueUpdated={updateIssueInState}
          userRole={userProfile?.role || 'operator'}
        />
      </div>
      {/* Bottom navigation bar */}
      <BottomNavigationBar />
    </div>
  );
}
