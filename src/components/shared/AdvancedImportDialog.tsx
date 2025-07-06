
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, FileText, ArrowRight, Save, ChevronDown } from 'lucide-react';
import type { ModelFieldDefinition, ColumnMapping, ImportMappingTemplate } from '@/types';
import { toast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';

type Stage = 'upload' | 'mapping' | 'confirm';

const conflictResolutionOptions = ['skip', 'overwrite'] as const; 

const confirmImportSchema = (t: Function) => z.object({
  conflictResolution: z.enum(conflictResolutionOptions, {
    required_error: t('Common.formErrors.requiredField', {fieldName: t('ImportProductsSettingsDialog.conflictResolutionLabel')}),
  }).default('skip'),
});
type ConfirmImportFormData = z.infer<ReturnType<typeof confirmImportSchema>>;


interface AdvancedImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelName: string;
  modelFields: ModelFieldDefinition[];
  onConfirmImport: (data: {
    dataRows: Record<string, any>[];
    mappings: ColumnMapping[];
    settings: { conflictResolution: 'skip' | 'overwrite' };
  }) => void;
  isImporting: boolean;
}

export default function AdvancedImportDialog({
  open,
  onOpenChange,
  modelName,
  modelFields,
  onConfirmImport,
  isImporting,
}: AdvancedImportDialogProps) {
  const { t } = useRxTranslate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('upload');
  
  const [fileName, setFileName] = useState('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<Record<string, any>[]>([]);

  const [mappings, setMappings] = useState<Map<string, Partial<ColumnMapping>>>(new Map());
  
  const [templates, setTemplates] = useState<ImportMappingTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState('');

  const confirmForm = useForm<ConfirmImportFormData>({
    resolver: zodResolver(confirmImportSchema(t)),
    defaultValues: { conflictResolution: 'skip' },
  });

  const getLocalStorageKey = useCallback(() => `importMappingTemplates_${modelName}`, [modelName]);

  useEffect(() => {
    if (open) {
      const storedTemplates = localStorage.getItem(getLocalStorageKey());
      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates));
      }
    } else {
      setStage('upload');
      setFileName('');
      setFileHeaders([]);
      setDataRows([]);
      setMappings(new Map());
      setSelectedTemplate('');
      setNewTemplateName('');
      confirmForm.reset();
    }
  }, [open, getLocalStorageKey, modelName, confirmForm]);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if (jsonData.length < 2) throw new Error(t('AdvancedImportDialog.errorNotEnoughRows'));
        
        const headers: string[] = (jsonData[0] as string[]).filter(h => h && h.trim() !== '');
        const rows = jsonData.slice(1).map(rowArray => {
          const rowObject: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowObject[header] = (rowArray as any[])[index];
          });
          return rowObject;
        }).filter(row => Object.values(row).some(val => val !== "" && val !== null && val !== undefined));

        setFileHeaders(headers);
        setDataRows(rows);
        autoMapColumns(headers);
        setStage('mapping');
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('ProductManagementPage.jsonParseErrorTitle'),
          description: error instanceof Error ? error.message : t('ProductManagementPage.jsonParseErrorDescription'),
        });
      }
    };
    reader.readAsArrayBuffer(file);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const autoMapColumns = useCallback((columns: string[]) => {
    const newMappings = new Map<string, Partial<ColumnMapping>>();
    modelFields.forEach(mf => {
        const lowerMfKey = mf.key.toLowerCase().replace(/[\s_-]/g, '');
        const matchedColumn = columns.find(col => col && col.toLowerCase().replace(/[\s_-]/g, '').includes(lowerMfKey)) || '';
        newMappings.set(mf.key, {
            modelField: mf.key,
            fileColumn: matchedColumn,
            relatedMatchField: mf.type === 'relation' ? 'name' : undefined
        });
    });
    setMappings(newMappings);
  }, [modelFields]);
  
  const handleMappingChange = (modelFieldKey: string, selectedFileColumn: string) => {
    setMappings(prev => {
        const newMap = new Map(prev);
        const currentMapping = newMap.get(modelFieldKey);
        newMap.set(modelFieldKey, {
            ...currentMapping,
            modelField: modelFieldKey,
            fileColumn: selectedFileColumn === '_ignore_' ? '' : selectedFileColumn
        });
        return newMap;
    });
    setSelectedTemplate('');
  };
  
  const handleRelatedFieldChange = (modelFieldKey: string, relatedMatchField: string) => {
      setMappings(prev => {
          const newMap = new Map(prev);
          const currentMapping = newMap.get(modelFieldKey);
          newMap.set(modelFieldKey, { ...currentMapping, relatedMatchField });
          return newMap;
      });
      setSelectedTemplate('');
  };
  
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({ title: t('Common.error'), description: t('AdvancedImportDialog.errorTemplateNameRequired'), variant: 'destructive' });
      return;
    }
    const mappingsToSave = Array.from(mappings.values()).filter(m => m.fileColumn);
    if (mappingsToSave.length === 0) {
      toast({ title: t('Common.error'), description: 'Cannot save an empty mapping template.', variant: 'destructive'});
      return;
    }

    const newTemplate: ImportMappingTemplate = {
      id: `${modelName}-${Date.now()}`,
      name: newTemplateName.trim(),
      targetModel: modelName,
      mappings: mappingsToSave as ColumnMapping[],
    };
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem(getLocalStorageKey(), JSON.stringify(updatedTemplates));
    toast({ title: t('AdvancedImportDialog.templateSavedSuccessTitle'), description: t('AdvancedImportDialog.templateSavedSuccessDescription', {name: newTemplate.name})});
    setNewTemplateName('');
    setSelectedTemplate(newTemplate.id);
  };
  
  const handleLoadTemplate = (templateId: string) => {
      setSelectedTemplate(templateId);
      const template = templates.find(t => t.id === templateId);
      if (template) {
          const templateMappingsMap = new Map(template.mappings.map(m => [m.modelField, m]));
          const newMappings = new Map<string, Partial<ColumnMapping>>();
          
          modelFields.forEach(mf => {
              const savedMapping = templateMappingsMap.get(mf.key);
              newMappings.set(mf.key, {
                  modelField: mf.key,
                  fileColumn: savedMapping?.fileColumn || '',
                  relatedMatchField: savedMapping?.relatedMatchField || (mf.type === 'relation' ? 'name' : undefined)
              });
          });
          setMappings(newMappings);
      }
  };

  function onConfirm(values: ConfirmImportFormData) {
    const mappingsForApi = Array.from(mappings.values())
        .filter(m => m.fileColumn && m.modelField) as ColumnMapping[];

    onConfirmImport({
        dataRows,
        mappings: mappingsForApi,
        settings: values,
    });
  }
  
  const requiredModelFields = useMemo(() => modelFields.filter(f => f.isRequired), [modelFields]);
  const mappedRequiredFields = useMemo(() => requiredModelFields.filter(rf => mappings.get(rf.key)?.fileColumn), [requiredModelFields, mappings]);
  const allRequiredFieldsMapped = mappedRequiredFields.length === requiredModelFields.length;

  const renderMappingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>{t('AdvancedImportDialog.mappingTitle')}</DialogTitle>
        <DialogDescription>{t('AdvancedImportDialog.mappingDescription', {modelName})}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col flex-grow overflow-hidden">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
            <div className="space-y-4 py-4">
                {templates.length > 0 && (
                <div className="flex gap-2 items-end">
                    <div className="flex-grow">
                    <Label className="text-xs">{t('AdvancedImportDialog.loadTemplateLabel')}</Label>
                    <Select value={selectedTemplate} onValueChange={handleLoadTemplate}>
                        <SelectTrigger><SelectValue placeholder={t('AdvancedImportDialog.selectTemplatePlaceholder')} /></SelectTrigger>
                        <SelectContent>
                        {templates.map(tpl => <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                )}
                <ScrollArea className="h-64 border rounded-md">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                            <TableRow>
                                <TableHead>{t('AdvancedImportDialog.modelFieldHeader')}</TableHead>
                                <TableHead>{t('AdvancedImportDialog.fileColumnHeader')}</TableHead>
                                <TableHead>{t('AdvancedImportDialog.relatedMatchFieldHeader')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modelFields.map(mf => {
                            const mapping = mappings.get(mf.key);
                            return (
                                <TableRow key={mf.key}>
                                    <TableCell className="font-medium text-sm">
                                        {mf.label}
                                        {mf.isRequired && <span className="text-destructive ml-1">*</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Select value={mapping?.fileColumn || ''} onValueChange={(val) => handleMappingChange(mf.key, val)}>
                                        <SelectTrigger><SelectValue placeholder={t('AdvancedImportDialog.selectFieldPlaceholder')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_ignore_">{t('AdvancedImportDialog.ignoreColumnOption')}</SelectItem>
                                            {fileHeaders.map((fc, index) => <SelectItem key={`${fc}-${index}`} value={fc}>{fc}</SelectItem>)}
                                        </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        {mf.type === 'relation' && (
                                        <Select value={mapping?.relatedMatchField} onValueChange={(val) => handleRelatedFieldChange(mf.key, val)} disabled={!mapping?.fileColumn}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {mf.relatedFieldOptions?.map(opt => <SelectItem key={opt} value={opt}>{t('AdvancedImportDialog.matchByOption')} {opt}</SelectItem>)}
                                                </SelectContent>
                                        </Select> 
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="text-xs text-muted-foreground">
                {t('AdvancedImportDialog.requiredFieldsHint')}: {requiredModelFields.map(f => f.label).join(', ')}
                </div>
            </div>
        </div>
        <div className="shrink-0 pt-4">
            <div className="flex gap-2">
                <Input placeholder={t('AdvancedImportDialog.templateNamePlaceholder')} value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} className="flex-grow"/>
                <Button type="button" variant="secondary" onClick={handleSaveTemplate} disabled={!newTemplateName.trim()}><Save className="mr-2 h-4 w-4"/> {t('AdvancedImportDialog.saveTemplateButton')}</Button>
            </div>
        </div>
      </div>
      <DialogFooter className="shrink-0">
        <Button variant="ghost" onClick={() => setStage('upload')}>{t('Common.back')}</Button>
        <Button onClick={() => setStage('confirm')} disabled={!allRequiredFieldsMapped}>
            {t('Common.next')} <ArrowRight className="ml-2 h-4 w-4"/>
        </Button>
      </DialogFooter>
    </>
  );

  const renderConfirmStep = () => (
     <Form {...confirmForm}>
        <form onSubmit={confirmForm.handleSubmit(onConfirm)} className="flex flex-col flex-grow overflow-hidden">
            <DialogHeader>
                <DialogTitle>{t('AdvancedImportDialog.confirmTitle')}</DialogTitle>
                <DialogDescription>{t('AdvancedImportDialog.confirmDescription', { count: dataRows.length, fileName: fileName })}</DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                <div className="py-4 space-y-4">
                    <FormField control={confirmForm.control} name="conflictResolution" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('ImportProductsSettingsDialog.conflictResolutionLabel')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isImporting}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="skip">{t('ImportProductsSettingsDialog.conflictResolutionSkip')}</SelectItem>
                                <SelectItem value="overwrite">{t('ImportProductsSettingsDialog.conflictResolutionOverwrite')}</SelectItem>
                            </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <div>
                        <h4 className="font-medium text-sm mb-2">{t('AdvancedImportDialog.previewTitle')}</h4>
                        <ScrollArea className="h-48 w-full border rounded-md">
                            <Table>
                                <TableHeader><TableRow>{fileHeaders.map((h, i) => (<TableHead key={`${h}-${i}`}>{h}</TableHead>))}</TableRow></TableHeader>
                                <TableBody>
                                {dataRows.slice(0, 5).map((row, i) => (
                                    <TableRow key={i}>{fileHeaders.map((c, j) => (<TableCell key={`${c}-${j}`} className="text-xs whitespace-nowrap">{String(row[c] ?? '')}</TableCell>))}</TableRow>
                                ))}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                </div>
            </div>
            <DialogFooter className="shrink-0">
                <Button variant="ghost" onClick={() => setStage('mapping')} disabled={isImporting}>{t('Common.back')}</Button>
                <Button type="submit" disabled={isImporting}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4"/>}
                    {isImporting ? t('Toasts.importingButton') : t('ImportProductsSettingsDialog.importButton')}
                </Button>
            </DialogFooter>
        </form>
    </Form>
  );


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
        {stage === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('AdvancedImportDialog.uploadTitle')}</DialogTitle>
              <DialogDescription>{t('AdvancedImportDialog.uploadDescription')}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{t('AdvancedImportDialog.dragDropPrompt')}</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" />
              <Button type="button" onClick={() => fileInputRef.current?.click()}>{t('AdvancedImportDialog.selectFileButton')}</Button>
            </div>
          </>
        )}
        
        {stage === 'mapping' && renderMappingStep()}

        {stage === 'confirm' && renderConfirmStep()}
      </DialogContent>
    </Dialog>
  );
}
