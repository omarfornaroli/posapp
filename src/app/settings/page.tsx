
'use client';

import { useRxTranslate } from '@/hooks/use-rx-translate';
import ReceiptSettingsForm from '@/components/settings/ReceiptSettingsForm';
import SmtpSettingsForm from '@/components/settings/SmtpSettingsForm';
import AiSettingsForm from '@/components/settings/AiSettingsForm';
import POSBehaviorSettingsForm from '@/components/settings/POSBehaviorSettingsForm';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Cog, ReceiptText, Mail, BrainCircuit, ShoppingCart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const { t } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  if (!hasPermission('manage_settings_page')) {
    return <AccessDeniedMessage />;
  }

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <Cog className="mr-3 h-8 w-8" /> {t('SettingsPage.title')}
        </h1>

        <Tabs defaultValue="receipt" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="receipt"><ReceiptText className="mr-2"/>{t('ReceiptSettingsForm.title')}</TabsTrigger>
                <TabsTrigger value="pos"><ShoppingCart className="mr-2"/>{t('POSBehaviorSettingsForm.title')}</TabsTrigger>
                <TabsTrigger value="smtp"><Mail className="mr-2"/>{t('SmtpSettingsForm.title')}</TabsTrigger>
                <TabsTrigger value="ai"><BrainCircuit className="mr-2"/>{t('AiSettingsForm.title')}</TabsTrigger>
            </TabsList>
            <TabsContent value="receipt" className="mt-6">
                <ReceiptSettingsForm />
            </TabsContent>
            <TabsContent value="pos" className="mt-6">
                <POSBehaviorSettingsForm />
            </TabsContent>
            <TabsContent value="smtp" className="mt-6">
                 <SmtpSettingsForm />
            </TabsContent>
             <TabsContent value="ai" className="mt-6">
                 <AiSettingsForm />
            </TabsContent>
        </Tabs>
    </div>
  );
}
