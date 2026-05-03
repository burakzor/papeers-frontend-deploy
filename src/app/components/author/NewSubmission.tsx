import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Home,
  Link as LinkIcon,
  Sparkles,
  Tag,
  Upload,
  Users,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '../../lib/api';
import { getEligibleAuthors } from '../../services/userService';
import { addPaper, finishPaper } from '../../services/paperService';
import { uploadPaperZip } from '../../services/storageService';
import {
  getCachedVenues,
  getAllVenues,
  getVenueRequirements,
  recommendVenues,
  runDraftPreCheck,
  runPreCheck,
  type PreCheckResponse,
  type VenueRequirementResponse,
  type VenueResponse,
} from '../../services/venueService';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';

interface Author {
  id: string;
  name: string;
}

interface FormDataState {
  venueId: string;
  venueName: string;
  track: string;
  title: string;
  abstract: string;
  coAuthors: Author[];
  keywords: string;
  file: File | null;
  overleafLink: string;
  overleafProjectUrl: string;
}

type CheckStatus = 'PASS' | 'FAIL' | 'UNCERTAIN' | 'PENDING';

interface DisplayCheck {
  checkName: string;
  status: CheckStatus;
  source?: string;
  reason?: string | null;
}

interface SubmissionResultState {
  paperId: string;
  title: string;
  venueName: string;
  overallStatus: string | null;
  overleafLink: string;
}

const EMPTY_FORM_DATA: FormDataState = {
  venueId: '',
  venueName: '',
  track: '',
  title: '',
  abstract: '',
  coAuthors: [],
  keywords: '',
  file: null,
  overleafLink: '',
  overleafProjectUrl: '',
};

const steps = [
  { title: 'Basic Information', icon: FileText },
  { title: 'Authors & Keywords', icon: Users },
  { title: 'Manuscript & Link', icon: Upload },
  { title: 'Review & Submit', icon: CheckCircle },
];

const AI_ELIGIBLE_CHECKS = new Set([
  'Page Limit',
  'Abstract Length',
  'Required Sections',
  'Anonymity',
  'Reference Analysis',
]);

export default function NewSubmission() {
  const navigate = useNavigate();
  const location = useLocation();
  const finishPaperId: string | undefined = (location.state as any)?.finishPaperId;
  const finishPaperTitle: string | undefined = (location.state as any)?.paperTitle;

  const cachedVenues = getCachedVenues();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormDataState>({
    venueId: '',
    venueName: '',
    track: '',
    title: '',
    abstract: '',
    coAuthors: [],
    keywords: '',
    file: null,
    overleafLink: '',
    overleafProjectUrl: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [venueQuery, setVenueQuery] = useState('');
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [labMembers, setLabMembers] = useState<Author[]>([]);
  const [venues, setVenues] = useState<VenueResponse[]>(cachedVenues ?? []);
  const [selectedVenueRequirement, setSelectedVenueRequirement] = useState<VenueRequirementResponse | null>(null);
  const [localChecks, setLocalChecks] = useState<DisplayCheck[]>([]);
  const [serverPreCheck, setServerPreCheck] = useState<PreCheckResponse | null>(null);
  const [isLoadingVenues, setIsLoadingVenues] = useState(!cachedVenues);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuggestingVenue, setIsSuggestingVenue] = useState(false);
  const [isFetchingRequirement, setIsFetchingRequirement] = useState(false);
  const [isRunningDraftPreCheck, setIsRunningDraftPreCheck] = useState(false);
  const [venueLoadError, setVenueLoadError] = useState<string | null>(null);
  const [draftPreCheckError, setDraftPreCheckError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResultState | null>(null);
  const [showForceSubmitDialog, setShowForceSubmitDialog] = useState(false);

  const loadVenues = async () => {
    setVenueLoadError(null);
    setIsLoadingVenues(venues.length === 0);
    try {
      const venueList = await getAllVenues();
      setVenues(venueList);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load venues.';
      setVenueLoadError(message);
      if (venues.length === 0) {
        toast.error(message);
      }
    } finally {
      setIsLoadingVenues(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      await loadVenues();

      try {
        const users = await getEligibleAuthors();
        const storedUserStr = window.localStorage.getItem('prs.auth.user');
        const currentUser = storedUserStr ? JSON.parse(storedUserStr) : null;

        const formattedAuthors = users
          .filter((user: any) => user.id !== currentUser?.id)
          .map((user: any) => ({
            id: user.id,
            name: user.name || user.email,
          }));

        setLabMembers(formattedAuthors);
      } catch (error) {
        toast.error('Could not load eligible authors.');
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!formData.venueId) {
      setSelectedVenueRequirement(null);
      return;
    }

    const venue = venues.find((item) => item.id === formData.venueId);
    if (venue?.requirement) {
      setSelectedVenueRequirement(venue.requirement);
    }

    const fetchRequirement = async () => {
      try {
        setIsFetchingRequirement(true);
        const requirement = await getVenueRequirements(formData.venueId);
        setSelectedVenueRequirement(requirement);
      } catch {
        setSelectedVenueRequirement(venue?.requirement ?? null);
      } finally {
        setIsFetchingRequirement(false);
      }
    };

    fetchRequirement();
  }, [formData.venueId, venues]);

  useEffect(() => {
    setLocalChecks(buildLocalChecks(formData, selectedVenueRequirement));
  }, [formData, selectedVenueRequirement]);

  useEffect(() => {
    if (submissionResult) {
      return;
    }

    if (currentStep !== 3 || !formData.file || !formData.venueId) {
      return;
    }

    let isCancelled = false;
    setIsRunningDraftPreCheck(true);
    setDraftPreCheckError(null);

    runDraftPreCheck({
      venueId: formData.venueId,
      title: formData.title.trim(),
      abstractText: formData.abstract.trim(),
      track: formData.track.trim(),
      file: formData.file,
    })
      .then((response) => {
        if (!isCancelled) {
          setServerPreCheck(response);
          setDraftPreCheckError(null);
        }
      })
        .catch((error) => {
          if (!isCancelled) {
            setServerPreCheck(null);
            const message = error instanceof Error ? error.message : 'Draft pre-check could not be loaded.';
            console.error('Draft pre-check failed:', error);
            setDraftPreCheckError(message);
          }
        })
      .finally(() => {
        if (!isCancelled) {
          setIsRunningDraftPreCheck(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentStep, formData.file, formData.venueId, formData.title, formData.abstract, formData.track, submissionResult]);

  const filteredMembers = useMemo(
    () =>
      labMembers.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase())
          && !formData.coAuthors.some((coAuthor) => coAuthor.id === member.id),
      ),
    [formData.coAuthors, labMembers, searchQuery],
  );

  const filteredVenues = useMemo(() => {
    const normalizedQuery = venueQuery.trim().toLowerCase();
    const sortedVenues = [...venues].sort((left, right) => left.name.localeCompare(right.name));

    if (!normalizedQuery) {
      return sortedVenues;
    }

    return sortedVenues.filter((venue) => {
      const label = `${venue.acronym ?? ''} ${venue.name}`.toLowerCase();
      return label.includes(normalizedQuery);
    });
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
  const allPreChecksPass = activeChecks.length > 0 && activeChecks.every((check) => check.status === 'PASS');
  const hasIncompletePreCheck = activeChecks.some((check) => check.status === 'UNCERTAIN' || check.status === 'PENDING');
  const keywordList = useMemo(
    () =>
      formData.keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    [formData.keywords],
  );

  const updateFormData = <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => {
    setServerPreCheck(null);
    setDraftPreCheckError(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitAnotherPaper = () => {
    setSubmissionResult(null);
    setServerPreCheck(null);
    setDraftPreCheckError(null);
    setLocalChecks([]);
    setSelectedVenueRequirement(null);
    setVenueQuery('');
    setShowVenueSuggestions(false);
    setCurrentStep(0);
    setFormData({ ...EMPTY_FORM_DATA });
    navigate('/member/new-submission', { replace: true });
  };

  const handleVenueQueryChange = (value: string) => {
    setVenueQuery(value);
    setShowVenueSuggestions(true);
    setServerPreCheck(null);
    setDraftPreCheckError(null);
    setFormData((prev) => ({
      ...prev,
      venueId: '',
      venueName: value,
    }));
  };

  const handleVenueSelect = (venue: VenueResponse) => {
    setVenueQuery(formatVenueLabel(venue));
    setShowVenueSuggestions(false);
    setServerPreCheck(null);
    setDraftPreCheckError(null);
    setFormData((prev) => ({
      ...prev,
      venueId: venue.id,
      venueName: venue.name,
    }));
  };

  const addAuthor = (author: Author) => {
    updateFormData('coAuthors', [...formData.coAuthors, author]);
    setSearchQuery('');
  };

  const removeAuthor = (authorId: string) => {
    updateFormData(
      'coAuthors',
      formData.coAuthors.filter((author) => author.id !== authorId),
    );
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (!event.dataTransfer.files?.[0]) {
      return;
    }

    const droppedFile = event.dataTransfer.files[0];
    if (!droppedFile.name.endsWith('.zip')) {
      toast.error('Please upload a .zip submission package.');
      return;
    }

    updateFormData('file', droppedFile);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      updateFormData('file', event.target.files[0]);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && (!formData.venueId || !formData.track || !formData.title || !formData.abstract.trim())) {
      toast.error('Please select a valid venue from the suggestions, then complete track, title, and abstract.');
      return;
    }

    if (currentStep === 1 && !formData.keywords.trim()) {
      toast.error('Please add keywords before continuing.');
      return;
    }

    if (currentStep === 2) {
      if (!formData.file) {
        toast.error('Please upload a .zip submission package.');
        return;
      }

      if (!formData.overleafLink.trim()) {
        toast.error('Please provide your Overleaf read-only link.');
        return;
      }

      if (!formData.overleafLink.includes('overleaf.com')) {
        toast.warning('The provided link does not look like an Overleaf URL. Please double-check it.');
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSuggestVenue = async () => {
    if (!formData.title.trim() && !formData.abstract.trim()) {
      toast.error('Please enter a title or abstract first so AI can suggest a venue.');
      return;
    }

    setIsSuggestingVenue(true);
    try {
      const recommendations = await recommendVenues({
        title: formData.title.trim(),
        abstractText: formData.abstract.trim(),
        track: formData.track.trim(),
        keywords: keywordList,
      });

      if (!recommendations.length) {
        toast.info('No venue recommendation was returned for this draft.');
        return;
      }

      const topRecommendation = recommendations[0];
      const matchingVenue = venues.find((venue) => venue.id === topRecommendation.venueId);

      if (matchingVenue) {
        handleVenueSelect(matchingVenue);
      }

      toast.success(
        `Top recommendation: ${topRecommendation.venueName}${topRecommendation.matchScore ? ` (${topRecommendation.matchScore}% match)` : ''}`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 501) {
        toast.info('AI venue recommendation is wired, but the backend AI implementation is not ready yet.');
      } else {
        toast.error(error instanceof Error ? error.message : 'Venue recommendation failed.');
      }
    } finally {
      setIsSuggestingVenue(false);
    }
  };

  const handleSubmit = async (force = false) => {
    if (!isVenueRequirementComplete) {
      toast.error('Paper submission is blocked until the selected venue has a complete verified requirement set.');
      return;
    }

    if (!force) {
      const failedChecks = activeChecks.filter((check) => check.status === 'FAIL');
      if (failedChecks.length > 0) {
        toast.error('Please fix the failing checks before submitting.');
        return;
      }
      if (!allPreChecksPass) {
        toast.error('All pre-checks must be PASS before submitting the paper.');
        return;
      }
    }

    const loadingToast = toast.loading('Submitting paper...');

    try {
      const fileUrl = await uploadPaperZip(formData.file as File);

      const storedUserStr = window.localStorage.getItem('prs.auth.user');
      const currentUser = storedUserStr ? JSON.parse(storedUserStr) : null;

      const storedLabStr = window.localStorage.getItem('prs.selected.lab');
      let finalLabId = '00000000-0000-0000-0000-000000000000';

      if (storedLabStr) {
        try {
          const labObj = JSON.parse(storedLabStr);
          finalLabId = labObj.id;
        } catch {
          finalLabId = storedLabStr;
        }
      }

      const createdPaper = await addPaper({
        title: formData.title,
        track: formData.track,
        labId: finalLabId,
        mainAuthorId: currentUser?.id || '99999999-9999-9999-9999-999999999999',
        coAuthorIds: formData.coAuthors.map((author) => author.id),
        expectedVenueId: formData.venueId,
        contentLink: fileUrl,
        overleafLink: formData.overleafLink,
        overleafProjectUrl: formData.overleafProjectUrl || undefined,
        ...(force && { bypassedPrechecks: true }),
      });

      try {
        const preCheckResponse = await runPreCheck(createdPaper.id);
        setServerPreCheck(preCheckResponse);
        setSubmissionResult({
          paperId: createdPaper.id,
          title: createdPaper.title,
          venueName: createdPaper.expectedVenueName ?? formData.venueName,
          overallStatus: preCheckResponse.overallStatus,
          overleafLink: formData.overleafLink,
        });
        toast.success(`Paper submitted successfully. Final pre-check status: ${preCheckResponse.overallStatus}.`, {
          id: loadingToast,
        });
      } catch (error) {
        setSubmissionResult({
          paperId: createdPaper.id,
          title: createdPaper.title,
          venueName: createdPaper.expectedVenueName ?? formData.venueName,
          overallStatus: null,
          overleafLink: formData.overleafLink,
        });
        toast.success('Paper submitted successfully.', { id: loadingToast });
        toast.info('Submission succeeded, but backend pre-check could not be completed right away.');
      }

      if (finishPaperId && currentUser?.id) {
        try {
          await finishPaper(finishPaperId, currentUser.id, force || undefined);
          toast.success('Your coordinator has been notified that the paper is ready for review.');
        } catch {
          toast.error('Submission saved, but failed to notify coordinator. Please contact them directly.');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred during submission.', {
        id: loadingToast,
      });
    }
  };

  if (submissionResult) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Paper Submitted</h2>
          <p className="mt-1 text-muted-foreground">
            Your paper was saved successfully. The draft pre-check panel is no longer active because the submission is complete.
          </p>
        </div>

        <Card className="border-green-200 bg-green-50/60">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-green-600 p-2 text-white">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{submissionResult.title}</p>
                  <p className="text-sm text-muted-foreground">{submissionResult.venueName}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Submission Status</p>
                    <p className="mt-1 text-sm font-semibold text-green-700">Successfully submitted</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Backend Pre-Check</p>
                    <p className={`mt-1 text-sm font-semibold ${getOverallStatusClass(submissionResult.overallStatus ?? 'PARTIAL')}`}>
                      {submissionResult.overallStatus ?? 'Pending'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button onClick={() => navigate('/member/submissions')}>
                    <Home className="mr-2 h-4 w-4" />
                    Go to My Submissions
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(submissionResult.overleafLink, '_blank', 'noopener,noreferrer')}
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    View Paper
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSubmitAnotherPaper}
                  >
                    Submit Another Paper
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="venue">Venue *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-600"
                    onClick={handleSuggestVenue}
                    disabled={isSuggestingVenue}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {isSuggestingVenue ? 'Suggesting...' : 'AI Suggestion'}
                  </Button>
                </div>
                <div className="relative">
                  <div className="relative">
                    <Input
                      id="venue"
                      name="venue-search-no-autocomplete"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={isLoadingVenues ? 'Loading venues...' : 'Type a venue name or acronym'}
                      value={venueQuery}
                      onFocus={() => setShowVenueSuggestions(true)}
                      onClick={() => setShowVenueSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowVenueSuggestions(false), 120);
                      }}
                      onChange={(event) => handleVenueQueryChange(event.target.value)}
                      disabled={isLoadingVenues}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setShowVenueSuggestions((prev) => !prev);
                      }}
                      aria-label="Toggle venue suggestions"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  {showVenueSuggestions && !isLoadingVenues && (
                    <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                      {filteredVenues.length > 0 ? (
                        filteredVenues.map((venue) => (
                          <button
                            key={venue.id}
                            type="button"
                            className="block w-full border-b border-border/50 px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleVenueSelect(venue);
                            }}
                          >
                            <div className="text-sm font-medium text-foreground">
                              {formatVenueLabel(venue)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {venue.rank ? `${venue.rank} • ` : ''}
                              {venue.type || 'Venue'}
                            </div>
                          </button>
                        ))
                      ) : venueLoadError ? (
                        <div className="space-y-2 px-3 py-3 text-sm text-muted-foreground">
                          <p>{venueLoadError}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              void loadVenues();
                            }}
                          >
                            Retry loading venues
                          </Button>
                        </div>
                      ) : venues.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No venues are currently loaded.
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No matching venue found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {formData.venueId ? (
                  <p className="text-xs text-green-600">Selected venue confirmed.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Choose one of the suggestions so we can link the paper to a real venue.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="track">Track *</Label>
                <Input
                  id="track"
                  placeholder="e.g., Research Track, Main Track"
                  value={formData.track}
                  onChange={(event) => updateFormData('track', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Paper Title *</Label>
              <Input
                id="title"
                placeholder="Enter your paper title..."
                value={formData.title}
                onChange={(event) => updateFormData('title', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abstract">Abstract *</Label>
              <Textarea
                id="abstract"
                placeholder="Enter your abstract..."
                rows={8}
                value={formData.abstract}
                onChange={(event) => updateFormData('abstract', event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Current: {countWords(formData.abstract)} words
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Co-Authors</Label>
              <div className="mb-2 flex min-h-[32px] flex-wrap gap-2">
                {formData.coAuthors.length === 0 && (
                  <span className="text-sm italic text-muted-foreground">No co-authors added yet.</span>
                )}
                {formData.coAuthors.map((author) => (
                  <Badge key={author.id} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                    {author.name}
                    <button
                      type="button"
                      onClick={() => removeAuthor(author.id)}
                      className="ml-1 rounded-full text-muted-foreground hover:text-red-500"
                    >
                      x
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Type to search lab members..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && filteredMembers.length > 0 && (
                <div className="mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="block w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                      onClick={() => addAuthor(member)}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="keywords">Keywords * (comma-separated)</Label>
              <Input
                id="keywords"
                placeholder="e.g., empirical software engineering, testing, repository mining"
                value={formData.keywords}
                onChange={(event) => updateFormData('keywords', event.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="file">Upload Submission Package (.zip) *</Label>
              <div
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`mx-auto mb-4 h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-muted-foreground'}`} />
                <p className="mb-2 text-sm font-medium">Drag and drop your .zip file here, or</p>
                <Label htmlFor="file" className="cursor-pointer font-medium text-blue-600 hover:text-blue-700">
                  browse files
                </Label>
                <Input id="file" type="file" accept=".zip" onChange={handleFileChange} className="hidden" />
                <p className="mt-4 text-xs text-muted-foreground">
                  Include your manuscript, code, and datasets in a single .zip file.
                </p>
              </div>

              {formData.file && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/10 p-3">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">{formData.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => updateFormData('file', null)} className="text-red-500">
                    Remove
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-6">
              <Label htmlFor="overleafLink" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-blue-600" />
                Overleaf Read-Only Link *
              </Label>
              <Input
                id="overleafLink"
                type="url"
                placeholder="https://www.overleaf.com/read/..."
                value={formData.overleafLink}
                onChange={(event) => updateFormData('overleafLink', event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Reviewers will use this link to access your manuscript on Overleaf.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overleafProjectUrl" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                Overleaf Project URL
                <span className="text-xs text-muted-foreground font-normal">(for browser extension — optional)</span>
              </Label>
              <Input
                id="overleafProjectUrl"
                type="url"
                placeholder="https://www.overleaf.com/project/..."
                value={formData.overleafProjectUrl}
                onChange={(event) => updateFormData('overleafProjectUrl', event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The direct project URL used by the browser extension to detect your paper.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-1 font-medium">Venue</h4>
                  <p className="text-foreground">{formData.venueName || 'Not provided'}</p>
                </div>
              <div>
                <h4 className="mb-1 font-medium">Track</h4>
                <p className="text-foreground">{formData.track || 'Not provided'}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Title</h4>
              <p className="text-foreground">{formData.title || 'Not provided'}</p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Abstract</h4>
              <p className="text-sm text-foreground">{formData.abstract || 'Not provided'}</p>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Authors</h4>
              <div className="flex flex-wrap gap-2">
                {formData.coAuthors.length > 0 ? (
                  formData.coAuthors.map((author) => (
                    <Badge key={author.id} variant="secondary">
                      {author.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No co-authors selected.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {keywordList.length > 0 ? (
                  keywordList.map((keyword) => <Badge key={keyword}>{keyword}</Badge>)
                ) : (
                  <p className="text-sm text-muted-foreground">No keywords provided.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Manuscript
                </h4>
                <p className="text-sm text-foreground">{formData.file?.name || 'No file uploaded'}</p>
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-2 font-medium">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  Overleaf Link
                </h4>
                <p className="truncate text-sm text-blue-600" title={formData.overleafLink}>
                  {formData.overleafLink || 'Not provided'}
                </p>
              </div>
            </div>

            {formData.overleafProjectUrl && (
              <div className="border-t pt-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  Overleaf Project URL
                  <span className="text-xs font-normal text-muted-foreground">(extension)</span>
                </h4>
                <p className="truncate text-sm text-blue-600" title={formData.overleafProjectUrl}>
                  {formData.overleafProjectUrl}
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">New Submission</h2>
        <p className="mt-1 text-muted-foreground">Submit your paper for review with venue-aware checks.</p>
      </div>

      {finishPaperId && (
        <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          Completing submission for: <span className="font-semibold">{finishPaperTitle}</span>. Your coordinator will be notified when you submit.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-8 flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.title} className="flex flex-1 items-center">
                <div className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      index <= currentStep ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index < currentStep ? <CheckCircle className="h-6 w-6" /> : <step.icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`mt-2 text-center text-sm ${
                      index <= currentStep ? 'font-medium text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-1 flex-1 ${index < currentStep ? 'bg-blue-600' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          <Progress value={(currentStep / (steps.length - 1)) * 100} className="mb-6" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Step {currentStep + 1}: {steps[currentStep].title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderStepContent()}

              <div className="flex justify-between border-t pt-6">
                <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                {currentStep < steps.length - 1 ? (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  ) : (
                    <Button onClick={() => handleSubmit()} disabled={!isVenueRequirementComplete || !allPreChecksPass}>
                      Submit Paper
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Pre-Check Status
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {serverPreCheck
                  ? 'Draft pre-check from your current ZIP and venue requirements'
                  : draftPreCheckError
                    ? 'Draft pre-check could not be loaded'
                  : 'Venue-aware validation before submit'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.venueName && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium text-foreground">{formData.venueName}</p>
                  <p className="mt-1 text-muted-foreground">
                    {isFetchingRequirement
                      ? 'Refreshing venue requirements...'
                      : selectedVenueRequirement?.manuallyVerified
                        ? 'Venue requirements loaded from verified backend data.'
                        : 'Using the latest venue requirement data available in the backend.'}
                  </p>
                </div>
              )}

              {isRunningDraftPreCheck && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Analyzing your ZIP package against venue requirements...
                </div>
              )}

              {draftPreCheckError && !isRunningDraftPreCheck && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Draft pre-check request failed, so the panel is showing local fallback estimates. {draftPreCheckError}
                  </AlertDescription>
                </Alert>
              )}

              {activeChecks.map((check) => (
                <div key={check.checkName} className="flex items-start gap-3">
                  {getCheckIcon(check.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{check.checkName}</p>
                      <div className="flex items-center gap-2">
                        {check.source && (
                          <Badge className={getSourceBadgeClass(check.source)}>
                            {getSourceLabel(check.source)}
                          </Badge>
                        )}
                        <Badge className={getStatusBadgeClass(check.status)}>
                          {getStatusLabel(check.status)}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {describeCheck(check, selectedVenueRequirement)}
                    </p>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall</p>
                <p className={`mt-1 text-sm font-semibold ${getOverallStatusClass(overallStatus)}`}>{overallStatus}</p>
              </div>

              {selectedVenueRequirement && (
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Venue Requirement Snapshot</p>
                  <ul className="mt-2 space-y-1">
                    <li>Page limit: {selectedVenueRequirement.pageLimit ?? 'Not specified'}</li>
                    <li>Abstract limit: {formatAbstractLimit(selectedVenueRequirement)}</li>
                    <li>Reference format: {selectedVenueRequirement.referenceFormat ?? 'Not specified'}</li>
                    <li>
                      Anonymity required:{' '}
                      {selectedVenueRequirement.anonymityRequired === null
                        ? 'Unknown'
                        : selectedVenueRequirement.anonymityRequired
                          ? 'Yes'
                          : 'No'}
                    </li>
                  </ul>
                </div>
              )}

              {!isVenueRequirementComplete && formData.venueId && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Submission is blocked because the selected venue does not yet have a complete verified requirement set.
                  </AlertDescription>
                </Alert>
              )}

                {activeChecks.some((check) => check.status === 'FAIL') && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Please fix the failing checks before submitting.</AlertDescription>
                  </Alert>
                )}

                {hasIncompletePreCheck && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Submission stays blocked until every pre-check is resolved to PASS.
                    </AlertDescription>
                  </Alert>
                )}

                {isVenueRequirementComplete && !allPreChecksPass && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      If you believe the pre-checks are incorrect (e.g. AI hallucination), you can bypass them. Your coordinator will be notified.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-400 text-amber-700 hover:bg-amber-50"
                      onClick={() => setShowForceSubmitDialog(true)}
                    >
                      Force Submit (Bypass Pre-checks)
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showForceSubmitDialog} onOpenChange={setShowForceSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bypass Pre-checks and Submit?</AlertDialogTitle>
            <AlertDialogDescription>
              One or more pre-checks have not passed. Submitting anyway means your coordinator will be notified that pre-checks were bypassed and will review the paper manually. Only do this if you are confident the pre-check results are incorrect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => { setShowForceSubmitDialog(false); handleSubmit(true); }}
            >
              Force Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function buildLocalChecks(
  formData: FormDataState,
  requirement: VenueRequirementResponse | null,
): DisplayCheck[] {
  const authorNames = formData.coAuthors.map((author) => author.name.toLowerCase());
  const titleAndAbstract = `${formData.title} ${formData.abstract}`.toLowerCase();
  const abstractWordCount = countWords(formData.abstract);
  const abstractWordLimit = requirement?.abstractWordLimit ?? null;

  const anonymityStatus = (() => {
    if (requirement?.anonymityRequired === false) {
      return 'PASS';
    }

    if (!formData.title.trim() && !formData.abstract.trim()) {
      return 'PENDING';
    }

    if (authorNames.length === 0 || requirement?.anonymityRequired === null || requirement?.anonymityRequired === undefined) {
      return 'UNCERTAIN';
    }

    const hasAuthorInText = authorNames.some((name) => titleAndAbstract.includes(name));
    return hasAuthorInText ? 'FAIL' : 'PASS';
  })();

  const abstractCheck = (() => {
    if (!formData.abstract.trim()) {
      return { status: 'PENDING' as CheckStatus, reason: 'Waiting for abstract text.' };
    }

    if (!abstractWordLimit) {
      return {
        status: 'UNCERTAIN' as CheckStatus,
        reason: 'No abstract word limit is currently available in the loaded venue requirements.',
      };
    }

    if (abstractWordCount <= abstractWordLimit) {
      return {
        status: 'PASS' as CheckStatus,
        reason: `Abstract contains ${abstractWordCount} words; the venue limit is ${abstractWordLimit} words.`,
      };
    }

    return {
      status: 'FAIL' as CheckStatus,
      reason: `Abstract contains ${abstractWordCount} words, which exceeds the venue limit of ${abstractWordLimit} words by ${abstractWordCount - abstractWordLimit}.`,
    };
  })();

  const pageLimitStatus = (() => {
    if (!formData.file) {
      return 'PENDING';
    }

    if (!requirement?.pageLimit) {
      return 'UNCERTAIN';
    }

    return 'UNCERTAIN';
  })();

  const requiredSectionsStatus = (() => {
    if (!formData.file) {
      return 'PENDING';
    }

    if (!requirement?.requiredSections?.trim()) {
      return 'UNCERTAIN';
    }

    return 'UNCERTAIN';
  })();

  const referenceFormatStatus = (() => {
    if (!formData.file) {
      return 'PENDING';
    }

    if (!requirement?.referenceFormat?.trim()) {
      return 'UNCERTAIN';
    }

    return 'UNCERTAIN';
  })();

  return [
    { checkName: 'Anonymity', status: anonymityStatus },
    { checkName: 'Abstract Length', status: abstractCheck.status, reason: abstractCheck.reason, source: 'RULE' },
    { checkName: 'Page Limit', status: pageLimitStatus },
    { checkName: 'Required Sections', status: requiredSectionsStatus },
    { checkName: 'Reference Analysis', status: referenceFormatStatus },
  ];
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function getCheckIcon(status: CheckStatus) {
  switch (status) {
    case 'PASS':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'FAIL':
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case 'UNCERTAIN':
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    case 'PENDING':
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusLabel(status: CheckStatus) {
  switch (status) {
    case 'PASS':
      return 'PASS';
    case 'FAIL':
      return 'FAIL';
    case 'UNCERTAIN':
      return 'UNCERTAIN';
    case 'PENDING':
    default:
      return 'PENDING';
  }
}

function getStatusBadgeClass(status: CheckStatus) {
  switch (status) {
    case 'PASS':
      return 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-50';
    case 'FAIL':
      return 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-50';
    case 'UNCERTAIN':
      return 'border border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-50';
    case 'PENDING':
    default:
      return 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50';
  }
}

function getSourceLabel(source: string) {
  switch (source) {
    case 'RULE':
      return 'Rule';
    case 'FILE':
      return 'File';
    case 'AI':
      return 'AI';
    case 'DRAFT_FALLBACK':
      return 'Fallback';
    default:
      return source;
  }
}

function getSourceBadgeClass(source: string) {
  switch (source) {
    case 'RULE':
      return 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50';
    case 'FILE':
      return 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50';
    case 'AI':
      return 'border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-50';
    case 'DRAFT_FALLBACK':
      return 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50';
    default:
      return 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50';
  }
}

function normalizeStatus(status: string): CheckStatus {
  if (status === 'PASS' || status === 'FAIL' || status === 'UNCERTAIN') {
    return status;
  }

  return 'PENDING';
}

function deriveOverallStatus(checks: DisplayCheck[]) {
  if (checks.some((check) => check.status === 'FAIL')) {
    return 'FAIL';
  }

  if (checks.some((check) => check.status === 'UNCERTAIN' || check.status === 'PENDING')) {
    return 'PARTIAL';
  }

  return 'PASS';
}

function getOverallStatusClass(status: string) {
  if (status === 'PASS') {
    return 'text-green-600';
  }

  if (status === 'FAIL') {
    return 'text-red-600';
  }

  return 'text-yellow-600';
}

function describeCheck(
  check: DisplayCheck,
  requirement: VenueRequirementResponse | null,
) {
  const abstractWordLimit = requirement?.abstractWordLimit ?? null;

  if (check.reason?.trim()) {
    return check.reason;
  }

  if (check.status === 'PASS') {
    if (check.checkName === 'Abstract Length' && abstractWordLimit) {
      return `Fits within the venue abstract limit (${abstractWordLimit} words).`;
    }

    if (check.checkName === 'Anonymity' && requirement?.anonymityRequired === false) {
      return 'This venue does not require anonymization.';
    }

    return 'This requirement currently looks satisfied.';
  }

  if (check.status === 'FAIL') {
    if (check.checkName === 'Abstract Length' && abstractWordLimit) {
      return `The abstract exceeds the venue limit of ${abstractWordLimit} words.`;
    }

    if (check.checkName === 'Anonymity') {
      return 'Author-identifying content was detected in title or abstract.';
    }

    return 'This requirement currently looks unsatisfied.';
  }

  if (check.status === 'UNCERTAIN') {
    if (AI_ELIGIBLE_CHECKS.has(check.checkName)) {
      return 'This will need file-level or AI-assisted validation after submission.';
    }

    return 'The system cannot decide this check yet.';
  }

  return 'Waiting for the required input.';
}

function formatAbstractLimit(requirement: VenueRequirementResponse | null) {
  return requirement?.abstractWordLimit !== null && requirement?.abstractWordLimit !== undefined
    ? String(requirement.abstractWordLimit)
    : 'Not specified';
}

function formatVenueLabel(venue: VenueResponse) {
  return venue.acronym ? `${venue.acronym} - ${venue.name}` : venue.name;
}

function isVenueRequirementSetComplete(requirement: VenueRequirementResponse | null) {
  if (!requirement) {
    return false;
  }

  return requirement.pageLimit !== null
    && !!requirement.officialSourceUrl?.trim()
    && requirement.manuallyVerified === true;
}
