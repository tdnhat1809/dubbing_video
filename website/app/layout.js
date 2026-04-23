import './globals.css';
import LayoutShell from './components/LayoutShell';

export const metadata = {
  title: 'B2Vision.com - AI Dịch văn bản trong video',
  description: 'Nền tảng dịch video bằng AI hàng đầu, giúp phá bỏ mọi rào cản ngôn ngữ.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="light" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@100;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-background selection:bg-primary-container/30" suppressHydrationWarning>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
