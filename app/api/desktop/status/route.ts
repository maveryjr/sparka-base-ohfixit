import { NextRequest, NextResponse } from 'next/server';

/**
 * Desktop Helper Status API Endpoint
 *
 * Checks the connection status and capabilities of the desktop helper application
 */
export async function GET(request: NextRequest) {
  try {
    const status = await checkDesktopHelperConnection();

    return NextResponse.json({
      connected: status.connected,
      version: status.version,
      capabilities: status.capabilities,
      lastCheck: new Date().toISOString(),
      endpoint: 'http://localhost:8765'
    });

  } catch (error) {
    console.error('Desktop status check error:', error);

    return NextResponse.json(
      {
        connected: false,
        error: 'Failed to check desktop helper status',
        details: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Check desktop helper connection and capabilities
 */
async function checkDesktopHelperConnection(): Promise<{
  connected: boolean;
  version?: string;
  capabilities?: string[];
  error?: string;
}> {
  try {
    // Attempt to connect to desktop helper service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('http://localhost:8765/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'sparka-ohfixit/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        connected: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();

    return {
      connected: true,
      version: data.version || 'unknown',
      capabilities: data.capabilities || [
        'screenshot',
        'system_info',
        'process_list',
        'file_operations'
      ]
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        connected: false,
        error: 'Connection timeout - desktop helper not responding'
      };
    }

    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
}