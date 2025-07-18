
import {getLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales} from '@/i18n-config';

export default async function getRequestConfig() {
  const locale = await getLocale();

  if (!locales.includes(locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
}
