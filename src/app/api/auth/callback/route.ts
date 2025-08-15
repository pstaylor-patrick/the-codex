import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const headers = {
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (error) {
    return NextResponse.json({ error }, { status: 400, headers });
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400, headers }
    );
  }

  // TODO: Validate state against localStorage
  // TODO: Exchange code for token

  // Set auth cookie and redirect to admin page
  const response = NextResponse.redirect(new URL('/admin', request.url), {
    status: 302,
    headers
  });
  
  // Set auth cookie that will be read by the admin page
  response.cookies.set('user_info', 'authenticated', {
    httpOnly: false, // readable by client code to unblock AuthWrapper
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  return response;
}
