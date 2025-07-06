
'use client';

import { useRxTranslate } from '@/hooks/use-rx-translate';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2 } from 'lucide-react';
import type { Report } from '@/types';

interface ViewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
}

export default function ViewReportDialog({ open, onOpenChange, report }: ViewReportDialogProps) {
  const { t, isLoading: isLoadingTranslations } = useRxTranslate();

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{report.reportData.title}</DialogTitle>
          <DialogDescription>
            {t('ReportsPage.viewDialogDescription', { reportName: report.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow space-y-4 overflow-y-auto pr-4">
          <Card className="shadow-lg bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="font-headline text-primary flex items-center gap-3">
                <Bot className="h-6 w-6" /> {t('AiReportsPage.summaryTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-primary/90 whitespace-pre-wrap">{report.reportData.summary}</p>
            </CardContent>
          </Card>
          
          <div className="rounded-md border shadow-sm max-h-[50vh] overflow-auto relative">
            <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                    {report.reportData.headers.map((header, index) => (
                        <TableHead key={index} className="font-semibold whitespace-nowrap">{header}</TableHead>
                    ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {report.reportData.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="whitespace-nowrap">
                            {typeof cell === 'number' ? cell.toLocaleString() : cell}
                        </TableCell>
                        ))}
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('Common.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    