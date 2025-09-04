import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { deviceProfile } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const deviceProfileSchema = z.object({
  os: z.enum(['macos', 'windows', 'linux']),
  name: z.string().min(1).max(128),
  capabilities: z.object({
    systemCommands: z.boolean().default(false),
    fileOperations: z.boolean().default(false),
    networkDiagnostics: z.boolean().default(true),
    healthChecks: z.boolean().default(true),
    automationActions: z.array(z.string()).default([]),
  }).optional(),
  warranty: z.object({
    manufacturer: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    purchaseDate: z.string().optional(),
    warrantyEnd: z.string().optional(),
  }).optional(),
});

// GET: List device profiles for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await db
      .select()
      .from(deviceProfile)
      .where(eq(deviceProfile.userId, session.user.id))
      .orderBy(desc(deviceProfile.lastSeenAt));

    return NextResponse.json({
      profiles,
      count: profiles.length
    });
  } catch (err: any) {
    console.error('Device profile list error:', err);
    return NextResponse.json({ 
      error: err?.message ?? 'Failed to fetch device profiles' 
    }, { status: 500 });
  }
}

// POST: Create or update a device profile
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { os, name, capabilities, warranty } = deviceProfileSchema.parse(body);

    // Check if device with same name already exists for this user
    const existingDevice = await db
      .select()
      .from(deviceProfile)
      .where(eq(deviceProfile.userId, session.user.id))
      .limit(1);

    const existingWithName = existingDevice.find(d => d.name === name);

    if (existingWithName) {
      // Update existing device profile
      const updated = await db
        .update(deviceProfile)
        .set({
          os,
          capabilities: capabilities || null,
          warranty: warranty || null,
          lastSeenAt: new Date(),
        })
        .where(eq(deviceProfile.id, existingWithName.id))
        .returning();

      return NextResponse.json({
        profile: updated[0],
        action: 'updated'
      });
    } else {
      // Create new device profile
      const created = await db
        .insert(deviceProfile)
        .values({
          userId: session.user.id,
          os,
          name,
          capabilities: capabilities || null,
          warranty: warranty || null,
        })
        .returning();

      return NextResponse.json({
        profile: created[0],
        action: 'created'
      });
    }
  } catch (err: any) {
    console.error('Device profile create/update error:', err);
    return NextResponse.json({ 
      error: err?.message ?? 'Failed to create/update device profile' 
    }, { status: 500 });
  }
}

// PUT: Update device last seen timestamp
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    
    if (!profileId) {
      return NextResponse.json({ error: 'profileId required' }, { status: 400 });
    }

    // Verify ownership and update last seen
    const updated = await db
      .update(deviceProfile)
      .set({
        lastSeenAt: new Date(),
      })
      .where(eq(deviceProfile.id, profileId))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Device profile not found' }, { status: 404 });
    }

    // Verify user owns this profile
    if (updated[0].userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      profile: updated[0],
      action: 'heartbeat'
    });
  } catch (err: any) {
    console.error('Device profile heartbeat error:', err);
    return NextResponse.json({ 
      error: err?.message ?? 'Failed to update device heartbeat' 
    }, { status: 500 });
  }
}