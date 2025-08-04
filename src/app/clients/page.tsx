// This file was moved from src/app/[locale]/clients/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AddClientDialog from '@/components/clients/AddClientDialog';
import EditClientDialog from '@/components/clients/EditClientDialog';
import ClientListTable from '@/components/clients/ClientListTable';
import GridSettingsDialog from '@/components/products/GridSettingsDialog';
import ImportSettingsDialog from '@/components/shared/ImportSettingsDialog';
import type { Client, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GroupedTableItem, GridTemplate } from '@/types';
import { PlusCircle, Users, Loader2, Settings, Upload, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';
import { useDexieClients } from '@/hooks/useDexieClients'; 
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/clients";

const parseCSVToClients = (csvText: string): Partial<Client>[] => {
  const clients: Partial<Client>[] = [];
  const lines = csvText.trim().split(/\r\n|\n/);

  if (lines.length < 2) {
    console.error("CSV data must have at least a header row and one data row.");
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
  const essentialHeaders = ['name', 'email'];
  if (!essentialHeaders.every(eh => headers.includes(eh))) {
    console.error(`CSV is missing essential headers: ${essentialHeaders.join(', ')}.`);
    return [];
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const clientData: any = {};
    headers.forEach((header, index) => {
      clientData[header] = values[index]?.trim();
    });

    if (!clientData.name || !clientData.email) {
      console.warn(`Skipping line ${i + 1} due to missing name or email.`);
      continue;
    }
    
    clients.push({
      name: clientData.name,
      email: clientData.email,
      phone: clientData.phone,
      address: clientData.address,
      registrationDate: clientData.registrationDate,
    });
  }
  return clients;
};

export default function ClientsPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { clients, isLoading: isLoadingClients, addClient, updateClient, deleteClient } = useDexieClients(); 
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  
  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [clientsToImport, setClientsToImport] = useState<Partial<Client>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig<Client> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<Client>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<Client>[] => [
    { key: 'name', label: translateFn('ClientListTable.headerName'), isSortable: true, isGroupable: true },
    { key: 'email', label: translateFn('ClientListTable.headerEmail'), isSortable: true, isGroupable: false },
    { key: 'phone', label: translateFn('ClientListTable.headerPhone'), isSortable: false, isGroupable: false },
    { key: 'address', label: translateFn('ClientListTable.headerAddress'), isSortable: false, isGroupable: true, visible: false },
    { key: 'registrationDate', label: translateFn('ClientListTable.headerRegistered'), isSortable: true, isGroupable: false },
  ], []);

  useEffect(() => {
    if (!isLoadingTranslations) {
      const defaultCols = getDefaultColumnDefinitions(t);
      setColumnDefinitions(defaultCols);
      if (persistedColumnSettings.length === 0) {
        setPersistedColumnSettings(defaultCols.map(def => ({ key: String(def.key), visible: def.visible !== false })));
      }
    }
  }, [isLoadingTranslations, t, getDefaultColumnDefinitions, persistedColumnSettings.length]);

  const persistGridSettingsToApi = useCallback(async (settingsToPersist: GridSetting) => {
    try {
      await fetch('/api/grid-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToPersist),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: 'Failed to save grid preferences.' });
    }
  }, [toast, t]);

  useEffect(() => {
    const fetchGridSettings = async () => {
      try {
        const response = await fetch(`/api/grid-settings?pagePath=${PAGE_PATH}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const savedSettings = result.data as GridSetting;
            setPersistedColumnSettings(savedSettings.columns);
            setSortConfig(savedSettings.sortConfig || null);
            setGroupingKeys(Array.isArray(savedSettings.groupingKeys) ? savedSettings.groupingKeys : []);
          }
        }
      } catch (error) {
        console.error('Error fetching grid settings:', error);
      }
    };
    if (!isLoadingTranslations) {
      fetchGridSettings();
    }
  }, [isLoadingTranslations]);

  const handleAddClient = async (newClientData: Omit<Client, 'id' | 'registrationDate' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addClient(newClientData);
      toast({ title: t('Toasts.clientAddedTitle'), description: t('Toasts.clientAddedDescription', {clientName: newClientData.name}) });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to add client locally.' });
    }
  };

  const handleEditClientTrigger = (clientId: string) => {
    const clientToEdit = clients.find(c => c.id === clientId);
    if (clientToEdit) {
      setEditingClient(clientToEdit);
      setIsEditClientDialogOpen(true);
    } else {
      toast({ title: t('Common.error'), description: t('ClientManagementPage.errorNotFoundForEditing'), variant: 'destructive' });
    }
  };

  const handleSaveEditedClient = async (updatedClientData: Client) => {
    try {
      await updateClient(updatedClientData);
      toast({ title: t('Toasts.clientUpdatedTitle'), description: t('Toasts.clientUpdatedDescription', {clientName: updatedClientData.name}) });
      setIsEditClientDialogOpen(false);
      setEditingClient(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update client locally.' });
    }
  };

  const handleDeleteClientTrigger = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientToDelete(client);
      setShowDeleteConfirmDialog(true);
    } else {
      toast({ title: t('Common.error'), description: t('ClientManagementPage.errorNotFoundForDeletion'), variant: 'destructive' });
    }
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await deleteClient(clientToDelete.id);
      toast({ title: t('Toasts.clientDeletedTitle'), description: t('Toasts.clientDeletedDescription', {clientName: clientToDelete.name}) });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to delete client locally.' });
    } finally {
      setShowDeleteConfirmDialog(false);
      setClientToDelete(null);
    }
  };
  
  const handleExport = () => {
    if (clients.length === 0) {
      toast({ title: t('Toasts.noProductsToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(clients, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "clients_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescriptionClients', { count: clients.length }) });
  };
  
  const handleImportButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const text = await file.text();
    let parsedClients: Partial<Client>[] = [];

    if (file.name.endsWith('.json')) {
      parsedClients = JSON.parse(text);
    } else if (file.name.endsWith('.csv')) {
      parsedClients = parseCSVToClients(text);
    } else {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ProductManagementPage.invalidFileTypeError') });
      return;
    }

    setClientsToImport(parsedClients);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleConfirmImport = async (settings: { conflictResolution: 'skip' | 'overwrite' }) => {
    if (!clientsToImport) return;
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: clientsToImport, settings }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({
        title: t('Toasts.importSuccessTitle'),
        description: t('Toasts.importSuccessSummary', result.data),
      });
      // Refetch from server might be needed in a more complex scenario
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('Toasts.importFailedError') });
    } finally {
      setIsImporting(false);
      setClientsToImport(null);
      setImportFileName(null);
    }
  };

  const handleSaveGridConfiguration = (
    newColumns: PersistedColumnSetting[],
    newSortConfig: SortConfig<Client> | null,
    newGroupingKeys: string[]
  ) => {
    setPersistedColumnSettings(newColumns);
    setSortConfig(newSortConfig);
    setGroupingKeys(newGroupingKeys);
    
    const settingsToSavePayload: GridSetting = {
      pagePath: PAGE_PATH,
      columns: newColumns,
      sortConfig: newSortConfig,
      groupingKeys: newGroupingKeys
    };
    persistGridSettingsToApi(settingsToSavePayload);
    setIsGridSettingsDialogOpen(false);
  };

  const handleSortRequest = useCallback((key: keyof Client | string, direction: 'asc' | 'desc' | null) => {
    const newSortConfig = direction ? { key, direction } : null;
    setSortConfig(newSortConfig);
    persistGridSettingsToApi({ pagePath: PAGE_PATH, columns: persistedColumnSettings, sortConfig: newSortConfig, groupingKeys });
  }, [persistedColumnSettings, groupingKeys, persistGridSettingsToApi]);

  const handleToggleGroupingKey = useCallback((key: string) => {
    setGroupingKeys(currentKeys => {
        const newKeys = currentKeys.includes(key) ? currentKeys.filter(k => k !== key) : [...currentKeys, key];
        persistGridSettingsToApi({ pagePath: PAGE_PATH, columns: persistedColumnSettings, sortConfig, groupingKeys: newKeys });
        return newKeys;
    });
  }, [persistedColumnSettings, sortConfig, persistGridSettingsToApi]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const lowercasedTerm = searchTerm.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(lowercasedTerm) ||
      c.email.toLowerCase().includes(lowercasedTerm)
    );
  }, [clients, searchTerm]);

  const sortedClients = useMemo(() => {
    let sortableItems = [...filteredClients];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Client];
        const valB = b[sortConfig.key as keyof Client];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredClients, sortConfig]);

  if (!hasPermission('manage_clients_page')) {
    return <AccessDeniedMessage />;
  }
  
  const finalColumnConfig = useMemo(() => {
    if (columnDefinitions.length === 0) return [];
    return persistedColumnSettings.map(pCol => {
        const definition = columnDefinitions.find(def => def.key === pCol.key);
        return definition ? { ...definition, visible: pCol.visible } : null;
      }).filter(Boolean) as ColumnDefinition<Client>[];
  }, [columnDefinitions, persistedColumnSettings]);


  if (isLoadingTranslations || (isLoadingClients && clients.length === 0)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Users className="mr-3 h-8 w-8" /> {t('ClientManagementPage.title')}
        </h1>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json, .csv" className="hidden" />
          <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={() => setIsGridSettingsDialogOpen(true)} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')} disabled={!hasPermission('manage_clients_page')}>
                          <Settings className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('ProductManagementPage.gridSettingsButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={handleImportButtonClick} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')} disabled={isImporting || !hasPermission('manage_clients_page')}>
                          {isImporting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')} disabled={!hasPermission('manage_clients_page')}>
                          <Download className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" disabled={!hasPermission('manage_clients_page')} aria-label={t('ClientManagementPage.addNewClientButton')}>
                          <PlusCircle className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('ClientManagementPage.addNewClientButton')}</p></TooltipContent>
              </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardContent className="pt-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('ClientManagementPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full max-w-sm"
            />
          </div>
          <ClientListTable 
            clients={sortedClients} 
            onEditClient={handleEditClientTrigger}
            onDeleteClient={handleDeleteClientTrigger}
            onSort={handleSortRequest}
            currentSortKey={sortConfig?.key}
            currentSortDirection={sortConfig?.direction}
            displayColumns={finalColumnConfig.filter(c => c.visible)}
            columnDefinitions={columnDefinitions}
            groupingKeys={groupingKeys}
            onToggleGroup={handleToggleGroupingKey}
          />
        </CardContent>
      </Card>
      
      <GridSettingsDialog<Client>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions}
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        onSave={handleSaveGridConfiguration}
      />
      
      {clientsToImport && (
        <ImportSettingsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          fileName={importFileName || ''}
          itemCount={clientsToImport.length}
          onConfirmImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}

      <AddClientDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddClient={handleAddClient}
      />

      {editingClient && (
        <EditClientDialog
          open={isEditClientDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingClient(null); 
            setIsEditClientDialogOpen(isOpen);
          }}
          client={editingClient}
          onSaveClient={handleSaveEditedClient}
        />
      )}

      {clientToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          if (!isOpen) setClientToDelete(null); 
          setShowDeleteConfirmDialog(isOpen);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('ClientManagementPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('ClientManagementPage.deleteDialogDescription', {clientName: clientToDelete?.name || 'this client'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('ClientManagementPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteClient} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('ClientManagementPage.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
