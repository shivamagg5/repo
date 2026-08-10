/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@platform/ui',
    '@platform/design-tokens',
    '@platform/types',
    '@platform/validation',
    '@platform/api-client',
    '@platform/auth',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'EventPlatform',
  },
};

module.exports = nextConfig;
