// ... diğer importlar aynı kalıyor ...
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
// 1. ThemeContext zaten import edilmiş
import { useTheme } from '../../context/ThemeContext';
// ... lucide-react importları aynı kalıyor ...
import {
  Bell,
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  FileText,
  Building2,
  Moon,
  Sun,
  UserCog,
  Users,
  LogOut
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { getNotificationsByLabId } from '../../services/notificationService';

export default function CoordinatorLayout() {
  const { user, selectedLab, logout } = useAuth();

  // 2. theme durumu burada
  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [switchLabDialogOpen, setSwitchLabDialogOpen] = useState(false);

  if (!selectedLab) {
    return <Navigate to="/lab-selection" replace />;
  }

  if (selectedLab.role !== 'COORDINATOR') {
    return <Navigate to="/member" replace />;
  }

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id, selectedLab?.id],
    queryFn: () => getNotificationsByLabId(selectedLab!.id),
    enabled: !!user?.id && !!selectedLab?.id,
    staleTime: 1000 * 60 * 2,
  });

  const hasUnreadNotifications = notifications.some((n) => !n.isRead);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 3. Tema durumuna göre logonun src yolunu belirleyin
  const isDark = theme === 'dark';
  const logoSrc = isDark
      ? '/src/styles/logo-dark-layout.png' // Karanlık tema logosu
      : '/src/styles/logo-light-layout.png'; // Aydınlık tema logosu (dosya adınız farklıysa güncelleyin)

  const navigationItems = [
    { path: '/coordinator', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { path: '/coordinator/analytics', label: 'Reviewer Analytics', icon: BarChart3 },
    { path: '/coordinator/deadlines', label: 'Deadline Management', icon: ClipboardList },
    { path: '/coordinator/papers', label: 'Lab Papers', icon: FileText },
    { path: '/coordinator/workload', label: 'Workload Balance', icon: Users },
    { path: '/coordinator/manage-users', label: 'Manage Users', icon: UserCog },
    { path: '/coordinator/venues', label: 'Manage Venues', icon: Building2 },
  ];

  return (
      <div className="flex h-screen bg-background text-foreground">
        {/* Permanent Sidebar */}
        <aside className="flex w-64 flex-col border-r border-border bg-card">
          {/* LOGO BÖLÜMÜ - DEĞİŞİKLİK BURADA YAPILDI */}
          <div className="border-b border-border p-6">
            {/*
            SORUNUN ÇÖZÜMÜ:
            İki logonun en boy oranları farklı olduğu için `h-12 w-auto` genişlik sıçramasına neden oluyordu.
            Dışarıya fixed yükseklik (`h-12`) ve genişlik (`w-full`) veren, içeriğini dikey ve yatayda merkezleyen (`flex items-center justify-start`) bir konteyner oluşturduk.
            Görüntünün kendisine ise `h-full w-auto max-w-full object-contain object-left` sınıflarını verdik.
            Bu sayede görüntü konteynerin yüksekliğini doldurur (`h-full`), genişliği otomatik sığar (`w-auto`), konteynerden taşmaz (`max-w-full`), konteynerin soluna yaslanır (`object-left`) ve en boy oranı bozulmadan sığar (`object-contain`).
            Görsel genişliği değişse bile dış konteyner sabit olduğu için layout sıçramaz.
          */}
            <div className="h-12 w-full flex items-center justify-start overflow-hidden">
              <img
                  src={logoSrc}
                  alt="PaPeers"
                  className="h-full w-auto max-w-full object-contain object-left"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Paper Review System</p>
            <Badge variant="default" className="mt-3 text-xs">
              {selectedLab?.role?.replace('_', ' ') ?? 'Coordinator'}
            </Badge>
          </div>

          {/* Selected Lab */}
          {/* ... kodun geri kalanı aynı kalıyor ... */}
          <div className="border-b border-border p-4">
            <button
                onClick={() => setSwitchLabDialogOpen(true)}
                className="group w-full rounded-lg p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase text-muted-foreground">Current Lab</span>
                  </div>
                  <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {selectedLab?.name ?? 'Select a Lab'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {selectedLab?.institution ?? 'Choose a lab from the list'}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                        isActive
                            ? 'flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-200/70 dark:ring-blue-800/60 shadow-sm transition-colors'
                            : 'flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                    }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="border-t border-border p-4">
            <div className="text-xs text-muted-foreground">
              <p>Version 1.0.0</p>
              <p className="mt-1">© 2026 Bilkent</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Global Header */}
          <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
            {/* Right Side Icons */}
            <div className="ml-auto flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="w-9 h-9"
              >
                {theme === 'light' ? (
                    <Moon className="w-4 h-4" />
                ) : (
                    <Sun className="w-4 h-4" />
                )}
              </Button>

              <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate('/coordinator/notifications')}
                  aria-label="Open notifications"
              >
                <Bell className="w-5 h-5" />
                {hasUnreadNotifications && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </Button>

              <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  onClick={() => navigate('/coordinator/profile')}
              >
                <div className="relative w-8 h-8">
                  <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-xs select-none">
                    {user?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </div>
                  {user?.photo && <img src={user.photo} alt="avatar" className="absolute inset-0 w-full h-full rounded-full object-cover" />}
                </div>
                <span className="text-sm text-foreground">{user?.name}</span>
              </Button>

              <Button variant="outline" size="sm" onClick={() => setLogoutDialogOpen(true)}>
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
            </div>
          </header>

          {/* Dynamic Main Content */}
          <main className="flex-1 overflow-auto bg-background p-6 text-foreground">
            <Outlet />
          </main>
        </div>

        <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to log out of your account?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={switchLabDialogOpen} onOpenChange={setSwitchLabDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch Laboratory?</AlertDialogTitle>
              <AlertDialogDescription>
                This will take you back to the lab selection screen. Are you sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => navigate('/lab-selection')}>
                Switch Lab
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}