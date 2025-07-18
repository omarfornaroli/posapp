
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales, defaultLocale} from '@/i18n-config';
import {getLocale} from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = await getLocale();

  if (!locales.includes(locale as any)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
