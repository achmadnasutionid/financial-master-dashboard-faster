import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Block search engine crawlers
  const userAgent = request.headers.get('user-agent') || ''
  const searchBots = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'sogou',
    'ia_archiver',
    'facebookexternalhit',
    'twitterbot',
  ]
  
  const isBot = searchBots.some(bot => userAgent.toLowerCase().includes(bot))
  
  if (isBot) {
    return new NextResponse('Access denied', { status: 403 })
  }

  // Add cache control headers for API responses
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Only cache MASTER DATA endpoints (rarely change)
    const masterDataEndpoints = [
      "/api/companies",
      "/api/products",
      "/api/billings",
      "/api/signatures",
    ]
    
    const isMasterData = masterDataEndpoints.some(endpoint => 
      request.nextUrl.pathname === endpoint || 
      request.nextUrl.pathname.startsWith(endpoint + "/")
    )
    
    if (request.method === "GET") {
      if (isMasterData) {
        // Cache master data for 5 minutes
        response.headers.set(
          "Cache-Control",
          "public, s-maxage=300, stale-while-revalidate=600"
        )
      } else {
        // NO CACHE for transaction data (quotations, invoices, expenses, etc)
        response.headers.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, max-age=0"
        )
      }
    }
    
    // Enable compression hint
    response.headers.set("Vary", "Accept-Encoding")
  }

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  
  // Prevent search engine indexing via headers
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex")

  return response
}

// Run middleware on all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

