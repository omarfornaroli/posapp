
import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './src/i18n-config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed' // Changed to as-needed for better routing behavior
});

export const config = {
  // Skip all paths that should not be internationalized. This example skips the
  // folders "api", "_next" and all files with an extension (e.g. favicon.ico)
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
