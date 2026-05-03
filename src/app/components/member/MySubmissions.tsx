import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { SearchableSelect } from '../ui/searchable-select';
import {
  FileText,
  Calendar,
  Users,
  Eye,
  Download,
  Search,
  Plus,
  ExternalLink,
  RefreshCw,
  Send,
  MessageSquare,
  MessageSquarePlus,
  CheckCircle,
  Flag,
  Clock,
} from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { getMyPapers, getPapersForGuestMember, updatePaperStatus, PaperResponseDTO } from '../../services/paperService';
import { requestClarification } from '../../services/assignmentService';
import { useAuth } from '../../context/AuthContext';
import PaperDetailsDialog from './PaperDetailsDialog';
import ResubmitDialog from './ResubmitDialog';
import AddCommentDialog from './AddCommentDialog';
import { motion, AnimatePresence } from 'framer-motion';
import FeatherLoader from '../shared/FeatherLoader'; // Klasör yolunu kendi projene göre ayarla

const pillClassName =
  'inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20';

const reviewerPillClassName =
  'inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20';

export default function MySubmissions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectedLab } = useAuth();
  const storedUserStr = window.localStorage.getItem('prs.auth.user');
  const currentUser = storedUserStr ? JSON.parse(storedUserStr) : null;
  const isGuestInLab = selectedLab?.role === 'GUEST_MEMBER';

  const [searchQuery, setSearchQuery] = useState('');
  const [paperToResubmit, setPaperToResubmit] = useState<PaperResponseDTO | null>(null);
  const [selectedPaperDetails, setSelectedPaperDetails] = useState<PaperResponseDTO | null>(null);
  const [commentTarget, setCommentTarget] = useState<any | null>(null);
  
  const [paperToLogDecision, setPaperToLogDecision] = useState<PaperResponseDTO | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<string>('');
  const [isLoggingDecision, setIsLoggingDecision] = useState(false);

  const [isMarkingSubmitted, setIsMarkingSubmitted] = useState<string | null>(null);

  const [clarificationDialog, setClarificationDialog] = useState<{ assignmentId: string; reviewerName: string } | null>(null);
  const [clarificationNote, setClarificationNote] = useState('');
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['my-papers', currentUser?.id, isGuestInLab ? selectedLab?.id : null],
    queryFn: async () => {
      if (!currentUser?.id) {
        toast.error('User not found in session.');
        return [];
      }

      if (isGuestInLab) {
        return getPapersForGuestMember(selectedLab!.id);
      }
      return getMyPapers(selectedLab!.id);
    },
    enabled: !!currentUser?.id,
    staleTime: 1000 * 60 * 5,
  });

  const filteredPapers = papers.filter((paper) => 
    paper.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderProfilePill = (name: string, index: number) => {
    return (
      <span key={`${name}-${index}`} className={pillClassName}>
        {name}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">In Progress</Badge>;
      case 'INTERNAL_REVIEW':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Internal Review</Badge>;
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

  const handleLogDecision = async () => {
    if (!paperToLogDecision || !selectedDecision) {
      toast.error("Please select a decision from the dropdown.");
      return;
    }

    setIsLoggingDecision(true);
    const loadingToast = toast.loading("Updating paper status...");

    try {
      await updatePaperStatus(paperToLogDecision.id, { status: selectedDecision });
      toast.success("Venue decision logged successfully!", { id: loadingToast });
      setPaperToLogDecision(null);
      setSelectedDecision('');
      queryClient.invalidateQueries({ queryKey: ['my-papers'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers'] });
    } catch (error) {
      toast.error("Failed to update the status.", { id: loadingToast });
    } finally {
      setIsLoggingDecision(false);
    }
  };

  const handleMarkAsSubmitted = async (paperId: string) => {
    setIsMarkingSubmitted(paperId);
    const loadingToast = toast.loading("Updating paper status...");

    try {
      await updatePaperStatus(paperId, { status: 'SUBMITTED_TO_VENUE' });
      toast.success("Paper marked as submitted to venue!", { id: loadingToast });
      queryClient.invalidateQueries({ queryKey: ['my-papers'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers'] });
    } catch (error) {
      toast.error("Failed to update the status.", { id: loadingToast });
    } finally {
      setIsMarkingSubmitted(null);
    }
  };

  const handleRequestClarification = async () => {
    if (!clarificationDialog) return;
    if (!clarificationNote.trim()) {
      toast.error("Please describe what needs clarification.");
      return;
    }
    try {
      setIsSubmittingClarification(true);
      const loading = toast.loading("Sending clarification request...");
      await requestClarification(clarificationDialog.assignmentId, clarificationNote.trim());
      queryClient.invalidateQueries({ queryKey: ['my-papers'] });
      toast.success("Clarification request sent to reviewer.", { id: loading });
      setClarificationDialog(null);
      setClarificationNote('');
    } catch {
      toast.error("Failed to send clarification request.");
    } finally {
      setIsSubmittingClarification(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Papers</h1>
        <p className="mt-1 text-muted-foreground">Track and manage your authored papers</p>
      </div>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center justify-between">
        <div className="relative w-full flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search papers by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {!isGuestInLab && (
          <Link to="/member/new-submission" className="shrink-0">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Submission
            </Button>
          </Link>
        )}
      </div>

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
              Loading your papers...
            </motion.p>
          </motion.div>
        ) : (
          // İÇERİK EKRANI (Burası normal div'di, motion.div key="content" yaptık)
          <motion.div 
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="grid gap-4"
          >
          {filteredPapers.map((paper) => {
            const allAuthors = [paper.mainAuthorName, ...(paper.coAuthorNames || [])].filter(Boolean);

            // YENİ: Frontend'de görsel olarak "Ready for Submission" gösterme mantığı
            let displayStatus = paper.status;
            if (paper.status === 'INTERNAL_REVIEW') {
              const reviewers = paper.assignedReviewers || [];
              if (reviewers.length > 0 && reviewers.every((r: any) => r.assignmentStatus === 'DONE' || r.assignmentStatus === 'COMPLETED')) {
                displayStatus = 'READY_FOR_SUBMISSION';
              }
            }

            // YENİ: Yazar artık makale INTERNAL_REVIEW'da olduğu sürece submit yapabilir.
            const canSubmit = paper.status === 'INTERNAL_REVIEW' || paper.status === 'READY_FOR_SUBMISSION' || paper.status === 'REVISION_REQUIRED';

            return (
              <Card key={paper.id} className="transition-shadow hover:shadow-md dark:hover:shadow-black/20">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2 text-lg">
                        {paper.title || <span className="italic text-muted-foreground">Untitled Paper</span>}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Created {formatDate(paper.submissionDate)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {allAuthors.length} author{allAuthors.length > 1 ? 's' : ''}
                        </div>
                        {(paper.track) && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            Track: {paper.track}
                          </div>
                        )}
                        {paper.expectedVenueName && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            Venue: {paper.expectedVenueName}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 lg:mt-0 flex shrink-0">
                      {getStatusBadge(displayStatus)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Author</p>
                        <div className="flex flex-wrap gap-2">
                          {renderProfilePill(paper.mainAuthorName || 'Unknown', 0)}
                        </div>
                      </div>
                      
                      {paper.coAuthorNames && paper.coAuthorNames.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Co-authors</p>
                          <div className="flex flex-wrap gap-2">
                            {paper.coAuthorNames.map((name, index) => renderProfilePill(name, index + 1))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Önce reddedilmeyenleri bir değişkene atayalım ki if kontrolü temiz olsun */}
                  {(() => {
                    const activeReviewers = paper.assignedReviewers?.filter(
                      (rev: any) => rev.assignmentStatus !== 'REJECTED'
                    ) || [];

                    if (activeReviewers.length === 0) return null;

                    return (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Reviewers</p>
                        <div className="flex flex-col gap-3"> {/* YENİ: flex-wrap yerine flex-col yaptık ki alt alta düzgün sıralansın */}
                          {activeReviewers.map((reviewer: any) => {
                            const isDone = reviewer.assignmentStatus === 'DONE';
                            const isClarPending = reviewer.assignmentStatus === 'CLARIFICATION_PENDING';
                            
                            return (
                              <div key={reviewer.assignmentId} className="flex flex-col gap-1.5 items-start">
                                <div className="flex items-center gap-1.5">
                                  <Link 
                                    to={`/member/members/${reviewer.reviewerId}`}
                                    className={cn(
                                      reviewerPillClassName,
                                      isDone && "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300",
                                      isClarPending && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                                    )}
                                    title={isClarPending ? `Clarification Pending` : undefined}
                                  >
                                    {reviewer.reviewerName}
                                    {isDone && <CheckCircle className="ml-1.5 h-3 w-3" />}
                                    {isClarPending && <Clock className="ml-1.5 h-3 w-3 animate-pulse" />}
                                  </Link>
                                  
                                  {isDone && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 rounded-full hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40"
                                        onClick={() => setClarificationDialog({ assignmentId: reviewer.assignmentId, reviewerName: reviewer.reviewerName })}
                                        title="Request Clarification"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </Button>
                                      
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 rounded-full hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-900/40"
                                        onClick={() => setCommentTarget({ ...reviewer, paperId: paper.id, paperTitle: paper.title })}
                                        title="Leave Comment"
                                      >
                                        <MessageSquarePlus className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {/* YENİ: Clarification Yazışmalarını Gösterme Alanı */}
                                {reviewer.clarificationRound !== undefined && reviewer.clarificationRound > 0 && reviewer.clarificationNote && (() => {
                                  const note = reviewer.clarificationNote;
                                  let authorNote = note || '';
                                  let reviewerNote = '';
                                  const separator = "\n\nReviewer Response: ";
                                  
                                  // Backend formatına göre parçala
                                  if (note.includes(separator)) {
                                    const parts = note.split(separator);
                                    authorNote = parts[0];
                                    reviewerNote = parts[1];
                                  } else if (note.startsWith("Reviewer Response: ")) {
                                    // İstisnai durum: Sadece hakem cevabı var
                                    authorNote = '';
                                    reviewerNote = note.replace("Reviewer Response: ", "");
                                  }

                                  return (
                                    <div className="mt-1 ml-2 text-[11px] border-l-2 border-amber-300 pl-2.5 max-w-lg space-y-1.5 w-full">
                                      <div className="font-medium text-amber-600/90 dark:text-amber-500/90 mb-1">
                                        Clarification Round {reviewer.clarificationRound}
                                        {isClarPending ? " (Waiting for reviewer...)" : " (Finished)"}
                                      </div>
                                      
                                      {authorNote && (
                                        <div className="bg-muted/40 rounded p-1.5 border border-border/50 text-muted-foreground">
                                          <span className="font-semibold block mb-0.5 text-foreground">{paper.mainAuthorName || "You"} (Author):</span>
                                          <span className="whitespace-pre-wrap break-words leading-relaxed">{authorNote}</span>
                                        </div>
                                      )}
                                      
                                      {reviewerNote && (
                                        <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded p-1.5 border border-blue-100/50 dark:border-blue-900/30 text-muted-foreground mt-1.5">
                                          <span className="font-semibold block mb-0.5 text-foreground">{reviewer.reviewerName} (Reviewer):</span>
                                          <span className="whitespace-pre-wrap break-words leading-relaxed">{reviewerNote}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {paper.status === 'IN_PROGRESS' && (
                    <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 space-y-2">
                      <p className="text-sm font-medium text-orange-800">
                        This paper is waiting for you to write it in Overleaf. Click "Finish Paper" when the draft is ready for internal review.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-100"
                          onClick={() => window.open(paper.overleafLink, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Open in Overleaf
                        </Button>
                        {paper.mainAuthorId === currentUser?.id && (
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={() => navigate('/member/new-submission', {
                              state: { finishPaperId: paper.id, paperTitle: paper.title || 'Untitled Paper' }
                            })}
                          >
                            <Flag className="mr-1.5 h-3.5 w-3.5" />
                            Finish Paper
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">

                    {/* YENİ: Yazar INTERNAL_REVIEW aşamasındayken istediği zaman submit diyebilir */}
                    {canSubmit && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleMarkAsSubmitted(paper.id)}
                        disabled={isMarkingSubmitted === paper.id}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        {isMarkingSubmitted === paper.id ? "Updating..." : "Mark as Submitted"}
                      </Button>
                    )}

                    {paper.status === 'SUBMITTED_TO_VENUE' && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => setPaperToLogDecision(paper)}
                      >
                        <Send className="mr-1 h-4 w-4" />
                        Log Venue Decision
                      </Button>
                    )}

                    {paper.status !== 'IN_PROGRESS' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          if (paper.overleafLink) {
                            window.open(paper.overleafLink, '_blank', 'noopener,noreferrer');
                          } else {
                            toast.error("Overleaf link not found for this paper.");
                          }
                        }}
                      >
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Open in Overleaf
                      </Button>
                    )}

                    {paper.status !== 'IN_PROGRESS' && paper.status !== 'REJECTED' && paper.status !== 'ACCEPTED' && (
                      <Button 
                        variant={paper.status === 'REVISION_REQUIRED' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setPaperToResubmit(paper)}
                      >
                        <RefreshCw className="mr-1 h-4 w-4" />
                        Resubmit
                      </Button>
                    )}

                    <Button variant="outline" size="sm" onClick={() => setSelectedPaperDetails(paper)}>
                      <Eye className="mr-1 h-4 w-4" />
                      View Details
                    </Button>
                    
                    {paper.contentLink && (
                      <Button variant="outline" size="sm" onClick={() => window.open(paper.contentLink, '_blank')}>
                        <Download className="mr-1 h-4 w-4" />
                        Download
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </motion.div>
        
      )}
      </AnimatePresence>
    

      {!isLoading && filteredPapers.length === 0 && (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium text-foreground">No papers found</h3>
          <p className="mb-4 text-muted-foreground">
            {searchQuery
              ? 'Try adjusting your search criteria.'
              : isGuestInLab
                ? 'You have not been added as a co-author to any papers in this lab yet.'
                : 'You haven\'t submitted any papers yet.'}
          </p>
          {!isGuestInLab && (
            <Link to="/member/new-submission">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Submit Your First Paper
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* DETAY VE RESUBMIT MODALLARI */}
      <PaperDetailsDialog 
        paper={selectedPaperDetails} 
        onClose={() => setSelectedPaperDetails(null)} 
      />

      <ResubmitDialog
        paper={paperToResubmit}
        onClose={() => setPaperToResubmit(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-papers'] })}
      />

      {/* CLARIFICATION REQUEST DIALOG */}
      <Dialog open={clarificationDialog !== null} onOpenChange={(open) => { if (!open) { setClarificationDialog(null); setClarificationNote(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Clarification</DialogTitle>
            <DialogDescription>
              Describe what you need {clarificationDialog?.reviewerName} to clarify in Overleaf.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="clarification-note">Description *</Label>
            <Textarea
              id="clarification-note"
              placeholder="Describe which sections need clarification and what you'd like explained..."
              value={clarificationNote}
              onChange={(e) => setClarificationNote(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setClarificationDialog(null); setClarificationNote(''); }} disabled={isSubmittingClarification}>
              Cancel
            </Button>
            <Button onClick={handleRequestClarification} disabled={isSubmittingClarification || !clarificationNote.trim()}>
              {isSubmittingClarification ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KARAR BİLDİRME (LOG DECISION) MODALI */}
      <Dialog open={paperToLogDecision !== null} onOpenChange={(isOpen) => !isOpen && setPaperToLogDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Venue Decision</DialogTitle>
            <DialogDescription>
              What is the official decision from the expected venue ({paperToLogDecision?.expectedVenueName || 'the venue'})?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <SearchableSelect
              value={selectedDecision}
              onValueChange={setSelectedDecision}
              options={[
                { value: 'ACCEPTED', label: 'Accepted 🎉' },
                { value: 'REVISION_REQUIRED', label: 'Revision Required ✍️' },
                { value: 'REJECTED', label: 'Rejected ❌' },
              ]}
              placeholder="Select the official decision..."
            />
            <p className="text-xs text-muted-foreground mt-3">
              Note: Updating this will permanently change the paper's status in the lab system.
            </p>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setPaperToLogDecision(null)} disabled={isLoggingDecision}>
              Cancel
            </Button>
            <Button onClick={handleLogDecision} disabled={isLoggingDecision || !selectedDecision}>
              {isLoggingDecision ? "Saving..." : "Save Decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCommentDialog
        reviewerId={commentTarget?.reviewerId ?? null}
        reviewerName={commentTarget?.reviewerName ?? ''}
        paperId={commentTarget?.paperId ?? null}
        paperTitle={commentTarget?.paperTitle ?? 'Untitled Paper'}
        onClose={() => setCommentTarget(null)}
      />
      
    </div>
  );
  
}