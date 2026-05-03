import { useRouteError, Link } from 'react-router';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError() as any;
  console.error(error); // Hatayı konsola yazdır ki debug yapabilesin

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
        <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Bir Şeyler Yanlış Gitti
      </h1>
      <p className="mt-4 text-muted-foreground max-w-md mx-auto">
        Beklenmedik bir hata oluştu. Teknik ekibimiz (yani sen!) bu durumla ilgileniyor olabilir.
      </p>
      
      {/* Geliştirme aşamasında hatayı görmek istersen: */}
      <div className="mt-4 rounded bg-muted p-2 text-xs font-mono text-red-500">
        {error.statusText || error.message || "Bilinmeyen Hata"}
      </div>

      <div className="mt-8 flex gap-4">
        <Button onClick={() => window.location.reload()} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Sayfayı Yenile
        </Button>
        <Link to="/">
          <Button>Ana Sayfaya Dön</Button>
        </Link>
      </div>
    </div>
  );
}