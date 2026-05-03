// TODO(backend): replace this localStorage helper with real feedback endpoints when backend persistence is ready.
export interface ReviewerFeedback {
  id: string;
  paperId: string;
  paperTitle: string;
  reviewerName: string;
  quality: number;
  quantity: number;
  timeliness: number;
  comment: string;
  createdAt: string;
}

const storagePrefix = 'reviewer-feedback:';

function getStorageKey(memberEmail: string): string {
  return `${storagePrefix}${memberEmail.toLowerCase()}`;
}

export function getReviewerFeedbackForMember(memberEmail: string): ReviewerFeedback[] {
  if (!memberEmail) {
    return [];
  }

  try {
    const raw = localStorage.getItem(getStorageKey(memberEmail));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ReviewerFeedback[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReviewerFeedbackForMember(memberEmail: string, feedback: ReviewerFeedback[]): void {
  if (!memberEmail) {
    return;
  }

  localStorage.setItem(getStorageKey(memberEmail), JSON.stringify(feedback));
}

export function upsertReviewerFeedback(memberEmail: string, entry: ReviewerFeedback): ReviewerFeedback[] {
  const current = getReviewerFeedbackForMember(memberEmail);
  const existingIndex = current.findIndex((item) => item.paperId === entry.paperId);

  if (existingIndex >= 0) {
    current[existingIndex] = entry;
  } else {
    current.unshift(entry);
  }

  saveReviewerFeedbackForMember(memberEmail, current);
  return current;
}
