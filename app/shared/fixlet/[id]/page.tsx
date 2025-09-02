import { notFound } from 'next/navigation';
import { FixletViewer } from '@/components/ohfixit/fixlet-viewer';
import { db } from '@/lib/db';
import { fixlet, fixletStep } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface SharedFixletPageProps {
  params: {
    id: string;
  };
}

export default async function SharedFixletPage({ params }: SharedFixletPageProps) {
  const fixletId = params.id;

  try {
    // Get the fixlet
    const fixlets = await db
      .select()
      .from(fixlet)
      .where(eq(fixlet.id, fixletId))
      .limit(1);

    if (fixlets.length === 0) {
      notFound();
    }

    const fixletData = fixlets[0];

    // Check if fixlet is public
    if (!fixletData.isPublic) {
      notFound();
    }

    // Get the steps
    const steps = await db
      .select()
      .from(fixletStep)
      .where(eq(fixletStep.fixletId, fixletId))
      .orderBy(fixletStep.stepOrder);

    // Increment usage count
    await db
      .update(fixlet)
      .set({ usageCount: fixletData.usageCount + 1 })
      .where(eq(fixlet.id, fixletId));

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Shared Fixlet
            </h1>
            <p className="text-gray-600">
              This fixlet has been shared publicly. You can view and execute it, but cannot modify it.
            </p>
          </div>

          <FixletViewer
            fixlet={{
              ...fixletData,
              steps,
            }}
            isReadOnly={true}
            isShared={true}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading shared fixlet:', error);
    notFound();
  }
}

export async function generateMetadata({ params }: SharedFixletPageProps) {
  try {
    const fixlets = await db
      .select()
      .from(fixlet)
      .where(eq(fixlet.id, params.id))
      .limit(1);

    if (fixlets.length === 0 || !fixlets[0].isPublic) {
      return {
        title: 'Fixlet Not Found',
      };
    }

    const fixletData = fixlets[0];

    return {
      title: `${fixletData.title} - Shared Fixlet`,
      description: fixletData.description || `Shared fixlet: ${fixletData.title}`,
      openGraph: {
        title: `${fixletData.title} - Shared Fixlet`,
        description: fixletData.description || `Shared fixlet for ${fixletData.category} issues`,
        type: 'article',
      },
    };
  } catch (error) {
    return {
      title: 'Shared Fixlet',
    };
  }
}
