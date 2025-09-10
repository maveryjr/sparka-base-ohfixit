import { NextResponse } from 'next/server';

export async function HEAD() {
  // Let the platform set the Date header; return 204
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return NextResponse.json({ now: new Date().toISOString() });
}

