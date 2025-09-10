import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { fixlet, fixletStep, fixletExecution, fixletExecutionStep, fixletShare } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const createFixletSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedTime: z.string().min(1, 'Estimated time is required'),
  tags: z.array(z.string()).optional(),
  steps: z.array(z.object({
    title: z.string().min(1, 'Step title is required'),
    description: z.string().optional(),
    actions: z.array(z.string()),
    expectedResult: z.string().optional(),
    estimatedTime: z.string().min(1, 'Step estimated time is required'),
    category: z.string().min(1, 'Step category is required'),
    os: z.string().optional(),
    successCriteria: z.array(z.string()).optional(),
  })),
  isPublic: z.boolean().optional(),
});

// GET /api/ohfixit/fixlet - List fixlets
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const authorId = searchParams.get('authorId');
    const isPublic = searchParams.get('isPublic') === 'true';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereConditions = [];

    // User can see their own fixlets and public ones
    whereConditions.push(
      sql`${fixlet.authorId} = ${session.user.id} OR ${fixlet.isPublic} = true`
    );

    if (category) {
      whereConditions.push(eq(fixlet.category, category));
    }

    if (difficulty) {
      whereConditions.push(eq(fixlet.difficulty, difficulty));
    }

    if (authorId) {
      whereConditions.push(eq(fixlet.authorId, authorId));
    }

    if (isPublic !== undefined) {
      whereConditions.push(eq(fixlet.isPublic, isPublic));
    }

    if (search) {
      whereConditions.push(
        sql`${fixlet.title} ILIKE ${`%${search}%`} OR ${fixlet.description} ILIKE ${`%${search}%`}`
      );
    }

    const fixlets = await db
      .select({
        id: fixlet.id,
        title: fixlet.title,
        description: fixlet.description,
        category: fixlet.category,
        difficulty: fixlet.difficulty,
        estimatedTime: fixlet.estimatedTime,
        tags: fixlet.tags,
        authorId: fixlet.authorId,
        isPublic: fixlet.isPublic,
        usageCount: fixlet.usageCount,
        createdAt: fixlet.createdAt,
        updatedAt: fixlet.updatedAt,
        stepCount: sql<number>`COUNT(${fixletStep.id})`,
      })
      .from(fixlet)
      .leftJoin(fixletStep, eq(fixlet.id, fixletStep.fixletId))
      .where(and(...whereConditions))
      .groupBy(fixlet.id)
      .orderBy(desc(fixlet.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(fixlet)
      .where(and(...whereConditions));

    return NextResponse.json({
      fixlets,
      totalCount: totalCount[0].count,
      hasMore: offset + limit < totalCount[0].count,
    });

  } catch (error) {
    console.error('Error fetching fixlets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ohfixit/fixlet - Create a new fixlet
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createFixletSchema.parse(body);

    // Create the fixlet
    const [newFixlet] = await db
      .insert(fixlet)
      .values({
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        difficulty: validatedData.difficulty,
        estimatedTime: validatedData.estimatedTime,
        tags: validatedData.tags || [],
        authorId: session.user.id,
        isPublic: validatedData.isPublic || false,
      })
      .returning();

    // Create the steps
    if (validatedData.steps && validatedData.steps.length > 0) {
      const stepsToInsert = validatedData.steps.map((step, index) => ({
        fixletId: newFixlet.id,
        title: step.title,
        description: step.description,
        actions: step.actions,
        expectedResult: step.expectedResult,
        estimatedTime: step.estimatedTime,
        category: step.category,
        os: step.os,
        successCriteria: step.successCriteria || [],
        stepOrder: index,
      }));

      await db.insert(fixletStep).values(stepsToInsert);
    }

    // Fetch the complete fixlet with steps
    const completeFixlet = await db
      .select()
      .from(fixlet)
      .where(eq(fixlet.id, newFixlet.id))
      .limit(1);

    const steps = await db
      .select()
      .from(fixletStep)
      .where(eq(fixletStep.fixletId, newFixlet.id))
      .orderBy(fixletStep.stepOrder);

    return NextResponse.json({
      ...completeFixlet[0],
      steps,
    });

  } catch (error) {
    console.error('Error creating fixlet:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
