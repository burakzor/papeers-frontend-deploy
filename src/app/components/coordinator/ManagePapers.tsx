import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { SearchableSelect } from '../ui/searchable-select';
import {
  Search,
  UserCheck,
  Loader2,
  Calendar as CalendarIcon,
  FileText,
  UserPlus,
  Plus,
  Trash2,
  Users,
  ExternalLink,
  PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import LabMemberNameLink from './LabMemberNameLink';
import { cn } from '../ui/utils';

import {
  getPapersByLab,
  getEligibleReviewers,
  createPaper,
} from '../../services/paperService';
import {
  createAssignment,
  deleteAssignment,
  getLabAssignments
} from '../../services/assignmentService';
import { getLabMembers } from '../../services/labService';
import { getAllVenues } from '../../services/venueService';

import { motion, AnimatePresence } from 'framer-motion';
import FeatherLoader from '../shared/FeatherLoader'; // Yolu projene göre teyit et

export default function ManagePapers() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not-assigned' | 'assigned'>('all');
  const [selectedReviewerByPaper, setSelectedReviewerByPaper] = useState<Record<string, string>>({});
  const [selectedDeadlineByPaper, setSelectedDeadlineByPaper] = useState<Record<string, string>>({});
  const [reviewerToRemove, setReviewerToRemove] = useState<{ id: string, name: string } | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [mainAuthorError, setMainAuthorError] = useState('');
  const [createForm, setCreateForm] = useState({
    mainAuthorId: '',
    overleafLink: '',
    overleafProjectUrl: '',
    title: '',
    track: '',
    expectedVenueId: '',
    coAuthorIds: [] as string[],
  });

  const labId = useMemo(() => {
    try {
      const stored = window.localStorage.getItem('prs.selected.lab');
      return stored ? JSON.parse(stored)?.id : null;
    } catch {
      return null;
    }
  }, []);

  const { data: papers = [], isLoading: isLoadingPapers } = useQuery({
    queryKey: ['lab-papers', labId],
    queryFn: () => getPapersByLab(labId!),
    enabled: !!labId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: labMembersRaw = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['lab-members-all', labId],
    queryFn: () => getLabMembers(),
    enabled: !!labId,
    staleTime: 1000 * 60 * 5,
  });

  const labMembers = useMemo(
    () => labMembersRaw
      .filter((m: any) => m.user?.role === 'LAB_MEMBER')
      .map((m: any) => ({
        id: m.user.id,
        name: m.user.name || m.user.email,
        role: 'Member',
        workload: m.workload
      })),
    [labMembersRaw]
  );

  const reviewers = labMembers;

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['lab-assignments', labId],
    queryFn: () => getLabAssignments(labId!),
    enabled: !!labId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: venues = [] } = useQuery({
    queryKey: ['all-venues'],
    queryFn: getAllVenues,
    enabled: isCreateDialogOpen,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: () => createPaper({
      labId: labId!,
      mainAuthorId: createForm.mainAuthorId,
      overleafLink: createForm.overleafLink,
      overleafProjectUrl: createForm.overleafProjectUrl || undefined,
      title: createForm.title || undefined,
      track: createForm.track || undefined,
      expectedVenueId: createForm.expectedVenueId || undefined,
      coAuthorIds: createForm.coAuthorIds.length > 0 ? createForm.coAuthorIds : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-papers', labId] });
      toast.success('Paper created. Author(s) have been notified.');
      setIsCreateDialogOpen(false);
      setMainAuthorError('');
      setCreateForm({ mainAuthorId: '', overleafLink: '', overleafProjectUrl: '', title: '', track: '', expectedVenueId: '', coAuthorIds: [] });
    },
    onError: (error: any) => {
      const msg: string = error?.message ?? '';
      if (msg.toLowerCase().includes('belong') || msg.toLowerCase().includes('main author')) {
        setMainAuthorError('Guest members cannot be set as the main author.');
      } else {
        toast.error(msg || 'Failed to create paper.');
      }
    },
  });

  const assignMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-papers', labId] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      toast.success('Reviewer assigned.');
    },
    onError: (error: any) => {
      toast.error( error?.message || error?.response?.data || 'Failed to assign reviewer.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-papers', labId] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      toast.success('Reviewer removed.');
      setReviewerToRemove(null);
    },
    onError: () => toast.error('Failed to remove reviewer.'),
  });

  const processedPapers = useMemo(() => {
    return papers.map((paper) => {
      const reviewersWithDeadline = (paper.assignedReviewers || []).filter(
        (rev) => rev.assignmentStatus !== 'REJECTED'
      ).map((rev) => {
        const assignment = assignments.find((a: any) => a.id === rev.assignmentId);
        return {
          ...rev,
          deadline: assignment?.deadline || (rev as any).deadline,
        };
      });

      const latestDeadline = reviewersWithDeadline.reduce((latest, current) => {
        if (!current.deadline) return latest;
        if (!latest) return current.deadline;
        return new Date(current.deadline) > new Date(latest) ? current.deadline : latest;
      }, undefined as string | undefined);

      return {
        ...paper,
        assignedReviewers: reviewersWithDeadline,
        latestDeadline
      };
    });
  }, [papers, assignments]);

  const filteredPapers = useMemo(() => {
    return processedPapers.filter((paper) => {
      const authorsText = [paper.mainAuthorName, ...(paper.coAuthorNames || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch =
        paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        authorsText.includes(searchTerm.toLowerCase());

      const isAssigned = paper.assignedReviewers && paper.assignedReviewers.length > 0;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'assigned' ? isAssigned : !isAssigned);

      return matchesSearch && matchesStatus;
    });
  }, [processedPapers, searchTerm, statusFilter]);

  const notAssignedCount = processedPapers.filter(p => !p.assignedReviewers || p.assignedReviewers.length === 0).length;
  const assignedCount = processedPapers.filter(p => p.assignedReviewers && p.assignedReviewers.length > 0).length;

  const handleAssignReviewer = (paperId: string) => {
    const reviewerId = selectedReviewerByPaper[paperId];
    const deadlineDate = selectedDeadlineByPaper[paperId];

    if (!reviewerId) return toast.error('Please select a reviewer.');
    if (!deadlineDate) return toast.error('Please select a deadline.');
    if (deadlineDate < tomorrowString) {
      return toast.error('Deadline must be in the future (tomorrow or later).');
    }

    assignMutation.mutate({
      paperId,
      reviewerId,
      assignedDate: new Date().toISOString(),
      deadline: `${deadlineDate}T23:59:59`,
    });

    setSelectedReviewerByPaper(prev => ({ ...prev, [paperId]: '' }));
    setSelectedDeadlineByPaper(prev => ({ ...prev, [paperId]: '' }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">In Progress</Badge>;
      case 'INTERNAL_REVIEW':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700">Internal Review</Badge>;
      case 'READY_FOR_SUBMISSION': 
        return <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">Ready for Submission</Badge>;
      case 'SUBMITTED_TO_VENUE': 
        return <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">Submitted to Venue</Badge>;
      case 'REVISION_REQUIRED': 
        return <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">Revision Required</Badge>;
      case 'ACCEPTED': 
        return <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">Accepted 🎉</Badge>;
      case 'REJECTED': 
        return <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">Rejected</Badge>;
      default: 
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const isLoading = isLoadingPapers || isLoadingMembers || isLoadingAssignments;
  
  const tomorrowString = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Lab Papers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign reviewers and track submission status across the lab.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Create Paper
        </Button>
      </div>

      {/* ANIMASYONLU ALAN BAŞLIYOR */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          // YÜKLENİYOR EKRANI
          <motion.div
            key="loader"
            className="py-24 flex flex-col items-center justify-center"
          >
            <FeatherLoader size={100} />
            <motion.p
              exit={{ opacity: 0, filter: "blur(5px)" }}
              className="mt-8 text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400 animate-pulse"
            >
              Loading papers...
            </motion.p>
          </motion.div>
        ) : (
          // İÇERİK EKRANI
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6"
          >




      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none">{processedPapers.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Total submissions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-500/15">
              <Users className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none text-yellow-600 dark:text-yellow-400">{notAssignedCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Awaiting assignment</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
              <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-none text-green-600 dark:text-green-400">{assignedCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Actively reviewed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            placeholder="Search by title or author name..."
          />
        </div>
        <SearchableSelect
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as 'all' | 'not-assigned' | 'assigned')}
          options={[
            { value: 'all', label: 'All papers' },
            { value: 'not-assigned', label: 'Not assigned' },
            { value: 'assigned', label: 'Assigned' },
          ]}
          className="sm:w-48"
        />
      </div>

      {/* Paper list */}
      <div className="space-y-4">
        {filteredPapers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="font-medium text-foreground">No papers found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter.</p>
            <Button
              variant="link"
              className="mt-3 text-sm"
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          filteredPapers.map((paper) => {
            const hasReviewers = paper.assignedReviewers && paper.assignedReviewers.length > 0;
            const isInProgress = paper.status === 'IN_PROGRESS';

            // YENİ: Makalenin dergiye yollanıp yollanmadığını (veya sonraki aşamalarını) kontrol et
            const isSubmittedOrBeyond = ['SUBMITTED_TO_VENUE', 'ACCEPTED', 'REJECTED'].includes(paper.status);
            
            // YENİ: Hakem ataması yapılabilecek müsait bir durumda mı?
            const canAssignReviewer = !isInProgress && !isSubmittedOrBeyond;

            // YENİ: Frontend'de görsel olarak "Ready for Submission" gösterme mantığı
            let displayStatus = paper.status;
            if (paper.status === 'INTERNAL_REVIEW') {
              const allReviewersDone = hasReviewers && paper.assignedReviewers.every(
                (rev: any) => rev.assignmentStatus === 'DONE' || rev.assignmentStatus === 'COMPLETED'
              );
              if (allReviewersDone) {
                displayStatus = 'READY_FOR_SUBMISSION';
              }
            }

            return (
              <Card key={paper.id} className="overflow-hidden">
                <div className={cn('h-1 w-full', isInProgress ? 'bg-orange-400' : hasReviewers ? 'bg-green-500' : 'bg-yellow-400')} />
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-semibold leading-snug">
                        {paper.title || <span className="italic text-muted-foreground font-normal">Untitled Paper</span>}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {getStatusBadge(displayStatus)}
                      {!isInProgress && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            hasReviewers
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                          )}
                        >
                          {hasReviewers ? 'Assigned' : 'Unassigned'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    {paper.track && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                        {paper.track}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 shrink-0" />
                      {paper.mainAuthorName ? (
                        <LabMemberNameLink
                          name={paper.mainAuthorName}
                          className="font-medium text-foreground hover:underline"
                        />
                      ) : (
                        <span className="italic">Unknown author</span>
                      )}
                      {paper.coAuthorNames?.filter(Boolean).map((author, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          <span>·</span>
                          <LabMemberNameLink
                            name={author}
                            className="hover:text-foreground hover:underline"
                          />
                        </span>
                      ))}
                    </span>
                    {paper.version != null && (
                      <span className="text-muted-foreground/70">v{paper.version}</span>
                    )}
                    {paper.expectedVenueName && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3 shrink-0" />
                        {paper.expectedVenueName}
                      </span>
                    )}
                    <span className="flex items-center gap-1" title={(paper as any).latestDeadline ? "Latest Review Deadline" : "Submission Date"}>
                      <CalendarIcon className="h-3 w-3 shrink-0" />
                      {(paper as any).latestDeadline 
                        ? `Deadline: ${new Date((paper as any).latestDeadline).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : `Submitted: ${new Date(paper.submissionDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      }
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 bg-slate-950 text-white border-none dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200"
                      onClick={() => window.open(paper.overleafLink, '_blank', 'noopener,noreferrer')}
                      disabled={!paper.overleafLink}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in Overleaf
                    </Button>
                    {paper.contentLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => window.open(paper.contentLink, '_blank', 'noopener,noreferrer')}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Download Paper
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {isInProgress && (
                    <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 flex items-center gap-2 text-sm text-orange-800">
                      <PenLine className="h-4 w-4 shrink-0" />
                      <span>Author is writing this paper in Overleaf. Reviewer assignment will be available once they finish.</span>
                    </div>
                  )}

                  {/* Current reviewers */}
                  {!isInProgress && (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Assigned reviewers
                        </p>
                      </div>

                      {!hasReviewers ? (
                        <p className="text-sm text-muted-foreground italic">None assigned yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {paper.assignedReviewers.map((rev) => {
                            const isPending = rev.assignmentStatus === 'PENDING' || rev.assignmentStatus === 'PENDING_REFUSAL';
                            const isAccepted = rev.assignmentStatus === 'ACCEPTED';
                            const isStarted = rev.assignmentStatus === 'STARTED' || rev.assignmentStatus === 'CLARIFICATION_PENDING';
                            const isFinished = rev.assignmentStatus === 'DONE' || rev.assignmentStatus === 'COMPLETED';
                            
                            return (
                            <span
                              key={rev.assignmentId}
                              className={cn(
                                "inline-flex flex-col items-start gap-0.5 rounded-xl border px-3 py-1.5 text-sm font-medium",
                                isPending ? "border-amber-200 bg-amber-50 text-amber-700" :
                                isAccepted ? "border-blue-200 bg-blue-50 text-blue-700" :
                                isStarted ? "border-purple-200 bg-purple-50 text-purple-700" :
                                isFinished ? "border-green-200 bg-green-50 text-green-700" :
                                "border-border bg-background"
                              )}
                            >
                              <span className="flex items-center gap-1.5">
                                {rev.reviewerName}
                                <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
                                  ({isPending ? 'Pending' : isAccepted ? 'Accepted' : isStarted ? 'In Progress' : isFinished ? 'Finished' : rev.assignmentStatus})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReviewerToRemove({ id: rev.assignmentId, name: rev.reviewerName })}
                                  disabled={removeMutation.isPending || !canAssignReviewer} // Atama kapalıysa silemez de
                                  className={cn(
                                    "rounded-full p-0.5 disabled:opacity-50 transition-colors ml-1",
                                    isPending ? "text-amber-700 hover:bg-amber-100 hover:text-amber-900" :
                                    isAccepted ? "text-blue-700 hover:bg-blue-100 hover:text-blue-900" :
                                    isStarted ? "text-purple-700 hover:bg-purple-100 hover:text-purple-900" :
                                    isFinished ? "text-green-700 hover:bg-green-100 hover:text-green-900" :
                                    "text-muted-foreground hover:bg-red-100 hover:text-red-600"
                                  )}
                                  aria-label={`Remove ${rev.reviewerName}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </span>
                              {(rev as any).deadline && (
                                <span className="text-[10.5px] opacity-80 font-normal flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                  <CalendarIcon className="h-2.5 w-2.5" />
                                  Due: {new Date((rev as any).deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {/* Clarification Note Rendering ... (Same as before) */}
                              {rev.clarificationRound !== undefined && rev.clarificationRound > 0 && (() => {
                                const note = rev.clarificationNote;
                                let authorNote = note || '';
                                let reviewerNote = '';
                                const separator = "\n\nReviewer Response: ";
                                if (note && note.includes(separator)) {
                                  const parts = note.split(separator);
                                  authorNote = parts[0];
                                  reviewerNote = parts[1];
                                } else if (note && note.startsWith("Reviewer Response: ")) {
                                  authorNote = '';
                                  reviewerNote = note.replace("Reviewer Response: ", "");
                                }

                                return (
                                  <div className="mt-1 text-[10.5px] opacity-90 border-l-2 border-amber-300 pl-1.5 max-w-[200px] space-y-1">
                                    <div className="font-medium text-amber-600/90 dark:text-amber-500/90">Clarification Round {rev.clarificationRound}:</div>
                                    
                                    {authorNote && (
                                      <div className="bg-muted/50 rounded p-1 border border-border/50">
                                        <span className="font-semibold block mb-0.5">{paper.mainAuthorName} (Author):</span>
                                        <span className="whitespace-pre-wrap break-words leading-tight">{authorNote}</span>
                                      </div>
                                    )}
                                    
                                    {reviewerNote && (
                                      <div className="bg-muted/50 rounded p-1 border border-border/50 mt-1">
                                        <span className="font-semibold block mb-0.5">{rev.reviewerName} (Reviewer):</span>
                                        <span className="whitespace-pre-wrap break-words leading-tight">{reviewerNote}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </span>
                          );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assign new reviewer */}
                  {canAssignReviewer ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
                      <div className="flex-1">
                        <SearchableSelect
                          value={selectedReviewerByPaper[paper.id] ?? ''}
                          onValueChange={(v) =>
                            setSelectedReviewerByPaper(prev => ({ ...prev, [paper.id]: v }))
                          }
                          options={reviewers
                            .filter(r =>
                              !paper.assignedReviewers?.some(a => a.reviewerId === r.id) &&
                              r.id !== paper.mainAuthorId &&
                              !(paper.coAuthorIds ?? []).includes(r.id)
                            )
                            .map((r) => ({
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
                          placeholder="Select reviewer..."
                          className="h-9 text-sm"
                        />
                      </div>

                      <div className="relative sm:w-44">
                        <CalendarIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="date"
                          min={tomorrowString}
                          value={selectedDeadlineByPaper[paper.id] ?? ''}
                          onChange={(e) =>
                            setSelectedDeadlineByPaper(prev => ({ ...prev, [paper.id]: e.target.value }))
                          }
                          className="h-9 pl-9 text-sm"
                        />
                      </div>

                      <Button
                        size="sm"
                        className="h-9 gap-1.5 shrink-0"
                        onClick={() => handleAssignReviewer(paper.id)}
                        disabled={assignMutation.isPending || !selectedReviewerByPaper[paper.id]}
                      >
                        {assignMutation.isPending
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <UserPlus className="h-3.5 w-3.5" />
                        }
                        Assign
                      </Button>
                    </div>
                  ) : !isInProgress && isSubmittedOrBeyond ? (
                    <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-md border border-border mt-4">
                      <p>This paper has been submitted to a venue. Reviewer assignment is now closed.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      </motion.div>
        )}
      </AnimatePresence>

      {/* Create Paper Dialog (Unchanged) */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setMainAuthorError('');
          setCreateForm({ mainAuthorId: '', overleafLink: '', overleafProjectUrl: '', title: '', track: '', expectedVenueId: '', coAuthorIds: [] });
        }
      }}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create New Paper</DialogTitle>
            <DialogDescription>
              Create a paper slot and notify the author(s). Title, venue, track, and co-authors are optional and can be set later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0 pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="main-author">Main Author <span className="text-red-500">*</span></Label>
              <SearchableSelect
                value={createForm.mainAuthorId}
                onValueChange={(v) => { setCreateForm(f => ({ ...f, mainAuthorId: v })); setMainAuthorError(''); }}
                options={labMembers.map((m: any) => ({ value: m.id, label: m.name }))}
                placeholder="Select main author..."
              />
              {mainAuthorError && (
                <p className="text-sm text-red-600 dark:text-red-400">{mainAuthorError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="overleaf-link">Overleaf Invitation Link <span className="text-red-500">*</span></Label>
              <Input
                id="overleaf-link"
                placeholder="https://www.overleaf.com/..."
                value={createForm.overleafLink}
                onChange={(e) => setCreateForm(f => ({ ...f, overleafLink: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="overleaf-project-url">
                Overleaf Project URL <span className="text-muted-foreground text-xs">(for extension — optional)</span>
              </Label>
              <Input
                id="overleaf-project-url"
                placeholder="https://www.overleaf.com/project/..."
                value={createForm.overleafProjectUrl}
                onChange={(e) => setCreateForm(f => ({ ...f, overleafProjectUrl: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="title"
                  placeholder="Untitled Paper"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="track">Track <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="track"
                  placeholder="e.g. Machine Learning"
                  value={createForm.track}
                  onChange={(e) => setCreateForm(f => ({ ...f, track: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venue">Expected Venue <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <SearchableSelect
                value={createForm.expectedVenueId}
                onValueChange={(v) => setCreateForm(f => ({ ...f, expectedVenueId: v }))}
                options={(venues as any[]).map((v: any) => ({
                  value: v.id,
                  label: `${v.name}${v.acronym ? ` (${v.acronym})` : ''}`,
                }))}
                placeholder="No venue selected"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Co-Authors <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <div className="max-h-32 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                {labMembers
                  .filter((m: any) => m.id !== createForm.mainAuthorId)
                  .map((m: any) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={createForm.coAuthorIds.includes(m.id)}
                        onChange={(e) => {
                          setCreateForm(f => ({
                            ...f,
                            coAuthorIds: e.target.checked
                              ? [...f.coAuthorIds, m.id]
                              : f.coAuthorIds.filter(id => id !== m.id),
                          }));
                        }}
                        className="rounded"
                      />
                      {m.name}
                    </label>
                  ))}
                {labMembers.filter((m: any) => m.id !== createForm.mainAuthorId).length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-1">No other lab members available.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !createForm.mainAuthorId || !createForm.overleafLink.trim()}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Paper
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Reviewer Dialog */}
      <Dialog open={!!reviewerToRemove} onOpenChange={(open) => !open && setReviewerToRemove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Reviewer</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{reviewerToRemove?.name}</strong> from this paper? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewerToRemove(null)} disabled={removeMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => removeMutation.mutate(reviewerToRemove!.id)} disabled={removeMutation.isPending}>
              {removeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remove Reviewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}