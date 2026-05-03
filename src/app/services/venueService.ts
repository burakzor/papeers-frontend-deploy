import { apiRequest } from '../lib/api';

const VENUE_CACHE_KEY = 'prs.venues.cache.v2';
const VENUE_CACHE_TTL_MS = 1000 * 60 * 60;

export interface VenueRequirementResponse {
  id: string;
  pageLimit: number | null;
  abstractWordLimit: number | null;
  referenceFormat: string | null;
  anonymityRequired: boolean | null;
  requiredSections: string | null;
  officialSourceUrl: string | null;
  lastFetchedAt: string | null;
  fetchNotes: string | null;
  manuallyVerified: boolean | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
}

export interface VenueResponse {
  id: string;
  name: string;
  acronym: string | null;
  type: string | null;
  rank: string | null;
  source: string | null;
  primaryFor: string | null;
  commentsCount: number | null;
  averageRating: string | null;
  officialUrl: string | null;
  dblpUrl: string | null;
  requirement: VenueRequirementResponse | null;
}

export interface VenueRecommendationRequest {
  file: File;
}

export interface VenueRecommendationResponse {
  venueId: string;
  venueName: string;
  acronym: string | null;
  rank: string | null;
  matchScore: number | null;
  reason: string | null;
  checks?: PreCheckCheckResponse[] | null;
}

export interface PreCheckCheckResponse {
  checkName: string;
  status: 'PASS' | 'FAIL' | 'UNCERTAIN' | string;
  source?: 'RULE' | 'FILE' | 'AI' | 'DRAFT_FALLBACK' | string;
  reason?: string | null;
}

export interface PreCheckResponse {
  paperId: string;
  venueId: string;
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL' | string;
  checks: PreCheckCheckResponse[];
}

export interface VenueCreateRequest {
  name: string;
  acronym: string;
  type: string;
  rank: string;
  source: string;
  primaryFor: string;
  commentsCount: number;
  averageRating: string;
  officialUrl?: string;
  dblpUrl?: string;
}

export interface VenueRequirementUpdateRequest {
  pageLimit?: number | null;
  abstractWordLimit?: number | null;
  referenceFormat?: string | null;
  anonymityRequired?: boolean | null;
  requiredSections?: string | null;
  verificationNotes?: string | null;
  manuallyVerified?: boolean;
}

export async function createVenue(data: VenueCreateRequest): Promise<VenueResponse> {
  const result = await apiRequest<VenueResponse>('/v1/venues', {
    method: 'POST',
    auth: true,
    body: data,
  });
  clearVenueCache();
  return result;
}

export async function updateVenue(id: string, data: VenueCreateRequest): Promise<VenueResponse> {
  const result = await apiRequest<VenueResponse>(`/v1/venues/${id}`, {
    method: 'PUT',
    auth: true,
    body: data,
  });
  clearVenueCache();
  return result;
}

export async function deleteVenue(id: string): Promise<void> {
  await apiRequest<void>(`/v1/venues/${id}`, {
    method: 'DELETE',
    auth: true,
  });
  clearVenueCache();
}

export async function updateVenueRequirements(venueId: string, data: VenueRequirementUpdateRequest): Promise<VenueRequirementResponse> {
  return apiRequest<VenueRequirementResponse>(`/v1/venues/${venueId}/requirements`, {
    method: 'PUT',
    auth: true,
    body: data,
  });
}

export async function getAllVenues(): Promise<VenueResponse[]> {
  const cached = readVenueCache();
  if (cached) {
    return cached;
  }

  const venues = await apiRequest<VenueResponse[]>('/v1/venues', {
    method: 'GET',
    auth: true,
  });

  writeVenueCache(venues);
  return venues;
}

export function getCachedVenues(): VenueResponse[] | null {
  return readVenueCache();
}

export async function getVenueRequirements(venueId: string): Promise<VenueRequirementResponse> {
  return apiRequest<VenueRequirementResponse>(`/v1/venues/${venueId}/requirements`, {
    method: 'GET',
    auth: true,
  });
}

export async function recommendVenues(
  request: VenueRecommendationRequest,
): Promise<VenueRecommendationResponse[]> {
  const formData = new FormData();
  formData.append('file', request.file);

  return apiRequest<VenueRecommendationResponse[]>('/v1/venues/recommend', {
    method: 'POST',
    auth: true,
    body: formData,
  });
}

export async function runPreCheck(paperId: string): Promise<PreCheckResponse> {
  return apiRequest<PreCheckResponse>('/v1/precheck', {
    method: 'POST',
    auth: true,
    body: { paperId },
  });
}

export async function runDraftPreCheck(input: {
  venueId: string;
  title: string;
  abstractText: string;
  track: string;
  file: File;
}): Promise<PreCheckResponse> {
  const formData = new FormData();
  formData.append('venueId', input.venueId);
  formData.append('title', input.title);
  formData.append('abstractText', input.abstractText);
  formData.append('track', input.track);
  formData.append('file', input.file);

  return apiRequest<PreCheckResponse>('/v1/precheck/draft', {
    method: 'POST',
    auth: true,
    body: formData,
  });
}

function readVenueCache(): VenueResponse[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(VENUE_CACHE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      fetchedAt: number;
      venues: VenueResponse[];
    };

    if (!parsed?.fetchedAt || !Array.isArray(parsed.venues)) {
      return null;
    }

    if (Date.now() - parsed.fetchedAt > VENUE_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(VENUE_CACHE_KEY);
      return null;
    }

    return parsed.venues;
  } catch {
    return null;
  }
}

function clearVenueCache() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(VENUE_CACHE_KEY);
  }
}

function writeVenueCache(venues: VenueResponse[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    VENUE_CACHE_KEY,
    JSON.stringify({
      fetchedAt: Date.now(),
      venues,
    }),
  );
}
