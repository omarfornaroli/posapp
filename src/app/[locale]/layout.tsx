
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import AppLayout from '@/components/layout/AppLayout';
 
export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // Providing all messages to the client
  // side is a good default.
  const messages = await getMessages();
 
  return (
    <NextIntlClientProvider messages={messages}>
      <AppLayout>
        {children}
      </AppLayout>
    </NextIntlClientProvider>
  );
}
