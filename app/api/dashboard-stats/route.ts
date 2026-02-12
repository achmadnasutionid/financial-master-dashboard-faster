import { NextResponse } from "next/server"

/**
 * Simplified Dashboard API
 * Landing page no longer requires analytics data
 * This endpoint now returns minimal data or can be removed entirely
 * Kept for backward compatibility
 */
export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    // Return minimal response - landing page is now just a menu
    const responseData = {
      message: "Landing page no longer displays analytics",
      timestamp: new Date().toISOString(),
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      ...responseData,
      _meta: {
        duration,
      }
    })
  } catch (error) {
    console.error("Error in dashboard-stats endpoint:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
