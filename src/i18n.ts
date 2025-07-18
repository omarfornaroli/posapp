
import {getLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import {locales} from '@/i18n-config';

export default getRequestConfig(async () => {
  // This logic is executed for every request that starts with a locale.
  // The locale is received from the middleware.
  const locale = await getLocale();

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default
  };
});

    