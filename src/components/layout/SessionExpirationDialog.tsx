'use client';

import { useState, useEffect } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Timer } from 'lucide-react';

interface SessionExpirationDialogProps {
  open: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

const COUNTDOWN_SECONDS = 30;

export default function SessionExpirationDialog({ open, onExtend, onLogout }: SessionExpirationDialogProps) {
  const { t } = useRxTranslate();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(COUNTDOWN_SECONDS);
      setIsExtending(false);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onLogout]);

  const handleExtendClick = () => {
    setIsExtending(true);
    onExtend();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
            <Timer className="h-8 w-8" />
          </div>
          <AlertDialogTitle className="text-center font-headline">{t('SessionExpiration.title')}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t('SessionExpiration.description', { countdown })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button onClick={handleExtendClick} disabled={isExtending} className="w-full">
            {isExtending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('SessionExpiration.stayConnectedButton')}
          </Button>
          <Button variant="outline" onClick={onLogout} className="w-full">
            {t('SessionExpiration.logoutButton')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
