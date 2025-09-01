import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const previewActionSchema = z.object({
  sessionId: z.string().optional(),
  actionId: z.string(),
  parameters: z.record(z.any()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { actionId, parameters } = previewActionSchema.parse(body);

    const preview = await generateActionPreview(actionId, parameters);
    return NextResponse.json(preview);
  } catch (error) {
    console.error('Action preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate action preview' },
      { status: 500 }
    );
  }
}

async function generateActionPreview(actionId: string, parameters: any): Promise<{
  description: string;
  commands: string[];
  risks: string[];
  reversible: boolean;
  estimatedTime: string;
  requirements: string[];
}> {
  const actionDefinitions: Record<string, any> = {
    'flush-dns-windows': {
      description: 'Flush the DNS resolver cache to resolve network connectivity issues',
      commands: ['ipconfig /flushdns'],
      risks: ['Temporary loss of cached DNS entries'],
      reversible: false,
      estimatedTime: '5 seconds',
      requirements: ['Administrator privileges']
    },
    'reset-network-adapter-windows': {
      description: 'Reset the Windows network stack to resolve connectivity issues',
      commands: ['netsh winsock reset', 'netsh int ip reset'],
      risks: ['Network connection will be temporarily interrupted', 'System restart required'],
      reversible: true,
      estimatedTime: '10 seconds + restart',
      requirements: ['Administrator privileges', 'System restart']
    },
    'clean-temp-windows': {
      description: 'Remove temporary files to free up disk space',
      commands: [
        'del /q /f /s %TEMP%\\*',
        'del /q /f /s %TMP%\\*',
        'del /q /f /s C:\\Windows\\Temp\\*'
      ],
      risks: ['Some applications may need to recreate temporary files'],
      reversible: false,
      estimatedTime: '2-5 minutes',
      requirements: ['Administrator privileges']
    },
    'clean-browser-cache': {
      description: 'Clear browser cache files to free up space and resolve loading issues',
      commands: [
        'Clear Chrome cache and cookies',
        'Clear Firefox cache and cookies',
        'Clear Edge cache and cookies'
      ],
      risks: ['You will be logged out of websites', 'Cached images and files will be re-downloaded'],
      reversible: false,
      estimatedTime: '1-2 minutes',
      requirements: ['Close all browser windows']
    },
    'health-check-disk-space': {
      description: 'Analyze disk space usage across all drives',
      commands: ['dir C:\\ /s', 'fsutil volume diskfree C:'],
      risks: ['No risks - read-only operation'],
      reversible: true,
      estimatedTime: '30 seconds',
      requirements: ['Basic user privileges']
    },
    'health-check-system-updates': {
      description: 'Check for available Windows updates',
      commands: ['Get-WindowsUpdate -List'],
      risks: ['No risks - read-only operation'],
      reversible: true,
      estimatedTime: '1-2 minutes',
      requirements: ['Internet connection']
    },
    'browser-extension-analysis': {
      description: 'Analyze installed browser extensions for security and performance issues',
      commands: [
        'Scan Chrome extensions',
        'Scan Firefox add-ons',
        'Scan Edge extensions'
      ],
      risks: ['No risks - read-only analysis'],
      reversible: true,
      estimatedTime: '30 seconds',
      requirements: ['Browser access permissions']
    },
    'startup-program-optimization': {
      description: 'Analyze and optimize programs that start with Windows',
      commands: ['msconfig', 'Get-CimInstance Win32_StartupCommand'],
      risks: ['Disabling critical startup programs may affect system functionality'],
      reversible: true,
      estimatedTime: '3-5 minutes',
      requirements: ['Administrator privileges']
    },
    'firewall-status-check': {
      description: 'Check Windows Firewall status and configuration',
      commands: ['netsh advfirewall show allprofiles'],
      risks: ['No risks - read-only operation'],
      reversible: true,
      estimatedTime: '10 seconds',
      requirements: ['Administrator privileges']
    },
    'memory-cleanup': {
      description: 'Clear system memory and optimize RAM usage',
      commands: ['Clear-RecycleBin', 'Get-Process | Stop-Process -Name "unused"'],
      risks: ['Some applications may close unexpectedly'],
      reversible: false,
      estimatedTime: '1-2 minutes',
      requirements: ['Administrator privileges']
    }
  };

  const definition = actionDefinitions[actionId];
  if (!definition) {
    throw new Error(`Unknown action: ${actionId}`);
  }

  // Apply parameter-specific modifications
  if (parameters) {
    if (parameters.paths && actionId === 'clean-temp-windows') {
      definition.commands = parameters.paths.map((path: string) => `del /q /f /s "${path}\\*"`);
    }
    if (parameters.browsers && actionId === 'clean-browser-cache') {
      definition.commands = parameters.browsers.map((browser: string) => `Clear ${browser} cache and cookies`);
    }
  }

  return definition;
}
