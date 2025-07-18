
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales} from './i18n-config';

// This function is called for every request that needs translations.
// By loading messages from static JSON files, we avoid slow and error-prone
// database calls during the critical server startup and request processing paths.
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is a valid locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  return {
    locale,
    // Messages are loaded dynamically based on the locale.
    // This requires a `[locale]` folder structure in `src/messages`.
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
