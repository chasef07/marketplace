import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Temporarily disabled for testing - no authentication required
  return NextResponse.next();
}

export const config = {
  matcher: [], // Disabled for testing
};