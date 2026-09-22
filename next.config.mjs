/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  logging: {
    incomingRequests: true,                                  
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
