import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  Camera, ClipboardList, FileText, GaugeCircle, Inbox,
  KeyRound, Loader2, RotateCcw, Save, Calendar, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile, getUserById } from '../../services/userService';
import { uploadProfilePhoto } from '../../services/storageService';
import { getMyReceivedComments } from '../../services/commentService';
import { getMyAssignments } from '../../services/assignmentService';
import { getPapersOfLabMember, getPapersForGuestMember } from '../../services/paperService';

import { useNavigate } from 'react-router'; // veya react-router-dom

/* ─── Helpers ─── */
function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${color ?? 'text-foreground'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RatingBadge({ label, val }: { label: string; val: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{val}/10</span>
    </span>
  );
}

/* ─── Main Component ─── */
export default function MyProfile() {
  const { user, selectedLab, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Edit state
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // TanStack Query for data fetching
  const { data: fullUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: () => getUserById(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const isGuestInLab = selectedLab?.role === 'GUEST_MEMBER';
  const isCoordinator = selectedLab?.role === 'COORDINATOR';

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['user-assignments', user?.id],
    queryFn: () => getMyAssignments(user!.id),
    enabled: !!user?.id && !isGuestInLab && !isCoordinator,
    staleTime: 1000 * 60 * 5,
  });

  const { data: papers = [], isLoading: isLoadingPapers } = useQuery({
    queryKey: ['user-papers', user?.id, isGuestInLab ? selectedLab?.id : null],
    queryFn: () => isGuestInLab
      ? getPapersForGuestMember(selectedLab!.id)
      : getPapersOfLabMember(selectedLab!.id),
    enabled: !!user?.id && !isCoordinator,
    staleTime: 1000 * 60 * 5,
  });

  const { data: receivedCommentsData } = useQuery({
    queryKey: ['user-received-comments', user?.id],
    queryFn: () => getMyReceivedComments(0, 5),
    enabled: !!user?.id && !isGuestInLab && !isCoordinator,
    staleTime: 1000 * 60 * 5,
  });

  const receivedComments = receivedCommentsData?.content ?? [];
  const isDataLoading = isLoadingUser || isLoadingAssignments || isLoadingPapers;

  /* ─── Derived stats ─── */
  const assignmentStats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'PENDING').length,
    inProgress: assignments.filter(a => a.status === 'IN_PROGRESS' || a.status === 'ACCEPTED').length,
    completed: assignments.filter(a => a.status === 'DONE' || a.status === 'COMPLETED').length,
    rejected: assignments.filter(a => a.status === 'REJECTED').length,
  };

  const paperStats = {
    total: papers.length,
    underReview: papers.filter(p => p.assignedReviewers?.length > 0).length,
  };

  // Completion rate: completed / total assignments
  const completionRate = assignmentStats.total > 0
    ? Math.round((assignmentStats.completed / assignmentStats.total) * 100)
    : 0;

  // Average ratings from received comments
  const avgQuality = receivedComments.length > 0
    ? Math.round(receivedComments.reduce((s, c) => s + c.qualityRating, 0) / receivedComments.length * 10) / 10
    : 0;
  const avgTimeliness = receivedComments.length > 0
    ? Math.round(receivedComments.reduce((s, c) => s + c.timelinessRating, 0) / receivedComments.length * 10) / 10
    : 0;

  // Radar chart data (0-10 scale → normalize to 0-5 for chart)
  const radarData = [
    { area: 'Reviews Done', score: Math.min(5, assignmentStats.completed) },
    { area: 'Completion %', score: Math.round(completionRate / 20) },
    { area: 'Quality', score: Math.round(avgQuality / 2) },
    { area: 'Timeliness', score: Math.round(avgTimeliness / 2) },
    { area: 'Papers', score: Math.min(5, paperStats.total) },
  ];

  /* ─── Handlers ─── */
  const handleReset = () => {
    setEditName(user?.name ?? '');
    setEditEmail(user?.email ?? '');
    setPhotoPreview(null);
    setEditError('');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoPreview(URL.createObjectURL(file));
    setIsSaving(true);
    setEditError('');
    try {
      const photoUrl = await uploadProfilePhoto(user.id, file);
      await updateProfile(user.id, undefined, undefined, photoUrl);
      updateUser({ photo: `${photoUrl}?t=${Date.now()}` });
      toast.success('Profile photo updated');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update photo');
      setPhotoPreview(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const name = editName.trim();
    const email = editEmail.trim();
    
    if (!name) { setEditError('Name cannot be blank.'); return; }
    if (!email) { setEditError('Email cannot be blank.'); return; }
    
    const newName = name !== user.name ? name : undefined;
    const newEmail = email !== user.email ? email : undefined;
    
    if (!newName && !newEmail) { toast.success('No changes to save'); return; }
    
    setIsSaving(true);
    setEditError('');
    try {
      await updateProfile(user.id, newEmail, newName);
      
      toast.success('Profiliniz güncellendi. Güvenliğiniz için lütfen yeniden giriş yapın.');
      
      // Mesajı okuyabilmesi için 1.5 saniye bekleyip çıkış yapıyoruz
      setTimeout(() => {
        logout();
      }, 1500);

    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update profile');
      setIsSaving(false); // Sadece hata olursa loading'i kapatıyoruz, başarılıysa zaten login'e atacak
    }
  };

  const handleSavePassword = async () => {
    if (!user) return;
    setPasswordError('');
    
    if (!currentPassword) { setPasswordError('Current password is required.'); return; }
    if (currentPassword.length < 8) { setPasswordError('Current password is incorrect.'); return; }
    if (!newPassword) { setPasswordError('New password is required.'); return; }
    if (!confirmPassword) { setPasswordError('Confirm password is required.'); return; }
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters long.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    if (newPassword === currentPassword) { setPasswordError('New password cannot be the same as your current password.'); return; }
    
    setIsSavingPassword(true);
    try {
      await updateProfile(user.id, undefined, undefined, undefined, currentPassword, newPassword);
      
      toast.success('Şifreniz güncellendi. Güvenliğiniz için lütfen yeniden giriş yapın.');
      
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);

    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
      setIsSavingPassword(false);
    }
  };

  const initials = (user?.name ?? user?.email ?? '?')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  let roleLabel;
  if (selectedLab?.role?.toLowerCase() == 'lab_member') {
      roleLabel = 'Lab Member';
  } else if (selectedLab?.role?.toLowerCase() == 'guest_member') {
      roleLabel = 'Guest Member';
  } else {
      roleLabel = 'Coordinator';
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
        <p className="mt-1 text-muted-foreground">Your performance overview, account settings and received feedback</p>
      </div>

      {/* ── Profile Card ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-8">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3 sm:w-40 shrink-0">
              <label htmlFor="mp-photo-upload" className="relative block w-24 h-24 rounded-full cursor-pointer group">
                <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl select-none">
                  {initials}
                </div>
                {(photoPreview ?? user?.photo) && (
                  <img src={photoPreview ?? user?.photo} alt="avatar" className="absolute inset-0 w-full h-full rounded-full object-cover" />
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input id="mp-photo-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} disabled={isSaving} />
              </label>
              <p className="text-xs text-muted-foreground text-center">Click to change photo</p>
              <Badge variant="secondary">{roleLabel}</Badge>
              {selectedLab && (
                <Badge variant="outline" className="text-xs max-w-[9rem] truncate">{selectedLab.name}</Badge>
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name</label>
                <Input value={editName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={editEmail} readOnly className="bg-muted cursor-not-allowed" />
              </div>

              {/* Meta info row */}
              <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
                {fullUser?.registrationDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {new Date(fullUser.registrationDate).toLocaleDateString()}
                  </span>
                )}
                {fullUser?.lastActiveDate && (
                  <span className="flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" />
                    Last active {new Date(fullUser.lastActiveDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
              <div className="flex gap-2">
                <Button onClick={() => void handleSave()} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Change Password ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Change Password</span>
            </div>
            {[
              { label: 'Current Password', value: currentPassword, setter: setCurrentPassword, placeholder: 'Enter current password' },
              { label: 'New Password', value: newPassword, setter: setNewPassword, placeholder: 'At least 8 characters' },
              { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Re-enter new password' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label} className="space-y-1">
                <label className="text-sm font-medium">{label}</label>
                <Input type="password" value={value} onChange={(e) => setter(e.target.value)} disabled={isSavingPassword} placeholder={placeholder} minLength={8} />
              </div>
            ))}
            {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            <Button onClick={() => void handleSavePassword()} disabled={isSavingPassword}>
              {isSavingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSavingPassword ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats Row (hidden for coordinators) ── */}
      {!isCoordinator && (
        isDataLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : (
          <>
            {isGuestInLab ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard label="Co-Authored Papers" value={paperStats.total} />
                <StatCard label="Under Review" value={paperStats.underReview} color="text-blue-600" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatCard label="Assignments" value={assignmentStats.total} />
                  <StatCard label="Papers" value={paperStats.total} />
                  <StatCard label="Completed" value={assignmentStats.completed} color="text-green-600" />
                  <StatCard label="Completion Rate" value={`${completionRate}%`} color="text-blue-600" />
                  <StatCard label="Avg Quality" value={avgQuality > 0 ? `${avgQuality}/10` : '—'} color="text-purple-600" />
                </div>

                {/* ── Charts ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GaugeCircle className="w-5 h-5 text-blue-600" />
                        Performance Radar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="area" tick={{ fontSize: 12 }} />
                          <PolarRadiusAxis domain={[0, 5]} tick={false} />
                          <Radar dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35} />
                        </RadarChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Based on your real assignment and review data
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-amber-600" />
                        Assignment Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: 'Pending', value: assignmentStats.pending, cls: '' },
                        { label: 'In Progress', value: assignmentStats.inProgress, cls: '' },
                        { label: 'Completed', value: assignmentStats.completed, cls: 'text-green-700 border-green-300' },
                        { label: 'Rejected', value: assignmentStats.rejected, cls: 'text-red-700 border-red-300' },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="flex items-center justify-between rounded-lg border p-3">
                          <span className="text-sm">{label}</span>
                          <Badge variant="outline" className={cls}>{value}</Badge>
                        </div>
                      ))}

                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium">Papers</span>
                        </div>
                        {[
                          { label: 'Total Submitted', value: paperStats.total },
                          { label: 'Under Review', value: paperStats.underReview },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between rounded-lg border p-3 mt-2">
                            <span className="text-sm">{label}</span>
                            <Badge variant="outline">{value}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* ── Received Comments ── */}
            {!isGuestInLab && <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-indigo-600" />
                  Received Comments
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    (feedback authors left about your reviews)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {receivedComments.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No feedback received yet.</p>
                    <p className="text-xs text-muted-foreground">Authors can leave comments on your reviews after you submit them.</p>
                  </div>
                ) : (
                  receivedComments.map((c) => (
                    <div key={c.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">
                          {c.sender
                            ? <><span className="text-muted-foreground">From: </span><span className="text-blue-600 dark:text-blue-400">{c.sender}</span></>
                            : <span className="text-muted-foreground italic">Anonymous</span>
                          }
                        </p>
                        <span className="text-[10px] font-medium text-muted-foreground italic">
                          {c.paperTitle || 'Untitled Paper'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <RatingBadge label="Quality" val={c.qualityRating} />
                        <RatingBadge label="Quantity" val={c.quantityRating} />
                        <RatingBadge label="Timeliness" val={c.timelinessRating} />
                      </div>
                      {c.comment && (
                        <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-border pl-2">{c.comment}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>}
          </>
        )
      )}
    </div>
  );
}
