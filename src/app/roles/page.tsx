
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import type { UserRole, Permission, RolePermission } from '@/types';
import { ALL_PERMISSIONS } from '@/lib/permissionKeys'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, Loader2, Save, ShieldAlert, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDexieRolePermissions } from '@/hooks/useDexieRolePermissions';

export default function RolesPermissionsPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

  const { rolesWithPermissions, isLoading: isLoadingData, refetch } = useDexieRolePermissions();
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [currentPermissions, setCurrentPermissions] = useState<Permission[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (selectedRole) {
      const roleData = rolesWithPermissions.find(rp => rp.role === selectedRole);
      setCurrentPermissions(roleData ? [...roleData.permissions] : []);
    } else {
      setCurrentPermissions([]);
    }
  }, [selectedRole, rolesWithPermissions]);

  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    setCurrentPermissions(prev =>
      checked ? [...prev, permission] : prev.filter(p => p !== permission)
    );
  };

  const handleSaveChanges = async () => {
    if (!selectedRole) {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('RolesPermissionsPage.errorNoRoleSelected') });
      return;
    }
    setIsSaving(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('loggedInUserEmail');
        if (userEmail) {
          headers['X-User-Email'] = userEmail;
        }
      }
      const response = await fetch(`/api/role-permissions/${selectedRole}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ permissions: currentPermissions }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('RolesPermissionsPage.errorSaving'));
      }
      toast({ title: t('RolesPermissionsPage.saveSuccessTitle'), description: t('RolesPermissionsPage.saveSuccessDescription', { roleName: selectedRole }) });
      refetch(); // Re-fetch to update the local cache
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('RolesPermissionsPage.errorSaving') });
    } finally {
      setIsSaving(false);
    }
  };
  
  const getPermissionFriendlyName = (permissionKey: Permission): string => {
    return t(`Permissions.${permissionKey}` as any, {}, {
      fallback: permissionKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    });
  };

  const canEditSelectedRole = selectedRole !== 'Admin'; 
  const readOnlyMode = !hasPermission('manage_roles_permissions_page');

  if (!readOnlyMode && !hasPermission('view_roles_permissions_page')) {
    return <AccessDeniedMessage />;
  }
  
  if (isLoadingTranslations || (isLoadingData && rolesWithPermissions.length === 0)) {
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
          <Lock className="mr-3 h-8 w-8" /> {t('RolesPermissionsPage.title')}
        </h1>
        {!readOnlyMode && (
            <Button onClick={handleSaveChanges} disabled={!selectedRole || isSaving || !canEditSelectedRole || !isOnline} className="bg-accent hover:bg-accent/90">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('RolesPermissionsPage.saveChangesButton')}
            </Button>
        )}
      </div>
      <CardDescription>
        {readOnlyMode ? t('RolesPermissionsPage.descriptionViewOnly') : (isOnline ? t('RolesPermissionsPage.descriptionEdit') : t('RolesPermissionsPage.descriptionOffline'))}
      </CardDescription>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            {t('RolesPermissionsPage.selectRoleLabel')}
          </CardTitle>
          <Select
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as UserRole | '')}
          >
            <SelectTrigger className="w-full max-w-sm mt-2">
              <SelectValue placeholder={t('RolesPermissionsPage.selectRolePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {rolesWithPermissions.map(rp => (
                <SelectItem key={rp.role} value={rp.role}>
                  {t(`AddUserDialog.roles.${rp.role}` as any, {}, { fallback: rp.role })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           {!canEditSelectedRole && selectedRole === 'Admin' && !readOnlyMode && (
            <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                <ShieldAlert className="h-4 w-4"/> {t('RolesPermissionsPage.adminPermissionsNote')}
            </p>
           )}
        </CardHeader>

        {selectedRole && (
          <CardContent>
            <h3 className="text-lg font-medium mb-3">
              {t('RolesPermissionsPage.permissionsForRole', { roleName: t(`AddUserDialog.roles.${selectedRole}` as any, {}, { fallback: selectedRole }) })}
            </h3>
            <ScrollArea className="h-[calc(100vh-28rem)] border rounded-md p-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3">
                {ALL_PERMISSIONS.map(permission => (
                  <div
                    key={permission}
                    className={`flex items-center gap-2 p-3 border rounded-md text-sm transition-colors
                      ${currentPermissions.includes(permission)
                        ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                        : 'bg-card'
                      }`}
                  >
                    {!readOnlyMode && canEditSelectedRole ? (
                        <Checkbox
                        id={`perm-${permission}`}
                        checked={currentPermissions.includes(permission)}
                        onCheckedChange={(checked) => handlePermissionChange(permission, Boolean(checked))}
                        aria-label={getPermissionFriendlyName(permission)}
                        disabled={!canEditSelectedRole || isSaving || !isOnline}
                        />
                    ) : (
                        currentPermissions.includes(permission)
                        ? <Check className="h-4 w-4 shrink-0 text-green-600" />
                        : <ShieldAlert className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    )}
                    <label
                      htmlFor={`perm-${permission}`}
                      className={`flex-grow truncate select-none ${(!canEditSelectedRole && !readOnlyMode) || readOnlyMode ? 'cursor-default' : 'cursor-pointer'}`}
                      title={getPermissionFriendlyName(permission)}
                    >
                      {getPermissionFriendlyName(permission)}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
