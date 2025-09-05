
'use client';

import React from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useInitialSync } from '@/context/InitialSyncContext';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function InitialSyncScreen() {
    const { t } = useRxTranslate();
    const { syncStatusMessages } = useInitialSync();

    return (
        <div className="fixed inset-0 bg-background z-[200] flex items-center justify-center">
            <div className="w-full max-w-md p-8 text-center">
                <h1 className="text-3xl font-headline text-primary mb-4">{t('Header.title')}</h1>
                <p className="text-muted-foreground mb-8">{t('InitialSync.description')}</p>
                <div className="space-y-3 text-left">
                    {syncStatusMessages.map((msg, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                            {msg.endsWith('...') ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            <span className={msg.endsWith('...') ? 'text-foreground' : 'text-muted-foreground'}>
                                {msg}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
