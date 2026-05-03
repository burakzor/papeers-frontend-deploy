import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { SearchableSelect } from '../ui/searchable-select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, FileCheck, Clock, TrendingUp, Loader2, Bell, X, Trash2 } from 'lucide-react';
import LabMemberNameLink from './LabMemberNameLink';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getPapersByLab } from '../../services/paperService';
import { getLabAssignments } from '../../services/assignmentService';
import { 
  getNotificationsByLabId,
  deleteNotification,
  deleteAllNotifications,
} from '../../services/notificationService';
import { 
  getCoordinatorDashboardStats,
  getDashboardChartData,
} from '../../services/labService';
import { Button } from '../ui/button';
import DeadlineCalendar from '../shared/DeadlineCalendar';

import { motion, AnimatePresence } from 'framer-motion';
import FeatherLoader from '../shared/FeatherLoader'; // Yolu projene göre teyit et

type FeedItem =
  | {
      kind: 'notification';
      id: string;
      title: string;
      message: string;
      isRead: boolean;
      dateMs: number;
      timeStr: string;
    }
  | {
      kind: 'activity';
      action: string;
      actor: string;
      paper: string;
      type: 'submission' | 'review';
      dateMs: number;
      timeStr: string;
    };

function formatMs(ms: number): string {
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CoordinatorDashboard() {
  const { user, selectedLab } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const isDark = theme === 'dark';

  const [typeFilter, setTypeFilter] = useState<'all' | 'submission' | 'review' | 'notification'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = window.localStorage.getItem('prs.dismissed.ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    window.localStorage.setItem('prs.dismissed.ids', JSON.stringify(Array.from(dismissedIds)));
  }, [dismissedIds]);

  const chartColors = {
    grid: isDark ? '#374151' : '#e5e7eb',
    axisLine: isDark ? '#4b5563' : '#d1d5db',
    tick: isDark ? '#9ca3af' : '#6b7280',
    cursor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    tooltipBg: isDark ? '#1f2937' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    tooltipText: isDark ? '#f9fafb' : '#111827',
    tooltipLabel: isDark ? '#d1d5db' : '#374151',
    legendText: isDark ? '#9ca3af' : '#6b7280',
  };

  const labId = selectedLab?.id;

  const { data: papers = [], isLoading: isLoadingPapers } = useQuery({
    queryKey: ['coordinator-papers', labId],
    queryFn: () => getPapersByLab(labId!),
    enabled: !!labId,
    staleTime: 1000 * 30, // 30 seconds
  });

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['coordinator-assignments', labId],
    queryFn: () => getLabAssignments(labId!),
    enabled: !!labId,
    staleTime: 1000 * 30, // 30 seconds
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['coordinator-stats', labId],
    queryFn: () => getCoordinatorDashboardStats(),
    enabled: !!labId,
    staleTime: 1000 * 30,
  });

  const { data: trendData = [] } = useQuery({
    queryKey: ['coordinator-trends', labId],
    queryFn: () => getDashboardChartData(),
    enabled: !!labId,
    staleTime: 1000 * 60 * 5,
  });

  // Shared cache key with CoordinatorLayout — no extra network request
  const { data: notifications = [], isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['notifications', user?.id, labId],
    queryFn: () => getNotificationsByLabId(labId!),
    enabled: !!user?.id && !!labId,
    staleTime: 1000 * 15, // 15 seconds for notifications
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id, labId] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllNotifications(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id, labId] });
    },
  });

  const handleClearAll = () => {
    if (combinedFeed.length === 0) return;
    
    const newDismissed = new Set(dismissedIds);
    combinedFeed.forEach(item => {
      if (item.kind === 'notification') {
        newDismissed.add(item.id);
      } else {
        const pseudoId = `act-${item.type}-${item.dateMs}`;
        newDismissed.add(pseudoId);
      }
    });
    setDismissedIds(newDismissed);
    deleteAllMutation.mutate();
  };

  const stats = useMemo(() => {
    if (!dashboardStats) {
      return { 
        activeReviewersCount: 0, 
        pendingReviewsCount: 0, 
        completedReviewsCount: 0, 
        avgTurnaround: 0 
      };
    }
    return {
      activeReviewersCount: dashboardStats.activeReviewers,
      pendingReviewsCount: dashboardStats.pendingReviews,
      completedReviewsCount: dashboardStats.completedReviews,
      avgTurnaround: dashboardStats.avgTurnaround
    };
  }, [dashboardStats]);

  const chartData = trendData;

  const topReviewers = useMemo(() => {
    const nameMap = new Map<string, string>();
    papers.forEach(p => p.assignedReviewers?.forEach((ar: { reviewerId: string; reviewerName: string }) =>
      nameMap.set(ar.reviewerId, ar.reviewerName),
    ));
    const totalByReviewer = new Map<string, number>();
    const completedByReviewer = new Map<string, number>();
    assignments.forEach(a => {
      totalByReviewer.set(a.reviewerId, (totalByReviewer.get(a.reviewerId) ?? 0) + 1);
      if (['DONE', 'COMPLETED'].includes(a.status))
        completedByReviewer.set(a.reviewerId, (completedByReviewer.get(a.reviewerId) ?? 0) + 1);
    });
    const rows = Array.from(totalByReviewer.entries())
      .map(([id, total]) => {
        const completed = completedByReviewer.get(id) ?? 0;
        const rate = Math.round((completed / total) * 100);
        const rating = Number(((completed / total) * 10).toFixed(1));
        return { id, name: nameMap.get(id) || 'Unknown', rate, rating };
      })
      .filter(r => (totalByReviewer.get(r.id) ?? 0) >= 1)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
    return { rows };
  }, [assignments, papers]);

  const reviewerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    papers.forEach(p => p.assignedReviewers?.forEach((ar: any) => map.set(ar.reviewerId, ar.reviewerName)));
    return map;
  }, [papers]);

  const getReviewerName = (reviewerId: string) => reviewerNameMap.get(reviewerId) || 'Reviewer';

  // Combined feed: notifications + lab activity, sorted newest first
  const combinedFeed = useMemo((): FeedItem[] => {
    const timeFilterMs: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 };
    const maxHours = timeFilter !== 'all' ? timeFilterMs[timeFilter] : Infinity;
    const now = Date.now();

    const items: FeedItem[] = [];

    // Notifications (excluding locally dismissed)
    if (typeFilter === 'all' || typeFilter === 'notification') {
      notifications
        .filter(n => !dismissedIds.has(n.id))
        .forEach(n => {
          const dateMs = new Date(n.date).getTime();
          const hoursAgo = (now - dateMs) / (1000 * 60 * 60);
          if (hoursAgo <= maxHours) {
            items.push({
              kind: 'notification',
              id: n.id,
              title: n.title,
              message: n.message,
              isRead: n.isRead,
              dateMs,
              timeStr: formatMs(dateMs),
            });
          }
        });
    }

    // Lab activity (papers + assignments)
    if (typeFilter === 'all' || typeFilter === 'submission' || typeFilter === 'review') {
      const reviewerLookup = new Map<string, string>();
      papers.forEach(p => p.assignedReviewers?.forEach(ar =>
        reviewerLookup.set(ar.reviewerId, ar.reviewerName)
      ));

      if (typeFilter === 'all' || typeFilter === 'submission') {
        papers.forEach(paper => {
          const dateMs = new Date(paper.submissionDate).getTime();
          const pseudoId = `act-submission-${dateMs}`;
          if (dismissedIds.has(pseudoId)) return;

          const hoursAgo = (now - dateMs) / (1000 * 60 * 60);
          if (hoursAgo <= maxHours) {
            items.push({
              kind: 'activity',
              action: 'New submission',
              actor: paper.mainAuthorName || 'Unknown Author',
              paper: paper.title || 'Untitled Paper',
              type: 'submission',
              dateMs,
              timeStr: formatMs(dateMs),
            });
          }
        });
      }

      if (typeFilter === 'all' || typeFilter === 'review') {
        assignments.forEach(a => {
          const dateMs = new Date(a.assignedDate).getTime();
          const pseudoId = `act-review-${dateMs}`;
          if (dismissedIds.has(pseudoId)) return;

          const hoursAgo = (now - dateMs) / (1000 * 60 * 60);
          if (hoursAgo <= maxHours) {
            const isCompleted = a.status === 'DONE' || a.status === 'COMPLETED';
            items.push({
              kind: 'activity',
              action: isCompleted ? 'Review completed' : 'Review assigned',
              actor: reviewerLookup.get(a.reviewerId) || 'Reviewer',
              paper: a.paperTitle || 'Untitled Paper',
              type: 'review',
              dateMs,
              timeStr: formatMs(dateMs),
            });
          }
        });
      }
    }

    return items.sort((a, b) => b.dateMs - a.dateMs);
  }, [notifications, papers, assignments, dismissedIds, typeFilter, timeFilter]);

  const isLoading = isLoadingPapers || isLoadingAssignments || isLoadingNotifications;


  if (!labId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-destructive">Lab information not found. Please select a lab.</p>
      </div>
    );
  }

return (
  <div className="space-y-6">
    {/* BAŞLIK SABİT KALIR */}
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Coordinator Dashboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of the review process and lab activity.
      </p>
    </div>

    <AnimatePresence mode="wait">
      {isLoading ? (
        // YÜKLENİYOR EKRANI (FeatherLoader)
        <motion.div
          key="loader"
          className="py-24 flex flex-col items-center justify-center"
        >
          <FeatherLoader size={100} />
          <motion.p
            exit={{ opacity: 0, filter: "blur(5px)" }}
            className="mt-8 text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400 animate-pulse"
          >
            Loading dashboard data...
          </motion.p>
        </motion.div>
      ) : (
        // İÇERİK EKRANI (Kartlar, Grafikler ve Activity Feed)
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-6"
        >

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none">{stats.activeReviewersCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Active reviewers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-500/15">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none">{stats.pendingReviewsCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Pending reviews</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
              <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none">{stats.completedReviewsCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Completed reviews</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-500/15">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none">
                {stats.avgTurnaround > 0 ? `${stats.avgTurnaround}d` : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Avg. turnaround</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trends chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Submission & Review Trends</CardTitle>
            <p className="text-sm text-muted-foreground">Last 6 months overview</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: chartColors.tick }}
                  axisLine={{ stroke: chartColors.axisLine }}
                  tickLine={{ stroke: chartColors.axisLine }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.tick }}
                  axisLine={{ stroke: chartColors.axisLine }}
                  tickLine={{ stroke: chartColors.axisLine }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    backgroundColor: chartColors.tooltipBg,
                    borderColor: chartColors.tooltipBorder,
                  }}
                  labelStyle={{ color: chartColors.tooltipLabel, fontWeight: 700 }}
                  itemStyle={{ color: chartColors.tooltipText }}
                  cursor={{ fill: chartColors.cursor }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: chartColors.legendText }} />
                <Bar dataKey="submissions" fill="#3b82f6" name="Submissions" radius={[3, 3, 0, 0]} />
                <Bar dataKey="reviews" fill="#10b981" name="Assignments" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {topReviewers.rows.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Top Reviewers by Completion Rate
                </p>
                <div className="space-y-2">
                  {topReviewers.rows.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <span className="w-32 shrink-0 truncate text-xs">{r.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${r.rate}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs font-medium text-foreground">
                        {r.rating}/10
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deadline Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Deadline Calendar</CardTitle>
            <p className="text-sm text-muted-foreground">Click a marked day to see details</p>
          </CardHeader>
          <CardContent>
            <DeadlineCalendar 
              assignments={assignments} 
              mode="coordinator" 
              getReviewerName={getReviewerName}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            </div>
            {combinedFeed.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                {combinedFeed.length}
              </span>
            )}
          </div>
          {/* Filters and Clear All */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <SearchableSelect
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
                options={[
                  { value: 'all', label: 'All types' },
                  { value: 'notification', label: 'Notifications' },
                  { value: 'submission', label: 'Submissions' },
                  { value: 'review', label: 'Reviews' },
                ]}
                className="h-7 w-40 text-xs"
              />
              <SearchableSelect
                value={timeFilter}
                onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}
                options={[
                  { value: 'all', label: 'All time' },
                  { value: '24h', label: 'Last 24h' },
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                ]}
                className="h-7 w-36 text-xs"
              />
            </div>
            {combinedFeed.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="h-7 px-2 text-[10px] text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {combinedFeed.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No recent activity.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto px-4 pb-4">
              <div className="space-y-2">
                {combinedFeed.map((item, i) => {
                  if (item.kind === 'notification') {
                    return (
                      <div
                        key={`n-${item.id}`}
                        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors"
                      >
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.isRead ? 'bg-muted' : 'bg-blue-100 dark:bg-blue-500/20'}`}>
                          <Bell className={`h-3.5 w-3.5 ${item.isRead ? 'text-muted-foreground' : 'text-blue-600 dark:text-blue-400'}`} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-snug truncate ${item.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.message}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">{item.timeStr}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDismissedIds(prev => new Set(prev).add(item.id));
                            deleteNotificationMutation.mutate(item.id);
                          }}
                          className="shrink-0 rounded-full p-1 text-muted-foreground/40 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all"
                          aria-label="Dismiss"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`a-${i}`}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors opacity-80"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">{item.action}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground/80 truncate">
                          <LabMemberNameLink
                            name={item.actor}
                            className="text-blue-600/70 hover:underline dark:text-blue-400/70"
                          />
                          {' · '}
                          {item.paper}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/60">{item.timeStr}</p>
                      </div>
                        <button
                          type="button"
                          onClick={() => {
                            const pseudoId = `act-${item.type}-${item.dateMs}`;
                            setDismissedIds(prev => new Set(prev).add(pseudoId));
                          }}
                          className="shrink-0 rounded-full p-1 text-muted-foreground/40 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all"
                          aria-label="Dismiss"
                        >
                          <X className="h-4 w-4" />
                        </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
    )}
      </AnimatePresence>
    </div>
  );
}