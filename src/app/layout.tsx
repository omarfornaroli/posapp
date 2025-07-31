import type { ReactNode } from 'react';

export const metadata = {
  title: 'POSAPP',
  description: 'Modern Point of Sale application',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
