
'use client';

import { ShieldAlert } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AccessDeniedMessage() {
  const currentLocale = useLocale();
  const { t, isLoading: isLoadingTranslations, initializeTranslations } = useRxTranslate();

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--header-height,64px)-4rem)] text-muted-foreground">
        <ShieldAlert className="h-16 w-16 mb-4 text-destructive" />
        <p className="text-xl">...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
      <Card className="w-full max-w-md shadow-xl border-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <CardTitle className="font-headline text-2xl text-destructive">
            {t('AccessDenied.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">{t('AccessDenied.message')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
