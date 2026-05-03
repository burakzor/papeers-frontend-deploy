import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '../../lib/api';
import {
  getAllVenues,
  recommendVenues,
  type VenueRecommendationResponse,
  type VenueResponse,
} from '../../services/venueService';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

const PRECHECK_FORM_ITEMS = [
  'Page Limit',
  'Abstract Length',
  'Required Sections',
  'Anonymity',
  'Reference Analysis',
] as const;

export default function VenueRecommendations() {
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendations, setRecommendations] = useState<VenueRecommendationResponse[]>([]);
  const [recommendationNotice, setRecommendationNotice] = useState<string | null>(null);

  useEffect(() => {
    const loadVenues = async () => {
      try {
        setVenues(await getAllVenues());
      } catch {
        toast.error('Could not load venue metadata.');
      } finally {
        setIsLoading(false);
      }
    };

    loadVenues();
  }, []);

  const venueById = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue])),
    [venues],
  );

  const filteredRecommendations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return recommendations;
    }

    return recommendations.filter((recommendation) => {
      const venue = venueById.get(recommendation.venueId);
      return (
        recommendation.venueName.toLowerCase().includes(normalizedQuery)
        || recommendation.acronym?.toLowerCase().includes(normalizedQuery)
        || venue?.primaryFor?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [recommendations, searchQuery, venueById]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setRecommendations([]);
    setRecommendationNotice(null);
    setSearchQuery('');
  };

  const handleRecommend = async () => {
    if (!selectedFile) {
      toast.error('Please upload a paper ZIP first.');
      return;
    }

    setIsRecommending(true);
    setRecommendationNotice(null);

    try {
      const result = await recommendVenues({ file: selectedFile });
      setRecommendations(result);
      setRecommendationNotice(
        result.length
          ? `Showing ${result.length} venue recommendation${result.length > 1 ? 's' : ''} for the uploaded paper.`
          : 'The AI analyzed the uploaded paper, but no database venue recommendation was returned.',
      );
    } catch (error) {
      setRecommendations([]);
      if (error instanceof ApiError && error.status === 501) {
        setRecommendationNotice(error.message || 'The backend AI venue recommendation service is not ready yet.');
      } else {
        setRecommendationNotice(error instanceof Error ? error.message : 'Venue recommendation failed.');
      }
    } finally {
      setIsRecommending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Target className="h-7 w-7 text-blue-600" />
          Venue Recommendations
        </h2>
        <p className="mt-1 text-muted-foreground">
          Upload a paper ZIP directly and let the AI rank matching venues from the verified database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Upload a Paper</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                The AI will inspect the full paper content inside the ZIP and compare it against verified venue requirements.
              </p>
            </div>
            <Badge className="w-fit bg-blue-600 text-white">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-ranked
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="venue-recommendation-file"
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Use a manuscript ZIP similar to the one used in the pre-check flow.
          </p>

          {!selectedFile ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Upload a paper ZIP to start venue recommendation.</AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="mt-1 text-muted-foreground">
                The uploaded paper will be checked against venue requirement checklists before ranking.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFile && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Run AI Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                The backend will inspect the uploaded paper, match it to venues in the database, and show requirement checks as supporting evidence.
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                Ranking is based on AI match score, conference rank, deadline urgency, and pre-check results.
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter returned venues..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleRecommend} disabled={isRecommending}>
                  <Upload className="mr-2 h-4 w-4" />
                  {isRecommending ? 'Generating...' : 'Recommend Venues'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {recommendationNotice && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{recommendationNotice}</AlertDescription>
            </Alert>
          )}

          {filteredRecommendations.length > 0 && (
            <div className="space-y-4">
              {filteredRecommendations.map((recommendation) => {
                const venue = venueById.get(recommendation.venueId);
                const requirement = venue?.requirement;
                const precheckForm = buildPrecheckForm(recommendation);

                return (
                  <Card key={recommendation.venueId}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <CardTitle className="text-lg">{recommendation.venueName}</CardTitle>
                            {recommendation.acronym && <Badge variant="secondary">{recommendation.acronym}</Badge>}
                            {recommendation.rank && <Badge variant="outline">{recommendation.rank}</Badge>}
                          </div>
                          {venue?.primaryFor && (
                            <p className="text-sm text-muted-foreground">{venue.primaryFor}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600">
                              {recommendation.matchScore ?? '-'}%
                            </span>
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                          </div>
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            AI fit + rank boost + deadline boost - pre-check penalty
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 text-blue-600" />
                          <div>
                            <p className="mb-1 text-xs font-medium text-blue-900">Why This Venue?</p>
                            <p className="text-sm text-blue-900">{recommendation.reason || 'No reasoning returned.'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <h4 className="text-sm font-medium">Pre-Check Form</h4>
                          <p className="text-xs text-muted-foreground">
                            Used for the score penalty; missing AI checks stay visible.
                          </p>
                        </div>
                        <div className="space-y-2">
                          {precheckForm.map((check) => (
                            <div
                              key={`${recommendation.venueId}-${check.checkName}`}
                              className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">{check.checkName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {check.reason || 'No detailed pre-check explanation was returned for this item.'}
                                </p>
                              </div>
                              <Badge className={getCheckStatusClassName(check.status)}>{formatCheckStatus(check.status)}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {requirement && (
                        <div className="rounded-lg border p-4">
                          <h4 className="mb-3 text-sm font-medium">Venue Requirement Snapshot</h4>
                          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Page limit</p>
                              <p className="font-medium text-foreground">{requirement.pageLimit ?? 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Abstract limit</p>
                              <p className="font-medium text-foreground">
                                {formatAbstractLimit(requirement)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Reference format</p>
                              <p className="font-medium text-foreground">
                                {requirement.referenceFormat ?? 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Anonymity</p>
                              <p className="font-medium text-foreground">
                                {requirement.anonymityRequired === null
                                  ? 'Unknown'
                                  : requirement.anonymityRequired
                                    ? 'Required'
                                    : 'Not required'}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs text-muted-foreground">Required sections</p>
                              <p className="font-medium text-foreground">
                                {requirement.requiredSections || 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {venue?.officialUrl ? (
                          <Button variant="outline" asChild>
                            <a href={venue.officialUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Guidelines
                            </a>
                          </Button>
                        ) : (
                          <Button variant="outline" disabled>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            No Guideline URL
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!filteredRecommendations.length && recommendations.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No returned venues match the current filter.</AlertDescription>
            </Alert>
          )}

          {!recommendations.length && !recommendationNotice && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Ready for venue matching</p>
                  <p className="text-sm text-muted-foreground">
                    Upload a paper ZIP and run the recommendation endpoint.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function formatAbstractLimit(requirement: VenueResponse['requirement']) {
  return requirement?.abstractWordLimit !== null && requirement?.abstractWordLimit !== undefined
    ? String(requirement.abstractWordLimit)
    : 'Not specified';
}

function getCheckStatusClassName(status?: string | null) {
  switch (status) {
    case 'PASS':
      return 'bg-green-600 text-white';
    case 'FAIL':
      return 'bg-red-600 text-white';
    case 'UNCERTAIN':
      return 'bg-amber-500 text-white';
    case 'NOT_AVAILABLE':
      return 'bg-slate-500 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
}

function formatCheckStatus(status?: string | null) {
  return status === 'NOT_AVAILABLE' ? 'N/A' : (status || 'N/A');
}

function buildPrecheckForm(recommendation: VenueRecommendationResponse) {
  const returnedChecks = new Map(
    (recommendation.checks ?? []).map((check) => [check.checkName, check]),
  );

  return PRECHECK_FORM_ITEMS.map((checkName) => {
    const returnedCheck = returnedChecks.get(checkName);
    return returnedCheck ?? {
      checkName,
      status: 'NOT_AVAILABLE',
      reason: 'AI did not return this pre-check item for the recommended venue.',
    };
  });
}
