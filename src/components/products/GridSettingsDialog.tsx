
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel as RadixSelectLabel } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel as RadixDropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { GripVertical, ArrowUp, ArrowDown, Loader2, Save, ChevronDown, Layers, Plus, Minus } from 'lucide-react';
import type { ColumnDefinition, PersistedColumnSetting, GridTemplate, GridTemplateConfig, SortConfig as GridSortConfigType } from '@/types';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const USER_CONFIG_STORAGE_PREFIX = 'userGridConfigs_';

interface GridSettingsDialogProps<TData> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagePath: string; 
  allColumnDefinitions: ColumnDefinition<TData>[]; 
  currentPersistedSettings: PersistedColumnSetting[];
  currentSortConfig: GridSortConfigType<TData> | null;
  currentGroupingKeys: string[];
  templates?: GridTemplate<TData>[];
  onSave: (
    newColumns: PersistedColumnSetting[],
    newSortConfig: GridSortConfigType<TData> | null,
    newGroupingKeys: string[]
  ) => void;
}

interface DialogColumn<TData> extends ColumnDefinition<TData> {
  visible: boolean; 
}

function deepCompareGridTemplateConfig<TData>(
  configA?: GridTemplateConfig<TData>,
  configB?: GridTemplateConfig<TData>
): boolean {
  if (!configA && !configB) return true;
  if (!configA || !configB) return false;

  if (configA.columns.length !== configB.columns.length) return false;
  const sortedACols = [...configA.columns].sort((x, y) => x.key.localeCompare(y.key));
  const sortedBCols = [...configB.columns].sort((x, y) => x.key.localeCompare(y.key));
  for (let i = 0; i < sortedACols.length; i++) {
    if (
      sortedACols[i].key !== sortedBCols[i].key ||
      sortedACols[i].visible !== sortedBCols[i].visible
    ) {
      return false;
    }
  }
  
  if (configA.sortConfig === null && configB.sortConfig !== null) return false;
  if (configA.sortConfig !== null && configB.sortConfig === null) return false;
  if (configA.sortConfig && configB.sortConfig) {
    if (configA.sortConfig.key !== configB.sortConfig.key || configA.sortConfig.direction !== configB.sortConfig.direction) {
      return false;
    }
  }

  const sortedAKeys = Array.isArray(configA.groupingKeys) ? [...configA.groupingKeys].sort() : [];
  const sortedBKeys = Array.isArray(configB.groupingKeys) ? [...configB.groupingKeys].sort() : [];
  if (sortedAKeys.length !== sortedBKeys.length) return false;
  for (let i = 0; i < sortedAKeys.length; i++) {
    if (sortedAKeys[i] !== sortedBKeys[i]) return false;
  }
  
  return true;
}


export default function GridSettingsDialog<TData>({
  open,
  onOpenChange,
  pagePath,
  allColumnDefinitions = [], // Ensure allColumnDefinitions is always an array
  currentPersistedSettings,
  currentSortConfig,
  currentGroupingKeys,
  templates = [],
  onSave,
}: GridSettingsDialogProps<TData>) {
  const currentLocale = useLocale();
  const { t, isLoading: isLoadingTranslations, initializeTranslations } = useRxTranslate();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const [dialogColumns, setDialogColumns] = useState<DialogColumn<TData>[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [localSortConfig, setLocalSortConfig] = useState<GridSortConfigType<TData> | null>(null);
  const [localGroupingKeys, setLocalGroupingKeys] = useState<string[]>([]);
  
  const [customConfigName, setCustomConfigName] = useState('');
  const [userSavedConfigurations, setUserSavedConfigurations] = useState<GridTemplate<TData>[]>([]);
  const [isInitialStateSet, setIsInitialStateSet] = useState(false);

  const getLocalStorageKey = useCallback(() => `${USER_CONFIG_STORAGE_PREFIX}${pagePath}`, [pagePath]);

  useEffect(() => {
    if (open && !isLoadingTranslations) {
      let loadedUserConfigs: GridTemplate<TData>[] = [];
      try {
        const storedConfigs = localStorage.getItem(getLocalStorageKey());
        if (storedConfigs) {
          loadedUserConfigs = JSON.parse(storedConfigs);
        }
      } catch (e) {
        console.error("Error loading user configurations from local storage:", e);
        localStorage.removeItem(getLocalStorageKey());
      }
      if (JSON.stringify(userSavedConfigurations) !== JSON.stringify(loadedUserConfigs)) {
        setUserSavedConfigurations(loadedUserConfigs);
      }
    }
  }, [open, isLoadingTranslations, getLocalStorageKey, userSavedConfigurations]);

  useEffect(() => {
    if (open && !isLoadingTranslations && !isInitialStateSet && Array.isArray(allColumnDefinitions)) {
      const currentConfigFromProps: GridTemplateConfig<TData> = {
        columns: Array.isArray(currentPersistedSettings) ? currentPersistedSettings : [],
        sortConfig: currentSortConfig,
        groupingKeys: Array.isArray(currentGroupingKeys) ? currentGroupingKeys : [],
      };

      let initialSelectedTemplateId = '';
      const allAvailableTemplates = [...templates, ...userSavedConfigurations];

      for (const tpl of allAvailableTemplates) {
        if (deepCompareGridTemplateConfig(tpl.config, currentConfigFromProps)) {
          initialSelectedTemplateId = tpl.id;
          break;
        }
      }
      setSelectedTemplateId(initialSelectedTemplateId);

      const sourceConfig = initialSelectedTemplateId
        ? allAvailableTemplates.find(tpl => tpl.id === initialSelectedTemplateId)?.config
        : currentConfigFromProps;

      let newDialogCols: DialogColumn<TData>[] = [];
      let newSortConfig: GridSortConfigType<TData> | null = null;
      let newGroupingKeys: string[] = [];

      if (sourceConfig) {
        const sourceColumnsMap = new Map((sourceConfig.columns || []).map(c => [c.key, c]));
        newDialogCols = allColumnDefinitions.map(def => {
          const savedCol = sourceColumnsMap.get(String(def.key));
          return { ...def, visible: savedCol ? savedCol.visible : (def.visible !== false) };
        });
        if (initialSelectedTemplateId && sourceConfig.columns) {
           newDialogCols.sort((a, b) => {
                const indexA = sourceConfig.columns.findIndex(sc => sc.key === String(a.key));
                const indexB = sourceConfig.columns.findIndex(sc => sc.key === String(b.key));
                return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
            });
        }
        newSortConfig = sourceConfig.sortConfig || null;
        newGroupingKeys = Array.isArray(sourceConfig.groupingKeys) ? [...sourceConfig.groupingKeys] : [];
      } else {
        newDialogCols = allColumnDefinitions.map(def => ({ ...def, visible: def.visible !== false }));
        newGroupingKeys = Array.isArray(currentGroupingKeys) ? [...currentGroupingKeys] : [];
        newSortConfig = currentSortConfig || null;
      }
      
      setDialogColumns(newDialogCols);
      setLocalSortConfig(newSortConfig);
      setLocalGroupingKeys(newGroupingKeys);
      
      setCustomConfigName('');
      setIsInitialStateSet(true);
    } else if (!open && isInitialStateSet) {
      setIsInitialStateSet(false); 
    }
  }, [
    open, isLoadingTranslations, userSavedConfigurations, isInitialStateSet, 
    allColumnDefinitions, currentPersistedSettings, currentSortConfig, currentGroupingKeys, templates
  ]);


  const handleVisibilityChange = (key: string, checked: boolean) => {
    setDialogColumns(prev =>
      prev.map(col => (col.key === key ? { ...col, visible: checked } : col))
    );
    setSelectedTemplateId('');
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    setDialogColumns(prev => {
      const newColumns = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newColumns.length) return newColumns; 
      const [movedColumn] = newColumns.splice(index, 1);
      newColumns.splice(targetIndex, 0, movedColumn);
      return newColumns;
    });
    setSelectedTemplateId('');
  };

  const handleTemplateOrConfigChange = (configId: string) => {
    setSelectedTemplateId(configId);
    const selectedTpl = [...templates, ...userSavedConfigurations].find(tpl => tpl.id === configId);
    
    if (selectedTpl && selectedTpl.config && Array.isArray(allColumnDefinitions)) {
      const templateColumnsMap = new Map((selectedTpl.config.columns || []).map(c => [c.key, c]));
      
      let newDialogCols = allColumnDefinitions.map(def => {
          const tplColSetting = templateColumnsMap.get(String(def.key));
          return { 
              ...def, 
              visible: tplColSetting ? tplColSetting.visible : (def.visible !== false)
          };
      });

      if (selectedTpl.config.columns) {
          newDialogCols.sort((a, b) => {
              const indexA = selectedTpl.config.columns.findIndex(sc => sc.key === String(a.key));
              const indexB = selectedTpl.config.columns.findIndex(sc => sc.key === String(b.key));
              return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
          });
      }
      
      setDialogColumns(newDialogCols);
      setLocalSortConfig(selectedTpl.config.sortConfig || null);
      setLocalGroupingKeys(Array.isArray(selectedTpl.config.groupingKeys) ? [...selectedTpl.config.groupingKeys] : []);
    }
  };

  const handleSaveCustomConfiguration = () => {
    if (!customConfigName.trim()) {
      toast({ title: t('Common.error'), description: t('GridSettingsDialog.errorConfigNameRequired'), variant: 'destructive' });
      return;
    }
    const newConfig: GridTemplate<TData> = {
      id: `${pagePath}-${customConfigName.trim().replace(/\s+/g, '-')}-${Date.now()}`,
      name: customConfigName.trim(),
      config: {
        columns: dialogColumns.map(dc => ({ key: String(dc.key), visible: dc.visible })),
        sortConfig: localSortConfig,
        groupingKeys: Array.isArray(localGroupingKeys) ? localGroupingKeys : [],
      },
      isUserDefined: true,
    };
    const updatedUserConfigs = [...userSavedConfigurations, newConfig];
    setUserSavedConfigurations(updatedUserConfigs);
    try {
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(updatedUserConfigs));
      toast({ title: t('GridSettingsDialog.configSavedTitle'), description: t('GridSettingsDialog.configSavedSuccessDescription', { name: newConfig.name }) });
      setCustomConfigName('');
      setSelectedTemplateId(newConfig.id);
    } catch (e) {
      console.error("Error saving user configuration to local storage:", e);
      toast({ title: t('Common.error'), description: t('GridSettingsDialog.errorSavingConfig'), variant: 'destructive' });
    }
  };

  const handleApplyChanges = () => {
    const newPersistedSettings: PersistedColumnSetting[] = dialogColumns.map(dc => ({
      key: String(dc.key),
      visible: dc.visible,
    }));
    onSave(newPersistedSettings, localSortConfig, Array.isArray(localGroupingKeys) ? localGroupingKeys : []);
  };

  const handleGroupingKeyToggle = useCallback((key: string, isChecked: boolean) => {
    setLocalGroupingKeys(prevKeys => {
      const currentKeys = Array.isArray(prevKeys) ? prevKeys : [];
      let newKeys;
      if (isChecked) {
        newKeys = currentKeys.includes(key) ? currentKeys : [...currentKeys, key];
      } else {
        newKeys = currentKeys.filter(k => k !== key);
      }
      return newKeys;
    });
    setSelectedTemplateId(''); 
  }, []);
  
  const groupableColumns = Array.isArray(allColumnDefinitions) ? allColumnDefinitions.filter(col => col.isGroupable) : [];

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center min-h-[60vh]">
          <DialogHeader className="sr-only"><DialogTitle>{t('Common.loadingTitle')}</DialogTitle><DialogDescription>{t('Common.loadingDescription')}</DialogDescription></DialogHeader>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) setIsInitialStateSet(false); }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('GridSettingsDialog.title')}</DialogTitle>
          <DialogDescription>{t('GridSettingsDialog.description')}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 min-h-0">
            <div className="space-y-4 py-4">
            <div>
                <Label htmlFor="config-select" className="text-sm font-medium">{t('GridSettingsDialog.loadConfigurationLabel')}</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateOrConfigChange}>
                <SelectTrigger id="config-select" className="mt-1">
                    <SelectValue placeholder={t('GridSettingsDialog.selectTemplatePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                    {templates.length > 0 && (
                    <SelectGroup>
                        <RadixSelectLabel className="px-2 py-1.5 text-xs font-semibold">{t('GridSettingsDialog.predefinedTemplatesLabel')}</RadixSelectLabel>
                        {templates.map(tpl => (<SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>))}
                    </SelectGroup>
                    )}
                    {userSavedConfigurations.length > 0 && (
                    <SelectGroup>
                        {templates.length > 0 && <Separator className="my-1"/>}
                        <RadixSelectLabel className="px-2 py-1.5 text-xs font-semibold">{t('GridSettingsDialog.userSavedConfigurationsLabel')}</RadixSelectLabel>
                        {userSavedConfigurations.map(tpl => (<SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>))}
                    </SelectGroup>
                    )}
                    {templates.length === 0 && userSavedConfigurations.length === 0 && (
                    <SelectItem value="disabled-no-configs" disabled>{t('GridSettingsDialog.noConfigurationsAvailable')}</SelectItem>
                    )}
                </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{t('GridSettingsDialog.templatesDescription')}</p>
            </div>

            <Separator />
            <Label className="text-sm font-medium">{t('GridSettingsDialog.columnsTitle')}</Label>
            <ScrollArea className="max-h-[25vh] p-1 pr-2 border rounded-md">
                <div className="space-y-3 py-2">
                {dialogColumns.map((col, index) => (
                    <div key={String(col.key)} className="flex items-center justify-between p-2.5 border-b last:border-b-0 bg-card hover:bg-muted/50">
                    <div className="flex items-center gap-2.5 flex-grow">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                        <label htmlFor={`vis-${String(col.key)}`} className="font-normal text-xs flex-grow select-none">{col.label}</label>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Checkbox id={`vis-${String(col.key)}`} checked={col.visible} onCheckedChange={(checked) => handleVisibilityChange(String(col.key), Boolean(checked))} aria-label={t('GridSettingsDialog.toggleVisibilityAria', { columnName: col.label })}/>
                        <Button variant="ghost" size="icon" onClick={() => handleMoveColumn(index, 'up')} disabled={index === 0} aria-label={t('GridSettingsDialog.moveUpAria', { columnName: col.label })} className="h-6 w-6"><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleMoveColumn(index, 'down')} disabled={index === dialogColumns.length - 1} aria-label={t('GridSettingsDialog.moveDownAria', { columnName: col.label })} className="h-6 w-6"><ArrowDown className="h-3.5 w-3.5" /></Button>
                    </div>
                    </div>
                ))}
                </div>
            </ScrollArea>

            <Separator />
            <div>
                <Label className="text-sm font-medium">{t('GridSettingsDialog.groupingTitle')}</Label>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between mt-1">
                    {Array.isArray(localGroupingKeys) && localGroupingKeys.length > 0 
                        ? t('GridSettingsDialog.groupingSelectedLabel', { count: localGroupingKeys.length })
                        : t('GridSettingsDialog.selectGroupingPlaceholder')
                    }
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                    <RadixDropdownMenuLabel>{t('GridSettingsDialog.groupableColumnsLabel')}</RadixDropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {groupableColumns.length === 0 ? (
                    <DropdownMenuCheckboxItem disabled>{t('GridSettingsDialog.noGroupableColumns')}</DropdownMenuCheckboxItem>
                    ) : (
                    groupableColumns.map(col => (
                        <DropdownMenuCheckboxItem
                        key={String(col.key)}
                        checked={Array.isArray(localGroupingKeys) && localGroupingKeys.includes(String(col.key))}
                        onCheckedChange={(checked) => handleGroupingKeyToggle(String(col.key), Boolean(checked))}
                        >
                        {col.label}
                        </DropdownMenuCheckboxItem>
                    ))
                    )}
                </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-muted-foreground mt-1">{t('GridSettingsDialog.groupingDescription')}</p>
            </div>
            
            <Separator />
            <div>
                <Label htmlFor="custom-config-name" className="text-sm font-medium">{t('GridSettingsDialog.saveCurrentConfigurationLabel')}</Label>
                <div className="flex gap-2 mt-1">
                <Input id="custom-config-name" placeholder={t('GridSettingsDialog.configurationNamePlaceholder')} value={customConfigName} onChange={(e) => setCustomConfigName(e.target.value)} className="flex-grow"/>
                <Button type="button" variant="secondary" onClick={handleSaveCustomConfiguration} disabled={!customConfigName.trim()}>
                    <Save className="mr-2 h-4 w-4"/> {t('GridSettingsDialog.saveConfigurationButton')}
                </Button>
                </div>
            </div>
            </div>
        </div>

        <DialogFooter className="pt-4 border-t shrink-0">
          <DialogClose asChild><Button type="button" variant="outline" onClick={() => { onOpenChange(false); setIsInitialStateSet(false); }}>{t('GridSettingsDialog.cancelButton')}</Button></DialogClose>
          <Button type="button" onClick={handleApplyChanges} className="bg-primary hover:bg-primary/90">{t('GridSettingsDialog.applyButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
