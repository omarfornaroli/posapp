
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BrainCircuit, Bot, Sparkles, Loader2, Download, FileJson, Save, ListCollapse, AlertTriangle } from 'lucide-react';
import { generateReport, type GenerateReportOutput } from '@/ai/flows/generate-report-flow';
import type { Report } from '@/types';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import SaveReportDialog from '@/components/reports/SaveReportDialog';
import { useRouter } from 'next/navigation';
import { useDexieReports } from '@/hooks/useDexieReports';
import ReportListTable from '@/components/reports/ReportListTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ViewReportDialog from '@/components/reports/ViewReportDialog';
import { buttonVariants } from '@/components/ui/button';

// Extend jsPDF type
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function ReportsPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // State for AI report generation
  const [query, setQuery] = useState('');
  const [generatedReport, setGeneratedReport] = useState<GenerateReportOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isAiConfigured, setIsAiConfigured] = useState(false);

  // State for saved reports list
  const { reports, isLoading: isLoadingReports, refetch: refetchReports } = useDexieReports();
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [reportToView, setReportToView] = useState<Report | null>(null);

  useEffect(() => {
    initializeTranslations(currentLocale);
    // Check if AI is configured
    async function checkAiStatus() {
        try {
            const response = await fetch('/api/settings/ai');
            const result = await response.json();
            if (result.success) {
                setIsAiConfigured(result.data.isKeySet);
            }
        } catch (error) {
            console.error("Failed to fetch AI key status:", error);
        }
    }
    checkAiStatus();
  }, [initializeTranslations, currentLocale]);
  
  // Handlers for AI report generation
  const handleGenerateReport = async () => {
    if (!query.trim()) {
      setError(t('AiReportsPage.errorQueryEmpty'));
      return;
    }
    setIsGenerating(true);
    setError(null);
    setGeneratedReport(null);

    try {
      const result = await generateReport(query);
      setGeneratedReport(result);
    } catch (e: any) {
      console.error("Error generating report:", e);
      const errorMessage = e.message || 'An unknown error occurred.';
      setError(t('AiReportsPage.errorGeneratingReport', { error: errorMessage }));
      toast({ variant: 'destructive', title: t('Common.error'), description: errorMessage });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (generatedReport && reportContainerRef.current) {
        reportContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [generatedReport]);

  const handleDownloadPdf = () => {
    if (!generatedReport) return;
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const finalY = (doc as any).lastAutoTable?.finalY || 10;
    doc.text(generatedReport.title, 14, finalY + 15);
    doc.autoTable({
      head: [generatedReport.headers],
      body: generatedReport.rows,
      startY: finalY + 20,
    });
    doc.save(`${generatedReport.title.replace(/\s+/g, '_').toLowerCase()}_report.pdf`);
  };

  const handleDownloadJson = () => {
    if (!generatedReport) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(generatedReport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${generatedReport.title.replace(/\s+/g, '_').toLowerCase()}_report.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSaveReport = async (reportDetails: { name: string; description?: string }) => {
    if (!generatedReport || !query) return;
    const reportToSave = {
      name: reportDetails.name,
      description: reportDetails.description,
      query: query,
      reportData: generatedReport,
    };
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const userEmail = localStorage.getItem('loggedInUserEmail');
      if (userEmail) headers['X-User-Email'] = userEmail;
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(reportToSave),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save report');
      }
      toast({
        title: t('ReportsPage.saveSuccessTitle'),
        description: t('ReportsPage.saveSuccessDescription', { reportName: result.data.name }),
      });
      setIsSaveDialogOpen(false);
      setGeneratedReport(null);
      setQuery('');
      refetchReports();
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Common.error'), description: e.message });
    }
  };

  // Handlers for saved reports list
  const handleDeleteTrigger = (report: Report) => { setReportToDelete(report); };
  const handleViewTrigger = (report: Report) => { setReportToView(report); };
  
  const confirmDelete = async () => {
    if (!reportToDelete) return;
    try {
      const response = await fetch(`/api/reports/${reportToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error((await response.json()).error || 'Failed to delete report');
      }
      toast({ title: t('ReportsPage.deleteSuccessTitle'), description: t('ReportsPage.deleteSuccessDescription', { reportName: reportToDelete.name }) });
      refetchReports();
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Error deleting report' });
    } finally {
      setReportToDelete(null);
    }
  };

  if (!hasPermission('manage_reports_page')) { return <AccessDeniedMessage />; }
  if (isLoadingTranslations) { return <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>; }

  const predefinedReports = [
    { labelKey: 'AiReportsPage.reportSales', queryKey: 'AiReportsPage.querySales' },
    { labelKey: 'AiReportsPage.reportBestSellers', queryKey: 'AiReportsPage.queryBestSellers' },
    { labelKey: 'AiReportsPage.reportStock', queryKey: 'AiReportsPage.queryStock' },
    { labelKey: 'AiReportsPage.reportFrequentClients', queryKey: 'AiReportsPage.queryFrequentClients' },
    { labelKey: 'AiReportsPage.reportPendingDispatches', queryKey: 'AiReportsPage.queryPendingDispatches' },
  ];

  return (
    <>
      <div className="space-y-8">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <BrainCircuit className="mr-3 h-8 w-8" /> {t('ReportsPage.title')}
        </h1>
        <CardDescription>{t('ReportsPage.pageDescription')}</CardDescription>

        {isAiConfigured ? (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline">{t('AiReportsPage.queryTitle')}</CardTitle>
              <CardDescription>{t('AiReportsPage.queryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea placeholder={t('AiReportsPage.queryPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} rows={4} disabled={isGenerating} />
              <div className="flex flex-wrap gap-2">
                {predefinedReports.map((report, i) => (
                  <Button key={i} variant="outline" size="sm" onClick={() => setQuery(t(report.queryKey))} disabled={isGenerating}>
                    {t(report.labelKey)}
                  </Button>
                ))}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleGenerateReport} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isGenerating ? t('AiReportsPage.buttonGenerating') : t('AiReportsPage.buttonGenerate')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-l-4 border-amber-500">
            <CardHeader className="flex flex-row items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <CardTitle className="font-headline text-amber-600">{t('SmtpSettingsForm.statusNotConfigured')}</CardTitle>
                <CardDescription className="text-amber-700">{t('ReportsPage.aiNotConfigured')}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-semibold text-primary">{t('AiReportsPage.loadingTitle')}</p>
            <p className="text-muted-foreground">{t('AiReportsPage.loadingDescription')}</p>
          </div>
        )}

        {generatedReport && (
          <div ref={reportContainerRef} className="space-y-6">
            <Card className="shadow-xl bg-primary/5 border-primary/20">
              <CardHeader><CardTitle className="font-headline text-primary flex items-center gap-3"><Bot className="h-6 w-6"/>{t('AiReportsPage.summaryTitle')}</CardTitle></CardHeader>
              <CardContent><p className="text-primary/90 whitespace-pre-wrap">{generatedReport.summary}</p></CardContent>
            </Card>
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline">{generatedReport.title}</CardTitle>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4"/>{t('AiReportsPage.downloadPdfButton')}</Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadJson}><FileJson className="mr-2 h-4 w-4"/>{t('AiReportsPage.downloadJsonButton')}</Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsSaveDialogOpen(true)}><Save className="mr-2 h-4 w-4"/>{t('ReportsPage.saveReportButton')}</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>{generatedReport.headers.map((h, i) => <TableHead key={i} className="font-semibold whitespace-nowrap">{h}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedReport.rows.map((row, rIdx) => <TableRow key={rIdx}>{row.map((cell, cIdx) => <TableCell key={cIdx} className="whitespace-nowrap">{typeof cell === 'number' ? cell.toLocaleString() : cell}</TableCell>)}</TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><ListCollapse /> {t('ReportsPage.listTitle')}</CardTitle>
            <CardDescription>{t('ReportsPage.listDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReports && reports.length === 0 ? (
              <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : (
              <ReportListTable reports={reports} onViewReport={handleViewTrigger} onDeleteReport={handleDeleteTrigger} />
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialogs */}
      <SaveReportDialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen} onSave={handleSaveReport} initialQuery={query}/>
      <ViewReportDialog open={!!reportToView} onOpenChange={(isOpen) => !isOpen && setReportToView(null)} report={reportToView}/>
      {reportToDelete && (
        <AlertDialog open={!!reportToDelete} onOpenChange={(isOpen) => !isOpen && setReportToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('ReportsPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('ReportsPage.deleteDialogDescription', { reportName: reportToDelete.name })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('Common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: "destructive" })}>{t('Common.delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
