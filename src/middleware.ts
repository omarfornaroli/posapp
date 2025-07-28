import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './i18n-config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - …paths that start with `/api/`
    // - …paths that start with `/_next/`
    // - …paths that contain a dot (`.`) (e.g. `favicon.ico`)
    '/((?!api|_next|.*\\..*).*)'
  ]
};
