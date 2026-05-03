import { apiRequest } from '../lib/api';

// ---- Method catalog --------------------------------------------------------

export interface ChecklistMethodResponse {
  id: string;
  name: string;
  category: string;
  description: string;
  sourceUrl: string | null;
  definitionAvailable: boolean;
}

export interface ChecklistMethodSuggestionResponse extends ChecklistMethodResponse {
  selected: boolean;
  confidence: number;
  reason: string;
}

export interface ChecklistDetectionResponse {
  suggestions: ChecklistMethodSuggestionResponse[];
}

// ---- Assessment response ---------------------------------------------------

export interface AssessedQuestion {
  questionId: string;
  questionText: string;
  attributeType: 'ESSENTIAL' | 'DESIRABLE' | 'EXTRAORDINARY';
  allowedErrorTypes: number[] | null;
  freeTextLabel: string | null;
  // AI-filled initial values — user can override
  answer: 'YES' | 'NO' | null;
  deviationReasonable: boolean | null;
  errorType: number | null;
  freeTextResponse: string | null;
}

export interface ChecklistStandardSection {
  standardName: string;
  questions: AssessedQuestion[];
}

export interface EmpiricalChecklistAssessResponse {
  standards: ChecklistStandardSection[];
}

// ---- API calls -------------------------------------------------------------

export async function getEmpiricalChecklistMethods(): Promise<ChecklistMethodResponse[]> {
  return apiRequest<ChecklistMethodResponse[]>('/v1/checklists/empirical-standards/methods', {
    method: 'GET',
    auth: true,
  });
}

export async function detectEmpiricalChecklistMethods(file: File): Promise<ChecklistDetectionResponse> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest<ChecklistDetectionResponse>('/v1/checklists/empirical-standards/detect-methods', {
    method: 'POST',
    auth: true,
    body,
  });
}

export async function detectMethodsByPaperId(paperId: string): Promise<ChecklistDetectionResponse> {
  return apiRequest<ChecklistDetectionResponse>(
    `/v1/checklists/empirical-standards/${paperId}/detect-methods`,
    { method: 'POST', auth: true },
  );
}

export async function assessEmpiricalChecklist(input: {
  file: File;
  standardNames: string[];
}): Promise<EmpiricalChecklistAssessResponse> {
  const body = new FormData();
  body.append('file', input.file);
  input.standardNames.forEach((name) => body.append('standardNames', name));
  return apiRequest<EmpiricalChecklistAssessResponse>('/v1/checklists/empirical-standards/assess', {
    method: 'POST',
    auth: true,
    body,
  });
}

export async function assessByPaperId(input: {
  paperId: string;
  standardNames: string[];
}): Promise<EmpiricalChecklistAssessResponse> {
  const params = new URLSearchParams();
  input.standardNames.forEach((name) => params.append('standardNames', name));
  return apiRequest<EmpiricalChecklistAssessResponse>(
    `/v1/checklists/empirical-standards/${input.paperId}/assess?${params.toString()}`,
    { method: 'POST', auth: true },
  );
}
