/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['canvas', 'pdfjs-dist'],
  },
};

export default nextConfig;
