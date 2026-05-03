import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bell, CheckCircle2, ClipboardCheck, Clock3 } from 'lucide-react';

const notifications = [
  {
    id: 'mn1',
    type: 'assignment',
    title: 'New Review Assignment',
    detail: 'You were assigned to review "Machine Learning in Healthcare".',
    when: '20 minutes ago',
  },
  {
    id: 'mn2',
    type: 'review-finished',
    title: 'Review Completed for Your Paper',
    detail: 'Review process for "AI in Educational Systems" has been completed.',
    when: '2 hours ago',
  },
  {
    id: 'mn3',
    type: 'deadline',
    title: 'Review Deadline Approaching',
    detail: 'Your assigned review is due in 2 days.',
    when: 'Today',
  },
];

function getTypeBadge(type: string) {
  if (type === 'assignment') {
    return <Badge className="bg-blue-600">Assignment</Badge>;
  }
  if (type === 'review-finished') {
    return <Badge className="bg-green-600">Completed</Badge>;
  }
  return <Badge variant="outline">Reminder</Badge>;
}

export default function MemberNotifications() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" />
          Notifications
        </h2>
        <p className="text-gray-500 mt-1">Assignment and review completion updates for you.</p>
      </div>

      <div className="space-y-4">
        {notifications.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {item.type === 'assignment' && <ClipboardCheck className="w-4 h-4 text-blue-600" />}
                  {item.type === 'review-finished' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {item.type === 'deadline' && <Clock3 className="w-4 h-4 text-amber-600" />}
                  {item.title}
                </CardTitle>
                {getTypeBadge(item.type)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{item.detail}</p>
              <p className="text-xs text-gray-500 mt-2">{item.when}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
