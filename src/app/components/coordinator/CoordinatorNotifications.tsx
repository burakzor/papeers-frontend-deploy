import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bell, CheckCircle2, UserCheck, Clock3 } from 'lucide-react';

const notifications = [
  {
    id: 'n1',
    type: 'assignment',
    title: 'Member Assigned to Paper',
    detail: 'Dr. Emily Brown was assigned to "Adaptive Reviewer Assignment".',
    when: '10 minutes ago',
  },
  {
    id: 'n2',
    type: 'review-finished',
    title: 'Paper Review Completed',
    detail: 'Review for "Transformer-Based Detection" has been completed by Dr. Sarah Johnson.',
    when: '1 hour ago',
  },
  {
    id: 'n3',
    type: 'deadline',
    title: 'Deadline Reminder Sent',
    detail: 'Deadline reminder sent to Dr. Michael Chen.',
    when: '3 hours ago',
  },
  {
    id: 'n4',
    type: 'assignment',
    title: 'Member Assigned to Paper',
    detail: 'Dr. James Wilson was assigned to "Prompt Injection Detection".',
    when: 'Yesterday',
  },
];

function getTypeBadge(type: string) {
  if (type === 'assignment') {
    return <Badge className="bg-blue-600">Assignment</Badge>;
  }
  if (type === 'review-finished') {
    return <Badge className="bg-green-600">Completed</Badge>;
  }
  return <Badge variant="outline">Update</Badge>;
}

export default function CoordinatorNotifications() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Bell className="h-6 w-6 text-blue-600" />
          Notifications
        </h2>
        <p className="mt-1 text-muted-foreground">Assignment, completion, and reminder updates for coordinators.</p>
      </div>

      <div className="space-y-4">
        {notifications.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {item.type === 'assignment' && <UserCheck className="w-4 h-4 text-blue-600" />}
                  {item.type === 'review-finished' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {item.type === 'deadline' && <Clock3 className="w-4 h-4 text-amber-600" />}
                  {item.title}
                </CardTitle>
                {getTypeBadge(item.type)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90">{item.detail}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.when}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
