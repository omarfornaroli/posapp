

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Report as ReportType, GenerateReportOutput } from '@/types';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Loader2, Bot, Download, FileJson, Save, FileText as FileTextIcon, ListOrdered, BarChart } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateReport } from '@/ai/flows/generate-report-flow';
import ReportListTable from '@/components/reports/ReportListTable';
import ViewReportDialog from '@/components/reports/ViewReportDialog';
import SaveReportDialog from '@/components/reports/SaveReportDialog';
import { useDexieReports } from '@/hooks/useDexieReports';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import SalesTable from '@/components/sales/SalesTable';
import { useDexieSales } from '@/hooks/useDexieSales';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const QUICK_QUERIES = [
  'ReportsPage.querySales',
  'ReportsPage.queryBestSellers',
  'ReportsPage.queryStock',
  'ReportsPage.queryFrequentClients',
  'ReportsPage.queryPendingDispatches'
];

export default function ReportsPage() {
  const { t } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  const { reports, isLoading: isLoadingReports, refetch: refetchReports } = useDexieReports();
  const { sales, isLoading: isLoadingSales } = useDexieSales();
  const { currencies, isLoading: isLoadingCurrencies } = useDexieCurrencies();
  const [isAiKeySet, setIsAiKeySet] = useState<boolean | null>(null);

  // State for AI Reports
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GenerateReportOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for Saved Reports
  const [viewingReport, setViewingReport] = useState<ReportType | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  // State for Basic Reports
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  useEffect(() => {
    async function checkKeyStatus() {
      try {
        const response = await fetch('/api/settings/ai');
        const result = await response.json();
        setIsAiKeySet(result.success && result.data.isKeySet);
      } catch {
        setIsAiKeySet(false);
      }
    }
    checkKeyStatus();
  }, []);

  const handleGenerateReport = async () => {
    if (!query) {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ReportsPage.errorQueryEmpty') });
      return;
    }
    setIsGenerating(true);
    setGeneratedReport(null);
    setError(null);
    try {
      const result = await generateReport(query);
      setGeneratedReport(result);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ReportsPage.errorGeneratingReport', { error: e.message }) });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveReport = async (details: { name: string; description?: string }) => {
    if (!generatedReport || !query) return;
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          query: query,
          reportData: generatedReport
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      toast({ title: t('ReportsPage.saveSuccessTitle'), description: t('ReportsPage.saveSuccessDescription', { reportName: result.data.name }) });
      refetchReports();
      setIsSaveDialogOpen(false);
      setGeneratedReport(null);
      setQuery('');

    } catch (err) {
       toast({ variant: 'destructive', title: t('Common.error'), description: err instanceof Error ? err.message : 'Failed to save report' });
    }
  };
  
  const handleDeleteReport = async (reportToDelete: ReportType) => {
    // Implement deletion logic
  };

  const handleViewReport = (report: ReportType) => {
    setViewingReport(report);
    setIsViewDialogOpen(true);
  };

  const downloadAsPdf = () => {
    if (!generatedReport) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(generatedReport.title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const splitSummary = doc.splitTextToSize(generatedReport.summary, 180);
    doc.text(splitSummary, 14, 32);

    (doc as any).autoTable({
        head: [generatedReport.headers],
        body: generatedReport.rows,
        startY: (doc as any).previousAutoTable.finalY + 10 > 50 ? (doc as any).previousAutoTable.finalY + 10 : 50,
        theme: 'striped'
    });
    doc.save(`${generatedReport.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  const downloadAsJson = () => {
    if (!generatedReport) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(generatedReport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${generatedReport.title.replace(/\s+/g, '_').toLowerCase()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (!hasPermission('manage_reports_page')) return <AccessDeniedMessage />;
  
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    return sales.filter(transaction => {
      if (dateRange?.from && new Date(transaction.date) < dateRange.from) return false;
      if (dateRange?.to && new Date(transaction.date) > dateRange.to) return false;
      return true;
    });
  }, [sales, dateRange]);
  
  const defaultCurrency = useMemo(() => currencies?.find(c => c.isDefault), [currencies]);

  const salesTableColumns = useMemo(() => [
      { key: 'id', label: t('SalesTable.headerTransactionId'), isSortable: true, isGroupable: false },
      { key: 'date', label: t('SalesTable.headerDate'), isSortable: true, isGroupable: true },
      { key: 'clientName', label: t('SalesTable.headerClient'), isSortable: true, isGroupable: true },
      { key: 'totalAmount', label: t('SalesTable.headerTotalAmount'), isSortable: true, isGroupable: false, className: "text-right font-bold text-primary" },
  ], [t]);


  const renderBasicReports = () => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>{t('ReportsPage.basicSalesReportTitle')}</CardTitle>
                <CardDescription>{t('ReportsPage.basicSalesReportDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <DateRangePicker date={dateRange} setDate={setDateRange} placeholder={t('SalesReportPage.pickDateRange')} />
                </div>
                {isLoadingSales || isLoadingCurrencies ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <SalesTable
                        transactions={filteredSales}
                        displayColumns={salesTableColumns}
                        columnDefinitions={salesTableColumns}
                        onSort={() => {}}
                        groupingKeys={[]}
                        onToggleGroup={() => {}}
                        defaultCurrency={defaultCurrency || null}
                    />
                )}
            </CardContent>
        </Card>
    </div>
  );

  const renderAdvancedReports = () => (
    <div className="space-y-6">
      {isAiKeySet === false && (
          <Alert variant="destructive">
              <AlertTitle>{t('Common.error')}</AlertTitle>
              <AlertDescription>{t('ReportsPage.aiNotConfiguredDb')}</AlertDescription>
          </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('ReportsPage.queryTitle')}</CardTitle>
          <CardDescription>{t('ReportsPage.queryDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={t('ReportsPage.queryPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            disabled={isGenerating || !isAiKeySet}
          />
          <div className="flex flex-wrap gap-2">
            {QUICK_QUERIES.map(q_key => (
              <Button key={q_key} size="sm" variant="outline" onClick={() => setQuery(t(q_key))} disabled={isGenerating || !isAiKeySet}>{t(q_key.replace('ReportsPage.query','ReportsPage.report'))}</Button>
            ))}
          </div>
          <Button onClick={handleGenerateReport} disabled={isGenerating || !isAiKeySet}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            {isGenerating ? t('ReportsPage.buttonGenerating') : t('ReportsPage.buttonGenerate')}
          </Button>
        </CardContent>
      </Card>
      
      {isGenerating && (
        <Card className="text-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-semibold">{t('ReportsPage.loadingTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('ReportsPage.loadingDescription')}</p>
        </Card>
      )}

      {generatedReport && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{generatedReport.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader><CardTitle className="font-headline text-primary flex items-center gap-3"><Bot className="h-6 w-6" /> {t('ReportsPage.summaryTitle')}</CardTitle></CardHeader>
                    <CardContent><p className="text-primary/90 whitespace-pre-wrap">{generatedReport.summary}</p></CardContent>
                </Card>
                <div className="rounded-md border shadow-sm max-h-[50vh] overflow-auto relative">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>{generatedReport.headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
                        </TableHeader>
                        <TableBody>
                        {generatedReport.rows.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}</TableRow>)}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={downloadAsPdf}><Download className="mr-2"/>PDF</Button>
                    <Button variant="outline" onClick={downloadAsJson}><FileJson className="mr-2"/>JSON</Button>
                    <Button onClick={() => setIsSaveDialogOpen(true)}><Save className="mr-2"/>{t('ReportsPage.saveReportButton')}</Button>
                </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl mt-8">
          <CardHeader>
            <CardTitle>{t('ReportsPage.listTitle')}</CardTitle>
            <CardDescription>{t('ReportsPage.listDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportListTable reports={reports} onViewReport={handleViewReport} onDeleteReport={handleDeleteReport} />
          </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <BrainCircuit className="mr-3 h-8 w-8" /> {t('ReportsPage.title')}
        </h1>
      </div>
      
      <p className="text-muted-foreground">{t('ReportsPage.pageDescription')}</p>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic"><BarChart className="mr-2"/>{t('ReportsPage.basicReportsTab')}</TabsTrigger>
            <TabsTrigger value="advanced"><Bot className="mr-2"/>{t('ReportsPage.advancedReportsTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="basic" className="mt-6">
            {renderBasicReports()}
        </TabsContent>
        <TabsContent value="advanced" className="mt-6">
            {renderAdvancedReports()}
        </TabsContent>
      </Tabs>

      <ViewReportDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} report={viewingReport} />
      <SaveReportDialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen} onSave={handleSaveReport} initialQuery={query} />
    </div>
  );
}
