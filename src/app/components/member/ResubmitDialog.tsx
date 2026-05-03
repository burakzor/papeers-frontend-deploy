import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import {
  AlertCircle,
  CheckCircle,
  Circle,
  Upload,
  Tag,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';

// Servisler
import { 
  addPaper, 
  updatePaperStatus, 
  resubmitPaper, 
  editPaperInformation,
  PaperResponseDTO 
} from '../../services/paperService';
import { uploadPaperZip } from '../../services/storageService';
import {
  getAllVenues,
  getVenueRequirements,
  runDraftPreCheck,
  type PreCheckResponse,
  type VenueRequirementResponse,
  type VenueResponse,
} from '../../services/venueService';

interface ResubmitDialogProps {
  paper: PaperResponseDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

type CheckStatus = 'PASS' | 'FAIL' | 'UNCERTAIN' | 'PENDING';

interface DisplayCheck {
  checkName: string;
  status: CheckStatus;
  source?: string;
  reason?: string | null;
}

const AI_ELIGIBLE_CHECKS = new Set([
  'Page Limit',
  'Abstract Length',
  'Required Sections',
  'Anonymity',
  'Reference Analysis',
]);

export default function ResubmitDialog({ paper, onClose, onSuccess }: ResubmitDialogProps) {
  const isRejected = paper?.status === 'REJECTED';

  // --- STATE ---
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState('');
  const [abstract, setAbstract] = useState('');
  
  const [venueId, setVenueId] = useState('');
  const [venueQuery, setVenueQuery] = useState('');
  
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);

  const [selectedVenueRequirement, setSelectedVenueRequirement] = useState<VenueRequirementResponse | null>(null);
  const [serverPreCheck, setServerPreCheck] = useState<PreCheckResponse | null>(null);
  const [localChecks, setLocalChecks] = useState<DisplayCheck[]>([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isRunningDraftPreCheck, setIsRunningDraftPreCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftPreCheckError, setDraftPreCheckError] = useState<string | null>(null);

  // Modala veri doldurma
  useEffect(() => {
    if (paper) {
      setTitle(''); // Opsiyonel olduğu için boş başlat, kullanıcı yazarsa günceller
      setTrack('');
      setAbstract(''); 
      setFile(null);
      setServerPreCheck(null);

      if (isRejected) {
        setVenueId('');
        setVenueQuery('');
        loadVenues();
      } else {
        setVenueId(paper.expectedVenueId || '');
        setVenueQuery(paper.expectedVenueName || '');
      }
    }
  }, [paper, isRejected]);

  // Venue Requirement Çekme
  useEffect(() => {
    if (!venueId) {
      setSelectedVenueRequirement(null);
      return;
    }
    const fetchRequirement = async () => {
      try {
        const req = await getVenueRequirements(venueId);
        setSelectedVenueRequirement(req);
      } catch {
        setSelectedVenueRequirement(null);
      }
    };
    fetchRequirement();
  }, [venueId]);

  // Lokal Check Hesaplamaları
  useEffect(() => {
    setLocalChecks(buildLocalChecks(
      title || paper?.title || '', 
      abstract, 
      file, 
      paper?.coAuthorNames || [], 
      selectedVenueRequirement
    ));
  }, [title, abstract, file, paper, selectedVenueRequirement]);

  // Pre-Check Çalıştırma (Draft)
  useEffect(() => {
    if (!file || !venueId) return;

    let isCancelled = false;
    setIsRunningDraftPreCheck(true);
    setDraftPreCheckError(null);

    runDraftPreCheck({
      venueId: venueId,
      title: title.trim() || paper?.title || '',
      abstractText: abstract.trim(),
      track: track.trim() || paper?.track || '',
      file: file,
    })
      .then((response) => {
        if (!isCancelled) setServerPreCheck(response);
      })
      .catch((error) => {
        if (!isCancelled) {
          setServerPreCheck(null);
          setDraftPreCheckError(error instanceof Error ? error.message : 'Draft pre-check failed.');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsRunningDraftPreCheck(false);
      });

    return () => { isCancelled = true; };
  }, [file, venueId, title, abstract, track, paper]);

  const loadVenues = async () => {
    setIsLoadingVenues(true);
    try {
      const venueList = await getAllVenues();
      setVenues(venueList);
    } catch {
      toast.error('Could not load venues.');
    } finally {
      setIsLoadingVenues(false);
    }
  };

  const filteredVenues = useMemo(() => {
    if (!venueQuery.trim()) return venues;
    return venues.filter((v) => 
      `${v.acronym ?? ''} ${v.name}`.toLowerCase().includes(venueQuery.toLowerCase())
    );
  }, [venueQuery, venues]);

  const activeChecks = serverPreCheck
    ? serverPreCheck.checks.map((check) => ({
        checkName: check.checkName,
        status: normalizeStatus(check.status),
        source: check.source,
        reason: check.reason,
      }))
    : localChecks;

  const overallStatus = serverPreCheck?.overallStatus ?? deriveOverallStatus(activeChecks);
  const isVenueRequirementComplete = isVenueRequirementSetComplete(selectedVenueRequirement);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      setFile(droppedFile);
      setServerPreCheck(null);
    } else {
      toast.error('Please upload a .zip file.');
    }
  };

  const handleSubmit = async () => {
    if (!paper) return;
    if (!file) return toast.error("A new .zip manuscript is required.");
    if (isRejected && !venueId) return toast.error("Please select a new venue.");
    if (!isVenueRequirementComplete) return toast.error("The selected venue doesn't have a verified requirement set.");
    if (activeChecks.some((c) => c.status === 'FAIL')) return toast.error("Please fix failing checks before submitting.");

    setIsSubmitting(true);
    const loadingId = toast.loading("Processing your resubmission...");

    try {
      // 1. Yeni ZIP'i Supabase'e yükle (Backend eski linki overwrite eder)
      const newFileUrl = await uploadPaperZip(file);

      if (isRejected) {
        // YENİ KAYIT OLARAK GÖNDER (REJECTED ise)
        await addPaper({
          title: title.trim() || paper.title,
          track: track.trim() || paper.track,
          labId: paper.labId,
          mainAuthorId: paper.mainAuthorId,
          coAuthorIds: paper.coAuthorIds || [],
          expectedVenueId: venueId,
          contentLink: newFileUrl,
          overleafLink: paper.overleafLink, // Eski linki koruruz
        });
        toast.success("Submitted as a new paper successfully!", { id: loadingId });
      } else {
        // MEVCUT KAYDI GÜNCELLE (REVISION veya diğerleri)
        await resubmitPaper(paper.id, newFileUrl);
        
        if (title.trim() || track.trim()) {
          await editPaperInformation(paper.id, { 
            title: title.trim() || undefined, 
            track: track.trim() || undefined 
          });
        }
        
        await updatePaperStatus(paper.id, { status: 'INTERNAL_REVIEW' });
        toast.success("Resubmitted for internal review!", { id: loadingId });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to resubmit.", { id: loadingId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!paper} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRejected ? 'Submit to New Venue' : 'Resubmit Revised Paper'}</DialogTitle>
          <DialogDescription>
            {isRejected 
              ? "Your paper was rejected. Select a new venue and upload the revised .zip package. This will create a new submission history."
              : "Upload your revised .zip package. Pre-check will run automatically. You can also update the title or track if needed."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
          
          {/* SOL KOLON: FORM */}
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Target Venue {isRejected && <span className="text-red-500">*</span>}</Label>
              {isRejected ? (
                <div className="relative">
                  <Input
                    placeholder={isLoadingVenues ? 'Loading venues...' : 'Search for a new venue...'}
                    value={venueQuery}
                    onFocus={() => setShowVenueSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowVenueSuggestions(false), 200)}
                    onChange={(e) => {
                      setVenueQuery(e.target.value);
                      setShowVenueSuggestions(true);
                      setVenueId('');
                      setServerPreCheck(null);
                    }}
                  />
                  {showVenueSuggestions && filteredVenues.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                      {filteredVenues.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className="block w-full border-b border-border/50 px-3 py-2 text-left text-sm hover:bg-muted"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setVenueId(v.id);
                            setVenueQuery(v.acronym ? `${v.acronym} - ${v.name}` : v.name);
                            setShowVenueSuggestions(false);
                          }}
                        >
                          <div className="font-medium">{v.acronym ? `${v.acronym} - ${v.name}` : v.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {venueId && <p className="text-[10px] text-green-600 mt-1">New venue confirmed.</p>}
                </div>
              ) : (
                <div className="p-2.5 rounded-md bg-muted/50 border text-sm text-muted-foreground font-medium">
                  {paper?.expectedVenueName || 'No venue linked'}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Title <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={paper?.title} />
            </div>

            <div className="space-y-1.5">
              <Label>Track <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input value={track} onChange={(e) => setTrack(e.target.value)} placeholder={paper?.track || 'e.g. Main Track'} />
            </div>

            <div className="space-y-1.5">
              <Label>Abstract <span className="text-muted-foreground font-normal">(For Pre-Check)</span></Label>
              <Textarea 
                value={abstract} 
                onChange={(e) => setAbstract(e.target.value)} 
                placeholder="Paste your abstract here to test against venue rules..."
                className="h-20 resize-none text-xs" 
              />
            </div>

            <div className="space-y-2">
              <Label>Revised Package (.zip) <span className="text-red-500">*</span></Label>
              <div
                className={cn(
                  "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-400',
                  file && "border-green-500 bg-green-50/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
              >
                {!file ? (
                  <>
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <Label htmlFor="resubmit-file" className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">
                      Browse Files
                    </Label>
                    <Input id="resubmit-file" type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div className="text-sm font-medium">{file.name}</div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-red-500 mt-1" onClick={() => setFile(null)}>Remove File</Button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* SAĞ KOLON: PRE-CHECK */}
          <div>
            <Card className="h-full border-muted/60 shadow-sm bg-slate-50/50 dark:bg-slate-900/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4 text-blue-600" /> Pre-Check Status
                </CardTitle>
                <CardDescription className="text-xs">
                  {serverPreCheck ? 'Analyzed from uploaded ZIP' : 'Awaiting file and venue to run checks'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {isRunningDraftPreCheck && (
                  <div className="flex items-center gap-2 rounded-lg border bg-blue-50/50 p-3 text-xs text-blue-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running venue validation...
                  </div>
                )}

                {draftPreCheckError && !isRunningDraftPreCheck && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs ml-2">Pre-check failed: {draftPreCheckError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {activeChecks.map((check) => (
                    <div key={check.checkName} className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getCheckIcon(check.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{check.checkName}</p>
                          <Badge className={cn("text-[9px] h-4 px-1.5 py-0 rounded", getStatusBadgeClass(check.status))}>
                            {getStatusLabel(check.status)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[10.5px] leading-tight text-muted-foreground pr-1">
                          {describeCheck(check, selectedVenueRequirement)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border bg-white dark:bg-black/40 p-2.5 mt-4 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Overall Readiness</span>
                  <span className={cn("text-sm font-black", getOverallStatusClass(overallStatus))}>{overallStatus}</span>
                </div>

                {!isVenueRequirementComplete && venueId && (
                  <div className="text-[10.5px] text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-start gap-1.5 mt-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Submission is blocked: This venue does not have a verified requirement set in the database yet.</span>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !file || (isRejected && !venueId) || !isVenueRequirementComplete || activeChecks.some(c => c.status === 'FAIL')}
            className={isRejected ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRejected ? 'Submit as New Paper' : 'Resubmit File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- PRE-CHECK HELPERS ---

function buildLocalChecks(title: string, abstract: string, file: File | null, coAuthorNames: string[], requirement: VenueRequirementResponse | null): DisplayCheck[] {
  const authorNames = coAuthorNames.map((n) => n.toLowerCase());
  const titleAndAbstract = `${title} ${abstract}`.toLowerCase();
  const abstractWordCount = abstract.trim().split(/\s+/).filter(Boolean).length;
  const abstractWordLimit = requirement?.abstractWordLimit ?? null;

  const anonymityStatus = (() => {
    if (requirement?.anonymityRequired === false) return 'PASS';
    if (!title.trim() && !abstract.trim()) return 'PENDING';
    if (authorNames.length === 0 || requirement?.anonymityRequired === null || requirement?.anonymityRequired === undefined) return 'UNCERTAIN';
    const hasAuthorInText = authorNames.some((name) => titleAndAbstract.includes(name));
    return hasAuthorInText ? 'FAIL' : 'PASS';
  })();

  const abstractCheck = (() => {
    if (!abstract.trim()) return { status: 'PENDING' as CheckStatus, reason: 'Waiting for abstract text.' };
    if (!abstractWordLimit) return { status: 'UNCERTAIN' as CheckStatus, reason: 'No limit specified in venue.' };
    if (abstractWordCount <= abstractWordLimit) return { status: 'PASS' as CheckStatus, reason: `Fits limit (${abstractWordCount}/${abstractWordLimit}).` };
    return { status: 'FAIL' as CheckStatus, reason: `Exceeds limit by ${abstractWordCount - abstractWordLimit} words.` };
  })();

  return [
    { checkName: 'Anonymity', status: anonymityStatus },
    { checkName: 'Abstract Length', status: abstractCheck.status, reason: abstractCheck.reason, source: 'RULE' },
    { checkName: 'Page Limit', status: !file ? 'PENDING' : !requirement?.pageLimit ? 'UNCERTAIN' : 'UNCERTAIN' },
    { checkName: 'Required Sections', status: !file ? 'PENDING' : !requirement?.requiredSections?.trim() ? 'UNCERTAIN' : 'UNCERTAIN' },
    { checkName: 'Reference Analysis', status: !file ? 'PENDING' : !requirement?.referenceFormat?.trim() ? 'UNCERTAIN' : 'UNCERTAIN' },
  ];
}

function getCheckIcon(status: CheckStatus) {
  switch (status) {
    case 'PASS': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'FAIL': return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'UNCERTAIN': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    default: return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  }
}

function getStatusLabel(status: CheckStatus) {
  return status;
}

function getStatusBadgeClass(status: CheckStatus) {
  switch (status) {
    case 'PASS': return 'border-green-200 bg-green-50 text-green-700';
    case 'FAIL': return 'border-red-200 bg-red-50 text-red-700';
    case 'UNCERTAIN': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
    default: return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function normalizeStatus(status: string): CheckStatus {
  if (['PASS', 'FAIL', 'UNCERTAIN'].includes(status)) return status as CheckStatus;
  return 'PENDING';
}

function deriveOverallStatus(checks: DisplayCheck[]) {
  if (checks.some((c) => c.status === 'FAIL')) return 'FAIL';
  if (checks.some((c) => c.status === 'UNCERTAIN' || c.status === 'PENDING')) return 'PARTIAL';
  return 'PASS';
}

function getOverallStatusClass(status: string) {
  if (status === 'PASS') return 'text-green-600';
  if (status === 'FAIL') return 'text-red-600';
  return 'text-yellow-600';
}

function describeCheck(check: DisplayCheck, requirement: VenueRequirementResponse | null) {
  if (check.reason?.trim()) return check.reason;
  if (check.status === 'PASS') return 'This requirement looks satisfied.';
  if (check.status === 'FAIL') return 'This requirement is unsatisfied.';
  if (check.status === 'UNCERTAIN') {
    if (AI_ELIGIBLE_CHECKS.has(check.checkName)) return 'Needs file-level validation after upload.';
    return 'The system cannot decide this yet.';
  }
  return 'Waiting for input.';
}

function isVenueRequirementSetComplete(requirement: VenueRequirementResponse | null) {
  if (!requirement) return false;
  return requirement.pageLimit !== null && !!requirement.officialSourceUrl?.trim() && requirement.manuallyVerified === true;
}