import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from './components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SplashScreen from './components/shared/SplashScreen'; 

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
    // State'i başlatırken sessionStorage'ı kontrol ediyoruz.
    // Eğer daha önce splash izlendiyse (hasSeenSplash === 'true'), isSplashMounted anında false olur.
    // State'i başlatırken hem sessionStorage'ı hem de bulunduğumuz sayfayı kontrol ediyoruz
    const [isSplashMounted, setIsSplashMounted] = useState(() => {
        const currentPath = window.location.pathname;
        // Eğer URL ana dizin (/) veya (/login) ise burası Login ekranıdır.
        const isLoginPage = currentPath === '/login' || currentPath === '/';
        
        const hasSeen = sessionStorage.getItem('hasSeenSplash');
        
        // KURAL: Eğer Login ekranındaysak büyük Splash HER ZAMAN çalışsın.
        // Login ekranında değilsek, sadece daha önce izlenmediyse (!hasSeen) çalışsın.
        return isLoginPage || !hasSeen; 
    });

    // Splash ekranı görevini tamamladığında hem DOM'dan siliyoruz hem de "izlendi" olarak işaretliyoruz.
    const handleSplashComplete = () => {
        setIsSplashMounted(false);
        sessionStorage.setItem('hasSeenSplash', 'true');
    };

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                
                <AuthProvider>
                    <RoleProvider>
                        <RouterProvider router={router} />
                        <Toaster position="top-right" richColors closeButton />
                    </RoleProvider>
                </AuthProvider>

                {/* Eğer oturumda ilk defa geliniyorsa (veya yeni sekme açıldıysa) büyük Splash çıkar */}
                {isSplashMounted && (
                    <SplashScreen 
                        onStartExit={() => {}} 
                        onComplete={handleSplashComplete} // Yeni fonksiyonumuzu buraya bağladık
                    />
                )}

            </ThemeProvider>
        </QueryClientProvider>
    );
}