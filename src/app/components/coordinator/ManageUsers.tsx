import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { SearchableSelect } from '../ui/searchable-select';
import { Mail, UserMinus, UserPlus, Search, Copy, Link as LinkIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { type UserRole } from '../../services/userService';
import { getLabMembers, removeLabMember, inviteToLab, type MemberResponse } from '../../services/labService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function ManageUsers() {
  const queryClient = useQueryClient();
  const { selectedLab, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('LAB_MEMBER');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // Fetch members with React Query
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['lab-members', selectedLab?.id],
    queryFn: () => getLabMembers(),
    staleTime: 1000 * 60 * 2,
    select: (data) => data.map((m: MemberResponse) => ({
      id: m.user.id,
      name: m.user.name ?? m.user.email.split('@')[0],
      email: m.user.email,
      role: m.user.role.toLowerCase().replace('role_', '').replace('_', ' '),
      status: m.user.lastActiveDate ? 'active' : 'pending',
      avatar: m.user.photo ?? undefined,
      joinedAt: m.user.registrationDate,
      workload: m.workload ?? 0,
      isGuest: m.isGuest,
      invitationLink: m.user.registrationDate ? undefined : '#' // Placeholder if needed
    })),
    enabled: !!user,
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: removeLabMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-members'] });
      toast.success('Member removed successfully');
    },
    onError: (err) => {
      toast.error('Failed to remove member', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  });

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role, link }: { email: string; role: UserRole; link: string }) =>
      inviteToLab(email, link, role),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['lab-members'] });
      toast.success("Invitation Sent", {
        description: `Registration link sent to ${response.email}`,
      });
      setInviteEmail('');
      setInviteRole('LAB_MEMBER');
      setIsInviteDialogOpen(false);
    },
    onError: (err) => {
      toast.error("Error Inviting Member", {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  });

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, searchTerm, statusFilter]);

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate(memberId);
  };

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const invitationToken = `invite-${Date.now()}`;
    const labName = selectedLab?.name ?? 'Selected lab';
    const urlRole = inviteRole.toLowerCase();
    const invitationLink = `${window.location.origin}/lab-member-registration?token=${invitationToken}&email=${encodeURIComponent(inviteEmail.trim())}&role=${urlRole}&lab=${encodeURIComponent(labName)}`;

    inviteMemberMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
      link: invitationLink
    });
  };

  const handleCopyInvitationLink = async (invitationLink?: string) => {
    if (!invitationLink || invitationLink === '#') {
      toast.error('Invitation link not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(invitationLink);
      toast.success('Registration link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const pendingMembersCount = members.filter((member) => member.status === 'pending').length;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'coordinator':
        return 'secondary';
      case 'lab member':
        return 'secondary';
      case 'guest member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleColor = (role: string, isGuest?: boolean) => {
    if (isGuest) return 'text-purple-600';
    switch (role) {
      case 'coordinator':
        return 'text-blue-600';
      case 'lab member':
        return 'text-green-600';
      case 'guest member':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage Users
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage lab members and invite new members with registration links
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
                <DialogDescription>
                  Send an invitation link to a new member via email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                    disabled={inviteMemberMutation.isPending}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <SearchableSelect
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as UserRole)}
                    options={[
                      { value: 'LAB_MEMBER', label: 'Lab Member' },
                      { value: 'GUEST_MEMBER', label: 'Guest Member' },
                    ]}
                    disabled={inviteMemberMutation.isPending}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={inviteMemberMutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={() => void handleInviteMember()} disabled={inviteMemberMutation.isPending}>
                  {inviteMemberMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {inviteMemberMutation.isPending ? 'Inviting...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search members by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <SearchableSelect
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'pending')}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
              ]}
              placeholder="Filter by status"
              className="w-full sm:w-44"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Lab Members ({filteredMembers.length})
            {pendingMembersCount > 0 && (
              <span className="ml-2 text-sm font-normal text-amber-600 dark:text-amber-400">
                {pendingMembersCount} pending
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p>Loading members...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      {member.role.includes('member') ? (
                        <Link
                          to={`/coordinator/members/${member.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {member.name}
                        </Link>
                      ) : (
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {member.name}
                        </h3>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {member.status === 'pending' ? 'Invited' : 'Joined'} {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={member.isGuest ? 'outline' : getRoleBadgeVariant(member.role)} className={getRoleColor(member.role, member.isGuest)}>
                      {member.isGuest ? 'Guest' : (member.role.charAt(0).toUpperCase() + member.role.slice(1))}
                    </Badge>
                    {member.status === 'pending' && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600">
                        Pending
                      </Badge>
                    )}
                    {member.status === 'pending' && member.invitationLink && member.invitationLink !== '#' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopyInvitationLink(member.invitationLink)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Link
                      </Button>
                    )}
                    {member.role !== 'coordinator' && (
                      <div className="flex items-center gap-2">
                        {member.status !== 'pending' && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`mailto:${member.email}?subject=Lab%20Communication`}
                              aria-label={`Contact ${member.name}`}
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Contact
                            </a>
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" disabled={removeMemberMutation.isPending}>
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.name} from the lab?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!isLoading && filteredMembers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No members found matching your filters.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}