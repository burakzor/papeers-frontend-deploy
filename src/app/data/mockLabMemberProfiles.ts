export interface LabMemberProfile {
  id: string;
  name: string;
  email: string;
  lab: string;
  title: string;
  joinedAt: string;
  assignmentStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  paperStats: {
    total: number;
    underReview: number;
    revisions: number;
    accepted: number;
  };
  scores: {
    average: number;
    completionRate: number;
    quality: number;
  };
  expertise: Array<{
    area: string;
    score: number;
  }>;
}

export const MOCK_LAB_MEMBER_PROFILES: LabMemberProfile[] = [
  {
    id: '2',
    name: 'Prof. Bob Smith',
    email: 'bob.smith@bilkent.edu.tr',
    lab: 'AI Research Lab',
    title: 'Senior Lab Member',
    joinedAt: '2024-02-01',
    assignmentStats: {
      total: 14,
      pending: 2,
      inProgress: 3,
      completed: 9,
    },
    paperStats: {
      total: 6,
      underReview: 2,
      revisions: 1,
      accepted: 3,
    },
    scores: {
      average: 4.5,
      completionRate: 92,
      quality: 88,
    },
    expertise: [
      { area: 'Machine Learning', score: 4.8 },
      { area: 'NLP', score: 4.1 },
      { area: 'Computer Vision', score: 4.2 },
      { area: 'Data Mining', score: 4.6 },
      { area: 'Research Writing', score: 4.7 },
    ],
  },
  {
    id: '3',
    name: 'Dr. Carol Davis',
    email: 'carol.davis@bilkent.edu.tr',
    lab: 'AI Research Lab',
    title: 'Lab Member',
    joinedAt: '2024-02-15',
    assignmentStats: {
      total: 11,
      pending: 1,
      inProgress: 2,
      completed: 8,
    },
    paperStats: {
      total: 5,
      underReview: 1,
      revisions: 2,
      accepted: 2,
    },
    scores: {
      average: 4.2,
      completionRate: 89,
      quality: 84,
    },
    expertise: [
      { area: 'Machine Learning', score: 4.0 },
      { area: 'NLP', score: 4.7 },
      { area: 'Computer Vision', score: 3.9 },
      { area: 'Data Mining', score: 4.3 },
      { area: 'Research Writing', score: 4.4 },
    ],
  },
  {
    id: '4',
    name: 'John Wilson',
    email: 'john.wilson@bilkent.edu.tr',
    lab: 'AI Research Lab',
    title: 'Lab Member',
    joinedAt: '2024-03-01',
    assignmentStats: {
      total: 8,
      pending: 2,
      inProgress: 1,
      completed: 5,
    },
    paperStats: {
      total: 4,
      underReview: 2,
      revisions: 1,
      accepted: 1,
    },
    scores: {
      average: 4.0,
      completionRate: 85,
      quality: 80,
    },
    expertise: [
      { area: 'Machine Learning', score: 3.8 },
      { area: 'NLP', score: 3.9 },
      { area: 'Computer Vision', score: 4.4 },
      { area: 'Data Mining', score: 4.1 },
      { area: 'Research Writing', score: 3.8 },
    ],
  },
  {
    id: 'sarah-johnson',
    name: 'Dr. Sarah Johnson',
    email: 's.johnson@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-01-20',
    assignmentStats: { total: 18, pending: 1, inProgress: 3, completed: 14 },
    paperStats: { total: 7, underReview: 2, revisions: 1, accepted: 4 },
    scores: { average: 4.7, completionRate: 94, quality: 91 },
    expertise: [
      { area: 'Machine Learning', score: 4.9 },
      { area: 'NLP', score: 4.2 },
      { area: 'Computer Vision', score: 4.3 },
      { area: 'Data Mining', score: 4.8 },
      { area: 'Research Writing', score: 4.7 },
    ],
  },
  {
    id: 'michael-chen',
    name: 'Dr. Michael Chen',
    email: 'm.chen@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-01-24',
    assignmentStats: { total: 16, pending: 2, inProgress: 4, completed: 10 },
    paperStats: { total: 6, underReview: 2, revisions: 2, accepted: 2 },
    scores: { average: 4.4, completionRate: 88, quality: 86 },
    expertise: [
      { area: 'Machine Learning', score: 4.4 },
      { area: 'NLP', score: 3.8 },
      { area: 'Computer Vision', score: 4.9 },
      { area: 'Data Mining', score: 4.1 },
      { area: 'Research Writing', score: 4.2 },
    ],
  },
  {
    id: 'emily-brown',
    name: 'Dr. Emily Brown',
    email: 'e.brown@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-02-02',
    assignmentStats: { total: 17, pending: 1, inProgress: 2, completed: 14 },
    paperStats: { total: 8, underReview: 1, revisions: 1, accepted: 6 },
    scores: { average: 4.2, completionRate: 95, quality: 87 },
    expertise: [
      { area: 'Machine Learning', score: 4.1 },
      { area: 'NLP', score: 4.8 },
      { area: 'Computer Vision', score: 3.9 },
      { area: 'Data Mining', score: 4.5 },
      { area: 'Research Writing', score: 4.4 },
    ],
  },
  {
    id: 'james-wilson',
    name: 'Dr. James Wilson',
    email: 'j.wilson@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-02-10',
    assignmentStats: { total: 20, pending: 2, inProgress: 5, completed: 13 },
    paperStats: { total: 5, underReview: 2, revisions: 1, accepted: 2 },
    scores: { average: 3.9, completionRate: 78, quality: 81 },
    expertise: [
      { area: 'Machine Learning', score: 3.9 },
      { area: 'NLP', score: 3.4 },
      { area: 'Computer Vision', score: 4.0 },
      { area: 'Data Mining', score: 4.2 },
      { area: 'Research Writing', score: 3.9 },
    ],
  },
  {
    id: 'lisa-martinez',
    name: 'Dr. Lisa Martinez',
    email: 'l.martinez@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-02-18',
    assignmentStats: { total: 15, pending: 1, inProgress: 2, completed: 12 },
    paperStats: { total: 7, underReview: 1, revisions: 1, accepted: 5 },
    scores: { average: 4.8, completionRate: 98, quality: 93 },
    expertise: [
      { area: 'Machine Learning', score: 4.8 },
      { area: 'NLP', score: 4.6 },
      { area: 'Computer Vision', score: 4.1 },
      { area: 'Data Mining', score: 4.3 },
      { area: 'Research Writing', score: 4.9 },
    ],
  },
  {
    id: 'david-lee',
    name: 'Dr. David Lee',
    email: 'd.lee@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-02-22',
    assignmentStats: { total: 12, pending: 1, inProgress: 3, completed: 8 },
    paperStats: { total: 5, underReview: 2, revisions: 1, accepted: 2 },
    scores: { average: 4.1, completionRate: 85, quality: 82 },
    expertise: [
      { area: 'Machine Learning', score: 4.1 },
      { area: 'NLP', score: 3.7 },
      { area: 'Computer Vision', score: 4.4 },
      { area: 'Data Mining', score: 4.0 },
      { area: 'Research Writing', score: 4.0 },
    ],
  },
  {
    id: 'anna-kaya',
    name: 'Dr. Anna Kaya',
    email: 'a.kaya@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-03-02',
    assignmentStats: { total: 13, pending: 1, inProgress: 2, completed: 10 },
    paperStats: { total: 4, underReview: 1, revisions: 1, accepted: 2 },
    scores: { average: 4.5, completionRate: 90, quality: 88 },
    expertise: [
      { area: 'Machine Learning', score: 4.3 },
      { area: 'NLP', score: 4.1 },
      { area: 'Computer Vision', score: 4.5 },
      { area: 'Data Mining', score: 4.2 },
      { area: 'Research Writing', score: 4.4 },
    ],
  },
  {
    id: 'bora-demir',
    name: 'Dr. Bora Demir',
    email: 'b.demir@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-03-05',
    assignmentStats: { total: 10, pending: 2, inProgress: 2, completed: 6 },
    paperStats: { total: 3, underReview: 1, revisions: 1, accepted: 1 },
    scores: { average: 3.8, completionRate: 80, quality: 77 },
    expertise: [
      { area: 'Machine Learning', score: 3.8 },
      { area: 'NLP', score: 3.5 },
      { area: 'Computer Vision', score: 3.9 },
      { area: 'Data Mining', score: 4.0 },
      { area: 'Research Writing', score: 3.7 },
    ],
  },
  {
    id: 'nil-ersoy',
    name: 'Dr. Nil Ersoy',
    email: 'n.ersoy@bilkent.edu',
    lab: 'AI Research Lab',
    title: 'Reviewer',
    joinedAt: '2024-03-09',
    assignmentStats: { total: 14, pending: 1, inProgress: 2, completed: 11 },
    paperStats: { total: 6, underReview: 1, revisions: 1, accepted: 4 },
    scores: { average: 4.6, completionRate: 93, quality: 90 },
    expertise: [
      { area: 'Machine Learning', score: 4.7 },
      { area: 'NLP', score: 4.2 },
      { area: 'Computer Vision', score: 4.1 },
      { area: 'Data Mining', score: 4.6 },
      { area: 'Research Writing', score: 4.5 },
    ],
  },
];
