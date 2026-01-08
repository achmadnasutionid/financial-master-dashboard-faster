import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip compression for responses
  compress: true,
  
  // Optimize production builds
  poweredByHeader: false, // Remove X-Powered-By header for security
  
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Experimental features for performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      '@react-pdf/renderer',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-alert-dialog',
    ],
  },
  
  // Output standalone for better Railway deployment
  output: 'standalone',
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;
