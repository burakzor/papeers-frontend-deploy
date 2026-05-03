import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { SearchableSelect } from '../ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Mail, UserPlus, Send, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  email: string;
  role: 'coordinator' | 'lab_member';
  lab?: string;
  status: 'sent' | 'accepted' | 'expired';
  sentAt: string;
  expiresAt: string;
}

export default function InviteUsers() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'coordinator' | 'lab_member'>('lab_member');
  const [inviteLab, setInviteLab] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // Mock data - in real app, this would come from API
  const [invitations, setInvitations] = useState<Invitation[]>([
    {
      id: '1',
      email: 'john.doe@bilkent.edu.tr',
      role: 'lab_member',
      lab: 'AI Research Lab',
      status: 'sent',
      sentAt: '2024-11-25',
      expiresAt: '2024-12-25',
    },
    {
      id: '2',
      email: 'jane.smith@bilkent.edu.tr',
      role: 'coordinator',
      status: 'accepted',
      sentAt: '2024-11-20',
      expiresAt: '2024-12-20',
    },
    {
      id: '3',
      email: 'bob.wilson@bilkent.edu.tr',
      role: 'lab_member',
      lab: 'Computer Vision Lab',
      status: 'expired',
      sentAt: '2024-10-15',
      expiresAt: '2024-11-15',
    },
  ]);

  // Mock labs data
  const labs = [
    'AI Research Lab',
    'Computer Vision Lab',
    'Natural Language Processing Lab',
    'Machine Learning Lab',
  ];

  const handleSendInvitation = () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (inviteRole === 'lab_member' && !inviteLab) {
      toast.error('Please select a lab for lab members');
      return;
    }

    const newInvitation: Invitation = {
      id: Date.now().toString(),
      email: inviteEmail,
      role: inviteRole,
      lab: inviteRole === 'lab_member' ? inviteLab : undefined,
      status: 'sent',
      sentAt: new Date().toISOString().split('T')[0],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
    };

    setInvitations([newInvitation, ...invitations]);
    setInviteEmail('');
    setInviteRole('lab_member');
    setInviteLab('');
    setIsInviteDialogOpen(false);
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'accepted':
        return 'default';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const activeInvitations = invitations.filter(inv => inv.status === 'sent');
  const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
  const expiredInvitations = invitations.filter(inv => inv.status === 'expired');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invite Users
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Send invitation emails to new users
          </p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Invitation</DialogTitle>
              <DialogDescription>
                Invite a new user to join the system via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <SearchableSelect
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as 'coordinator' | 'lab_member')}
                  options={[
                    { value: 'lab_member', label: 'Lab Member' },
                    { value: 'coordinator', label: 'Coordinator' },
                  ]}
                />
              </div>
              {inviteRole === 'lab_member' && (
                <div>
                  <label className="text-sm font-medium">Lab</label>
                  <SearchableSelect
                    value={inviteLab}
                    onValueChange={setInviteLab}
                    options={labs.map((lab) => ({ value: lab, label: lab }))}
                    placeholder="Select a lab"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvitation}>
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Invitations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeInvitations.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedInvitations.length}</div>
            <p className="text-xs text-muted-foreground">
              Successfully joined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredInvitations.length}</div>
            <p className="text-xs text-muted-foreground">
              Need to resend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {invitation.email}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                      {invitation.lab && ` • ${invitation.lab}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Sent: {new Date(invitation.sentAt).toLocaleDateString()} • Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(invitation.status)} className="flex items-center gap-1">
                    {getStatusIcon(invitation.status)}
                    {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                  </Badge>
                  {invitation.status === 'expired' && (
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-1" />
                      Resend
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {invitations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No invitations sent yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}