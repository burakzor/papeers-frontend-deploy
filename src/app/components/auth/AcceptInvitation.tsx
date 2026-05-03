import { useRef, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, CheckCircle2, LockKeyhole, Mail, UserRound, Camera } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { registerUser, updateProfile } from '../../services/userService';
import { uploadProfilePhoto } from '../../services/storageService';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const invitation = useMemo(
    () => ({
      token: searchParams.get('token') ?? '',
      role: searchParams.get('role') ?? 'coordinator',
      lab: searchParams.get('lab') ?? 'Selected lab',
      coordinatorName: searchParams.get('coordinatorName') ?? '',
    }),
    [searchParams],
  );

  const isLabMemberInvitation = invitation.role === 'lab_member';
  const invitationRoleLabel = isLabMemberInvitation ? 'Lab Member' : 'Coordinator';

  const isInvalidInvitation = !invitation.token;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (isInvalidInvitation) {
      toast.error('Invitation link is invalid or incomplete.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const registered = await registerUser(email, fullName, password);
      if (photoFile) {
        const photoUrl = await uploadProfilePhoto(registered.id, photoFile);
        await updateProfile(registered.id, undefined, undefined, photoUrl);
      }
      toast.success('Account created. You can sign in now.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-blue-100 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl font-semibold text-slate-900">
                {isLabMemberInvitation ? 'Lab member registration' : 'Complete your invitation'}
              </CardTitle>
              <CardDescription className="text-base leading-6 text-slate-600">
                {isLabMemberInvitation
                  ? 'Use your invitation link to register as a lab member and join your lab.'
                  : 'Finish your account setup to join the paper review system. This mock flow is ready to be replaced by a backend invitation endpoint later.'}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                {isInvalidInvitation && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This invitation link is missing a token. Open the link from the invitation email again.
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Profile Photo (optional)</Label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                      disabled={isSubmitting}
                    />
                    <span className="text-xs text-slate-500">
                      {photoFile ? photoFile.name : 'Click the circle to upload'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="name@university.edu"
                      className="pl-10 bg-slate-50 cursor-not-allowed"
                      value={email}
                      readOnly={true}
                      tabIndex={-1}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="invite-name"
                      placeholder="Enter your full name"
                      className="pl-10"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="invite-password"
                      type="password"
                      placeholder="Create a password (min. 8 characters)"
                      className="pl-10"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="invite-confirm-password"
                      type="password"
                      placeholder="Re-enter your password"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      minLength={8}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={() => navigate('/login')}>
                  Back to Login
                </Button>
                <Button type="submit" disabled={isSubmitting || isInvalidInvitation}>
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-slate-200 bg-slate-900 text-white shadow-sm">
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200">
                <CheckCircle2 className="h-4 w-4" />
                Invitation details
              </div>
              <CardTitle className="text-2xl font-semibold text-white">
                Review before joining
              </CardTitle>
              <CardDescription className="text-slate-300">
                The form collects the three fields you asked for. Role and lab are shown for context so the future backend contract stays obvious.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-200">
              {searchParams.get('lab') && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lab</p>
                  <p className="mt-2 text-base font-medium text-white">{invitation.lab}</p>
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Role</p>
                <p className="mt-2 text-base font-medium text-white">{invitationRoleLabel}</p>
              </div>
              {invitation.coordinatorName && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invited By (Coordinator)</p>
                  <p className="mt-2 text-base font-medium text-white">{invitation.coordinatorName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}