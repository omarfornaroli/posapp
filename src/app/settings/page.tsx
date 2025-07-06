
'use client';

import { useEffect } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import ReceiptSettingsForm from '@/components/settings/ReceiptSettingsForm';
import AiSettingsForm from '@/components/settings/AiSettingsForm';
import SmtpSettingsForm from '@/components/settings/SmtpSettingsForm';
import POSBehaviorSettingsForm from '@/components/settings/POSBehaviorSettingsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cog, Loader2, ShieldAlert, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const handleComingSoon = (featureName: string) => {
    toast({
        title: t('Common.featureComingSoonTitle'),
        description: `${featureName} will be available in a future update.`,
    });
  };

  if (!hasPermission('manage_settings_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Cog className="mr-3 h-8 w-8" /> {t('SettingsPage.title')}
        </h1>
        <Button onClick={() => handleComingSoon('Application-wide settings')} variant="outline">
            <Settings className="mr-2 h-4 w-4"/> More Settings
        </Button>
      </div>

      <SmtpSettingsForm />
      <AiSettingsForm />
      <POSBehaviorSettingsForm />
      <ReceiptSettingsForm />
      
    </div>
  );
}
