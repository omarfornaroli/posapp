
'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import type { Product } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Image
          src={product.imageUrl || "https://placehold.co/300x300.png"}
          alt={product.name}
          width={300}
          height={300}
          className="object-cover w-full h-48"
          data-ai-hint={`${product.category} item`}
        />
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-headline mb-1">{product.name}</CardTitle>
        <p className="text-sm text-muted-foreground h-10 overflow-hidden">{product.description || t('ProductCardComponent.noDescription')}</p>
        <p className="text-primary font-semibold text-xl mt-2">${product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Button
          onClick={() => onAddToCart(product)}
          className="w-full bg-primary hover:bg-primary/90"
          aria-label={t('ProductCardComponent.addToCartAriaLabel', {productName: product.name})}
        >
          <PlusCircle className="mr-2 h-5 w-5" /> {t('ProductCardComponent.addToCartButton')}
        </Button>
      </CardFooter>
    </Card>
  );
}
