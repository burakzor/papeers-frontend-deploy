// src/components/shared/NotFound.tsx

import { Link } from 'react-router';
import { Button } from '../ui/button';
import { FileQuestion } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // AuthContext'ini import et

export default function NotFound() {
  const { user } = useAuth(); // Mevcut kullanıcıyı çek

  // Kullanıcının giriş yapıp yapmadığına ve rolüne göre ana sayfa linkini belirle
  const getHomeLink = () => {
    if (!user) return '/login'; // Giriş yapmamışsa logine at
    
    // Kullanıcı rolüne göre yönlendir
    switch (user.role?.toUpperCase()) {
      case 'ADMIN':
        return '/admin';
      case 'COORDINATOR':
        return '/coordinator';
      case 'LAB_MEMBER':
      default:
        return '/member';
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <FileQuestion className="mb-6 h-24 w-24 text-muted-foreground/50" />
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">404</h1>
      <h2 className="mt-4 text-xl font-semibold text-foreground">Sayfa Bulunamadı</h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        Oops! Aradığınız sayfa silinmiş veya geçici olarak kullanılamıyor olabilir.
      </p>
      <div className="mt-8">
        <Link to={getHomeLink()}>
          <Button size="lg">
            {user ? "Panelime Dön" : "Giriş Sayfasına Dön"}
          </Button>
        </Link>
      </div>
    </div>
  );
}