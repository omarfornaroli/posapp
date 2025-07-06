
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, VideoOff } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
}

export default function BarcodeScannerDialog({ open, onOpenChange, onScanSuccess }: BarcodeScannerDialogProps) {
  const { t } = useRxTranslate();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const playSuccessSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error("Could not play sound:", e);
    }
  };

  const setupScanner = useCallback(async () => {
    if (open) {
      setHasCameraPermission(null);
      setErrorMessage(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(t('BarcodeScanner.noCameraSupportError'));
        }
        
        await navigator.mediaDevices.getUserMedia({ video: true }); 

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setVideoInputDevices(videoDevices);
        
        if (videoDevices.length > 0 && (!selectedDeviceId || !videoDevices.some(d => d.deviceId === selectedDeviceId))) {
            const backCamera = videoDevices.find(device => device.label.toLowerCase().includes('back'));
            setSelectedDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
        } else if (videoDevices.length === 0) {
            throw new Error(t('BarcodeScanner.noDeviceFoundError'));
        }
        setHasCameraPermission(true);
      } catch (error: any) {
        console.error("Camera permission or setup error:", error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setErrorMessage(t('BarcodeScanner.permissionDeniedError'));
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setErrorMessage(t('BarcodeScanner.noDeviceFoundError'));
        } else {
          setErrorMessage(error.message || t('BarcodeScanner.genericCameraError'));
        }
        setHasCameraPermission(false);
      }
    }
  }, [open, t, selectedDeviceId]);

  useEffect(() => {
    setupScanner();
  }, [open, setupScanner]);
  
  useEffect(() => {
    if (open && selectedDeviceId && videoRef.current && hasCameraPermission) {
        codeReaderRef.current = new BrowserMultiFormatReader();
        const reader = codeReaderRef.current;
        
        reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
            if (result) {
                reader.reset(); 
                playSuccessSound();
                onScanSuccess(result.getText());
            }
            if (err && !(err instanceof NotFoundException) && !(err instanceof ChecksumException) && !(err instanceof FormatException)) {
                console.error('Barcode scan error:', err);
                setErrorMessage(err.message);
            }
        }).catch(err => {
            console.error('Failed to start decoding from video device:', err);
            setErrorMessage(err.message);
        });
    }

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
    };
  }, [open, selectedDeviceId, hasCameraPermission, onScanSuccess]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('BarcodeScanner.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('BarcodeScanner.dialogDescription')}</DialogDescription>
        </DialogHeader>

        {videoInputDevices.length > 1 && hasCameraPermission && (
            <div className="grid w-full items-center gap-1.5 pt-2">
                <Label htmlFor="camera-select">{t('BarcodeScanner.selectCameraLabel')}</Label>
                <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                    <SelectTrigger id="camera-select" className="w-full">
                        <SelectValue placeholder={t('BarcodeScanner.selectCameraPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        {videoInputDevices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${videoInputDevices.indexOf(device) + 1}`}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        <div className="aspect-video w-full rounded-md overflow-hidden bg-muted relative mt-2">
          {hasCameraPermission === null && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">{t('BarcodeScanner.requestingPermission')}</p>
            </div>
          )}
          {hasCameraPermission === false && (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <VideoOff className="h-10 w-10 text-destructive mb-3" />
              <Alert variant="destructive">
                  <AlertTitle>{t('BarcodeScanner.cameraAccessRequired')}</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
          )}
          <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline style={{ display: hasCameraPermission ? 'block' : 'none' }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
