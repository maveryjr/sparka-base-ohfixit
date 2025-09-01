import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createSessionSchema = z.object({
  chatId: z.string(),
  requiredCapabilities: z.array(z.string()),
  clientInfo: z.object({
    platform: z.string(),
    userAgent: z.string()
  })
});

interface DesktopSession {
  id: string;
  userId: string;
  chatId: string;
  capabilities: string[];
  permissions: string[];
  startTime: Date;
  expiresAt: Date;
  isActive: boolean;
  clientInfo: {
    platform: string;
    userAgent: string;
  };
}

// In-memory session store (replace with database in production)
const sessions = new Map<string, DesktopSession>();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, requiredCapabilities, clientInfo } = createSessionSchema.parse(body);

    // Create new desktop session
    const sessionId = nanoid();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Map required capabilities to permissions
    const permissions = mapCapabilitiesToPermissions(requiredCapabilities);
    
    const desktopSession: DesktopSession = {
      id: sessionId,
      userId: session.user.id,
      chatId,
      capabilities: requiredCapabilities,
      permissions,
      startTime: now,
      expiresAt,
      isActive: true,
      clientInfo
    };

    sessions.set(sessionId, desktopSession);

    return NextResponse.json(desktopSession);
  } catch (error) {
    console.error('Desktop session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create desktop session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const desktopSession = sessions.get(sessionId);
    if (!desktopSession || desktopSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if session is expired
    if (new Date() > desktopSession.expiresAt) {
      sessions.delete(sessionId);
      return NextResponse.json({ error: 'Session expired' }, { status: 410 });
    }

    return NextResponse.json(desktopSession);
  } catch (error) {
    console.error('Desktop session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve desktop session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const desktopSession = sessions.get(sessionId);
    if (!desktopSession || desktopSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    sessions.delete(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Desktop session deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete desktop session' },
      { status: 500 }
    );
  }
}

function mapCapabilitiesToPermissions(capabilities: string[]): string[] {
  const permissionMap: Record<string, string[]> = {
    'wifi-reset': ['network.manage', 'system.restart_services'],
    'printer-management': ['hardware.printers', 'system.install_drivers'],
    'system-cleanup': ['filesystem.temp', 'system.cleanup'],
    'firewall-config': ['security.firewall', 'system.admin'],
    'startup-management': ['system.startup', 'registry.modify'],
    'health-check': ['system.diagnostics', 'network.test'],
    'browser-automation': ['browser.control', 'ui.automation']
  };

  const permissions = new Set<string>();
  capabilities.forEach(capability => {
    const capabilityPermissions = permissionMap[capability] || [];
    capabilityPermissions.forEach(permission => permissions.add(permission));
  });

  return Array.from(permissions);
}
