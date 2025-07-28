
import {getRequestConfig} from 'next-intl/server';
import {locales} from '@/i18n-config';
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
      console.warn(`Unsupported locale "${locale}" requested. Falling back to default.`);
      locale = locales[0]; // Fallback to the first available locale
  }
 
  return {
    messages: (await import(`@/messages/${locale}.json`)).default
  };
});
