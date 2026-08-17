/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@platform/ui','@platform/design-tokens','@platform/types','@platform/validation','@platform/api-client','@platform/auth'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};
module.exports = nextConfig;
