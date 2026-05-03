export type SubmissionStatus = 'Under Review' | 'Accepted' | 'Rejected';

export interface Submission {
  id: string;
  title: string;
  status: SubmissionStatus;
  submittedDate: string;
  authors: string[];
  reviewerName: string;
  reviewerNames: string[];
  venue: string;
  track: string;
  paperType: string;
  readinessScore: number;
  keywords: string[];
}

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-1',
    title: 'Machine Learning Approaches for Medical Diagnosis',
    status: 'Under Review',
    submittedDate: '2024-01-15',
    authors: ['Dr. Carol Davis', 'Prof. Bob Smith'],
    reviewerName: 'Dr. Sarah Johnson',
    reviewerNames: ['Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Anna Kaya'],
    venue: 'ICML 2024',
    track: 'AI for Healthcare',
    paperType: 'Technical Research Paper',
    readinessScore: 85,
    keywords: ['Machine Learning', 'Healthcare', 'Diagnostics'],
  },
  {
    id: 'sub-2',
    title: 'Deep Learning in Computer Vision',
    status: 'Accepted',
    submittedDate: '2024-01-10',
    authors: ['John Wilson'],
    reviewerName: 'Dr. Emily Brown',
    reviewerNames: ['Dr. Emily Brown', 'Dr. Lisa Martinez'],
    venue: 'CVPR 2024',
    track: 'Computer Vision',
    paperType: 'Experimental Vision Paper',
    readinessScore: 92,
    keywords: ['Deep Learning', 'Computer Vision', 'Image Analysis'],
  },
  {
    id: 'sub-3',
    title: 'Natural Language Processing for Code Generation',
    status: 'Rejected',
    submittedDate: '2024-01-05',
    authors: ['Dr. Carol Davis', 'John Wilson'],
    reviewerName: 'Dr. James Wilson',
    reviewerNames: ['Dr. James Wilson', 'Dr. David Lee', 'Dr. Nil Ersoy'],
    venue: 'ACL 2024',
    track: 'NLP for Software Engineering',
    paperType: 'Applied NLP Paper',
    readinessScore: 78,
    keywords: ['Natural Language Processing', 'Code Generation', 'Large Language Models'],
  },
];
