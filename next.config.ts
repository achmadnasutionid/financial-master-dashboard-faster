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
    // Optimize package imports - reduces bundle size by tree-shaking unused code
    optimizePackageImports: [
      'lucide-react',
      '@react-pdf/renderer',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@tiptap/react',
      '@tiptap/starter-kit',
    ],
    
    // Enable Server Actions (if you plan to use them)
    serverActions: {
      bodySizeLimit: '2mb',
    },
    
    // Optimize CSS - reduces CSS bundle size
    optimizeCss: true,
  },
  
  // Output standalone for better Railway deployment
  output: 'standalone',
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production (except error/warn)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Split large chunks for better caching and parallel loading
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunks
            default: false,
            vendors: false,
            
            // React & React-DOM in one chunk
            react: {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            
            // PDF libraries in separate chunk (only loaded on PDF pages)
            pdf: {
              name: 'pdf-vendor',
              test: /[\\/]node_modules[\\/]@react-pdf[\\/]/,
              priority: 15,
              reuseExistingChunk: true,
            },
            
            // Charts library in separate chunk (only loaded on dashboard)
            charts: {
              name: 'charts-vendor',
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              priority: 15,
              reuseExistingChunk: true,
            },
            
            // UI components (Radix)
            ui: {
              name: 'ui-vendor',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
            
            // All other node_modules
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 5,
              reuseExistingChunk: true,
            },
            
            // Common code shared across pages
            common: {
              name: 'common',
              minChunks: 2,
              priority: 1,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    
    return config
  },
  
  // Headers for static assets
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
    ]
  },
};

export default nextConfig;
