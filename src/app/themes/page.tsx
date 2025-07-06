
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Palette, CheckCircle2, Edit, PlusCircle, ShieldAlert } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import type { Theme } from '@/types';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import EditThemeDialog from '@/components/themes/EditThemeDialog';
import AddThemeDialog from '@/components/themes/AddThemeDialog'; 
import { useDexieThemes } from '@/hooks/useDexieThemes'; 
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';

export default function ThemeManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { toast } = useToast();
  const router = useRouter();

  const { themes, isLoading: isLoadingThemes, addTheme, updateTheme } = useDexieThemes(); 
  const [isUpdatingDefault, setIsUpdatingDefault] = useState<string | null>(null);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false); 

  const handleSetDefault = async (themeId: string) => {
    const themeToSet = themes.find(t => t.id === themeId);
    if (!themeToSet) return;
    
    setIsUpdatingDefault(themeId);
    try {
      await updateTheme({ ...themeToSet, isDefault: true });
      toast({
        title: t('ThemeManagerPage.themeSetDefaultSuccessTitle'),
        description: t('ThemeManagerPage.themeSetDefaultSuccessDescription', { themeName: themeToSet.name }),
      });
      // Force a full page reload for the new theme variables to be applied by the root layout.
      router.refresh(); 
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('ThemeManagerPage.errorSettingDefaultTheme'),
      });
    } finally {
      setIsUpdatingDefault(null);
    }
  };

  const handleEditTheme = (theme: Theme) => {
    setEditingTheme(theme);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedTheme = async (updatedTheme: Theme) => {
    try {
      await updateTheme(updatedTheme);
      toast({
        title: t('ThemeManagerPage.themeUpdateSuccessTitle'),
        description: t('ThemeManagerPage.themeUpdateSuccessDescription', { themeName: updatedTheme.name }),
      });
      setIsEditDialogOpen(false);
      if (updatedTheme.isDefault) { 
        router.refresh(); 
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('ThemeManagerPage.errorUpdatingTheme'),
      });
    }
  };

  const handleAddNewTheme = async (newThemeData: Omit<Theme, 'id' | 'isDefault'>) => {
    try {
      await addTheme(newThemeData as Omit<Theme, 'id'| 'createdAt' | 'updatedAt' | 'isDefault'>);
      toast({
        title: t('Toasts.themeAddedTitle'),
        description: t('Toasts.themeAddedDescription', { themeName: newThemeData.name }),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('ThemeManagerPage.errorAddingTheme'),
      });
    }
  };

  if (!hasPermission('manage_themes_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations || (isLoadingThemes && themes.length === 0)) {
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
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" disabled={!hasPermission('manage_themes_page')}>
          <PlusCircle className="mr-2 h-5 w-5" /> {t('ThemeManagerPage.addThemeButton')}
        </Button>
      </div>
      <CardDescription>{t('ThemeManagerPage.description')}</CardDescription>

      {themes.length === 0 && !isLoadingThemes && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{t('ThemeManagerPage.noThemesFound')}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {themes.map((theme) => (
          <Card key={theme.id} className={`flex flex-col shadow-lg ${theme.isDefault ? 'border-primary border-2 ring-2 ring-primary ring-offset-2' : 'border-border'}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="font-headline">{theme.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => handleEditTheme(theme)} aria-label={t('ThemeManagerPage.editThemeAriaLabel', { themeName: theme.name })} disabled={!hasPermission('manage_themes_page')}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              {theme.isDefault && (
                <Badge variant="default" className="w-fit mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('ThemeManagerPage.defaultBadge')}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('ThemeManagerPage.fontsLabel')}</p>
                <div className="space-y-1">
                    <p className="text-xs"><span className="font-medium">{t('ThemeManagerPage.fontBodyLabel')}:</span> {theme.fontBody}</p>
                    <p className="text-xs"><span className="font-medium">{t('ThemeManagerPage.fontHeadlineLabel')}:</span> {theme.fontHeadline}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('ThemeManagerPage.colorsPreviewLabel')}</p>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                  {Object.entries(theme.colors).map(([colorName, colorValue]) => (
                    <div key={colorName} className="flex items-center justify-start text-xs gap-1.5">
                      <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: `hsl(${colorValue})` }} data-ai-hint="color swatch"></div>
                      <span className="capitalize text-[10px]">{colorName.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleSetDefault(theme.id)}
                disabled={theme.isDefault || isUpdatingDefault === theme.id || !hasPermission('manage_themes_page')}
                className="w-full"
                variant={theme.isDefault ? "outline" : "default"}
              >
                {isUpdatingDefault === theme.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {theme.isDefault ? t('ThemeManagerPage.currentDefaultButton') : t('ThemeManagerPage.setDefaultButton')}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      {editingTheme && (
        <EditThemeDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          theme={editingTheme}
          onSaveTheme={handleSaveEditedTheme}
        />
      )}
      <AddThemeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSaveTheme={handleAddNewTheme}
      />
    </div>
  );
}
