import { useState, useMemo, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, RotateCcw, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { buttonVariants } from '../ui/button';
import { AssignmentResponseDTO } from '../../services/assignmentService';
import { exportToICS, openInGoogleCalendar } from '../../lib/calendarExport';
import { useAuth } from '../../context/AuthContext';

interface DeadlineCalendarProps {
  assignments: AssignmentResponseDTO[];
  mode?: 'reviewer' | 'coordinator' | 'member';
  getReviewerName?: (reviewerId: string) => string;
}

// One entry per (paper × deadline date) — same paper can appear on multiple days
// if its reviewers have different deadlines.
interface PaperGroup {
  paperId: string;
  paperTitle: string;
  overleafLink: string;
  deadlineDate: string;
  assignments: AssignmentResponseDTO[];
  urgencyDays: number; // drives card border color
}

// ── Export dropdown ───────────────────────────────────────────────────────────
function ExportDropdown({
  assignments,
  label = 'Export',
  getReviewerName,
}: {
  assignments: AssignmentResponseDTO[];
  label?: string;
  getReviewerName?: (reviewerId: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (assignments.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
      >
        <Download className="h-3 w-3" />
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-popover shadow-md">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] hover:bg-muted transition-colors"
            onClick={() => {
              assignments.forEach(a =>
                openInGoogleCalendar({ ...a, reviewerName: getReviewerName?.(a.reviewerId) }),
              );
              setOpen(false);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
            Google Calendar
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] hover:bg-muted transition-colors"
            onClick={() => {
              exportToICS(assignments.map(a => ({ ...a, reviewerName: getReviewerName?.(a.reviewerId) })));
              setOpen(false);
            }}
          >
            <Download className="h-3.5 w-3.5 text-gray-500" />
            Apple / ICS File
          </button>
        </div>
      )}
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────
function dotColor(status: string, deadline: string): string {
  const overdue = new Date(deadline) < new Date() && !['DONE', 'COMPLETED', 'REJECTED'].includes(status);
  if (overdue) return 'bg-red-500';
  switch (status) {
    case 'DONE':
    case 'COMPLETED':         return 'bg-green-500';
    case 'ACCEPTED':
    case 'STARTED':           return 'bg-blue-500';
    case 'PENDING_EXTENSION': return 'bg-orange-400';
    case 'PENDING':           return 'bg-yellow-500';
    default:                  return 'bg-gray-400';
  }
}

function urgencyCardBorder(days: number): string {
  if (days < 0) return 'border-red-300 bg-red-50/40 dark:border-red-700/40 dark:bg-red-500/5';
  if (days <= 3) return 'border-orange-300 bg-orange-50/40 dark:border-orange-700/40 dark:bg-orange-500/5';
  return 'border-border bg-background';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending', PENDING_EXTENSION: 'Extension Requested',
    PENDING_REFUSAL: 'Refusal Requested', ACCEPTED: 'Accepted',
    STARTED: 'Started', DONE: 'Done', COMPLETED: 'Completed', REJECTED: 'Rejected',
  };
  return labels[status] ?? status;
}

function reviewerStatusPill(status: string, deadline: string): { label: string; style: string } {
  const overdue = new Date(deadline) < new Date() && !['DONE', 'COMPLETED', 'REJECTED'].includes(status);
  if (overdue) return { label: 'Overdue',   style: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' };
  switch (status) {
    case 'DONE':
    case 'COMPLETED':         return { label: 'Done',      style: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' };
    case 'STARTED':           return { label: 'Started',   style: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' };
    case 'ACCEPTED':          return { label: 'Accepted',  style: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' };
    case 'PENDING_EXTENSION': return { label: 'Extension', style: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' };
    case 'PENDING':           return { label: 'Pending',   style: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' };
    case 'REJECTED':          return { label: 'Rejected',  style: 'bg-gray-100 text-gray-500 dark:bg-gray-700/40 dark:text-gray-400' };
    default:                  return { label: status,      style: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400' };
  }
}

function statusBadgeStyles(status: string, deadline: string): string {
  const overdue = new Date(deadline) < new Date() && !['DONE', 'COMPLETED', 'REJECTED'].includes(status);
  if (overdue) return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-200';
  switch (status) {
    case 'DONE':
    case 'COMPLETED':         return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-200';
    case 'ACCEPTED':
    case 'STARTED':           return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-200';
    case 'PENDING_EXTENSION': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 hover:bg-orange-200';
    case 'PENDING':           return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 hover:bg-yellow-200';
    default:                  return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 hover:bg-gray-200';
  }
}

function badgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['DONE', 'COMPLETED'].includes(status)) return 'secondary';
  if (['ACCEPTED', 'STARTED'].includes(status)) return 'default';
  if (status === 'REJECTED') return 'destructive';
  return 'outline';
}

function daysFromNow(deadline: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function OverleafButton({ href }: { href: string }) {
  return (
    <button
      type="button"
      title="Open in Overleaf"
      onClick={() => window.open(href, '_blank')}
      className="inline-flex items-center gap-1 rounded-md border border-[#24814d]/30 bg-[#24814d]/10 px-2 py-1 text-[10px] font-medium text-[#24814d] hover:bg-[#24814d]/20 transition-colors shrink-0"
    >
      <ExternalLink className="h-3 w-3" />
      Open
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DeadlineCalendar({
  assignments,
  mode = 'reviewer',
  getReviewerName,
}: DeadlineCalendarProps) {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date>(new Date());

  const userRoleBase = user?.role === 'admin' ? '/admin' : (user?.role === 'coordinator' ? '/coordinator' : '/member');
  const getProfileLink = (memberId: string) => `${userRoleBase}/members/${memberId}`;

  const today = new Date();
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  // ── Non-coordinator: flat date map ─────────────────────────────────────────
  const byDate = useMemo(() => {
    const map = new Map<string, AssignmentResponseDTO[]>();
    assignments.forEach(a => {
      if (!a.deadline) return;
      const key = format(new Date(a.deadline), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return map;
  }, [assignments]);

  // ── Coordinator: group by (paperId × deadline date) ────────────────────────
  // A paper with reviewers on different dates shows up on EACH of those dates.
  const paperGroups = useMemo((): PaperGroup[] => {
    if (mode !== 'coordinator') return [];
    const groupMap = new Map<string, AssignmentResponseDTO[]>();
    assignments.forEach(a => {
      if (!a.paperId || !a.deadline || a.status === 'REJECTED') return;
      const dateKey = format(new Date(a.deadline), 'yyyy-MM-dd');
      const key = `${a.paperId}__${dateKey}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(a);
    });
    return Array.from(groupMap.values()).map(assigns => {
      const unfinished = assigns.filter(a => !['DONE', 'COMPLETED', 'REJECTED'].includes(a.status));
      const urgencyDays = unfinished.length > 0
        ? Math.min(...unfinished.map(a => daysFromNow(a.deadline)))
        : Infinity;
      return {
        paperId: assigns[0].paperId,
        paperTitle: assigns[0].paperTitle || 'Untitled Paper',
        overleafLink: assigns[0].overleafLink,
        deadlineDate: assigns[0].deadline,
        assignments: [...assigns].sort((a, b) => (a.reviewerName ?? '').localeCompare(b.reviewerName ?? '')),
        urgencyDays,
      };
    });
  }, [assignments, mode]);

  const byDateCoordinator = useMemo(() => {
    const map = new Map<string, PaperGroup[]>();
    paperGroups.forEach(g => {
      const key = format(new Date(g.deadlineDate), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return map;
  }, [paperGroups]);

  // Upcoming: most urgent unfinished paper-deadline groups first
  const upcomingCoordinator = useMemo(
    () =>
      paperGroups
        .filter(g => g.urgencyDays !== Infinity)
        .sort((a, b) => a.urgencyDays - b.urgencyDays)
        .slice(0, 4),
    [paperGroups],
  );

  // ── Non-coordinator upcoming ────────────────────────────────────────────────
  const upcoming = useMemo(
    () =>
      assignments
        .filter(a => a.deadline && !['DONE', 'COMPLETED', 'REJECTED'].includes(a.status))
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 4),
    [assignments],
  );

  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedAssignments = selectedKey ? (byDate.get(selectedKey) ?? []) : [];
  const selectedPaperGroups = selectedKey ? (byDateCoordinator.get(selectedKey) ?? []) : [];

  function handleDayClick(day: Date) {
    const key = format(day, 'yyyy-MM-dd');
    const hasItems = mode === 'coordinator' ? byDateCoordinator.has(key) : byDate.has(key);
    if (!hasItems) { setSelectedDay(null); return; }
    setSelectedDay(prev => (prev && isSameDay(prev, day) ? null : day));
  }

  return (
    <div className="space-y-3 relative">
      {!isCurrentMonth && (
        <button
          type="button"
          onClick={() => { setMonth(new Date()); setSelectedDay(null); }}
          title="Go to today"
          className="absolute top-0 left-0 z-10 p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 transition-all shadow-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}

      <DayPicker
        mode="single"
        month={month}
        onMonthChange={setMonth}
        selected={selectedDay ?? undefined}
        onDayClick={handleDayClick}
        showOutsideDays
        classNames={{
          months: 'flex flex-col items-center',
          month: 'space-y-3',
          caption: 'flex justify-center pt-1 relative items-center',
          caption_label: 'text-sm font-medium',
          nav: 'flex items-center gap-1',
          nav_button: cn(
            buttonVariants({ variant: 'outline' }),
            'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
          ),
          nav_button_previous: 'absolute left-1',
          nav_button_next: 'absolute right-1',
          table: 'w-full border-collapse',
          head_row: 'flex',
          head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center',
          row: 'flex w-full mt-1',
          cell: 'relative w-9 text-center text-sm p-0 focus-within:relative focus-within:z-20',
          day: cn(
            buttonVariants({ variant: 'ghost' }),
            'w-9 h-10 p-0 font-normal aria-selected:opacity-100 flex flex-col items-center justify-start pt-1',
          ),
          day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
          day_today: 'bg-accent text-accent-foreground',
          day_outside: 'text-muted-foreground opacity-30',
          day_disabled: 'text-muted-foreground opacity-50',
          day_hidden: 'invisible',
        }}
        components={{
          IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" {...props} />,
          IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" {...props} />,
          DayContent: ({ date, displayMonth }) => {
            const key = format(date, 'yyyy-MM-dd');
            const isThisMonth = date.getMonth() === displayMonth.getMonth();

            if (mode === 'coordinator') {
              const groups = byDateCoordinator.get(key) ?? [];
              const dots = groups.slice(0, 3);
              const extra = groups.length - 3;
              return (
                <div className="flex flex-col items-center gap-0.5">
                  <span>{date.getDate()}</span>
                  {isThisMonth && groups.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {dots.map((_, i) => (
                        <span key={i} className="w-1 h-1 rounded-full bg-blue-400" />
                      ))}
                      {extra > 0 && <span className="text-[7px] leading-none text-muted-foreground">+{extra}</span>}
                    </div>
                  )}
                </div>
              );
            }

            const dayItems = byDate.get(key) ?? [];
            const visibleDots = dayItems.slice(0, 3);
            const extra = dayItems.length - 3;
            return (
              <div className="flex flex-col items-center gap-0.5">
                <span>{date.getDate()}</span>
                {isThisMonth && dayItems.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    {visibleDots.map((_, i) => (
                      <span key={i} className={cn('w-1 h-1 rounded-full', mode === 'member' ? 'bg-blue-400' : dotColor(_.status, _.deadline))} />
                    ))}
                    {extra > 0 && <span className="text-[7px] leading-none text-muted-foreground">+{extra}</span>}
                  </div>
                )}
              </div>
            );
          },
        }}
      />

      {/* ── Coordinator: selected day panel ────────────────────────────────── */}
      {selectedDay && mode === 'coordinator' && selectedPaperGroups.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {format(selectedDay, 'MMMM d, yyyy')}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {selectedPaperGroups.length} paper{selectedPaperGroups.length > 1 ? 's' : ''}
              </span>
            </p>
            <ExportDropdown
              assignments={selectedPaperGroups.flatMap(g => g.assignments)}
              label="Export"
              getReviewerName={getReviewerName}
            />
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {selectedPaperGroups.map((g, idx) => (
              <div key={`${g.paperId}-${idx}`} className={cn('rounded-md border p-2.5', urgencyCardBorder(g.urgencyDays))}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold leading-tight line-clamp-2 flex-1">{g.paperTitle}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {g.overleafLink && <OverleafButton href={g.overleafLink} />}
                    <ExportDropdown assignments={g.assignments} label="" getReviewerName={getReviewerName} />
                  </div>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Reviewers:
                </p>
                <div className="space-y-1">
                  {g.assignments.map(a => {
                    const pill = reviewerStatusPill(a.status, a.deadline);
                    const days = daysFromNow(a.deadline);
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-[10px]">
                        <Link to={getProfileLink(a.reviewerId)} className="font-medium text-foreground hover:underline truncate max-w-[100px]">
                          {a.reviewerName || 'Unassigned'}
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-muted-foreground">{format(new Date(a.deadline), 'MMM d')}</span>
                          <span className={cn('font-bold uppercase tracking-wider', days < 0 ? 'text-red-600 dark:text-red-400' : days <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground/50')}>
                            {days < 0 ? `${Math.abs(days)}d over` : days === 0 ? 'today' : `${days}d`}
                          </span>
                          <span className={cn('px-1.5 py-0.5 rounded font-semibold', pill.style)}>{pill.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Non-coordinator: selected day panel ────────────────────────────── */}
      {selectedDay && mode !== 'coordinator' && selectedAssignments.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {format(selectedDay, 'MMMM d, yyyy')}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {selectedAssignments.length} deadline{selectedAssignments.length > 1 ? 's' : ''}
              </span>
            </p>
            <ExportDropdown assignments={selectedAssignments} label="Export" getReviewerName={getReviewerName} />
          </div>
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {selectedAssignments.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-2 rounded-md border border-border bg-background p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight line-clamp-2">{a.paperTitle || 'Untitled Paper'}</p>
                  {mode !== 'member' && (
                    <div className="mt-1 flex items-center gap-1.5">
                      {a.reviewerName ? (
                        <Link to={getProfileLink(a.reviewerId)} className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors', statusBadgeStyles(a.status, a.deadline))}>
                          Reviewer: {a.reviewerName}
                        </Link>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          Reviewer: Unassigned
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground">Deadline: {format(new Date(a.deadline), 'MMM d')}</p>
                    {(() => {
                      const days = daysFromNow(a.deadline);
                      const isOverdue = days < 0;
                      return (
                        <span className={cn('text-[10px] font-bold uppercase tracking-wider', isOverdue ? 'text-red-600 dark:text-red-400' : days <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground/60')}>
                          • {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {mode !== 'member' && (
                    <Badge variant={badgeVariant(a.status)} className="px-1.5 text-[10px]">{statusLabel(a.status)}</Badge>
                  )}
                  {mode === 'member' && a.overleafLink && <OverleafButton href={a.overleafLink} />}
                  <ExportDropdown assignments={[a]} label="" getReviewerName={getReviewerName} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Coordinator: upcoming strip ─────────────────────────────────────── */}
      {!selectedDay && mode === 'coordinator' && upcomingCoordinator.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> Upcoming
            </p>
            <ExportDropdown
              assignments={paperGroups.flatMap(g => g.assignments).filter(a => !['DONE', 'COMPLETED', 'REJECTED'].includes(a.status) && a.deadline)}
              label="Export all"
              getReviewerName={getReviewerName}
            />
          </div>
          {upcomingCoordinator.map((g, idx) => (
            <div key={`${g.paperId}-${idx}`} className={cn('rounded-md border p-2.5', urgencyCardBorder(g.urgencyDays))}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-semibold leading-tight line-clamp-2 flex-1">{g.paperTitle}</p>
                <div className="flex items-center gap-1 shrink-0">
                  {g.overleafLink && <OverleafButton href={g.overleafLink} />}
                  <ExportDropdown assignments={g.assignments} label="" getReviewerName={getReviewerName} />
                </div>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Reviewers:
              </p>
              <div className="space-y-1">
                {g.assignments.map(a => {
                  const pill = reviewerStatusPill(a.status, a.deadline);
                  const days = daysFromNow(a.deadline);
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-[10px]">
                      <Link to={getProfileLink(a.reviewerId)} className="font-medium text-foreground hover:underline truncate max-w-[100px]">
                        {a.reviewerName || 'Unassigned'}
                      </Link>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-muted-foreground">{format(new Date(a.deadline), 'MMM d')}</span>
                        <span className={cn('font-bold uppercase tracking-wider', days < 0 ? 'text-red-600 dark:text-red-400' : days <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground/50')}>
                          {days < 0 ? `${Math.abs(days)}d over` : days === 0 ? 'today' : `${days}d`}
                        </span>
                        <span className={cn('px-1.5 py-0.5 rounded font-semibold', pill.style)}>{pill.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Non-coordinator: upcoming strip ────────────────────────────────── */}
      {!selectedDay && mode !== 'coordinator' && upcoming.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> Upcoming
            </p>
            <ExportDropdown
              assignments={assignments.filter(a => !['DONE', 'COMPLETED', 'REJECTED'].includes(a.status) && a.deadline)}
              label="Export all"
              getReviewerName={getReviewerName}
            />
          </div>
          {upcoming.map(a => {
            const days = daysFromNow(a.deadline);
            const isOverdue = days < 0;
            return (
              <div key={a.id} className="flex items-start justify-between gap-2 rounded-md border border-border bg-background p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight line-clamp-2">{a.paperTitle || 'Untitled Paper'}</p>
                  {mode !== 'member' && (
                    <div className="mt-1 flex items-center gap-1.5">
                      {a.reviewerName ? (
                        <Link to={getProfileLink(a.reviewerId)} className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors', statusBadgeStyles(a.status, a.deadline))}>
                          Reviewer: {a.reviewerName}
                        </Link>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          Reviewer: Unassigned
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground">Deadline: {format(new Date(a.deadline), 'MMM d')}</p>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', isOverdue ? 'text-red-600 dark:text-red-400' : days <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground/60')}>
                      • {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {mode === 'member' && a.overleafLink && <OverleafButton href={a.overleafLink} />}
                  <ExportDropdown assignments={[a]} label="" getReviewerName={getReviewerName} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      {mode === 'reviewer' && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Overdue</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Pending</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> In Progress</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Done</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" /> Extension</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" /> Rejected</span>
        </div>
      )}
    </div>
  );
}