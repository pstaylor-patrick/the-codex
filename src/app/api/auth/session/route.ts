import { NextRequest, NextResponse } from 'next/server';
import { getUserFromAccessToken } from '@/lib/auth';
import { db } from '@/drizzle/db';
import { admins } from '@/drizzle/schema';
import { ilike } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7);
    
    // Get user info from access token
    const user = await getUserFromAccessToken(accessToken);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unable to determine user email' }, { status: 401 });
    }

    // Check if user is an admin
    const rows = await db.select().from(admins).where(ilike(admins.email, user.email)).limit(1);
    if (!rows.length) {
      return NextResponse.json({ error: 'User not authorized' }, { status: 403 });
    }

    // Set auth cookie for server-side authentication
    const response = NextResponse.json({ success: true, user: { email: user.email } });
    response.cookies.set('user_info', 'authenticated', {
      httpOnly: false, // readable by client code to unblock AuthWrapper
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Session establishment error:', error);
    return NextResponse.json({ error: 'Session establishment failed' }, { status: 500 });
  }
}
