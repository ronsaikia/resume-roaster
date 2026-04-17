/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom', '@napi-rs/canvas'];
    }
    return config;
  },
};

export default nextConfig;
