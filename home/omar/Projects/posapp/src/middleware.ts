
import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './i18n-config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export const config = {
  // Skip all paths that should not be internationalized. This example skips the
  // folders "api", "_next" and all files with an extension (e.g. favicon.ico)
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
