import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { fixlet, fixletStep, fixletExecution, fixletExecutionStep } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const updateFixletSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedTime: z.string().min(1, 'Estimated time is required').optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/ohfixit/fixlet/[id] - Get a specific fixlet
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

    // Get the fixlet
    const fixlets = await db
      .select()
      .from(fixlet)
      .where(eq(fixlet.id, fixletId))
      .limit(1);

    if (fixlets.length === 0) {
      return NextResponse.json({ error: 'Fixlet not found' }, { status: 404 });
    }

    const fixletData = fixlets[0];

    // Check if user has access to this fixlet
    if (fixletData.authorId !== session.user.id && !fixletData.isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the steps
    const steps = await db
      .select()
      .from(fixletStep)
      .where(eq(fixletStep.fixletId, fixletId))
      .orderBy(fixletStep.stepOrder);

    // Get execution statistics
    const executionStats = await db
      .select({
        totalExecutions: sql<number>`COUNT(*)`,
        successfulExecutions: sql<number>`COUNT(CASE WHEN ${fixletExecution.status} = 'completed' THEN 1 END)`,
        avgRating: sql<number>`AVG(${fixletExecution.status})`, // This would need proper rating table
      })
      .from(fixletExecution)
      .where(eq(fixletExecution.fixletId, fixletId));

    return NextResponse.json({
      ...fixletData,
      steps,
      stats: executionStats[0],
    });

  } catch (error) {
    console.error('Error fetching fixlet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/ohfixit/fixlet/[id] - Update a fixlet
export async function PUT(
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
    const validatedData = updateFixletSchema.parse(body);

    // Check if user owns this fixlet
    const existingFixlet = await db
      .select()
      .from(fixlet)
      .where(eq(fixlet.id, fixletId))
      .limit(1);

    if (existingFixlet.length === 0) {
      return NextResponse.json({ error: 'Fixlet not found' }, { status: 404 });
    }

    if (existingFixlet[0].authorId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the fixlet
    const [updatedFixlet] = await db
      .update(fixlet)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(fixlet.id, fixletId))
      .returning();

    return NextResponse.json(updatedFixlet);

  } catch (error) {
    console.error('Error updating fixlet:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ohfixit/fixlet/[id] - Delete a fixlet
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fixletId = params.id;

    // Check if user owns this fixlet
    const existingFixlet = await db
      .select()
      .from(fixlet)
      .where(eq(fixlet.id, fixletId))
      .limit(1);

    if (existingFixlet.length === 0) {
      return NextResponse.json({ error: 'Fixlet not found' }, { status: 404 });
    }

    if (existingFixlet[0].authorId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the fixlet (cascade will handle steps and executions)
    await db.delete(fixlet).where(eq(fixlet.id, fixletId));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting fixlet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
