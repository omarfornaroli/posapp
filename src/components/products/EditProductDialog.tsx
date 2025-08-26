

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Product } from '@/types';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const getProductFormSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('AddProductDialog.nameLabel')}) }),
  productGroup: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('AddProductDialog.barcodeLabel')}) }),
  measurementUnit: z.string().optional(),
  cost: z.coerce.number().min(0, { message: t('AddProductDialog.positiveOrZeroError')}).optional().or(z.literal('')),
  markup: z.coerce.number().min(0, { message: t('AddProductDialog.positiveOrZeroError')}).optional().or(z.literal('')),
  price: z.coerce.number().positive({ message: t('Common.formErrors.positiveNumber', {fieldName: t('AddProductDialog.priceLabel')}) }),
  tax: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  isTaxInclusivePrice: z.boolean().default(false),
  isPriceChangeAllowed: z.boolean().default(true),
  isUsingDefaultQuantity: z.boolean().default(true),
  isService: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(0, { message: t('Common.formErrors.nonNegativeNumber', {fieldName: t('AddProductDialog.quantityLabel')}) }),
  supplier: z.string().optional(),
  reorderPoint: z.coerce.number().int().min(0).optional().or(z.literal('')),
  preferredQuantity: z.coerce.number().int().min(0).optional().or(z.literal('')),
  lowStockWarning: z.boolean().default(false),
  warningQuantity: z.coerce.number().int().min(0).optional().or(z.literal('')),
  category: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('AddProductDialog.categoryLabel')}) }),
  imageUrl: z.string().url({ message: t('Common.formErrors.invalidUrl', {fieldName: t('AddProductDialog.imageUrlLabel')}) }).optional().or(z.literal('')),
});

type ProductFormData = z.infer<ReturnType<typeof getProductFormSchema>>;

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSaveProduct: (updatedProduct: Product) => void;
}

export default function EditProductDialog({ open, onOpenChange, product, onSaveProduct }: EditProductDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const productFormSchema = getProductFormSchema(t);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '', productGroup: '', sku: '', barcode: '', measurementUnit: 'piece',
      cost: '', markup: '', price: 0, tax: '', 
      isTaxInclusivePrice: false, isPriceChangeAllowed: true, isUsingDefaultQuantity: true,
      isService: false, isEnabled: true, description: '', quantity: 0, 
      supplier: '', reorderPoint: '', preferredQuantity: '', lowStockWarning: false,
      warningQuantity: '', category: '', imageUrl: '',
    },
  });

  useEffect(() => {
    if (product && open && !isLoadingTranslations) {
      form.reset({
        name: product.name || '',
        productGroup: product.productGroup || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        measurementUnit: product.measurementUnit || 'piece',
        cost: product.cost,
        markup: product.markup,
        price: product.price,
        tax: product.tax !== undefined ? product.tax * 100 : '',
        isTaxInclusivePrice: product.isTaxInclusivePrice || false,
        isPriceChangeAllowed: product.isPriceChangeAllowed === undefined ? true : product.isPriceChangeAllowed,
        isUsingDefaultQuantity: product.isUsingDefaultQuantity === undefined ? true : product.isUsingDefaultQuantity,
        isService: product.isService || false,
        isEnabled: product.isEnabled === undefined ? true : product.isEnabled,
        description: product.description || '',
        quantity: product.quantity,
        supplier: (product.supplier as any)?.name || (product.supplier as string) || '',
        reorderPoint: product.reorderPoint,
        preferredQuantity: product.preferredQuantity,
        lowStockWarning: product.lowStockWarning || false,
        warningQuantity: product.warningQuantity,
        category: product.category || '',
        imageUrl: product.imageUrl || '',
      });
    } else if (!open) {
        form.reset({ 
            name: '', productGroup: '', sku: '', barcode: '', measurementUnit: 'piece',
            cost: '', markup: '', price: 0, tax: '',
            isTaxInclusivePrice: false, isPriceChangeAllowed: true, isUsingDefaultQuantity: true,
            isService: false, isEnabled: true, description: '', quantity: 0,
            supplier: '', reorderPoint: '', preferredQuantity: '', lowStockWarning: false,
            warningQuantity: '', category: '', imageUrl: '',
        });
    }
  }, [product, open, form, isLoadingTranslations, t]);

  useEffect(() => {
    if (!isLoadingTranslations && product && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, product, open, form, t]);

  function onSubmit(values: ProductFormData) {
    if (!product) return; 
    const processedValues: Product = {
      ...product, 
      ...values,
      cost: values.cost === '' ? undefined : Number(values.cost),
      markup: values.markup === '' ? undefined : Number(values.markup),
      price: Number(values.price),
      tax: values.tax === '' ? undefined : Number(values.tax) / 100, 
      quantity: Number(values.quantity),
      reorderPoint: values.reorderPoint === '' ? undefined : Number(values.reorderPoint),
      preferredQuantity: values.preferredQuantity === '' ? undefined : Number(values.preferredQuantity),
      warningQuantity: values.warningQuantity === '' ? undefined : Number(values.warningQuantity),
      imageUrl: values.imageUrl || undefined,
    };
    onSaveProduct(processedValues);
  }

  if (isLoadingTranslations && open) {
    return (
       <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl flex flex-col items-center justify-center min-h-[70vh]">
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
      if (!isOpen) {
        form.reset(); 
      }
    }}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('EditProductDialog.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('EditProductDialog.dialogDescription', {productName: product?.name || t('AddProductDialog.defaultProductName')})}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-6 -mr-6">
              <div className="space-y-4 py-4 pr-6">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('AddProductDialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.categoryLabel')}</FormLabel><FormControl><Input placeholder={t('AddProductDialog.categoryPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="productGroup" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.productGroupLabel')}</FormLabel><FormControl><Input placeholder={t('AddProductDialog.productGroupPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="sku" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.skuLabel')}</FormLabel><FormControl><Input placeholder={t('AddProductDialog.skuPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="barcode" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.barcodeLabel')}</FormLabel><FormControl><Input placeholder={t('AddProductDialog.barcodePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="measurementUnit" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.measurementUnitLabel')}</FormLabel><FormControl><Input placeholder={t('AddProductDialog.measurementUnitPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <h3 className="text-md font-semibold pt-2 border-b">{t('AddProductDialog.pricingSectionTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="cost" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.costLabel')}</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="markup" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.markupLabel')}</FormLabel><FormControl><Input type="number" placeholder="e.g. 20 for 20%" {...field} step="0.01" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.priceLabel')}</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <FormField control={form.control} name="tax" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.taxLabel')}</FormLabel><FormControl><Input type="number" placeholder="e.g. 10 for 10%" {...field} step="0.01" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="isTaxInclusivePrice" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4"><div className="space-y-0.5"><FormLabel>{t('AddProductDialog.isTaxInclusivePriceLabel')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </div>
                
                <h3 className="text-md font-semibold pt-2 border-b">{t('AddProductDialog.inventorySectionTitle')}</h3>
                <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.quantityLabel')}</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="reorderPoint" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.reorderPointLabel')}</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="preferredQuantity" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.preferredQuantityLabel')}</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                   <FormField control={form.control} name="warningQuantity" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.warningQuantityLabel')}</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="lowStockWarning" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4"><div className="space-y-0.5"><FormLabel>{t('AddProductDialog.lowStockWarningLabel')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </div>
                <FormField control={form.control} name="supplier" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.supplierLabel')}</FormLabel><FormControl><Input placeholder={t('AddProductDialog.supplierPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />

                <h3 className="text-md font-semibold pt-2 border-b">{t('AddProductDialog.behaviorStatusSectionTitle')}</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <FormField control={form.control} name="isPriceChangeAllowed" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('AddProductDialog.isPriceChangeAllowedLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="isUsingDefaultQuantity" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('AddProductDialog.isUsingDefaultQuantityLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="isService" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('AddProductDialog.isServiceLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="isEnabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('AddProductDialog.isEnabledLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </div>
                
                <h3 className="text-md font-semibold pt-2 border-b">{t('AddProductDialog.otherDetailsSectionTitle')}</h3>
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.descriptionLabel')}</FormLabel><FormControl><Textarea placeholder={t('AddProductDialog.descriptionPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>{t('AddProductDialog.imageUrlLabel')}</FormLabel><FormControl><Input placeholder={t('AddProductDialog.imageUrlPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t mt-auto shrink-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('AddProductDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditProductDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
