import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ToastProvider from '../components/ToastProvider';

export const metadata: Metadata = {
  title: 'Porsi Kita — Satu Menu Keluarga, Gizi Tepat untuk Setiap Anggota',
  description:
    'Aplikasi perencanaan menu mingguan hemat, bebas alergen, dan tepat gizi untuk seluruh anggota keluarga berbasis TKPI 2017 dan AKG Permenkes 28/2019.',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-[#0D0101] antialiased">
        <ToastProvider>
          <main className="flex-1">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
