import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
// 1. ThemeContext'i import edin
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // 2. useTheme hook'unu kullanın
  const { theme } = useTheme();

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);

      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/lab-selection');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Tema durumuna göre logonun src yolunu belirleyin
  const isDark = theme === 'dark';
  const logoSrc = isDark
      ? '/src/styles/Papeers-dark-logo-removebg-preview.png' // Karanlık tema logosu
      : '/src/styles/Papeers-light-logo.png'; // Aydınlık tema logosu

  return (
      // Arka planın yumuşakça (fade-in) belirmesi için motion.div
      <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="min-h-screen bg-gradient-to-br from-background via-background to-blue-950/10 px-4 py-8 text-foreground dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/30 flex items-center justify-center"
      >
        {/* Form kartının aşağıdan yukarı süzülerek gelmesi için motion.div */}
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="w-full max-w-md"
        >
          <Card className="w-full border-border bg-card shadow-lg">
            <CardHeader className="space-y-0 text-center pb-0">
              <div className="mx-auto w-full flex justify-center overflow-hidden">
                <img
                    // 4. src özniteliğini dinamik değişken ile değiştirin
                    src={logoSrc}
                    alt="PaPeers Logo"
                    className="w-150 h-32 object-contain"
                />
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        disabled={loading}
                    >
                      {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                      ) : (
                          <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="mt-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                  ) : (
                      'Sign In'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </motion.div>
  );
}