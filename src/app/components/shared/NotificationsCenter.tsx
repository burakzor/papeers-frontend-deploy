import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SearchableSelect } from '../ui/searchable-select';
import {
    AlertCircle,
    AlertTriangle,
    ArrowUpDown,
    Bell,
    CalendarCheck,
    CalendarClock,
    CalendarPlus,
    CalendarX,
    Check,
    CheckCheck,
    CheckCircle2,
    Clock3,
    Eye,
    FileUp,
    ListChecks,
    Loader2,
    Scale,
    ThumbsDown,
    ThumbsUp,
    Trash2,
    UserCheck,
    UserPlus,
    UserX,
    X,
} from 'lucide-react';
import { cn } from '../ui/utils';
import {
    type BackendNotificationType,
    type NotificationResponseDTO,
    deleteAllNotifications,
    deleteNotification,
    deleteReadNotifications,
    getNotificationsByLabId,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '../../services/notificationService';

// ── Types ──────────────────────────────────────────────────────────────────

type FilterCategory = 'all' | 'assignments' | 'reviews' | 'deadlines' | 'access' | 'system';
type SortOrder = 'newest' | 'oldest';

interface NotificationConfig {
    icon: React.ElementType;
    iconColor: string;
    cardBorder: string;
    badgeLabel: string;
    badgeClass: string;
    category: FilterCategory;
}

// ── Notification map ────────────────────────────────────────────────────────

const NOTIFICATION_MAP: Record<NonNullable<BackendNotificationType>, NotificationConfig> = {
    ASSIGNMENT_RECEIVED: {
        icon: UserCheck, iconColor: 'text-blue-600',
        cardBorder: 'border-blue-600',
        badgeLabel: 'Assignment', badgeClass: 'bg-blue-600',
        category: 'assignments',
    },
    REVIEWER_REMOVED: {
        icon: UserX, iconColor: 'text-red-600',
        cardBorder: 'border-red-600',
        badgeLabel: 'Removed', badgeClass: 'bg-red-600',
        category: 'assignments',
    },
    REVIEWER_INVITATION_ACCEPTED: {
        icon: ThumbsUp, iconColor: 'text-emerald-600',
        cardBorder: 'border-emerald-600',
        badgeLabel: 'Accepted', badgeClass: 'bg-emerald-600',
        category: 'assignments',
    },
    REVIEWER_INVITATION_REJECTED: {
        icon: UserX, iconColor: 'text-red-600',
        cardBorder: 'border-red-600',
        badgeLabel: 'Rejected', badgeClass: 'bg-red-600',
        category: 'assignments',
    },
    REVIEW_FINISHED: {
        icon: CheckCircle2, iconColor: 'text-green-600',
        cardBorder: 'border-green-600',
        badgeLabel: 'Completed', badgeClass: 'bg-green-600',
        category: 'reviews',
    },
    ALL_REVIEWS_COMPLETED: {
        icon: ListChecks, iconColor: 'text-green-700',
        cardBorder: 'border-green-700',
        badgeLabel: 'All Done', badgeClass: 'bg-green-700',
        category: 'reviews',
    },
    DECISION_MADE: {
        icon: Scale, iconColor: 'text-purple-600',
        cardBorder: 'border-purple-600',
        badgeLabel: 'Decision', badgeClass: 'bg-purple-600',
        category: 'reviews',
    },
    DEADLINE_REMINDER: {
        icon: Clock3, iconColor: 'text-amber-600',
        cardBorder: 'border-amber-600',
        badgeLabel: 'Reminder', badgeClass: 'bg-amber-600',
        category: 'deadlines',
    },
    DEADLINE_EXPIRED: {
        icon: AlertCircle, iconColor: 'text-red-600',
        cardBorder: 'border-red-600',
        badgeLabel: 'Expired', badgeClass: 'bg-red-600',
        category: 'deadlines',
    },
    DEADLINE_EXTENSION_REQUEST: {
        icon: CalendarPlus, iconColor: 'text-orange-600',
        cardBorder: 'border-orange-600',
        badgeLabel: 'Ext. Request', badgeClass: 'bg-orange-600',
        category: 'deadlines',
    },
    DEADLINE_EXTENSION_APPROVED: {
        icon: CalendarCheck, iconColor: 'text-green-600',
        cardBorder: 'border-green-600',
        badgeLabel: 'Ext. Approved', badgeClass: 'bg-green-600',
        category: 'deadlines',
    },
    DEADLINE_EXTENSION_REJECTED: {
        icon: CalendarX, iconColor: 'text-red-500',
        cardBorder: 'border-red-500',
        badgeLabel: 'Ext. Rejected', badgeClass: 'bg-red-500',
        category: 'deadlines',
    },
    COORDINATOR_EXTENDED_DEADLINE: {
        icon: CalendarClock, iconColor: 'text-blue-500',
        cardBorder: 'border-blue-500',
        badgeLabel: 'Extended', badgeClass: 'bg-blue-500',
        category: 'deadlines',
    },
    GUEST_ACCESS_GRANTED: {
        icon: Eye, iconColor: 'text-indigo-600',
        cardBorder: 'border-indigo-600',
        badgeLabel: 'Access', badgeClass: 'bg-indigo-600',
        category: 'access',
    },
    NEW_PAPER_UPLOADED: {
        icon: FileUp, iconColor: 'text-sky-600',
        cardBorder: 'border-sky-600',
        badgeLabel: 'New Paper', badgeClass: 'bg-sky-600',
        category: 'access',
    },
    WELCOME_TO_LAB: {
        icon: UserPlus, iconColor: 'text-teal-600',
        cardBorder: 'border-teal-600',
        badgeLabel: 'Welcome', badgeClass: 'bg-teal-600',
        category: 'access',
    },
    ASSIGNMENT_CANCELLED: {
        icon: Trash2, iconColor: 'text-red-500',
        cardBorder: 'border-red-500',
        badgeLabel: 'Cancelled', badgeClass: 'bg-red-500',
        category: 'assignments',
    },
    SYSTEM_ALERT: {
        icon: AlertTriangle, iconColor: 'text-yellow-600',
        cardBorder: 'border-yellow-500',
        badgeLabel: 'System', badgeClass: 'bg-yellow-600',
        category: 'system',
    },
    PAPER_IN_PROGRESS_ASSIGNED: {
        icon: FileUp, iconColor: 'text-blue-500',
        cardBorder: 'border-blue-500',
        badgeLabel: 'Draft', badgeClass: 'bg-blue-500',
        category: 'access',
    },
    PAPER_FINISHED_BY_AUTHOR: {
        icon: CheckCircle2, iconColor: 'text-green-600',
        cardBorder: 'border-green-600',
        badgeLabel: 'Ready', badgeClass: 'bg-green-600',
        category: 'access',
    },
    CLARIFICATION_REQUESTED: {
        icon: AlertCircle, iconColor: 'text-amber-500',
        cardBorder: 'border-amber-500',
        badgeLabel: 'Clarification', badgeClass: 'bg-amber-500',
        category: 'reviews',
    },
    CLARIFICATION_FINISHED: {
        icon: CheckCheck, iconColor: 'text-blue-500',
        cardBorder: 'border-blue-500',
        badgeLabel: 'Clarified', badgeClass: 'bg-blue-500',
        category: 'reviews',
    },
};

const FALLBACK_CONFIG: NotificationConfig = {
    icon: Bell, iconColor: 'text-muted-foreground',
    cardBorder: 'border-primary',
    badgeLabel: 'Info', badgeClass: '',
    category: 'system',
};

function getConfig(type: BackendNotificationType): NotificationConfig {
    if (!type) return FALLBACK_CONFIG;
    return NOTIFICATION_MAP[type] ?? FALLBACK_CONFIG;
}

// ── Route helpers ───────────────────────────────────────────────────────────

const TYPE_PATHS: Partial<Record<NonNullable<BackendNotificationType>, { coordinator: string; member: string }>> = {
    ASSIGNMENT_RECEIVED: { coordinator: '/coordinator/papers', member: '/member/reviews' },
    REVIEWER_REMOVED: { coordinator: '/coordinator/papers', member: '/member/reviews' },
    REVIEWER_INVITATION_ACCEPTED: { coordinator: '/coordinator/papers', member: '/member/reviews' },
    REVIEWER_INVITATION_REJECTED: { coordinator: '/coordinator/papers', member: '/member/reviews' },
    REVIEW_FINISHED: { coordinator: '/coordinator/papers', member: '/member/submissions' },
    ALL_REVIEWS_COMPLETED: { coordinator: '/coordinator/papers', member: '/member/submissions' },
    DECISION_MADE: { coordinator: '/coordinator/papers', member: '/member/submissions' },
    DEADLINE_REMINDER: { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    DEADLINE_EXPIRED: { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    DEADLINE_EXTENSION_REQUEST: { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    DEADLINE_EXTENSION_APPROVED: { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    DEADLINE_EXTENSION_REJECTED: { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    COORDINATOR_EXTENDED_DEADLINE: { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    GUEST_ACCESS_GRANTED: { coordinator: '/coordinator/papers', member: '/member/submissions' },
    NEW_PAPER_UPLOADED: { coordinator: '/coordinator/papers', member: '/member/submissions' },
    WELCOME_TO_LAB: { coordinator: '/coordinator', member: '/member' },
    ASSIGNMENT_CANCELLED: { coordinator: '/coordinator/papers', member: '/member/reviews' },
    PAPER_IN_PROGRESS_ASSIGNED: { coordinator: '/coordinator/papers', member: '/member/submissions' },
    PAPER_FINISHED_BY_AUTHOR: { coordinator: '/coordinator/papers', member: '/member/submissions' },
    CLARIFICATION_REQUESTED: { coordinator: '/coordinator/papers', member: '/member/reviews' },
    CLARIFICATION_FINISHED: { coordinator: '/coordinator/papers', member: '/member/submissions' },
};

function getTargetPath(type: BackendNotificationType, role: string | undefined): string | null {
    if (!type) return null;
    const paths = TYPE_PATHS[type];
    if (!paths) return null;
    return role === 'coordinator' ? paths.coordinator : paths.member;
}

// ── Utilities ───────────────────────────────────────────────────────────────

function formatDate(isoDate: string | null | undefined): string {
    if (!isoDate) return 'Just now';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'Just now';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;
    return date.toLocaleDateString();
}

// ── Component ───────────────────────────────────────────────────────────────

export default function NotificationsCenter() {
    const { user, selectedLab } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const QUERY_KEY = ['notifications', user?.id, selectedLab?.id];

    const {
        data: notifications = [],
        isLoading: loading,
        error: queryError
    } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => getNotificationsByLabId(selectedLab!.id),
        enabled: !!user?.id && !!selectedLab?.id,
        staleTime: 1000 * 60 * 5,
    });

    const error = queryError
        ? (queryError as Error).message ?? 'Failed to load notifications.'
        : null;

    const [filter, setFilter] = useState<FilterCategory>('all');
    const [sort, setSort] = useState<SortOrder>('newest');

    // ── Select mode ───────────────────────────────────────────────────────────
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ── Mutations ─────────────────────────────────────────────────────────────

    const markReadMutation = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
        onError: () => toast.error('Could not mark notification as read.'),
    });

    const markAllReadMutation = useMutation({
        mutationFn: (userId: string) => markAllNotificationsAsRead(userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
        onError: () => toast.error('Could not mark all notifications as read.'),
    });

    const deleteOneMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
        onError: () => toast.error('Could not delete notification.'),
    });

    const clearReadMutation = useMutation({
        mutationFn: (userId: string) => deleteReadNotifications(userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
        onError: () => toast.error('Could not clear read notifications.'),
    });

    const clearAllMutation = useMutation({
        mutationFn: (userId: string) => deleteAllNotifications(userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
        onError: () => toast.error('Could not clear all notifications.'),
    });

    // ── Standard actions ──────────────────────────────────────────────────────

    const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        markReadMutation.mutate(id);
    };

    const handleMarkAllAsRead = () => {
        if (user?.id) markAllReadMutation.mutate(user.id);
    };

    const handleCardClick = (item: NotificationResponseDTO) => {
        if (isSelectMode) {
            handleToggleSelect(item.id);
            return;
        }
        if (!item.isRead) {
            markReadMutation.mutate(item.id);
        }
        const targetPath = getTargetPath(item.type, user?.role);
        if (targetPath) navigate(targetPath);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteOneMutation.mutate(id);
    };

    const handleClearRead = () => {
        if (user?.id) clearReadMutation.mutate(user.id);
    };

    const handleClearAll = () => {
        if (user?.id) clearAllMutation.mutate(user.id);
    };

    // ── Select mode actions ───────────────────────────────────────────────────

    const handleEnterSelectMode = () => {
        setIsSelectMode(true);
        setSelectedIds(new Set());
    };

    const handleCancelSelectMode = () => {
        setIsSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (allVisibleSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(visibleNotifications.map((n) => n.id)));
        }
    };

    const handleMarkSelectedAsRead = () => {
        const ids = [...selectedIds];
        if (ids.length === 0) return;

        Promise.all(ids.map(id => markNotificationAsRead(id)))
            .then(() => {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                setSelectedIds(new Set());
                setIsSelectMode(false);
            })
            .catch(() => toast.error('Could not mark selected notifications as read.'));
    };

    const handleDeleteSelected = () => {
        const ids = [...selectedIds];
        if (ids.length === 0) return;

        Promise.all(ids.map(id => deleteNotification(id)))
            .then(() => {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY });
                setSelectedIds(new Set());
                setIsSelectMode(false);
            })
            .catch(() => toast.error('Could not delete selected notifications.'));
    };

    // ── Derived state ─────────────────────────────────────────────────────────

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications],
    );

    const readCount = useMemo(
        () => notifications.filter((n) => n.isRead).length,
        [notifications],
    );

    const visibleNotifications = useMemo(() => {
        const filtered =
            filter === 'all'
                ? notifications
                : notifications.filter((n) => getConfig(n.type).category === filter);
        return [...filtered].sort((a, b) => {
            const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
            return sort === 'newest' ? -diff : diff;
        });
    }, [filter, sort, notifications]);

    const allVisibleSelected = useMemo(
        () =>
            visibleNotifications.length > 0 &&
            visibleNotifications.every((n) => selectedIds.has(n.id)),
        [visibleNotifications, selectedIds],
    );

    const subtitle = useMemo(() => {
        if (user?.role === 'coordinator')
            return 'Coordinator notifications: assignments, reviews, and deadline management.';
        if (user?.role === 'guest')
            return 'Guest notifications: updates on the papers you are collaborating on.';
        return 'Lab member notifications: review assignments, decisions, and deadline updates.';
    }, [user?.role]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Bell className="w-8 h-8 text-blue-600" />
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-sm font-bold text-white shadow-lg shadow-blue-500/30">
                                {unreadCount}
                            </span>
                        )}
                    </h2>
                    <p className="text-muted-foreground mt-2 text-lg">{subtitle}</p>
                </div>

                <div className="flex flex-wrap gap-2 sm:items-center">
                    {isSelectMode ? (
                        /* ── Select mode controls ── */
                        <>
                            {selectedIds.size > 0 && (
                                <>
                                    <span className="self-center text-sm text-muted-foreground">
                                        {selectedIds.size} selected
                                    </span>
                                    <Button size="sm" variant="outline" onClick={handleMarkSelectedAsRead} className="gap-1.5">
                                        <Check className="w-4 h-4" />
                                        Mark as read
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleDeleteSelected} className="gap-1.5 text-destructive hover:text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </Button>
                                </>
                            )}
                            <Button size="sm" variant="outline" onClick={handleToggleSelectAll} className="gap-1.5">
                                {allVisibleSelected ? 'Unselect All' : 'Select All'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelSelectMode} className="gap-1.5">
                                <X className="w-4 h-4" />
                            </Button>
                        </>
                    ) : (
                        /* ── Normal mode controls ── */
                        <>
                            {/* Sort */}
                            <SearchableSelect
                                value={sort}
                                onValueChange={(v) => setSort(v as SortOrder)}
                                options={[
                                    { value: 'newest', label: 'Newest first' },
                                    { value: 'oldest', label: 'Oldest first' },
                                ]}
                                className="w-36"
                            />

                            {/* Filter */}
                            <SearchableSelect
                                value={filter}
                                onValueChange={(v) => setFilter(v as FilterCategory)}
                                options={[
                                    { value: 'all', label: 'All Notifications' },
                                    { value: 'assignments', label: 'Assignments' },
                                    { value: 'reviews', label: 'Reviews' },
                                    { value: 'deadlines', label: 'Deadlines' },
                                    { value: 'access', label: 'Papers & Access' },
                                    { value: 'system', label: 'System' },
                                ]}
                                placeholder="Filter"
                                className="w-44"
                            />

                            {unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    disabled={markAllReadMutation.isPending}
                                    className="gap-1.5"
                                >
                                    {markAllReadMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCheck className="w-4 h-4" />
                                    )}
                                    Mark all as read
                                </Button>
                            )}

                            {readCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearRead}
                                    disabled={clearReadMutation.isPending}
                                    className="gap-1.5 text-muted-foreground"
                                >
                                    {clearReadMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    Clear read
                                </Button>
                            )}

                            {notifications.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearAll}
                                    disabled={clearAllMutation.isPending}
                                    className="gap-1.5 text-destructive hover:text-destructive"
                                >
                                    {clearAllMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    Clear all
                                </Button>
                            )}

                            {/* Select mode entry */}
                            {notifications.length > 0 && (
                                <Button variant="outline" size="sm" onClick={handleEnterSelectMode}>
                                    Select
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Body */}
            {loading && (
                <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        Loading notifications…
                    </CardContent>
                </Card>
            )}

            {!loading && error && (
                <Card>
                    <CardContent className="py-8 text-center text-sm text-destructive">
                        {error}
                    </CardContent>
                </Card>
            )}

            {!loading && !error && (
                <div className="space-y-4">
                    {visibleNotifications.map((item) => {
                        const config = getConfig(item.type);
                        const Icon = config.icon;
                        const isSelected = selectedIds.has(item.id);
                        const targetPath = !isSelectMode ? getTargetPath(item.type, user?.role) : null;

                        return (
                            <Card
                                key={item.id}
                                onClick={() => handleCardClick(item)}
                                className={cn(
                                    'group relative border-l-4 transition-all duration-200 select-none hover:border-l-blue-600',
                                    isSelectMode || targetPath ? 'cursor-pointer' : '',
                                    /* Unread */ !item.isRead && `bg-card/50 shadow-sm ${config.cardBorder}`,
                                    /* Read   */  item.isRead && 'bg-card/30 border-transparent opacity-70',
                                    /* Selected ring */
                                    isSelectMode && isSelected && 'ring-2 ring-primary opacity-100 bg-primary/5',
                                    /* Hover shadow — only in normal mode with a target */
                                    !isSelectMode && targetPath && 'hover:shadow-lg hover:bg-card',
                                )}
                            >
                                <CardHeader className="pb-3 pt-6 px-6 pr-12">
                                    <div className="flex items-center gap-3">
                                        {/* Checkbox in select mode */}
                                        {isSelectMode && (
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleSelect(item.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="shrink-0"
                                            />
                                        )}

                                        <div className="flex items-center justify-between gap-3 flex-1 min-w-0">
                                            <CardTitle
                                                className={cn(
                                                    'text-lg flex items-center gap-3',
                                                    item.isRead
                                                        ? 'font-medium text-muted-foreground'
                                                        : 'font-bold text-foreground',
                                                )}
                                            >
                                                <Icon
                                                    className={cn(
                                                        'w-5 h-5 shrink-0',
                                                        item.isRead ? 'text-muted-foreground' : config.iconColor,
                                                    )}
                                                />
                                                {item.title}
                                            </CardTitle>

                                            <div className="flex items-center gap-3 shrink-0">
                                                {!item.isRead && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                                                )}
                                                <Badge
                                                    variant={item.isRead ? 'outline' : 'default'}
                                                    className={cn(
                                                        'px-2.5 py-0.5 font-semibold transition-colors',
                                                        item.isRead ? 'text-muted-foreground border-muted-foreground/30' : `text-white ${config.badgeClass}`,
                                                    )}
                                                >
                                                    {config.badgeLabel}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="px-6 pb-6 pt-0">
                                    <p className={cn(
                                        'text-base leading-relaxed',
                                        item.isRead ? 'text-muted-foreground/80' : 'text-foreground/90',
                                    )}>
                                        {item.message}
                                    </p>

                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 font-medium">
                                            <Clock3 className="w-3 h-3" />
                                            {formatDate(item.date)}
                                        </div>

                                        {/* Quick actions — hidden in select mode, visible on card hover */}
                                        {!isSelectMode && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!item.isRead && (
                                                    <button
                                                        onClick={(e) => handleMarkAsRead(e, item.id)}
                                                        title="Mark as read"
                                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-blue-50 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-100"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(e, item.id)}
                                                    title="Delete"
                                                    className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {visibleNotifications.length === 0 && (
                        <Card>
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                No notifications found for the selected filter.
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}