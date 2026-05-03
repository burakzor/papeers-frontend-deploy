import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Camera, KeyRound, Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile } from '../../services/userService';
import { uploadProfilePhoto } from '../../services/storageService';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

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
      updateUser({ ...user, photo: `${photoUrl}?t=${Date.now()}` });
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

    const newName = name !== (user?.name ?? '') ? name : undefined;
    const newEmail = email !== (user?.email ?? '') ? email : undefined;

    if (!newName && !newEmail) {
      toast.success('No changes to save');
      return;
    }

    setIsSaving(true);
    setEditError('');
    try {
      await updateProfile(user.id, newEmail, newName, undefined);
      updateUser({ ...user, ...(newName ? { name: newName } : {}), ...(newEmail ? { email: newEmail } : {}) });
      toast.success('Profile updated');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabel =
    user?.role === 'admin' ? 'Admin' :
    user?.role === 'coordinator' ? 'Coordinator' :
    user?.role === 'guest' ? 'Guest Member' : 'Lab Member';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
        <p className="mt-1 text-muted-foreground">Manage your account information</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-8">
            {/* Left: photo chooser */}
            <div className="flex flex-col items-center gap-3 sm:w-40 shrink-0">
              <label htmlFor="ep-photo-upload" className="relative block w-24 h-24 rounded-full cursor-pointer group">
                <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl select-none">
                  {(user?.name ?? '').split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </div>
                {(photoPreview ?? user?.photo) && (
                  <img src={photoPreview ?? user?.photo} alt="avatar" className="absolute inset-0 w-full h-full rounded-full object-cover" />
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input id="ep-photo-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} disabled={isSaving} />
              </label>
              <p className="text-xs text-muted-foreground text-center mt-2">Click to change photo</p>
              <Badge variant="default">{roleLabel}</Badge>
            </div>

            {/* Right: name and email fields */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={editName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={editEmail}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
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
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Change Password</span>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                disabled={isSavingPassword}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">New Password</label>
              <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSavingPassword}
                  placeholder="At least 8 characters"
                  minLength={8}
              />
              <p className="text-[10px] text-muted-foreground">Must be different from your current password.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                disabled={isSavingPassword}
                placeholder="Re-enter new password"
                minLength={8}
              />
            </div>
            {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            <Button onClick={() => void handleSavePassword()} disabled={isSavingPassword}>
              {isSavingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSavingPassword ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
