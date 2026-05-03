import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Users, AlertTriangle, CheckCircle2, TrendingUp, Loader2, Settings2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { SearchableSelect } from '../ui/searchable-select';
import { toast } from 'sonner';
import LabMemberNameLink from './LabMemberNameLink';
import {
  getWorkloadBalance,
  updateWorkloadLimit,
  type ReviewerWorkload as BackendReviewerWorkload,
} from '../../services/labService';

interface ReviewerWorkload extends BackendReviewerWorkload {
  utilizationRate: number;
  status: 'available' | 'optimal' | 'near-capacity' | 'overloaded';
}

type StatusFilter = 'all' | 'available' | 'optimal' | 'near-capacity' | 'overloaded';

const STATUS_COLORS: Record<ReviewerWorkload['status'], string> = {
  available: '#10b981',
  optimal: '#3b82f6',
  'near-capacity': '#f59e0b',
  overloaded: '#ef4444',
};

const STATUS_LABELS: Record<ReviewerWorkload['status'], string> = {
  available: 'Available',
  optimal: 'Optimal',
  'near-capacity': 'Near Capacity',
  overloaded: 'Overloaded',
};

const STATUS_CLASSES: Record<ReviewerWorkload['status'], string> = {
  available: 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400',
  optimal: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400',
  'near-capacity': 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400',
  overloaded: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400',
};

const PROGRESS_CLASSES: Record<ReviewerWorkload['status'], string> = {
  available: 'bg-green-500',
  optimal: 'bg-blue-500',
  'near-capacity': 'bg-yellow-500',
  overloaded: 'bg-red-500',
};

export default function WorkloadBalance() {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartColors = {
    grid: isDark ? '#374151' : '#e5e7eb',
    axisLine: isDark ? '#4b5563' : '#d1d5db',
    tick: isDark ? '#9ca3af' : '#6b7280',
    capacity: isDark ? '#374151' : '#d1d5db',
    cursor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    tooltipBg: isDark ? '#1f2937' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    tooltipText: isDark ? '#f9fafb' : '#111827',
    tooltipLabel: isDark ? '#d1d5db' : '#374151',
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [chartSort, setChartSort] = useState<'workload-desc' | 'workload-asc' | 'name'>('workload-desc');
  const [tempThreshold, setTempThreshold] = useState(4);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workload-balance'],
    queryFn: getWorkloadBalance,
    staleTime: 1000 * 60 * 2,
  });

  const updateLimitMutation = useMutation({
    mutationFn: (limit: number) => updateWorkloadLimit(limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workload-balance'] });
      toast.success(`Overload threshold updated to ${tempThreshold}.`);
    },
    onError: () => toast.error('Failed to update threshold.'),
  });

  const workloadThreshold = data?.workloadThreshold ?? 4;

  useEffect(() => {
    if (data) setTempThreshold(data.workloadThreshold);
  }, [data]);

  const getStatus = (activeReviews: number): ReviewerWorkload['status'] => {
    if (activeReviews >= workloadThreshold) return 'overloaded';
    if (activeReviews >= Math.ceil(workloadThreshold * 0.75)) return 'near-capacity';
    if (activeReviews > 0) return 'optimal';
    return 'available';
  };

  const processed: ReviewerWorkload[] = useMemo(
    () => (data?.reviewers ?? []).map(r => ({
      ...r,
      utilizationRate: r.capacity > 0 ? Math.round((r.activeReviews / r.capacity) * 100) : 0,
      status: getStatus(r.activeReviews),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, workloadThreshold]
  );

  const avgWorkload = processed.length > 0
    ? Math.round(processed.reduce((s, r) => s + r.utilizationRate, 0) / processed.length)
    : 0;
  const availableCount = processed.filter(r => r.status === 'available').length;
  const overloadedCount = processed.filter(r => r.status === 'overloaded').length;
  const totalCapacity = processed.reduce((s, r) => s + Math.max(0, r.capacity - r.activeReviews), 0);

  const handleSaveThreshold = () => {
    if (tempThreshold < 1 || tempThreshold > 10 || !Number.isInteger(tempThreshold)) {
      toast.error('Threshold must be a whole number between 1 and 10.');
      return;
    }
    updateLimitMutation.mutate(tempThreshold);
  };

  const filteredReviewers = useMemo(
    () => processed.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    [processed, searchTerm, statusFilter]
  );

  const sortedChartData = useMemo(
    () => [...processed].sort((a, b) => {
      if (chartSort === 'workload-desc') return b.activeReviews - a.activeReviews;
      if (chartSort === 'workload-asc') return a.activeReviews - b.activeReviews;
      return a.name.localeCompare(b.name);
    }),
    [processed, chartSort]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading workload data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center gap-3">
        <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
        <p className="font-medium">Failed to load workload data</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['workload-balance'] })}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Workload Balance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor reviewer capacity and distribute assignments evenly.
        </p>
      </div>

      {/* Alert banner */}
      {overloadedCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-300">
            <span className="font-medium">{overloadedCount} reviewer{overloadedCount > 1 ? 's' : ''}</span> {overloadedCount > 1 ? 'are' : 'is'} at or above the overload threshold of {workloadThreshold}.{' '}
            {availableCount > 0 && `${availableCount} reviewer${availableCount > 1 ? 's' : ''} ${availableCount > 1 ? 'are' : 'is'} available for redistribution.`}
          </p>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none">{avgWorkload}%</p>
              <p className="mt-1 text-xs text-muted-foreground">Avg utilization</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none text-green-600 dark:text-green-400">{availableCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none text-red-600 dark:text-red-400">{overloadedCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Overloaded</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none">{totalCapacity}</p>
              <p className="mt-1 text-xs text-muted-foreground">Open slots</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Threshold + Chart side by side on large screens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Threshold config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Overload Threshold
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Max active assignments before a reviewer is flagged as overloaded.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="threshold-input">Max assignments (1–10)</Label>
              <Input
                id="threshold-input"
                type="number"
                min="1"
                max="10"
                step="1"
                value={tempThreshold}
                onChange={(e) => setTempThreshold(parseInt(e.target.value) || 1)}
                className="h-9"
              />
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={handleSaveThreshold}
              disabled={updateLimitMutation.isPending || tempThreshold === workloadThreshold}
            >
              {updateLimitMutation.isPending
                ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                : null
              }
              Save
            </Button>

            {/* Legend */}
            <div className="pt-2 space-y-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">Status legend</p>
              {(Object.entries(STATUS_COLORS) as [ReviewerWorkload['status'], string][]).map(([s, color]) => (
                <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span>{STATUS_LABELS[s]}</span>
                  <span className="ml-auto text-foreground font-medium">
                    {processed.filter(r => r.status === s).length}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Workload Distribution</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active reviews per reviewer (threshold: {workloadThreshold})
                </p>
              </div>
              <SearchableSelect
                value={chartSort}
                onValueChange={(v) => setChartSort(v as typeof chartSort)}
                options={[
                  { value: 'workload-desc', label: 'Highest first' },
                  { value: 'workload-asc', label: 'Lowest first' },
                  { value: 'name', label: 'Name (A–Z)' },
                ]}
                className="h-8 w-44 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {sortedChartData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No reviewer data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sortedChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: chartColors.tick }}
                    axisLine={{ stroke: chartColors.axisLine }}
                    tickLine={{ stroke: chartColors.axisLine }}
                    angle={-35}
                    textAnchor="end"
                    height={64}
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
                  <Bar dataKey="activeReviews" name="Active" radius={[3, 3, 0, 0]}>
                    {sortedChartData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Bar>
                  <Bar dataKey="capacity" name="Capacity" fill={chartColors.capacity} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviewer list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Reviewer Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search + filter tabs */}
          <div className="mb-4 space-y-3">
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex flex-wrap gap-1 border-b border-border pb-0">
              {(['all', 'available', 'optimal', 'near-capacity', 'overloaded'] as StatusFilter[]).map((s) => {
                const count = s === 'all' ? processed.length : processed.filter(r => r.status === s).length;
                const label = s === 'all' ? 'All' : STATUS_LABELS[s as ReviewerWorkload['status']];
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`mr-3 pb-2.5 px-0 text-sm font-medium border-b-2 transition-colors ${
                      statusFilter === s
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {filteredReviewers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No reviewers match the selected filters.</p>
            ) : (
              filteredReviewers.map((reviewer, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Avatar */}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white uppercase">
                    {reviewer.name.trim().split(' ').filter(Boolean).pop()?.charAt(0) ?? '?'}
                  </span>

                  {/* Name + progress */}
                  <div className="flex-1 min-w-0">
                    <LabMemberNameLink
                      name={reviewer.name}
                      className="text-sm font-medium hover:underline text-blue-600 dark:text-blue-400"
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${PROGRESS_CLASSES[reviewer.status]}`}
                          style={{ width: `${Math.min(reviewer.utilizationRate, 100)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {reviewer.activeReviews}/{reviewer.capacity}
                      </span>
                    </div>
                  </div>

                  {/* Badge */}
                  <Badge variant="outline" className={`shrink-0 text-xs ${STATUS_CLASSES[reviewer.status]}`}>
                    {STATUS_LABELS[reviewer.status]}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}