import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '600', '800'],
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'KuboDeck · deck box stampabili in 3D',
  description:
    'Configura una deck box per 60 carte imbustate, guardala in 3D e scarica gli STL pronti per la Bambu Lab A1 Mini.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="it" className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
