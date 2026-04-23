/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['uuid'],
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
};

export default nextConfig;
