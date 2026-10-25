export const metadata = {
  title: 'Zyron Studio — Build your online store',
  description: 'Build your online store in minutes. Share the link, get orders on WhatsApp, and send invoices when you need them. Made for Nigerian small businesses.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#05060a', colorScheme: 'dark' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap" />
        <link rel="stylesheet" href="/app/app.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
