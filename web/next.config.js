/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: { domains: ["img.clerk.com"] },
};
module.exports = nextConfig;
