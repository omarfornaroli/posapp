
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { format, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CalendarIcon, Loader2, ChevronDown } from 'lucide-react';
import type { Promotion, PromotionDiscountType, PromotionCondition, PaymentMethod, Product, Client } from '@/types';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

const promotionDiscountTypes = ['percentage', 'fixedAmount'] as const;

const getPromotionFormSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t('Common.formErrors.requiredField', {fieldName: t('AddPromotionDialog.nameLabel')}) }),
  description: z.string().optional(),
  discountType: z.enum(promotionDiscountTypes, { required_error: t('Common.formErrors.requiredField', {fieldName: t('AddPromotionDialog.discountTypeLabel')}) }),
  discountValue: z.coerce.number().positive({ message: t('Common.formErrors.positiveNumber')}),
  startDate: z.date({ required_error: t('Common.formErrors.requiredField', {fieldName: t('AddPromotionDialog.startDateLabel')}) }),
  endDate: z.date().optional(),
  applicationMethod: z.enum(['cart', 'lowestPriceItem']).default('cart'),
  itemQuantity: z.coerce.number().int().min(0, { message: t('Common.formErrors.nonNegativeNumber') }).optional().or(z.literal('')),
  applicableCategoryIds: z.array(z.string()).optional().default([]),
  applicableProductIds: z.array(z.string()).optional().default([]),
  applicableClientIds: z.array(z.string()).optional().default([]),
  applicablePaymentMethodIds: z.array(z.string()).optional().default([]),
  minimumSellAmount: z.coerce.number().min(0, { message: t('Common.formErrors.nonNegativeNumber') }).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: t('Common.formErrors.invalidDateRange'),
  path: ['endDate'],
});

type PromotionFormDataInternal = z.infer<ReturnType<typeof getPromotionFormSchema>>;

interface EditPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: Promotion | null;
  onSavePromotion: (updatedPromotion: Promotion) => void;
}

export default function EditPromotionDialog({ open, onOpenChange, promotion, onSavePromotion }: EditPromotionDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [isLoadingRelatedData, setIsLoadingRelatedData] = useState(false);
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  useEffect(() => {
    async function fetchRelatedData() {
      if (open) {
        setIsLoadingRelatedData(true);
        try {
          const [pmResponse, prodResponse, clientResponse] = await Promise.all([
            fetch('/api/payment-methods'),
            fetch('/api/products'),
            fetch('/api/clients'),
          ]);

          if (pmResponse.ok) {
            const pmResult = await pmResponse.json();
            if (pmResult.success) setPaymentMethods(pmResult.data.filter((pm: PaymentMethod) => pm.isEnabled));
          }
          if (prodResponse.ok) {
            const prodResult = await prodResponse.json();
            if (prodResult.success) {
              const fetchedProducts = prodResult.data as Product[];
              setProducts(fetchedProducts);
              const uniqueCategories = Array.from(new Set(fetchedProducts.map(p => p.category).filter(Boolean)));
              setCategories(uniqueCategories.sort());
            }
          }
          if (clientResponse.ok) {
            const clientResult = await clientResponse.json();
            if (clientResult.success) setClients(clientResult.data);
          }
        } catch (error) {
          console.error("Error fetching related data for promotion dialog:", error);
        } finally {
          setIsLoadingRelatedData(false);
        }
      }
    }
    fetchRelatedData();
  }, [open]);

  const promotionFormSchema = getPromotionFormSchema(t);

  const form = useForm<PromotionFormDataInternal>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: '', description: '', discountType: 'percentage', discountValue: 0,
      startDate: undefined, endDate: undefined,
      applicationMethod: 'cart',
      itemQuantity: '',
      applicableCategoryIds: [], applicableProductIds: [], applicableClientIds: [],
      applicablePaymentMethodIds: [],
      minimumSellAmount: '', isActive: true,
    },
  });

  useEffect(() => {
    if (promotion && open && !isLoadingTranslations && !isLoadingRelatedData) {
      form.reset({
        name: promotion.name,
        description: promotion.description || '',
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        startDate: promotion.startDate ? parseISO(promotion.startDate) : undefined,
        endDate: promotion.endDate ? parseISO(promotion.endDate) : undefined,
        applicationMethod: promotion.applicationMethod || 'cart',
        itemQuantity: promotion.conditions.find(c => c.type === 'itemQuantity')?.value || '',
        applicableCategoryIds: promotion.conditions.find(c => c.type === 'productCategories')?.values || [],
        applicableProductIds: promotion.conditions.find(c => c.type === 'productIds')?.values || [],
        applicableClientIds: promotion.conditions.find(c => c.type === 'clientIds')?.values || [],
        applicablePaymentMethodIds: promotion.conditions.find(c => c.type === 'paymentMethods')?.values || [],
        minimumSellAmount: promotion.conditions.find(c => c.type === 'minSellAmount')?.value || '',
        isActive: promotion.isActive,
      });
    } else if (!open) {
      form.reset(); 
    }
  }, [promotion, open, form, isLoadingTranslations, isLoadingRelatedData, t]);
  
  useEffect(() => {
    if (!isLoadingTranslations && !isLoadingRelatedData && promotion && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, isLoadingRelatedData, promotion, open, form, t]);

  function onSubmit(values: PromotionFormDataInternal) {
    if (!promotion) return;

    const conditions: PromotionCondition[] = [];
    if (values.minimumSellAmount !== '' && values.minimumSellAmount !== undefined) {
      conditions.push({ type: 'minSellAmount', value: Number(values.minimumSellAmount), operator: 'gte' });
    }
     if (values.itemQuantity !== '' && values.itemQuantity !== undefined) {
      conditions.push({ type: 'itemQuantity', value: Number(values.itemQuantity), operator: 'gte' });
    }
    if (values.applicableCategoryIds && values.applicableCategoryIds.length > 0) {
      conditions.push({ type: 'productCategories', values: values.applicableCategoryIds, operator: 'in' });
    }
    if (values.applicableProductIds && values.applicableProductIds.length > 0) {
      conditions.push({ type: 'productIds', values: values.applicableProductIds, operator: 'in' });
    }
    if (values.applicableClientIds && values.applicableClientIds.length > 0) {
      conditions.push({ type: 'clientIds', values: values.applicableClientIds, operator: 'in' });
    }
    if (values.applicablePaymentMethodIds && values.applicablePaymentMethodIds.length > 0) {
      conditions.push({ type: 'paymentMethods', values: values.applicablePaymentMethodIds, operator: 'in' });
    }

    const updatedPromotionData: Promotion = {
      ...promotion, 
      name: values.name,
      description: values.description,
      discountType: values.discountType,
      discountValue: values.discountValue,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate ? values.endDate.toISOString() : undefined,
      conditions, 
      isActive: values.isActive,
      applicationMethod: values.applicationMethod,
    };
    onSavePromotion(updatedPromotionData);
  }
  
  if ((isLoadingTranslations || (open && isLoadingRelatedData)) && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl flex flex-col items-center justify-center min-h-[70vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('Common.loadingTitle')}</DialogTitle>
            <DialogDescription>{t('Common.loadingDescription')}</DialogDescription>
          </DialogHeader>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) form.reset();
    }}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('EditPromotionDialog.title')}</DialogTitle>
          <DialogDescription>{t('EditPromotionDialog.description', { promotionName: promotion?.name || 'promotion' })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-4 py-4 pr-6">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('AddPromotionDialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('AddPromotionDialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{t('AddPromotionDialog.descriptionLabel')}</FormLabel><FormControl><Input placeholder={t('AddPromotionDialog.descriptionPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="discountType" render={({ field }) => (<FormItem><FormLabel>{t('AddPromotionDialog.discountTypeLabel')}</FormLabel><Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{promotionDiscountTypes.map(type => (<SelectItem key={type} value={type}>{t(type === 'percentage' ? 'AddPromotionDialog.discountTypePercentage' : 'AddPromotionDialog.discountTypeFixedAmount')}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="discountValue" render={({ field }) => (<FormItem><FormLabel>{t('AddPromotionDialog.discountValueLabel')}</FormLabel><FormControl><Input type="number" placeholder={form.getValues('discountType') === 'percentage' ? t('AddPromotionDialog.discountValuePercentagePlaceholder') : t('AddPromotionDialog.discountValueFixedPlaceholder')} {...field} step={form.getValues('discountType') === 'percentage' ? "1" : "0.01"} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{t('AddPromotionDialog.startDateLabel')}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && isValid(field.value) ? format(field.value, "PPP") : <span>{t('AddPromotionDialog.selectDatePrompt')}</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{t('AddPromotionDialog.endDateLabel')}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value && isValid(field.value) ? format(field.value, "PPP") : <span>{t('AddPromotionDialog.selectDatePrompt')}</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                  </div>
                  
                  <Separator />
                  <h3 className="text-md font-semibold pt-2">{t('AddPromotionDialog.logicSectionTitle')}</h3>

                  <FormField control={form.control} name="applicationMethod" render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>{t('AddPromotionDialog.applicationMethodLabel')}</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} defaultValue={field.value} className="flex flex-col space-y-1">
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="cart" /></FormControl>
                              <FormLabel className="font-normal">{t('AddPromotionDialog.applyToCart')}</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="lowestPriceItem" /></FormControl>
                              <FormLabel className="font-normal">{t('AddPromotionDialog.applyToLowestPriceItem')}</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />
                  <h3 className="text-md font-semibold pt-2">{t('PromotionListTable.headerApplicability')}</h3>
                  
                  <FormField control={form.control} name="minimumSellAmount" render={({ field }) => (<FormItem><FormLabel>{t('AddPromotionDialog.minimumSellAmountLabel')}</FormLabel><FormControl><Input type="number" placeholder={t('AddPromotionDialog.minimumSellAmountPlaceholder')} {...field} step="0.01" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="itemQuantity" render={({ field }) => (<FormItem><FormLabel>{t('AddPromotionDialog.itemQuantityLabel')}</FormLabel><FormControl><Input type="number" placeholder={t('AddPromotionDialog.itemQuantityPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  
                  <FormField
                    control={form.control} name="applicableCategoryIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('AddPromotionDialog.applicableCategoriesLabel')}</FormLabel>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className="w-full justify-between">
                                {field.value?.length > 0 ? `${field.value.length} ${t(field.value.length === 1 ? 'AddPromotionDialog.categorySelectedSingular' : 'AddPromotionDialog.categorySelectedPlural')}` : t('AddPromotionDialog.selectCategoriesPlaceholder')}
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                            <DropdownMenuLabel>{t('AddPromotionDialog.availableCategoriesHint')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {categories.length === 0 ? (<DropdownMenuItem disabled>{t('AddPromotionDialog.noCategoriesAvailable')}</DropdownMenuItem>) :
                              categories.map((cat) => (<DropdownMenuCheckboxItem key={cat} checked={field.value?.includes(cat)} onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), cat] : (field.value || []).filter(id => id !== cat))}>{cat}</DropdownMenuCheckboxItem>))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control} name="applicableProductIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('AddPromotionDialog.applicableProductsLabel')}</FormLabel>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className="w-full justify-between">
                                {field.value?.length > 0 ? `${field.value.length} ${t(field.value.length === 1 ? 'AddPromotionDialog.productSelectedSingular' : 'AddPromotionDialog.productSelectedPlural')}` : t('AddPromotionDialog.selectProductsPlaceholder')}
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                            <DropdownMenuLabel>{t('AddPromotionDialog.availableProductsHint')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {products.length === 0 ? (<DropdownMenuItem disabled>{t('AddPromotionDialog.noProductsAvailable')}</DropdownMenuItem>) :
                              products.map((prod) => (<DropdownMenuCheckboxItem key={prod.id} checked={field.value?.includes(prod.id)} onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), prod.id] : (field.value || []).filter(id => id !== prod.id))}>{prod.name} ({prod.barcode})</DropdownMenuCheckboxItem>))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control} name="applicableClientIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('AddPromotionDialog.applicableClientsLabel')}</FormLabel>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className="w-full justify-between">
                                {field.value?.length > 0 ? `${field.value.length} ${t(field.value.length === 1 ? 'AddPromotionDialog.clientSelectedSingular' : 'AddPromotionDialog.clientSelectedPlural')}` : t('AddPromotionDialog.selectClientsPlaceholder')}
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                             <DropdownMenuLabel>{t('AddPromotionDialog.availableClientsHint')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {clients.length === 0 ? (<DropdownMenuItem disabled>{t('AddPromotionDialog.noClientsAvailable')}</DropdownMenuItem>) :
                              clients.map((client) => (<DropdownMenuCheckboxItem key={client.id} checked={field.value?.includes(client.id)} onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), client.id] : (field.value || []).filter(id => id !== client.id))}>{client.name} ({client.email})</DropdownMenuCheckboxItem>))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control} name="applicablePaymentMethodIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('AddPromotionDialog.applicablePaymentMethodsLabel')}</FormLabel>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className="w-full justify-between">
                                {field.value?.length > 0 ? `${field.value.length} ${t(field.value.length === 1 ? 'AddPromotionDialog.paymentMethodSelectedSingular' : 'AddPromotionDialog.paymentMethodSelectedPlural')}` : t('AddPromotionDialog.selectPaymentMethodsPlaceholder')}
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
                            <DropdownMenuLabel>{t('AddPromotionDialog.availablePaymentMethodsHint')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             {paymentMethods.length === 0 ? (<DropdownMenuItem disabled>{t('AddPromotionDialog.noPaymentMethodsAvailable')}</DropdownMenuItem>) :
                              paymentMethods.map((method) => (<DropdownMenuCheckboxItem key={method.id} checked={field.value?.includes(method.id)} onCheckedChange={(checked) => field.onChange(checked ? [...(field.value || []), method.id] : (field.value || []).filter(id => id !== method.id))}>{method.name}</DropdownMenuCheckboxItem>))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>{t('AddPromotionDialog.isActiveLabel')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 mt-4 border-t shrink-0">
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('AddPromotionDialog.cancelButton')}</Button></DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditPromotionDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
