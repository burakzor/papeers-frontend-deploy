import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
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
import { Search, Shield, Building2, User, UserPlus, Send, Trash2, Copy, Link as LinkIcon, Loader2, ChevronLeft, ChevronRight, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { addUser, getAllUsers, removeUser, upgradeMemberToCoordinator, type BackendUserResponse } from '../../services/userService';
import { deleteProfilePhoto } from '../../services/storageService';
import { getLabMemberProfileIdByName } from '../../data/labMemberProfileLookup';

const showInvitationTestingTools =
  import.meta.env.VITE_SHOW_INVITATION_LINKS?.toLowerCase() === 'true';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coordinator' | 'lab_member' | 'guest_member';
  lab?: string;
  institution?: string;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: string;
  lastActive: string;
  photo?: string;
  invitationLink?: string;
  registrationDate: string; // Original ISO string for sorting
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function mapBackendToSystemUser(u: BackendUserResponse): SystemUser {
  const isPending = u.name == null;
  const role = ((): SystemUser['role'] => {
    switch (u.role.toUpperCase()) {
      case 'ADMIN': return 'admin';
      case 'COORDINATOR': return 'coordinator';
      case 'GUEST_MEMBER': return 'guest_member';
      default: return 'lab_member';
    }
  })();
  return {
    id: u.id,
    name: u.name ?? u.email.split('@')[0].replace(/[._-]/g, ' '),
    email: u.email,
    role,
    status: isPending ? 'pending' : 'active',
    joinedAt: formatDateTime(u.registrationDate),
    lastActive: u.lastActiveDate ? formatDateTime(u.lastActiveDate) : 'Never',
    photo: u.photo ?? undefined,
    registrationDate: u.registrationDate,
  };
}

export default function ManageAllUsers() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 20;

  const [upgradingUserId, setUpgradingUserId] = useState<string | null>(null);
  const [upgradeConfirmUser, setUpgradeConfirmUser] = useState<{ id: string; name: string } | null>(null);
  const [upgradeLabName, setUpgradeLabName] = useState('');
  const [upgradeLabNameError, setUpgradeLabNameError] = useState('');

  const fetchUsers = (page: number) => {
    setIsLoading(true);
    setFetchError('');
    getAllUsers(undefined, page, PAGE_SIZE)
      .then((data) => {
        setUsers(data.content.map(mapBackendToSystemUser));
        setCurrentPage(data.number);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchUsers(0);
  }, []);


  const handleInviteCoordinator = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsInviting(true);
    try {
      const invitationToken = `invite-${Date.now()}`;
      const invitationLink = `${window.location.origin}/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(inviteEmail.trim())}&role=coordinator`;

      const response = await addUser(inviteEmail.trim(), invitationLink, 'COORDINATOR');

      const newCoordinator: SystemUser = {
        id: response.id,
        name: response.name ?? response.email.split('@')[0].replace(/[._-]/g, ' '),
        email: response.email,
        role: 'coordinator',
        institution: undefined,
        status: 'pending',
        joinedAt: response.registrationDate.split('T')[0],
        lastActive: 'Never',
        invitationLink,
      };

      setUsers((prevUsers: SystemUser[]) => [newCoordinator, ...prevUsers]);
      setInviteEmail('');
      setIsInviteDialogOpen(false);

      toast.success('Coordinator invited — registration link sent by email');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite coordinator');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInvitationLink = async (invitationLink?: string) => {
    if (!invitationLink) {
      toast.error('This user does not have an invitation link');
      return;
    }

    if (!navigator.clipboard?.writeText) {
      toast.error('Clipboard is not available in this browser');
      return;
    }

    await navigator.clipboard.writeText(invitationLink);
    toast.success('Invitation link copied');
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = window.confirm(`Delete ${userName}? This action cannot be undone.`);
    if (!confirmed) return;

    const snapshot = users.find((u) => u.id === userId);
    setUsers((prev: SystemUser[]) => prev.filter((u) => u.id !== userId));

    try {
      await removeUser(userId);
      void deleteProfilePhoto(userId).catch(() => {});
      toast.success(`${userName} deleted`);
    } catch (err) {
      if (snapshot) setUsers((prev: SystemUser[]) => [snapshot, ...prev]);
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleUpgradeToCoordinator = async () => {
    if (!upgradeConfirmUser) return;
    if (!upgradeLabName.trim()) { setUpgradeLabNameError('Lab name is required.'); return; }
    const { id, name } = upgradeConfirmUser;
    setUpgradeConfirmUser(null);
    setUpgradingUserId(id);
    try {
      await upgradeMemberToCoordinator(id, upgradeLabName.trim());
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: 'coordinator' } : u));
      toast.success(`${name} is now a Coordinator`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upgrade role');
    } finally {
      setUpgradingUserId(null);
      setUpgradeLabName('');
      setUpgradeLabNameError('');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.lab && user.lab.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    const dateA = new Date(a.registrationDate).getTime();
    const dateB = new Date(b.registrationDate).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'coordinator': return 'default';
      case 'lab_member': return 'secondary';
      case 'guest_member': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'coordinator':
        return <Building2 className="w-4 h-4" />;
      case 'lab_member':
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            All Users
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage all users in the system
          </p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Coordinator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Coordinator</DialogTitle>
              <DialogDescription>
                Admin can only invite users with the coordinator role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter coordinator email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleInviteCoordinator()} disabled={isInviting}>
                {isInviting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isInviting ? 'Inviting...' : 'Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by name, email, or lab..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <SearchableSelect
              value={roleFilter}
              onValueChange={setRoleFilter}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'coordinator', label: 'Coordinator' },
                { value: 'lab_member', label: 'Lab Member' },
                { value: 'guest_member', label: 'Guest Member' },
              ]}
              placeholder="Filter by role"
              className="w-full sm:w-48"
            />
            <SearchableSelect
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
              ]}
              placeholder="Sort by"
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({isLoading ? '…' : `${filteredUsers.length} shown / ${totalElements} total`})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading users…
            </div>
          )}
          {!isLoading && fetchError && (
            <div className="py-8 text-center text-red-600 dark:text-red-400">
              {fetchError}
            </div>
          )}
          {!isLoading && !fetchError && (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={user.photo ?? ''} />
                    <AvatarFallback>
                      {user.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {user.role === 'lab_member' && getLabMemberProfileIdByName(user.name) ? (
                      <Link
                        to={`/admin/members/${getLabMemberProfileIdByName(user.name)}`}
                        className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {user.name}
                      </Link>
                    ) : (
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </h3>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                    {user.lab && (
                      <p className="text-xs text-gray-400 mt-1">
                        {user.lab} • {user.institution}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {showInvitationTestingTools && user.status === 'pending' && user.invitationLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyInvitationLink(user.invitationLink)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  )}
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role === 'lab_member' ? 'Lab Member' : user.role === 'guest_member' ? 'Guest Member' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                    {user.status === 'pending' && (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    <p>Joined: {user.joinedAt}</p>
                    <p>Last active: {user.lastActive}</p>
                    {showInvitationTestingTools && user.status === 'pending' && user.invitationLink && (
                      <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                        <LinkIcon className="w-3 h-3" />
                        Invitation ready
                      </p>
                    )}
                  </div>
                  {(user.role === 'lab_member' || user.role === 'guest_member') && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={upgradingUserId === user.id}
                      onClick={() => { setUpgradeConfirmUser({ id: user.id, name: user.name }); setUpgradeLabName(''); setUpgradeLabNameError(''); }}
                      className="text-blue-600 hover:text-blue-700 gap-1"
                    >
                      {upgradingUserId === user.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <ArrowUpCircle className="w-4 h-4" />}
                      Make Coordinator
                    </Button>
                  )}
                  {user.role !== 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDeleteUser(user.id, user.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found matching your filters.
              </div>
            )}
          </div>
          )}
          {/* Pagination Controls */}
          {!isLoading && !fetchError && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => fetchUsers(currentPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => fetchUsers(currentPage + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Make Coordinator confirmation dialog */}
      <Dialog open={upgradeConfirmUser !== null} onOpenChange={(open) => { if (!open) { setUpgradeConfirmUser(null); setUpgradeLabName(''); setUpgradeLabNameError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Coordinator</DialogTitle>
            <DialogDescription>
              <strong>{upgradeConfirmUser?.name}</strong> will be upgraded to Coordinator and a new lab will be created for them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <label className="text-sm font-medium">New Lab Name <span className="text-red-500">*</span></label>
            <Input
              placeholder="e.g. Software Engineering Research Lab"
              value={upgradeLabName}
              onChange={(e) => { setUpgradeLabName(e.target.value); setUpgradeLabNameError(''); }}
              className={upgradeLabNameError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {upgradeLabNameError && <p className="text-sm text-red-600 dark:text-red-400">{upgradeLabNameError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUpgradeConfirmUser(null); setUpgradeLabName(''); setUpgradeLabNameError(''); }}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpgradeToCoordinator()} disabled={!upgradeLabName.trim()}>
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}