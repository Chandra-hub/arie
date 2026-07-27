/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_ARIE_API_URL: process.env.NEXT_PUBLIC_ARIE_API_URL,
  },
};

module.exports = nextConfig;
