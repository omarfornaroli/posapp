
import {getLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import {locales} from './i18n-config';

export default getRequestConfig(async () => {
  // Read the A/B test cookie and decide which locale to serve.
  // In this example, we'll just use the default.
  const locale = await getLocale();

  if (!locales.includes(locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
