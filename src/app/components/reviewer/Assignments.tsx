import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileText, Calendar, Clock, Loader2, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';

import {
  createRequest,
} from '../../services/requestService';

import {
  getMyAssignments,
  updateAssignmentStatus,
  finishClarification,
  AssignmentResponseDTO,
} from '../../services/assignmentService';
import { useAuth } from '../../context/AuthContext';

// UI Bileşenleri
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
// Standart Select bileşenleri (Arama özelliği olmayan)
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

import { motion, AnimatePresence } from 'framer-motion';
import FeatherLoader from '../shared/FeatherLoader'; // Yolu projene göre teyit et

export default function Assignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setIsUpdating] = useState(false);
  // Filtre state'i "in-progress" eklenecek şekilde güncellendi
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'in-progress' | 'completed' | 'requests'>('all');

  // --- MODAL STATE'LERİ ---
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [extensionDialogId, setExtensionDialogId] = useState<string | null>(null);
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionDate, setExtensionDate] = useState('');
  const [finishDialogId, setFinishDialogId] = useState<string | null>(null);
  const [finishClarificationDialogId, setFinishClarificationDialogId] = useState<string | null>(null);
  const [clarificationMessage, setClarificationMessage] = useState('');

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: () => {
      const storedUserStr = window.localStorage.getItem('prs.auth.user');
      const currentUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      if (!currentUser?.id) return [];
      return getMyAssignments(currentUser.id);
    },
    staleTime: 1000 * 60 * 2,
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown Date";
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // --- AKSİYON FONKSİYONLARI ---
  const handleStartReview = async (assignment: AssignmentResponseDTO) => {
    try {
      await updateAssignmentStatus({ assignmentId: assignment.id, status: 'STARTED' });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers'] });
      if (assignment.overleafLink) {
        window.open(assignment.overleafLink, '_blank', 'noopener,noreferrer');
      } else {
        toast.error("Overleaf link not found.");
      }
    } catch {
      toast.error("Failed to start review.");
    }
  };

  const handleFinishReview = async () => {
    if (!finishDialogId) return;
    try {
      setIsUpdating(true);
      const loading = toast.loading("Submitting review...");
      await updateAssignmentStatus({ assignmentId: finishDialogId, status: 'DONE' });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers'] });
      queryClient.invalidateQueries({ queryKey: ['my-papers'] });
      toast.success("Review submitted successfully!", { id: loading });
      setFinishDialogId(null);
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinishClarification = async () => {
    if (!finishClarificationDialogId) return;
    try {
      setIsUpdating(true);
      const loading = toast.loading("Submitting clarification...");
      await finishClarification(finishClarificationDialogId, clarificationMessage);
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers'] });
      queryClient.invalidateQueries({ queryKey: ['my-papers'] });
      toast.success("Clarification submitted!", { id: loading });
      setFinishClarificationDialogId(null);
      setClarificationMessage('');
    } catch {
      toast.error("Failed to submit clarification.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAccept = async (assignmentId: string) => {
    try {
      const loading = toast.loading("Accepting assignment...");
      await updateAssignmentStatus({ assignmentId: assignmentId, status: 'ACCEPTED' });
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers'] });
      toast.success("Assignment accepted!", { id: loading });
    } catch {
      toast.error("Operation failed.");
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim() || !rejectDialogId) return toast.error("Please provide a reason.");
    try {
      setIsUpdating(true);
      const loading = toast.loading("Sending refusal request...");
      await createRequest({
        assignmentId: rejectDialogId,
        memberId: user!.id,
        excuse: rejectReason,
        status: "PENDING",
        type: "REFUSAL"
      });
      toast.success("Refusal request sent.", { id: loading });
      setRejectDialogId(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
    } catch {
      toast.error("Error sending request.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExtensionSubmit = async () => {
    if (!extensionDate || !extensionReason.trim() || !extensionDialogId) return toast.error("Fill required fields.");
    try {
      setIsUpdating(true);
      const loading = toast.loading("Sending extension request...");
      await createRequest({
        assignmentId: extensionDialogId,
        memberId: user!.id,
        excuse: extensionReason,
        status: "PENDING",
        type: "EXTENSION",
        requestedDeadline: `${extensionDate}T23:59:59`,
      });
      toast.success("Extension request sent.", { id: loading });
      setExtensionDialogId(null);
      setExtensionReason('');
      setExtensionDate('');
      queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send extension request.");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- FİLTRELEME MANTIĞI ---
  const filteredAssignments = assignments.filter(a => {
    if (a.status === 'REJECTED') return false;
    const isCompleted = ['DONE', 'COMPLETED'].includes(a.status);
    const isRequest = ['PENDING_REFUSAL', 'PENDING_EXTENSION'].includes(a.status);

    if (filter === 'pending') return a.status === 'PENDING';
    if (filter === 'accepted') return a.status === 'ACCEPTED' || a.status === 'CLARIFICATION_PENDING';
    if (filter === 'in-progress') return a.status === 'STARTED'; // In Progress filtresi eklendi
    if (filter === 'completed') return isCompleted;
    if (filter === 'requests') return isRequest;
    return true;
  });


  return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Review Assignments</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage your paper reviews and track deadlines.</p>
          </div>

          {/* GÜNCELLENEN SELECT BÖLÜMÜ */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-lg border border-border">
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="h-8 w-[160px] text-xs bg-transparent border-none shadow-none focus:ring-0">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="requests">Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* YENİ: ANIMATE PRESENCE BAŞLIYOR */}
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
                Loading your assignments...
              </motion.p>
            </motion.div>
          ) : (
            // İÇERİK EKRANI
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-4" // space-y-4'ü buraya taşıdık ki içerik düzgün sıralansın
            >
              {filteredAssignments.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-20 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No assignments found</h3>
                  </CardContent>
                </Card>
              ) : (
                <> {/* Fragment ekledik çünkü map'i doğrudan sarmalamamız gerekti */}
                  {filteredAssignments.map((assignment) => {
                const daysLeft = Math.ceil((new Date(assignment.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const isOverdue = daysLeft < 0 && !['DONE', 'COMPLETED'].includes(assignment.status);
                const isDueSoon = daysLeft >= 0 && daysLeft <= 3 && !['DONE', 'COMPLETED'].includes(assignment.status);
                const isCompleted = ['DONE', 'COMPLETED'].includes(assignment.status);

                let badgeClass = "bg-amber-500 text-white";
                let badgeText = assignment.status;

                if (isCompleted) { badgeClass = "bg-green-600 text-white"; badgeText = "Completed"; }
                else if (assignment.status === 'ACCEPTED') { badgeClass = "bg-blue-600 text-white"; badgeText = "Accepted"; }
                else if (assignment.status === 'STARTED') { badgeClass = "bg-indigo-600 text-white"; badgeText = "In Progress"; }
                else if (assignment.status === 'CLARIFICATION_PENDING') { badgeClass = "bg-amber-500 text-white"; badgeText = "Clarification"; }
                else if (['PENDING_REFUSAL', 'PENDING_EXTENSION'].includes(assignment.status)) { badgeClass = "bg-muted text-muted-foreground"; badgeText = "Request Pending"; }
                else if (isOverdue) { badgeClass = "bg-red-600 text-white"; badgeText = "Overdue"; }

                return (
                    <div key={assignment.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border border-border bg-card hover:bg-accent/5 transition-all">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-1.5">
                          <h4 className="text-base font-bold truncate">{assignment.paperTitle || "Untitled Paper"}</h4>
                          <Badge className={cn("text-[10px] h-5", badgeClass)}>{badgeText}</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-muted-foreground">
                          {assignment.paperTrack && <span className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded text-blue-700 dark:text-blue-300">{assignment.paperTrack}</span>}
                          <span className="flex items-center gap-1">
                      <span className="opacity-60">Submitted:</span> {assignment.paperSubmissionDate ? formatDate(assignment.paperSubmissionDate) : '—'}
                    </span>

                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Assigned: {formatDate(assignment.assignedDate)}</div>
                          <div className={cn("flex items-center gap-1.5 font-medium", isOverdue && "text-red-600", isDueSoon && "text-amber-600")}>
                            <Clock className="h-3.5 w-3.5" /> Deadline: {formatDate(assignment.deadline)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2">
                        {assignment.status === 'PENDING' ? (
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1 bg-green-600 text-white" onClick={() => handleAccept(assignment.id)}>Accept</Button>
                                <Button size="sm" variant="destructive" className="flex-1" onClick={() => setRejectDialogId(assignment.id)}>Reject</Button>
                              </div>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => setExtensionDialogId(assignment.id)}>Accept with Extension</Button>
                            </div>
                        ) : assignment.status === 'ACCEPTED' ? (
                            <Button size="sm" onClick={() => handleStartReview(assignment)}><FileText className="mr-2 h-4 w-4" /> Start Review</Button>
                        ) : assignment.status === 'STARTED' ? (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-indigo-600 text-white" onClick={() => window.open(assignment.overleafLink, '_blank')}><FileText className="mr-2 h-4 w-4" /> Continue</Button>
                              <Button size="sm" variant="outline" className="text-green-600 border-green-600" onClick={() => setFinishDialogId(assignment.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Finish</Button>
                            </div>
                        ) : assignment.status === 'CLARIFICATION_PENDING' ? (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="border-indigo-600 text-indigo-600" onClick={() => window.open(assignment.overleafLink, '_blank')}><Eye className="mr-2 h-4 w-4" /> Open Review</Button>
                              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setFinishClarificationDialogId(assignment.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Finish Clarification</Button>
                            </div>
                        ) : isCompleted ? (
                            <Button size="sm" variant="outline" onClick={() => window.open(assignment.overleafLink, '_blank')}><Eye className="mr-2 h-4 w-4" /> View</Button>
                        ) : (
                            <Badge variant="outline" className="opacity-50">Locked</Badge>
                        )}
                      </div>
                    </div>
                );
              })}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODALLAR */}
        <Dialog open={!!rejectDialogId} onOpenChange={() => setRejectDialogId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Assignment</DialogTitle></DialogHeader>
            <Textarea placeholder="Reason for refusal..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRejectSubmit}>Confirm Reject</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!extensionDialogId} onOpenChange={() => setExtensionDialogId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Extension</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Requested Deadline *</Label>
                <Input type="date" value={extensionDate} onChange={(e) => setExtensionDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label>Justification *</Label>
                <Textarea placeholder="Reason..." value={extensionReason} onChange={(e) => setExtensionReason(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExtensionDialogId(null)}>Cancel</Button>
              <Button onClick={handleExtensionSubmit}>Send Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!finishDialogId} onOpenChange={() => setFinishDialogId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Finish Review</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Are you sure you want to finalize this review?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFinishDialogId(null)}>Cancel</Button>
              <Button className="bg-green-600 text-white" onClick={handleFinishReview}>Yes, Finish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!finishClarificationDialogId} onOpenChange={() => { setFinishClarificationDialogId(null); setClarificationMessage(''); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Finish Clarification</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Are you sure you have addressed the clarification request?</p>
            <div className="space-y-2 mt-4">
              <Label>Response Message (Optional)</Label>
              <Textarea placeholder="Leave a message for the author..." value={clarificationMessage} onChange={(e) => setClarificationMessage(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setFinishClarificationDialogId(null); setClarificationMessage(''); }}>Cancel</Button>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleFinishClarification}>Yes, Finish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}