import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { fixlet, fixletShare } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const shareFixletSchema = z.object({
  sharedWithUserId: z.string().optional(), // null means public share
  permissions: z.enum(['view', 'edit', 'execute']).default('view'),
});

// POST /api/ohfixit/fixlet/[id]/share - Share a fixlet
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fixletId = params.id;
    const body = await request.json();
    const { sharedWithUserId, permissions } = shareFixletSchema.parse(body);

    // Verify user owns the fixlet
    const fixlets = await db
      .select()
      .from(fixlet)
      .where(and(
        eq(fixlet.id, fixletId),
        eq(fixlet.authorId, session.user.id)
      ))
      .limit(1);

    if (fixlets.length === 0) {
      return NextResponse.json({ error: 'Fixlet not found or access denied' }, { status: 404 });
    }

    // If making public, just update the fixlet
    if (!sharedWithUserId) {
      await db
        .update(fixlet)
        .set({ isPublic: true })
        .where(eq(fixlet.id, fixletId));

      return NextResponse.json({
        success: true,
        message: 'Fixlet made public',
      });
    }

    // Check if share already exists
    const existingShares = await db
      .select()
      .from(fixletShare)
      .where(and(
        eq(fixletShare.fixletId, fixletId),
        eq(fixletShare.sharedWithUserId, sharedWithUserId)
      ))
      .limit(1);

    if (existingShares.length > 0) {
      // Update existing share
      await db
        .update(fixletShare)
        .set({ permissions })
        .where(and(
          eq(fixletShare.fixletId, fixletId),
          eq(fixletShare.sharedWithUserId, sharedWithUserId)
        ));

      return NextResponse.json({
        success: true,
        message: 'Fixlet share updated',
      });
    } else {
      // Create new share
      await db
        .insert(fixletShare)
        .values({
          fixletId,
          sharedByUserId: session.user.id,
          sharedWithUserId,
          permissions,
        });

      return NextResponse.json({
        success: true,
        message: 'Fixlet shared successfully',
      });
    }

  } catch (error) {
    console.error('Error sharing fixlet:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/ohfixit/fixlet/[id]/share - Get shares for a fixlet
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fixletId = params.id;

    // Verify user owns the fixlet
    const fixlets = await db
      .select()
      .from(fixlet)
      .where(and(
        eq(fixlet.id, fixletId),
        eq(fixlet.authorId, session.user.id)
      ))
      .limit(1);

    if (fixlets.length === 0) {
      return NextResponse.json({ error: 'Fixlet not found or access denied' }, { status: 404 });
    }

    // Get all shares for this fixlet
    const shares = await db
      .select()
      .from(fixletShare)
      .where(eq(fixletShare.fixletId, fixletId));

    // Get the fixlet to check if it's public
    const fixletData = fixlets[0];

    return NextResponse.json({
      fixlet: {
        id: fixletData.id,
        title: fixletData.title,
        isPublic: fixletData.isPublic,
      },
      shares,
    });

  } catch (error) {
    console.error('Error fetching fixlet shares:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ohfixit/fixlet/[id]/share/[userId] - Remove a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId?: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fixletId = params.id;
    const sharedWithUserId = params.userId;

    // Verify user owns the fixlet
    const fixlets = await db
      .select()
      .from(fixlet)
      .where(and(
        eq(fixlet.id, fixletId),
        eq(fixlet.authorId, session.user.id)
      ))
      .limit(1);

    if (fixlets.length === 0) {
      return NextResponse.json({ error: 'Fixlet not found or access denied' }, { status: 404 });
    }

    // If no specific user, make fixlet private
    if (!sharedWithUserId) {
      await db
        .update(fixlet)
        .set({ isPublic: false })
        .where(eq(fixlet.id, fixletId));

      return NextResponse.json({
        success: true,
        message: 'Fixlet made private',
      });
    }

    // Remove the specific share
    await db
      .delete(fixletShare)
      .where(and(
        eq(fixletShare.fixletId, fixletId),
        eq(fixletShare.sharedWithUserId, sharedWithUserId)
      ));

    return NextResponse.json({
      success: true,
      message: 'Fixlet share removed',
    });

  } catch (error) {
    console.error('Error removing fixlet share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
