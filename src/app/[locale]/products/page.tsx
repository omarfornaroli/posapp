// src/app/[locale]/products/page.tsx
// This file re-exports the actual page component from the non-locale-prefixed path
// to work correctly with next-intl's localePrefix: 'never' strategy.

export { default } from '@/app/products/page';
