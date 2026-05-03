import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router';

export default function AuthorDashboard() {
  const submissions = [
    { id: 1, title: 'Machine Learning in Healthcare', status: 'under-review', submitted: '2026-02-15', reviewers: 3 },
    { id: 2, title: 'Quantum Computing Applications', status: 'accepted', submitted: '2026-01-20', reviewers: 3 },
    { id: 3, title: 'Climate Modeling with AI', status: 'revisions-requested', submitted: '2026-02-28', reviewers: 2 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'under-review':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Clock className="w-4 h-4" />
            <span>Under Review</span>
          </div>
        );
      case 'accepted':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Accepted</span>
          </div>
        );
      case 'revisions-requested':
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <FileText className="w-4 h-4" />
            <span>Revisions Requested</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-4 h-4" />
            <span>Rejected</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Author Dashboard</h2>
          <p className="text-gray-500 mt-1">Manage your paper submissions and track review progress</p>
        </div>
        <Link to="/author/new-submission">
          <Button className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            New Submission
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">1</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">1</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Needs Revision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">1</div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>My Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{submission.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>Submitted: {submission.submitted}</span>
                      <span>•</span>
                      <span>{submission.reviewers} reviewers assigned</span>
                    </div>
                  </div>
                  <div className="text-sm">{getStatusBadge(submission.status)}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  {submission.status === 'revisions-requested' && (
                    <Button size="sm">Submit Revision</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
