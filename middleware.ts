import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Rewrite API requests to our proxy endpoint
  const url = request.nextUrl.clone()

  if (url.pathname.startsWith("/translate-text") || url.pathname.startsWith("/translate-document")) {
    url.pathname = `/api/proxy${url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/translate-text/:path*", "/translate-document/:path*"],
}

