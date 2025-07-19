
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, UserCog, Loader2, ShieldAlert, Settings, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, SortConfig } from '@/types';
import AddUserDialog from '@/components/users/AddUserDialog';
import EditUserDialog from '@/components/users/EditUserDialog';
import UserListTable from '@/components/users/UserListTable';
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
import { buttonVariants } from '@/components/ui/button';
import { useDexieUsers } from '@/hooks/useDexieUsers';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function UsersManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { users, isLoading: isLoadingUsers, addUser, updateUser, deleteUser } = useDexieUsers(); 
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<User> | null>(null);

  const handleComingSoon = (featureName: string) => {
    toast({
        title: t('Common.featureComingSoonTitle'),
        description: t('UsersManagerPage.featureComingSoon', { featureName: featureName }),
    });
  };

  const handleAddUser = async (newUserData: Omit<User, 'id' | 'joinDate' | 'status' | 'permissions'>) => {
    try {
      const result = await addUser(newUserData);
      toast({
        title: t('Toasts.userAddedTitle'),
        description: t('Toasts.userAddedDescription', { userName: result.name }),
      });
      setIsAddUserDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to add user',
      });
    }
  };

  const handleEditUserTrigger = (userId: string) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      setEditingUser(userToEdit);
      setIsEditDialogOpen(true);
    } else {
      toast({ title: t('Common.error'), description: t('UsersManagerPage.errorNotFoundForEditing'), variant: 'destructive' });
    }
  };

  const handleSaveEditedUser = async (updatedUserData: User) => {
    if (!editingUser) return;
    try {
      await updateUser(updatedUserData);
      toast({
        title: t('Toasts.userUpdatedTitle'),
        description: t('Toasts.userUpdatedDescription', {userName: updatedUserData.name}),
      });

      if (typeof window !== 'undefined') {
        const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
        if (loggedInUserEmail && updatedUserData.email === loggedInUserEmail) {
          window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedUserData }));
        }
      }

      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
       toast({ 
         variant: 'destructive',
         title: t('Common.error'), 
         description: error instanceof Error ? error.message : t('UsersManagerPage.errorFailedToUpdateUserAPI') 
        });
    }
  };

  const handleDeleteUserTrigger = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setShowDeleteConfirmDialog(true);
    } else {
       toast({ title: t('Common.error'), description: t('UsersManagerPage.errorNotFoundForDeletion'), variant: 'destructive' });
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete.id);
      toast({
        title: t('Toasts.userDeletedTitle'),
        description: t('Toasts.userDeletedDescription', {userName: userToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('UsersManagerPage.errorFailedToDeleteUserAPI'),
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setUserToDelete(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof User | string, direction: 'asc' | 'desc' | null) => {
    if (direction === null) {
      setSortConfig(null);
    } else {
      setSortConfig({ key, direction });
    }
  }, []);

  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];
    if (sortConfig && sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = (a as any)[sortConfig.key];
        const valB = (b as any)[sortConfig.key];

        if (valA == null && valB != null) return 1;
        if (valA != null && valB == null) return -1;
        if (valA == null && valB == null) return 0;
        
        let comparison = 0;
        if (sortConfig.key === 'joinDate') {
            comparison = new Date(valA).getTime() - new Date(valB).getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [users, sortConfig]);

  if (!hasPermission('manage_users_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations || (isLoadingUsers && users.length === 0)) {
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
          <UserCog className="mr-3 h-8 w-8" /> {t('UsersManagerPage.title')}
        </h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => handleComingSoon('Grid Settings')} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')} disabled={!hasPermission('manage_users_page')}>
                      <Settings className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.gridSettingsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => handleComingSoon('Import')} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')} disabled={!hasPermission('manage_users_page')}>
                      <Upload className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => handleComingSoon('Export')} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')} disabled={!hasPermission('manage_users_page')}>
                      <Download className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => setIsAddUserDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" disabled={!hasPermission('manage_users_page')} aria-label={t('UsersManagerPage.addNewUserButton')}>
                      <PlusCircle className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('UsersManagerPage.addNewUserButton')}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardContent className="pt-6">
          {isLoadingUsers && users.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <UserListTable
              users={sortedUsers}
              onEditUser={handleEditUserTrigger}
              onDeleteUser={handleDeleteUserTrigger}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
          )}
        </CardContent>
      </Card>

      <AddUserDialog
        open={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        onAddUser={handleAddUser}
      />

      {editingUser && (
        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) {
              setEditingUser(null); 
            }
          }}
          user={editingUser}
          onSaveUser={handleSaveEditedUser}
        />
      )}

      {userToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          setShowDeleteConfirmDialog(isOpen);
          if (!isOpen) {
            setUserToDelete(null); 
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('UsersManagerPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('UsersManagerPage.deleteDialogDescription', {userName: userToDelete?.name || 'this user'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('UsersManagerPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteUser} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('UsersManagerPage.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
