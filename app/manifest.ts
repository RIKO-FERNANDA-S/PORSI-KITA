import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Porsi Kita — Satu Menu Keluarga, Gizi Tepat',
    short_name: 'Porsi Kita',
    description:
      'Inovasi Meal Planner Cerdas Berbasis Anggaran dan Presisi AKG Kemenkes untuk Pencegahan Stunting.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: '#0C4B20',
    orientation: 'portrait-primary',
    scope: '/',
    categories: ['food', 'health', 'lifestyle', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '360x360',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
