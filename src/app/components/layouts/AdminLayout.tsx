import { Outlet, NavLink, useNavigate } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
// 1. ThemeContext zaten import edilmiş
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Moon,
  Sun,
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

export default function AdminLayout() {
  const { user, logout } = useAuth();

  // 2. theme durumu burada
  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

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
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { path: '/admin/labs', label: 'Manage Labs', icon: Building2 },
    { path: '/admin/users', label: 'All Users', icon: Users },
  ];

  return (
      <div className="flex h-screen bg-background text-foreground">
        <aside className="flex w-64 flex-col border-r border-border bg-card">
          {/* LOGO BÖLÜMÜ - DİNAMİK VE SABİT BOYUTLU HALE GETİRİLDİ */}
          <div className="border-b border-border p-6">
            {/*
            Coordinator Layout'ta uyguladığımız çözümün aynısı:
            Farklı logo en boy oranlarının layout'u bozmasını engellemek için sabit boyutlu kapsayıcı konteyner tekniği.
            Dış konteyner fixed yükseklik (`h-12`) ve genişlik (`w-full`) vererek layout alanını sabitler.
            İçerik dikeyde ortalanır ve yatayda sola yaslanır (`flex items-center justify-start`).
            Görüntünün kendisine ise `h-full w-auto max-w-full object-contain object-left` sınıflarını verdik.
            Bu sayede görsel genişliği değişse bile dış konteyner sabit olduğu için layout "zıplamaz".
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
              Admin
            </Badge>
          </div>

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

          <div className="border-t border-border p-4">
            <div className="text-xs text-muted-foreground">
              <p>Version 1.0.0</p>
              <p className="mt-1">© 2026 Bilkent</p>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
            <div className="ml-auto flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-9 h-9">
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>


              <button
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                  onClick={() => navigate('/admin/profile')}
              >
                <div className="relative w-8 h-8">
                  <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-xs select-none">
                    {user?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </div>
                  {user?.photo && <img src={user.photo} alt="avatar" className="absolute inset-0 w-full h-full rounded-full object-cover" />}
                </div>
                <span className="text-sm text-foreground">{user?.name}</span>
              </button>

              <Button variant="outline" size="sm" onClick={() => setLogoutDialogOpen(true)}>
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
            </div>
          </header>

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
      </div>
  );
}