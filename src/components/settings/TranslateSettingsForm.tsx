
'use client';

import { useEffect, useState } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CodeBlock from '@/components/ui/code-block';
import { Languages, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function TranslateSettingsForm() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const [isKeySet, setIsKeySet] = useState<boolean | null>(null);

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  useEffect(() => {
    async function checkKeyStatus() {
      try {
        const response = await fetch('/api/settings/translate');
        const result = await response.json();
        if (result.success) {
          setIsKeySet(result.data.isKeySet);
        } else {
          setIsKeySet(false);
        }
      } catch (error) {
        console.error("Failed to fetch Translate API key status:", error);
        setIsKeySet(false);
      }
    }
    checkKeyStatus();
  }, []);

  if (isLoadingTranslations) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center"><Languages className="mr-3 h-6 w-6 text-primary"/> ...</CardTitle>
            </CardHeader>
            <CardContent>
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <Languages className="mr-3 h-6 w-6 text-primary"/>
          {t('TranslateSettingsForm.title')}
        </CardTitle>
        <CardDescription>{t('TranslateSettingsForm.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-3 border rounded-lg">
            <span className="font-medium text-sm">{t('TranslateSettingsForm.statusLabel')}</span>
            {isKeySet === null ? (
                <Loader2 className="h-4 w-4 animate-spin"/>
            ) : isKeySet ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t('TranslateSettingsForm.statusConfigured')}
                </Badge>
            ) : (
                 <Badge variant="destructive">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {t('TranslateSettingsForm.statusNotConfigured')}
                </Badge>
            )}
        </div>
        <div>
            <h4 className="font-medium text-sm mb-2">{t('AiSettingsForm.instructionsTitle')}</h4>
             <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>{t('TranslateSettingsForm.instruction1')}</li>
                <li>
                    {t('TranslateSettingsForm.instruction2')}
                    <CodeBlock code={'GOOGLE_TRANSLATE_API_KEY="YOUR_API_KEY_HERE"'} className="my-2" />
                </li>
                <li>{t('AiSettingsForm.instruction3')}</li>
            </ol>
        </div>
      </CardContent>
    </Card>
  );
}
