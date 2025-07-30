// This file is intentionally blank.
// The root of the site is now handled by src/app/[locale]/page.tsx
// which will be routed by the middleware.
// This prevents a conflict where Next.js tries to render two root pages.
export default function RootPage() {
  return null;
}
