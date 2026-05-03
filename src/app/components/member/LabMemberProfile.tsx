import { useState, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  ClipboardList, FileText, GaugeCircle, Inbox,
  Loader2, Calendar, Activity, Mail, Lock, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserById } from '../../services/userService';
import { getReviewerComments } from '../../services/commentService';
import { getMyAssignments } from '../../services/assignmentService';
import { getPapersOfLabMember } from '../../services/paperService';

/* ─── Helpers ─── */
function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${color ?? 'text-foreground'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RatingBadge({ label, val }: { label: string; val: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{val}/10</span>
    </span>
  );
}

/* ─── Main Component ─── */
export default function LabMemberProfile() {
  const { memberId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Pagination state
  const [feedbackPage, setFeedbackPage] = useState(0);

  // Permission check
  const canViewFeedback = useMemo(() => {
    return currentUser?.role === 'admin' || currentUser?.role === 'coordinator' || currentUser?.id === memberId;
  }, [currentUser, memberId]);

  // TanStack Query for data fetching
  const { data: profileUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['member-profile', memberId],
    queryFn: () => getUserById(memberId!),
    enabled: !!memberId,
    staleTime: 1000 * 60 * 10,
  });

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['member-assignments', memberId],
    queryFn: () => getMyAssignments(memberId!),
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: papers = [], isLoading: isLoadingPapers } = useQuery({
    queryKey: ['member-papers', memberId],
    queryFn: () => getPapersOfLabMember(memberId!),
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: feedbackData, isLoading: isFeedbackLoading } = useQuery({
    queryKey: ['member-feedback', memberId, feedbackPage],
    queryFn: () => getReviewerComments(memberId!, feedbackPage, 5),
    enabled: !!memberId && canViewFeedback,
    staleTime: 1000 * 60 * 5,
  });

  const receivedComments = feedbackData?.content ?? [];
  const feedbackTotalPages = feedbackData?.totalPages ?? 0;
  
  const isLoading = isLoadingUser || isLoadingAssignments || isLoadingPapers;

  /* ─── Derived stats ─── */
  const assignmentStats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'DONE' || a.status === 'COMPLETED').length,
    pending: assignments.filter(a => a.status === 'PENDING').length,
    inProgress: assignments.filter(a => a.status === 'IN_PROGRESS' || a.status === 'ACCEPTED').length,
  };

  const paperStats = {
    total: papers.length,
    underReview: papers.filter(p => p.assignedReviewers?.length > 0).length,
  };

  const completionRate = assignmentStats.total > 0
    ? Math.round((assignmentStats.completed / assignmentStats.total) * 100)
    : 0;

  const avgQuality = receivedComments.length > 0
    ? Math.round(receivedComments.reduce((s, c) => s + c.qualityRating, 0) / receivedComments.length * 10) / 10
    : 0;
  const avgTimeliness = receivedComments.length > 0
    ? Math.round(receivedComments.reduce((s, c) => s + c.timelinessRating, 0) / receivedComments.length * 10) / 10
    : 0;

  // Radar chart data (consistent with MyProfile)
  const radarData = [
    { area: 'Reviews Done', score: Math.min(5, assignmentStats.completed) },
    { area: 'Completion %', score: Math.round(completionRate / 20) },
    { area: 'Quality', score: Math.round(avgQuality / 2) },
    { area: 'Timeliness', score: Math.round(avgTimeliness / 2) },
    { area: 'Papers', score: Math.min(5, paperStats.total) },
  ];

  const handleBack = () => {
    // If we have history, go back, otherwise fall back to role-based dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const defaultPath = location.pathname.startsWith('/admin') ? '/admin/users' : 
                          location.pathname.startsWith('/coordinator') ? '/coordinator/manage-users' : '/member';
      navigate(defaultPath);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <Card>
        <CardContent className="py-20 text-center space-y-4">
          <p className="text-muted-foreground text-lg">Member profile not found.</p>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const initials = (profileUser.name ?? profileUser.email)
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const roleLabel = profileUser.role === 'COORDINATOR' ? 'Coordinator' : 'Lab Member';

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{profileUser.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary">{roleLabel}</Badge>
              <span className="text-muted-foreground text-sm">•</span>
              <span className="text-muted-foreground text-sm">{profileUser.email}</span>
            </div>
          </div>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <a href={`mailto:${profileUser.email}?subject=Lab%20Platform%20Coordination`}>
            <Mail className="w-4 h-4 mr-2" />
            Contact Member
          </a>
        </Button>
      </div>

      {/* Profile Overview Card (Consistent with MyProfile) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-3 sm:w-40 shrink-0">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl select-none">
                {profileUser.photo ? (
                  <img src={profileUser.photo} alt={profileUser.name} className="w-full h-full rounded-full object-cover" />
                ) : initials}
              </div>
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  <Calendar className="h-3 w-3" />
                  Joined {new Date(profileUser.registrationDate).toLocaleDateString()}
                </span>
                {profileUser.lastActiveDate && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    <Activity className="h-3 w-3 text-green-500" />
                    Active {new Date(profileUser.lastActiveDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Verified
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expertise</p>
                  <p className="text-sm font-semibold">Senior Researcher</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reviews Done</p>
                  <p className="text-sm font-semibold text-blue-600">{assignmentStats.completed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submissions</p>
                  <p className="text-sm font-semibold text-purple-600">{paperStats.total}</p>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "Currently focusing on academic peer review and research coordination within the lab's primary tracks."
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Tasks" value={assignmentStats.total} />
        <StatCard label="Papers" value={paperStats.total} />
        <StatCard label="Completed" value={assignmentStats.completed} color="text-green-600" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} color="text-blue-600" />
        <StatCard label="Avg Quality" value={avgQuality > 0 ? `${avgQuality}/10` : '—'} color="text-purple-600" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GaugeCircle className="w-5 h-5 text-blue-600" />
              Performance Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 5]} tick={false} />
                <Radar dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Comparative visualization of researcher contributions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-600" />
              Detailed Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Assignments</h4>
              {[
                { label: 'Pending', value: assignmentStats.pending },
                { label: 'In Progress', value: assignmentStats.inProgress },
                { label: 'Completed', value: assignmentStats.completed, cls: 'text-green-700 border-green-300' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">{label}</span>
                  <Badge variant="outline" className={cls}>{value}</Badge>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Papers</h4>
              {[
                { label: 'Total Submitted', value: paperStats.total },
                { label: 'Under Review', value: paperStats.underReview },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">{label}</span>
                  <Badge variant="outline">{value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-600" />
            Reviewer Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canViewFeedback ? (
            <div className="flex flex-col items-center gap-3 py-10 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
              <Lock className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center px-4">
                <p className="font-bold text-foreground">Feedback is Private</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Reviewer performance metrics and comments are only visible to coordinators and admins.
                </p>
              </div>
            </div>
          ) : isFeedbackLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : receivedComments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center opacity-60">
              <Inbox className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">No feedback recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedComments.map((c) => (
                <div key={c.id} className="rounded-xl border p-4 space-y-3 bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        From: {c.sender || <span className="italic opacity-50">Anonymous Author</span>}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground italic">
                        {c.paperTitle || 'Untitled Paper'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <RatingBadge label="Qual" val={c.qualityRating} />
                      <RatingBadge label="Time" val={c.timelinessRating} />
                    </div>
                  </div>
                  {c.comment && (
                    <p className="text-sm text-foreground/80 leading-relaxed border-l-4 border-muted pl-3 py-1 bg-muted/20 rounded-r">
                      {c.comment}
                    </p>
                  )}
                </div>
              ))}

              {feedbackTotalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={() => setFeedbackPage(p => p - 1)}
                    disabled={feedbackPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {feedbackPage + 1} / {feedbackTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={() => setFeedbackPage(p => p + 1)}
                    disabled={feedbackPage >= feedbackTotalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
