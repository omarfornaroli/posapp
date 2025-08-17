
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast';
import type { RolePermission, UserRole, Permission } from '@/types';
import { useDexieRolePermissions } from '@/hooks/useDexieRolePermissions';
import { ALL_PERMISSIONS } from '@/lib/permissionKeys';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, Loader2, Save } from 'lucide-react';

export default function RolesPermissionsPage() {
  const { t } = useRxTranslate();
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();
  const { rolesWithPermissions, isLoading, refetch } = useDexieRolePermissions();

  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedRole && rolesWithPermissions.length > 0) {
      const roleData = rolesWithPermissions.find(r => r.role === selectedRole);
      setPermissions(roleData ? roleData.permissions : []);
    } else {
      setPermissions([]);
    }
  }, [selectedRole, rolesWithPermissions]);

  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    setPermissions(prev =>
      checked ? [...prev, permission] : prev.filter(p => p !== permission)
    );
  };
  
  const handleSaveChanges = async () => {
    if (!selectedRole) {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('RolesPermissionsPage.errorNoRoleSelected') });
      return;
    }
    if (selectedRole === 'Admin') {
        toast({ variant: 'destructive', title: t('Common.error'), description: t('RolesPermissionsPage.adminPermissionsNote') });
        return;
    }
    setIsSaving(true);
    try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (typeof window !== 'undefined') {
            const userEmail = localStorage.getItem('loggedInUserEmail');
            if (userEmail) headers['X-User-Email'] = userEmail;
        }
        const response = await fetch(`/api/role-permissions/${selectedRole}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ permissions }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        toast({ title: t('RolesPermissionsPage.saveSuccessTitle'), description: t('RolesPermissionsPage.saveSuccessDescription', { roleName: selectedRole }) });
        await refetch();
    } catch(e) {
        toast({ variant: 'destructive', title: t('Common.error'), description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
        setIsSaving(false);
    }
  };

  if (!hasPermission('view_roles_permissions_page')) {
    return <AccessDeniedMessage />;
  }

  const canEdit = hasPermission('manage_roles_permissions_page');

  if (isLoading) {
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
        {canEdit && (
             <Button onClick={handleSaveChanges} disabled={!selectedRole || isSaving || selectedRole === 'Admin'}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                {t('RolesPermissionsPage.saveChangesButton')}
            </Button>
        )}
      </div>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>{t('RolesPermissionsPage.selectRoleLabel')}</CardTitle>
          <CardDescription>
            {canEdit ? t('RolesPermissionsPage.descriptionEdit') : t('RolesPermissionsPage.descriptionViewOnly')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder={t('RolesPermissionsPage.selectRolePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {rolesWithPermissions.map(roleItem => (
                <SelectItem key={roleItem.role} value={roleItem.role}>{roleItem.role}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedRole && (
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 font-headline text-primary">{t('RolesPermissionsPage.permissionsForRole', { roleName: selectedRole })}</h3>
                {selectedRole === 'Admin' && <p className="text-sm text-muted-foreground mb-4">{t('RolesPermissionsPage.adminPermissionsNote')}</p>}
                <ScrollArea className="h-[calc(100vh-35rem)] border rounded-md p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ALL_PERMISSIONS.map(permission => (
                            <div key={permission} className="flex items-center space-x-2">
                                <Checkbox
                                    id={permission}
                                    checked={permissions.includes(permission)}
                                    onCheckedChange={(checked) => handlePermissionChange(permission, Boolean(checked))}
                                    disabled={!canEdit || selectedRole === 'Admin'}
                                />
                                <label htmlFor={permission} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {t(`Permissions.${permission}` as any, {}, { fallback: permission })}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
