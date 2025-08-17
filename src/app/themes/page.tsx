
'use client';

import { useState, useEffect } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Palette, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Theme } from '@/types';
import AddThemeDialog from '@/components/themes/AddThemeDialog';
import EditThemeDialog from '@/components/themes/EditThemeDialog';
import { useDexieThemes } from '@/hooks/useDexieThemes';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ThemesPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { themes, isLoading, addTheme, updateTheme, refetch } = useDexieThemes();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { toast } = useToast();

  const handleAddTheme = async (newThemeData: Omit<Theme, 'id' | 'isDefault'>) => {
    setIsUpdating(true);
    try {
      await addTheme(newThemeData);
      toast({
        title: t('Toasts.themeAddedTitle'),
        description: t('Toasts.themeAddedDescription', { themeName: newThemeData.name }),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to add theme',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditTrigger = (theme: Theme) => {
    setEditingTheme(theme);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdited = async (updatedThemeData: Theme) => {
    setIsUpdating(true);
    try {
      await updateTheme(updatedThemeData);
      toast({
        title: t('ThemeManagerPage.themeUpdatedTitle'),
        description: t('ThemeManagerPage.themeUpdatedDescription', {themeName: updatedThemeData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingTheme(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update theme.' });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const handleSetDefault = async (themeId: string) => {
     setIsUpdating(true);
     try {
       const response = await fetch(`/api/themes/${themeId}/set-default`, {
        method: 'PUT',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('ThemeManagerPage.errorSettingDefaultTheme'));
      }
       
       toast({
          title: t('Toasts.themeDefaultSetTitle'),
          description: t('Toasts.themeDefaultSetDescription', { themeName: result.data.name }),
       });
       window.location.reload();
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('ThemeManagerPage.errorSettingDefaultTheme') });
    } finally {
        setIsUpdating(false);
    }
  };

  if (!hasPermission('manage_themes_page')) {
    return <AccessDeniedMessage />;
  }
  
  const isLoadingData = isLoadingTranslations || (isLoading && themes.length === 0);

  if (isLoadingData) {
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
            <Palette className="mr-3 h-8 w-8" /> {t('ThemeManagerPage.title')}
        </h1>
        <div className="flex gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                        <PlusCircle className="mr-2 h-5 w-5" /> {t('ThemeManagerPage.addNewThemeButton')}
                      </Button>
                    </TooltipTrigger>
                     <TooltipContent><p>{t('ThemeManagerPage.addNewThemeDescription')}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {themes.map((theme) => (
                <div key={theme.id} className="border rounded-lg shadow-sm p-4 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-semibold font-headline">{theme.name}</h3>
                        <p className="text-sm text-muted-foreground">{theme.fontHeadline}, {theme.fontBody}</p>
                    </div>
                    <div className="flex mt-4 gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditTrigger(theme)}>{t('Common.edit')}</Button>
                        <Button size="sm" onClick={() => handleSetDefault(theme.id)} disabled={theme.isDefault || isUpdating}>
                            {theme.isDefault ? t('ThemeManagerPage.isDefaultBadge') : t('ThemeManagerPage.setDefaultButton')}
                        </Button>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
      
      <AddThemeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSaveTheme={handleAddTheme}
      />
      
      {editingTheme && (
        <EditThemeDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          theme={editingTheme}
          onSaveTheme={handleSaveEdited}
        />
      )}

    </div>
  );
}
