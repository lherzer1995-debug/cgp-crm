/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@cgp/ai"],
  images: {
    domains: ["maps.googleapis.com", "img.clerk.com"],
  },
};

module.exports = nextConfig;
