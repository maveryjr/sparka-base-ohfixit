import { NextRequest, NextResponse } from 'next/server';

/**
 * Desktop Displays API Endpoint
 * 
 * Retrieves information about available displays/monitors
 * from the desktop helper application
 */
export async function GET(request: NextRequest) {
  try {
    // Check if desktop helper is available
    const helperStatus = await checkDesktopHelperStatus();
    if (!helperStatus.connected) {
      return NextResponse.json(
        {
          success: false,
          displays: [],
          error: 'Desktop helper not available',
          details: 'Please ensure the desktop helper application is running'
        },
        { status: 503 }
      );
    }

    // Get display information from desktop helper
    const displaysResult = await getDisplaysFromDesktopHelper();

    if (!displaysResult.success) {
      return NextResponse.json(
        {
          success: false,
          displays: [],
          error: displaysResult.error || 'Failed to get display information',
          details: displaysResult.details
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      displays: displaysResult.displays,
      primaryDisplay: displaysResult.primaryDisplay,
      totalDisplays: displaysResult.displays?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Desktop displays API error:', error);

    return NextResponse.json(
      {
        success: false,
        displays: [],
        error: 'Internal server error',
        details: 'An unexpected error occurred while retrieving display information'
      },
      { status: 500 }
    );
  }
}

/**
 * Check desktop helper connection status
 */
async function checkDesktopHelperStatus(): Promise<{
  connected: boolean;
  version?: string;
}> {
  try {
    const response = await fetch('http://localhost:8765/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const status = await response.json();
      return {
        connected: true,
        version: status.version
      };
    }

    return { connected: false };
  } catch {
    return { connected: false };
  }
}

/**
 * Get display information from desktop helper
 */
async function getDisplaysFromDesktopHelper(): Promise<{
  success: boolean;
  displays?: Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    isPrimary: boolean;
    scaleFactor?: number;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  primaryDisplay?: string;
  error?: string;
  details?: string;
}> {
  try {
    const response = await fetch('http://localhost:8765/displays', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Desktop helper error: ${response.status}`,
        details: errorData.message || response.statusText
      };
    }

    const result = await response.json();
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Unknown desktop helper error',
        details: result.details
      };
    }

    // Validate and format display data
    const displays = result.displays?.map((display: any, index: number) => ({
      id: display.id || `display_${index}`,
      name: display.name || `Display ${index + 1}`,
      width: display.width || 1920,
      height: display.height || 1080,
      isPrimary: display.isPrimary || index === 0,
      scaleFactor: display.scaleFactor || 1.0,
      bounds: display.bounds || {
        x: display.x || 0,
        y: display.y || 0,
        width: display.width || 1920,
        height: display.height || 1080
      }
    })) || [];

    const primaryDisplay = displays.find(d => d.isPrimary)?.id || displays[0]?.id;

    return {
      success: true,
      displays,
      primaryDisplay
    };

  } catch (error) {
    console.error('Desktop helper communication error:', error);
    
    return {
      success: false,
      error: 'Failed to communicate with desktop helper',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}