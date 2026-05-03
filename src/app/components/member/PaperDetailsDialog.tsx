import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, FileText, MessageSquare, MessageSquarePlus, Building2, Calendar, Loader2 } from 'lucide-react';
import { PaperResponseDTO, PaperReviewerInfo } from '../../services/paperService';
import AddCommentDialog from './AddCommentDialog';
import { downloadFormalReviewPdf } from '../../services/aiService';
import { requestClarification } from '../../services/assignmentService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Dialog as UI_Dialog,
  DialogContent as UI_DialogContent,
  DialogHeader as UI_DialogHeader,
  DialogTitle as UI_DialogTitle,
  DialogFooter as UI_DialogFooter,
  DialogDescription as UI_DialogDescription,
} from '../ui/dialog';

interface PaperDetailsDialogProps {
  paper: PaperResponseDTO | null;
  onClose: () => void;
}

export default function PaperDetailsDialog({ paper, onClose }: PaperDetailsDialogProps) {
  const [commentTarget, setCommentTarget] = useState<PaperReviewerInfo | null>(null);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [pdfError, setPdfError] = useState('');
  const queryClient = useQueryClient();

  const [clarificationDialog, setClarificationDialog] = useState<{ assignmentId: string; reviewerName: string } | null>(null);
  const [clarificationNote, setClarificationNote] = useState('');
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);

  // Tarihleri İngilizce formatında (en-GB) gösteren yardımcı fonksiyon
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleRequestClarification = async () => {
    if (!clarificationDialog || !paper) return;
    if (!clarificationNote.trim()) {
      toast.error("Please describe what needs clarification.");
      return;
    }
    try {
      setIsSubmittingClarification(true);
      const loading = toast.loading("Sending clarification request...");
      await requestClarification(clarificationDialog.assignmentId, clarificationNote.trim());
      queryClient.invalidateQueries({ queryKey: ['my-papers'] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers'] });
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
      <>
        <Dialog open={paper !== null} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Paper Details</DialogTitle>
              <DialogDescription>Detailed information about your submission.</DialogDescription>
            </DialogHeader>

            {paper && (
                <div className="space-y-4 py-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Title</h4>
                    <p className="text-base font-medium text-foreground">{paper.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Track</h4>
                      <p className="text-sm text-foreground">{paper.track || 'No track assigned'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Submission Date</h4>
                      <p className="text-sm text-foreground">{formatDate(paper.submissionDate)}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expected Venue</h4>
                      <p className="text-sm text-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {paper.expectedVenueName || 'No venue specified'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Version</h4>
                      <p className="text-sm text-foreground">v{paper.version || 1}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Author</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                          {paper.mainAuthorName}
                        </span>
                      </div>
                    </div>

                    {paper.coAuthorNames && paper.coAuthorNames.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Co-authors</h4>
                        <div className="flex flex-wrap gap-2">
                          {paper.coAuthorNames.map((name, index) => (
                            <span key={index} className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reviewer Listesi ve Deadline Bilgisi */}
                  {paper.assignedReviewers && paper.assignedReviewers.length > 0 && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Internal Review Deadlines
                          </h4>
                          {(() => {
                            const deadlines = paper.assignedReviewers.map(r => r.deadline).filter(Boolean).sort();
                            const latestDeadline = deadlines[deadlines.length - 1];
                            return latestDeadline ? (
                              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Due by {formatDate(latestDeadline)}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="space-y-2">
                          {paper.assignedReviewers.map((reviewer) => {
                            const { authorNote, reviewerNote } = (() => {
                              const note = reviewer.clarificationNote;
                              if (!note) return { authorNote: '', reviewerNote: '' };
                              const separator = "\n\nReviewer Response: ";
                              if (note.includes(separator)) {
                                const parts = note.split(separator);
                                return { authorNote: parts[0], reviewerNote: parts[1] };
                              }
                              if (note.startsWith("Reviewer Response: ")) {
                                return { authorNote: '', reviewerNote: note.replace("Reviewer Response: ", "") };
                              }
                              return { authorNote: note, reviewerNote: '' };
                            })();

                            return (
                              <div
                                  key={reviewer.assignmentId}
                                  className="flex flex-col sm:flex-row sm:items-start justify-between rounded-lg border bg-muted/20 px-3 py-2.5 gap-2"
                              >
                                <div className="flex-1">
                                  <span className="text-sm font-semibold text-foreground">
                                    {reviewer.reviewerName}
                                  </span>
                                  {reviewer.clarificationRound !== undefined && reviewer.clarificationRound > 0 && (
                                    <div className="mt-2 text-xs border-l-2 border-amber-300 pl-2.5 space-y-1.5">
                                      <div className="font-medium text-amber-600">Clarification Round {reviewer.clarificationRound}</div>
                                      
                                      {authorNote && (
                                        <div className="bg-background/50 rounded-md p-2 border border-border/50">
                                          <span className="font-semibold text-foreground/80 block mb-0.5">{paper.mainAuthorName} (Author):</span>
                                          <span className="text-muted-foreground whitespace-pre-wrap">{authorNote}</span>
                                        </div>
                                      )}
                                      
                                      {reviewerNote && (
                                        <div className="bg-background/50 rounded-md p-2 border border-border/50">
                                          <span className="font-semibold text-foreground/80 block mb-0.5">{reviewer.reviewerName} (Reviewer):</span>
                                          <span className="text-muted-foreground whitespace-pre-wrap">{reviewerNote}</span>
                                        </div>
                                      )}
                                      
                                      {!authorNote && !reviewerNote && (
                                        <span className="italic text-muted-foreground">No notes provided.</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {reviewer.assignmentStatus === 'DONE' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                      onClick={() => setClarificationDialog({ assignmentId: reviewer.assignmentId, reviewerName: reviewer.reviewerName })}
                                    >
                                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                                      Clarify
                                    </Button>
                                  )}
                                  <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                      onClick={() => setCommentTarget(reviewer)}
                                  >
                                    <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
                                    Comment
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                  )}

                  {paper.contentLink && (
                      <div className="pt-4 border-t space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Document</h4>

                        {/* Download original manuscript ZIP */}
                        <Button
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => window.open(paper.contentLink, '_blank')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Manuscript
                        </Button>

                        {/* Generate & download formal review PDF */}
                        <div>
                          <Button
                              variant="outline"
                              className="w-full sm:w-auto"
                              disabled={pdfStatus === 'loading'}
                              onClick={async () => {
                                setPdfStatus('loading');
                                setPdfError('');
                                try {
                                  await downloadFormalReviewPdf(paper.id, paper.title);
                                  setPdfStatus('idle');
                                } catch (err: unknown) {
                                  const msg = err instanceof Error ? err.message : 'Unknown error';
                                  setPdfError(msg);
                                  setPdfStatus('error');
                                }
                              }}
                          >
                            {pdfStatus === 'loading' ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating PDF...</>
                            ) : (
                              <><FileText className="mr-2 h-4 w-4" />Download Formal Review (PDF)</>
                            )}
                          </Button>
                          {pdfStatus === 'error' && (
                              <p className="mt-1.5 text-xs text-destructive">
                                {pdfError || 'Failed to generate PDF. Please try again.'}
                              </p>
                          )}
                          {pdfStatus === 'loading' && (
                              <p className="mt-1.5 text-xs text-muted-foreground">
                                AI is writing and compiling the review — this may take up to a minute.
                              </p>
                          )}
                        </div>
                      </div>
                  )}
                </div>
            )}
          </DialogContent>
        </Dialog>

        <AddCommentDialog
            reviewerId={commentTarget?.reviewerId ?? null}
            reviewerName={commentTarget?.reviewerName ?? ''}
            paperId={paper?.id ?? null}
            paperTitle={paper?.title ?? 'Untitled Paper'}
            onClose={() => setCommentTarget(null)}
        />

        <UI_Dialog open={clarificationDialog !== null} onOpenChange={(open) => { if (!open) { setClarificationDialog(null); setClarificationNote(''); } }}>
          <UI_DialogContent className="sm:max-w-md">
            <UI_DialogHeader>
              <UI_DialogTitle>Request Clarification</UI_DialogTitle>
              <UI_DialogDescription>
                Describe what you need {clarificationDialog?.reviewerName} to clarify in Overleaf.
              </UI_DialogDescription>
            </UI_DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="clarification-note">Description *</Label>
              <Textarea
                id="clarification-note"
                placeholder="Describe which sections need clarification..."
                value={clarificationNote}
                onChange={(e) => setClarificationNote(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <UI_DialogFooter>
              <Button variant="outline" onClick={() => { setClarificationDialog(null); setClarificationNote(''); }} disabled={isSubmittingClarification}>
                Cancel
              </Button>
              <Button onClick={handleRequestClarification} disabled={isSubmittingClarification || !clarificationNote.trim()}>
                {isSubmittingClarification ? "Sending..." : "Send Request"}
              </Button>
            </UI_DialogFooter>
          </UI_DialogContent>
        </UI_Dialog>
      </>
  );
}