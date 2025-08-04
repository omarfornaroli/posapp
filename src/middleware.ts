import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './i18n-config';
 
export default createMiddleware({
  locales,
  defaultLocale,
  // The `localePrefix` is set to `never` to completely remove the locale
  // from the URL, aligning with the flat file structure.
  localePrefix: 'never'
});
 
export const config = {
  // Match all pathnames except for
  // - …paths that start with `/api/`
  // - …paths that start with `/_next/`
  // - …paths that contain a dot (`.`) (e.g. `favicon.ico`)
  matcher: [
    '/((?!api|_next|.*\\..*).*)'
  ]
};
