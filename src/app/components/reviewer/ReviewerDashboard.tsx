import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments } from '../../services/assignmentService';
import DeadlineCalendar from '../shared/DeadlineCalendar';

const reviewData = [
  { month: 'Jan', completed: 4, pending: 1 },
  { month: 'Feb', completed: 5, pending: 2 },
  { month: 'Mar', completed: 6, pending: 1 },
  { month: 'Apr', completed: 4, pending: 0 },
  { month: 'May', completed: 5, pending: 3 },
  { month: 'Jun', completed: 7, pending: 2 },
];

export default function ReviewerDashboard() {
  const { user } = useAuth();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: () => getMyAssignments(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const active = assignments.filter(a =>
      ['PENDING', 'ACCEPTED', 'STARTED', 'PENDING_EXTENSION', 'PENDING_REFUSAL'].includes(a.status),
    ).length;
    const completed = assignments.filter(a => ['DONE', 'COMPLETED'].includes(a.status)).length;
    const overdue = assignments.filter(
      a =>
        a.deadline &&
        new Date(a.deadline) < now &&
        !['DONE', 'COMPLETED', 'REJECTED'].includes(a.status),
    ).length;
    return { active, completed, overdue };
  }, [assignments]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reviewer Dashboard</h2>
        <p className="text-gray-500 mt-1">Track your review assignments and performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Assignments</CardTitle>
            <FileText className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-gray-500 mt-1">Currently assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed Reviews</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-gray-500 mt-1">Total completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Overdue</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : ''}`}>
              {stats.overdue}
            </div>
            <p className="text-xs text-gray-500 mt-1">Past deadline</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Calendar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Review Activity</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Monthly completed and pending reviews</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reviewData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deadline Calendar</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Click a marked day to see details</p>
          </CardHeader>
          <CardContent>
            <DeadlineCalendar 
              assignments={assignments} 
              mode="reviewer" 
              getReviewerName={() => user?.name || 'Reviewer'} 
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'Review submitted', paper: 'Machine Learning in Healthcare', date: '2026-03-04' },
              { action: 'Review accepted', paper: 'Quantum Computing Applications', date: '2026-03-01' },
              { action: 'Review completed', paper: 'Climate Modeling with AI', date: '2026-02-28' },
              { action: 'New assignment', paper: 'Blockchain Security', date: '2026-02-25' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                <div className="flex-1">
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.paper}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}