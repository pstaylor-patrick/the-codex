import { NextRequest, NextResponse } from 'next/server';

// This route handles the incorrect redirect from the auth server
// The auth server is configured to redirect to 0.0.0.0:8080/callback
// but we need to redirect to the correct production URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Build the correct callback URL
  const correctCallbackUrl = new URL('/api/auth/callback', process.env.NEXTAUTH_URL || 'https://codex.freemensworkout.org');
  
  // Preserve all query parameters
  if (code) correctCallbackUrl.searchParams.set('code', code);
  if (state) correctCallbackUrl.searchParams.set('state', state);
  if (error) correctCallbackUrl.searchParams.set('error', error);

  // Add any other query parameters
  for (const [key, value] of searchParams.entries()) {
    if (!['code', 'state', 'error'].includes(key)) {
      correctCallbackUrl.searchParams.set(key, value);
    }
  }

  // Redirect to the correct callback URL
  return NextResponse.redirect(correctCallbackUrl.toString(), { status: 302 });
}
