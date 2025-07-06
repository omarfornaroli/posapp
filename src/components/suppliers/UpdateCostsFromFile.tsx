
'use client';
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast';
import { Upload, ArrowRight, Loader2, FileText } from 'lucide-react';

interface UpdateCostsFromFileProps {
  supplierId: string;
}

export default function UpdateCostsFromFile({ supplierId }: UpdateCostsFromFileProps) {
  const { t } = useRxTranslate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileData, setFileData] = useState<Record<string, any>[]>([]);

  const [identifierColumn, setIdentifierColumn] = useState('');
  const [identifierType, setIdentifierType] = useState<'barcode' | 'sku'>('barcode');
  const [costColumn, setCostColumn] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if (jsonData.length < 2) throw new Error(t('AdvancedImportDialog.errorNotEnoughRows'));
        
        const headers: string[] = jsonData[0] as string[];
        const rows = jsonData.slice(1).map(rowArray => {
          const rowObject: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowObject[header] = (rowArray as any[])[index];
          });
          return rowObject;
        }).filter(row => Object.values(row).some(val => val !== "" && val !== null && val !== undefined));

        setFileHeaders(headers);
        setFileData(rows);
        
        // Auto-select columns
        const lowerHeaders = headers.map(h => h.toLowerCase());
        const barcodeGuess = headers[lowerHeaders.findIndex(h => h.includes('barcode') || h.includes('ean'))] || '';
        const skuGuess = headers[lowerHeaders.findIndex(h => h.includes('sku') || h.includes('ref'))] || '';
        const costGuess = headers[lowerHeaders.findIndex(h => h.includes('cost') || h.includes('costo'))] || '';

        setIdentifierColumn(barcodeGuess || skuGuess);
        setIdentifierType(barcodeGuess ? 'barcode' : 'sku');
        setCostColumn(costGuess);
        
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('ProductManagementPage.jsonParseErrorTitle'),
          description: error instanceof Error ? error.message : t('ProductManagementPage.jsonParseErrorDescription'),
        });
        resetState();
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const resetState = () => {
      setFileName('');
      setFileHeaders([]);
      setFileData([]);
      setIdentifierColumn('');
      setCostColumn('');
      setIsProcessing(false);
  }

  const handleUpdateCosts = async () => {
    if (!identifierColumn || !costColumn || fileData.length === 0) {
      toast({
        title: t('Common.error'),
        description: t('SuppliersManager.updateCostsMappingError'),
        variant: 'destructive'
      });
      return;
    }
    
    setIsProcessing(true);

    try {
        const response = await fetch(`/api/suppliers/${supplierId}/update-costs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: fileData,
                mappings: {
                    identifierColumn,
                    identifierType,
                    costColumn
                }
            })
        });

        const result = await response.json();
        if(!response.ok) throw new Error(result.error || 'API error');

        toast({
            title: t('SuppliersManager.updateCostsSuccessTitle'),
            description: t('SuppliersManager.updateCostsSuccessDescription', result.data),
        });
        resetState();

    } catch(error) {
        toast({
            title: t('Common.error'),
            description: error instanceof Error ? error.message : t('SuppliersManager.updateCostsApiError'),
            variant: 'destructive'
        });
    } finally {
        setIsProcessing(false);
    }

  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg">
        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-3 text-sm text-center">{t('SuppliersManager.updateCostsDescription')}</p>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx, .xls" className="hidden" />
        <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4" />}
            {fileName || t('AdvancedImportDialog.selectFileButton')}
        </Button>
      </div>
      
      {fileData.length > 0 && !isProcessing && (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                    <Label className="text-xs">{t('SuppliersManager.fileIdentifierColumnLabel')}</Label>
                    <Select value={identifierColumn} onValueChange={setIdentifierColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{fileHeaders.filter(h => h).map((h, index) => <SelectItem key={`${h}-${index}`} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1">
                     <Label className="text-xs">{t('SuppliersManager.databaseIdentifierTypeLabel')}</Label>
                     <Select value={identifierType} onValueChange={(v) => setIdentifierType(v as 'barcode' | 'sku')}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="barcode">Barcode</SelectItem><SelectItem value="sku">SKU</SelectItem></SelectContent></Select>
                </div>
                 <div className="space-y-1">
                     <Label className="text-xs">{t('SuppliersManager.fileCostColumnLabel')}</Label>
                     <Select value={costColumn} onValueChange={setCostColumn}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{fileHeaders.filter(h => h).map((h, index) => <SelectItem key={`${h}-${index}`} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                </div>
            </div>
            
             <div>
                <Label className="text-xs font-medium">{t('AdvancedImportDialog.previewTitle')}</Label>
                <ScrollArea className="h-32 border rounded-md mt-1">
                    <Table>
                        <TableHeader><TableRow>{fileHeaders.map((h, index) => <TableHead key={`${h}-${index}`}>{h}</TableHead>)}</TableRow></TableHeader>
                        <TableBody>
                            {fileData.slice(0, 5).map((row, i) => (
                                <TableRow key={i}>{fileHeaders.map((c, index) => <TableCell key={`${c}-${index}`} className="text-xs whitespace-nowrap">{String(row[c] ?? '')}</TableCell>)}</TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

            <Button type="button" className="w-full" onClick={handleUpdateCosts} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4"/>}
                {t('SuppliersManager.updateCostsButton')}
            </Button>
        </div>
      )}
    </div>
  );
}
