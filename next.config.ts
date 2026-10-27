import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/masuk',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/masuk?tab=buat-akun',
        permanent: true,
      },
      {
        source: '/otp',
        destination: '/verifikasi-otp',
        permanent: false,
      },
      {
        source: '/onboarding',
        destination: '/lengkapi-profil',
        permanent: false,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
