import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SearchableSelect } from '../ui/searchable-select';
// YENİ: Standart Select bileşenlerini ekledik
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { AlertCircle, Clock, Bell, CheckCircle2, XCircle, Mail, Loader2, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../context/AuthContext';
import LabMemberNameLink from './LabMemberNameLink';

import {
  getExtensionRequests,
  getRefusalRequests,
  acceptRequestAction,
  declineRequestAction,
  RequestResponseDTO,
} from '../../services/requestService';
import {
  getLabAssignments,
  AssignmentResponseDTO,
  deleteAssignment,
  createAssignment,
} from '../../services/assignmentService';
import { getEligibleAuthors } from '../../services/userService';
import { updateReminderThreshold } from '../../services/labService';

import { motion, AnimatePresence } from 'framer-motion';
import FeatherLoader from '../shared/FeatherLoader'; // Yolu projene göre teyit et

interface OverdueAssignment extends AssignmentResponseDTO {
  daysOverdue: number;
}

function StatusBadge({ status }: { status?: string }) {
  const s = status?.toUpperCase();
  if (s === 'ACCEPTED' || s === 'REASSIGNED')
    return (
        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {s === 'REASSIGNED' ? 'Reassigned' : 'Approved'}
        </Badge>
    );
  if (s === 'DECLINED')
    return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <XCircle className="mr-1 h-3 w-3" />
          Declined
        </Badge>
    );
  return (
      <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-400">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
  );
}

export default function DeadlineManagement() {
  const { selectedLab, selectLab } = useAuth();
  const queryClient = useQueryClient();

  const labId = selectedLab?.id ?? null;

  const [requestsTab, setRequestsTab] = useState<'extensions' | 'rejections'>('extensions');
  const [selectedExtension, setSelectedExtension] = useState<RequestResponseDTO | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedDeadline, setSelectedDeadline] = useState<OverdueAssignment | null>(null);
  const [selectedRejection, setSelectedRejection] = useState<RequestResponseDTO | null>(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [rejectionDialogMode, setRejectionDialogMode] = useState<'change-reviewer' | null>(null);
  const [notificationThreshold, setNotificationThreshold] = useState<number>(
      selectedLab?.reminderDaysBeforeDeadline ?? 3
  );

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['deadline-assignments', labId],
    queryFn: () => getLabAssignments(labId!),
    enabled: !!labId,
    staleTime: 1000 * 60 * 2,
  });

  const { data: reviewersRaw = [], isLoading: isLoadingReviewers } = useQuery({
    queryKey: ['eligible-reviewers', labId],
    queryFn: () => getEligibleAuthors(labId!),
    enabled: !!labId,
    staleTime: 1000 * 60 * 10,
  });

  const { data: extensions = [], isLoading: isLoadingExtensions } = useQuery({
    queryKey: ['extension-requests'],
    queryFn: getExtensionRequests,
    staleTime: 1000 * 60 * 2,
  });

  const { data: rejections = [], isLoading: isLoadingRejections } = useQuery({
    queryKey: ['refusal-requests'],
    queryFn: getRefusalRequests,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = isLoadingAssignments || isLoadingReviewers || isLoadingExtensions || isLoadingRejections;

  const reviewers = useMemo(
      () => reviewersRaw.map((r: any) => ({
        id: r.id,
        name: r.name || r.fullName || r.email,
        rating: r.rating,
      })),
      [reviewersRaw]
  );

  const getReviewerName = (id?: string) => {
    if (!id) return 'Unknown';
    const r = reviewers.find(x => x.id === id);
    return r?.name ?? 'Unknown';
  };

  const getReviewerEmail = (id: string) =>
      (reviewersRaw as any[]).find(r => r.id === id)?.email ?? '';

  const getPaperTitle = (assignmentId: string) =>
      assignments.find(a => a.id === assignmentId)?.paperTitle ?? 'Unknown Paper';

  const overdueAssignments: OverdueAssignment[] = useMemo(() => {
    const now = new Date();
    return assignments
        .filter(a => {
          if (a.status === 'COMPLETED' || a.status === 'DONE' || a.status === 'PENDING_REFUSAL') return false;
          return new Date(a.deadline) < now;
        })
        .map(a => {
          const diffMs = Math.abs(now.getTime() - new Date(a.deadline).getTime());
          return { ...a, daysOverdue: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) };
        });
  }, [assignments]);

  const pendingExtensions = extensions.filter(e => e.status?.toUpperCase() === 'PENDING');
  const pendingRejections = rejections.filter(r => r.status?.toUpperCase() === 'PENDING');

  const approveExtensionMutation = useMutation({
    mutationFn: (id: string) => acceptRequestAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extension-requests'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      toast.success('Extension approved.');
    },
    onError: () => toast.error('Failed to approve extension.'),
  });

  const declineExtensionMutation = useMutation({
    mutationFn: (id: string) => declineRequestAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extension-requests'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      toast.success('Extension declined.');
      setSelectedExtension(null);
      setDeclineReason('');
    },
    onError: () => toast.error('Failed to decline extension.'),
  });

  const approveRejectionMutation = useMutation({
    mutationFn: (id: string) => acceptRequestAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refusal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers', labId] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      toast.success('Rejection accepted. Please reassign the paper.');
    },
    onError: () => toast.error('Failed to accept rejection.'),
  });

  const declineRejectionMutation = useMutation({
    mutationFn: (id: string) => declineRequestAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refusal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      toast.success('Reviewer must complete the review.');
    },
    onError: () => toast.error('Failed to process request.'),
  });

  const changeReviewerMutation = useMutation({
    mutationFn: async ({ assignment, reviewerId, deadline }: {
      assignment: OverdueAssignment;
      reviewerId: string;
      deadline: string;
    }) => {
      await deleteAssignment(assignment.id);
      await createAssignment({
        paperId: assignment.paperId,
        reviewerId,
        assignedDate: new Date().toISOString(),
        deadline: `${deadline}T23:59:59`,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['deadline-assignments', labId] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers', labId] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      toast.success(`Reviewer changed to ${getReviewerName(vars.reviewerId)}.`);
      setSelectedDeadline(null);
      setSelectedReviewerId('');
      setNewDeadline('');
    },
    onError: () => toast.error('Failed to reassign reviewer.'),
  });

  const changeReviewerForRejectionMutation = useMutation({
    mutationFn: async ({ rejection, reviewerId, deadline }: {
      rejection: RequestResponseDTO;
      reviewerId: string;
      deadline: string;
    }) => {
      const related = assignments.find(a => a.id === rejection.assignmentId);
      if (!related) throw new Error('Original assignment not found.');
      await createAssignment({
        paperId: related.paperId,
        reviewerId,
        assignedDate: new Date().toISOString(),
        deadline: `${deadline}T23:59:59`,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['deadline-assignments', labId] });
      queryClient.invalidateQueries({ queryKey: ['refusal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers', labId] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      toast.success(`Review assigned to ${getReviewerName(vars.reviewerId)}.`);
      setSelectedRejection(null);
      setRejectionDialogMode(null);
      setSelectedReviewerId('');
      setNewDeadline('');
    },
    onError: () => toast.error('Failed to reassign reviewer.'),
  });

  const thresholdMutation = useMutation({
    mutationFn: (days: number) => updateReminderThreshold(days),
    onSuccess: () => {
      selectLab({ ...selectedLab!, reminderDaysBeforeDeadline: notificationThreshold });
      toast.success(`Reminder threshold updated to ${notificationThreshold} day(s).`);
    },
    onError: () => toast.error('Failed to update reminder threshold.'),
  });

  const handleDeclineExtension = () => {
    if (!selectedExtension) return;
    if (!declineReason.trim()) return toast.error('Please provide a reason for declining.');
    declineExtensionMutation.mutate(selectedExtension.id);
  };

  const handleConfirmChangeReviewer = () => {
    if (!selectedDeadline || !selectedReviewerId || !newDeadline)
      return toast.error('Please select a reviewer and a deadline.');
    if (new Date(newDeadline) <= new Date(selectedDeadline.deadline))
      return toast.error('New deadline must be after the original deadline.');
    changeReviewerMutation.mutate({ assignment: selectedDeadline, reviewerId: selectedReviewerId, deadline: newDeadline });
  };

  const handleConfirmChangeReviewerForRejection = () => {
    if (!selectedRejection || !selectedReviewerId || !newDeadline)
      return toast.error('Please select a reviewer and a deadline.');
    changeReviewerForRejectionMutation.mutate({ rejection: selectedRejection, reviewerId: selectedReviewerId, deadline: newDeadline });
  };


  const todayString = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Deadline Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor overdue reviews and manage extension or rejection requests.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            className="py-24 flex flex-col items-center justify-center"
          >
            <FeatherLoader size={100} />
            <p className="mt-8 text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400 animate-pulse">
              Loading deadline data...
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6"
          >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="flex items-center gap-4 pt-5 pb-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </span>
                    <div>
                      <p className="text-2xl font-semibold leading-none">{overdueAssignments.length}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Overdue reviews</p>
                    </div>
                  </CardContent>
                </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-500/15">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </span>
              <div>
                <p className="text-2xl font-semibold leading-none">
                  {pendingExtensions.length + pendingRejections.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Pending requests</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-2">Reminder threshold</p>
                <div className="flex items-center gap-2">
                  {/* GÜNCELLENEN KISIM: Search özelliği olmayan standart Select kullanımı */}
                  <Select
                      value={String(notificationThreshold)}
                      onValueChange={(v) => setNotificationThreshold(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-sm w-36">
                      <SelectValue placeholder="Select days" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 3, 5, 7, 10, 14].map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d} day{d > 1 ? 's' : ''} before
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                      size="sm"
                      className="h-8 px-3 text-sm"
                      onClick={() => thresholdMutation.mutate(notificationThreshold)}
                      disabled={
                          thresholdMutation.isPending ||
                          notificationThreshold === (selectedLab?.reminderDaysBeforeDeadline ?? 3)
                      }
                  >
                    {thresholdMutation.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : 'Save'
                    }
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Overdue Reviews</CardTitle>
            <p className="text-sm text-muted-foreground">Reviews that have passed their deadline and require action.</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-6">Paper</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-center">Overdue</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                        No overdue reviews.
                      </TableCell>
                    </TableRow>
                ) : (
                    overdueAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="pl-6 font-medium max-w-[200px] truncate">
                            {assignment.paperTitle}
                          </TableCell>
                          <TableCell>
                            <LabMemberNameLink
                                name={getReviewerName(assignment.reviewerId)}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(assignment.deadline).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive" className="tabular-nums">
                              {assignment.daysOverdue}d
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    const email = getReviewerEmail(assignment.reviewerId);
                                    if (!email) return toast.error('Reviewer email not found.');
                                    window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Overdue review: ${assignment.paperTitle}`)}`;
                                  }}
                              >
                                <Mail className="h-3.5 w-3.5" />
                                Contact
                              </Button>
                              <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5"
                                  onClick={() => {
                                    setSelectedDeadline(assignment);
                                    setNewDeadline('');
                                    setSelectedReviewerId('');
                                  }}
                              >
                                <UserCog className="h-3.5 w-3.5" />
                                Reassign
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Requests</CardTitle>
            <p className="text-sm text-muted-foreground">Review extension and rejection requests from lab members.</p>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex gap-1 border-b border-border">
              {(['extensions', 'rejections'] as const).map((tab) => {
                const count = tab === 'extensions' ? pendingExtensions.length : pendingRejections.length;
                return (
                    <button
                        key={tab}
                        onClick={() => setRequestsTab(tab)}
                        className={`relative pb-2.5 px-1 mr-4 text-sm font-medium transition-colors border-b-2 ${
                            requestsTab === tab
                                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {tab === 'extensions' ? 'Extension Requests' : 'Rejection Requests'}
                      {count > 0 && (
                          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                      {count}
                    </span>
                      )}
                    </button>
                );
              })}
            </div>

            {requestsTab === 'extensions' && (
                <div className="space-y-3">
                  {pendingExtensions.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">No pending extension requests.</p>
                  ) : (
                      pendingExtensions.map((ext) => (
                          <div key={ext.id} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{getPaperTitle(ext.assignmentId)}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Requested by{' '}
                                  <span className="font-medium text-foreground">{getReviewerName(ext.labMemberId)}</span>
                                </p>
                                {ext.requestedDeadline && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      New deadline requested:{' '}
                                      <span className="font-medium text-foreground">
                              {new Date(ext.requestedDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                                    </p>
                                )}
                              </div>
                              <StatusBadge status={ext.status} />
                            </div>
                            {ext.excuse && (
                                <div className="mt-3 rounded-md bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                                  {ext.excuse}
                                </div>
                            )}
                            {ext.status?.toUpperCase() === 'PENDING' && (
                                <div className="mt-3 flex gap-2">
                                  <Button
                                      size="sm"
                                      className="h-8 gap-1.5"
                                      onClick={() => approveExtensionMutation.mutate(ext.id)}
                                      disabled={approveExtensionMutation.isPending}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Approve
                                  </Button>
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1.5"
                                      onClick={() => setSelectedExtension(ext)}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Decline
                                  </Button>
                                </div>
                            )}
                          </div>
                      ))
                  )}
                </div>
            )}

            {requestsTab === 'rejections' && (
                <div className="space-y-3">
                  {pendingRejections.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">No pending rejection requests.</p>
                  ) : (
                      pendingRejections.map((rej) => (
                          <div key={rej.id} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{getPaperTitle(rej.assignmentId)}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Rejected by{' '}
                                  <span className="font-medium text-foreground">{getReviewerName(rej.labMemberId)}</span>
                                </p>
                              </div>
                              <StatusBadge status={rej.status?.toUpperCase() === 'ACCEPTED' ? 'REASSIGNED' : rej.status} />
                            </div>
                            {rej.excuse && (
                                <div className="mt-3 rounded-md border border-red-200/70 bg-red-50/60 px-3 py-2.5 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                                  {rej.excuse}
                                </div>
                            )}
                            {rej.status?.toUpperCase() === 'PENDING' && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8"
                                      onClick={() => approveRejectionMutation.mutate(rej.id)}
                                      disabled={approveRejectionMutation.isPending}
                                  >
                                    Accept Rejection
                                  </Button>
                                  <Button
                                      size="sm"
                                      className="h-8 gap-1.5"
                                      onClick={() => {
                                        setSelectedRejection(rej);
                                        setRejectionDialogMode('change-reviewer');
                                        setNewDeadline('');
                                        setSelectedReviewerId('');
                                      }}
                                  >
                                    <UserCog className="h-3.5 w-3.5" />
                                    Change Reviewer
                                  </Button>
                                  <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8"
                                      onClick={() => declineRejectionMutation.mutate(rej.id)}
                                      disabled={declineRejectionMutation.isPending}
                                  >
                                    Force Complete
                                  </Button>
                                </div>
                            )}
                          </div>
                      ))
                  )}
                </div>
            )}
          </CardContent>
        </Card>

        </motion.div>
          )}
        </AnimatePresence>

        <Dialog
            open={selectedDeadline !== null}
            onOpenChange={(open) => {
              if (!open) { setSelectedDeadline(null); setSelectedReviewerId(''); setNewDeadline(''); }
            }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign Reviewer</DialogTitle>
              <DialogDescription>
                Select a new reviewer and set an updated deadline for this paper.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm space-y-1">
                <p><span className="text-muted-foreground">Paper:</span> <span className="font-medium">{selectedDeadline?.paperTitle}</span></p>
                <p><span className="text-muted-foreground">Current reviewer:</span> <span className="font-medium">{getReviewerName(selectedDeadline?.reviewerId)}</span></p>
              </div>
              <div className="space-y-1.5">
                <Label>New reviewer</Label>
                <SearchableSelect
                    value={selectedReviewerId}
                    onValueChange={setSelectedReviewerId}
                    options={reviewers.map(r => ({
                      value: r.id,
                      label: r.name,
                      badge: r.rating !== null && r.rating !== undefined ? (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            ★ {r.rating}
                          </Badge>
                      ) : (
                          <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground border-slate-200">
                            New
                          </Badge>
                      ),
                    }))}
                    placeholder="Select a reviewer"
                />
              </div>
              <div className="space-y-1.5">
                <Label>New deadline</Label>
                <Input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} min={todayString} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDeadline(null)}>Cancel</Button>
              <Button
                  onClick={handleConfirmChangeReviewer}
                  disabled={changeReviewerMutation.isPending || !selectedReviewerId || !newDeadline}
              >
                {changeReviewerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={selectedExtension !== null} onOpenChange={() => setSelectedExtension(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Decline Extension Request</DialogTitle>
              <DialogDescription>
                Provide a reason so the reviewer understands why the extension was not granted.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-2">
              <Label>Reason</Label>
              <Textarea
                  placeholder="Explain why the extension cannot be granted..."
                  rows={4}
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedExtension(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeclineExtension} disabled={declineExtensionMutation.isPending}>
                {declineExtensionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Decline
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
            open={rejectionDialogMode === 'change-reviewer' && selectedRejection !== null}
            onOpenChange={(open) => {
              if (!open) { setSelectedRejection(null); setRejectionDialogMode(null); setSelectedReviewerId(''); setNewDeadline(''); }
            }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign New Reviewer</DialogTitle>
              <DialogDescription>
                The original reviewer rejected this paper. Choose a replacement and set a deadline.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-red-200/70 bg-red-50/50 px-3 py-2.5 text-sm space-y-1 dark:border-red-500/20 dark:bg-red-500/10">
                <p><span className="text-muted-foreground">Paper:</span> <span className="font-medium">{getPaperTitle(selectedRejection?.assignmentId ?? '')}</span></p>
                <p><span className="text-muted-foreground">Rejected by:</span> <span className="font-medium">{getReviewerName(selectedRejection?.labMemberId)}</span></p>
                {selectedRejection?.excuse && (
                    <p className="text-red-700 dark:text-red-400 italic mt-1">"{selectedRejection.excuse}"</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>New reviewer</Label>
                <SearchableSelect
                    value={selectedReviewerId}
                    onValueChange={setSelectedReviewerId}
                    options={reviewers.map(r => ({
                      value: r.id,
                      label: r.name,
                      badge: r.rating !== null && r.rating !== undefined ? (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            ★ {r.rating}
                          </Badge>
                      ) : (
                          <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground border-slate-200">
                            New
                          </Badge>
                      ),
                    }))}
                    placeholder="Select a reviewer"
                />
              </div>
              <div className="space-y-1.5">
                <Label>New deadline</Label>
                <Input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} min={todayString} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedRejection(null); setRejectionDialogMode(null); }}>Cancel</Button>
              <Button
                  onClick={handleConfirmChangeReviewerForRejection}
                  disabled={changeReviewerForRejectionMutation.isPending || !selectedReviewerId || !newDeadline}
              >
                {changeReviewerForRejectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}