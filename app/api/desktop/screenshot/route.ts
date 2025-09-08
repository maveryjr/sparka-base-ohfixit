import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request schema validation
const screenshotRequestSchema = z.object({
  region: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional(),
  display: z.number().optional(),
  includeCursor: z.boolean().default(false),
  format: z.enum(['png', 'jpeg']).default('png'),
  quality: z.number().min(1).max(100).default(90)
});

/**
 * Desktop Screenshot API Endpoint
 * 
 * Captures screenshots using the desktop helper application
 * Supports full screen, window, and region capture
 */
export async function POST(request: NextRequest) {
  try {
    // Check if desktop helper is available
    const helperStatus = await checkDesktopHelperStatus();
    if (!helperStatus.connected) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Desktop helper not available',
          details: 'Please ensure the desktop helper application is running'
        },
        { status: 503 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedInput = screenshotRequestSchema.parse(body);

    // Forward request to desktop helper
    const screenshotResult = await captureScreenshotViaDesktopHelper(validatedInput);

    if (!screenshotResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: screenshotResult.error || 'Screenshot capture failed',
          details: screenshotResult.details
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: screenshotResult.data,
      format: screenshotResult.format,
      size: screenshotResult.size,
      dimensions: screenshotResult.dimensions,
      timestamp: screenshotResult.timestamp,
      metadata: {
        captureMethod: 'desktop_helper',
        region: validatedInput.region,
        display: validatedInput.display,
        includeCursor: validatedInput.includeCursor
      }
    });

  } catch (error) {
    console.error('Desktop screenshot API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: 'An unexpected error occurred while capturing screenshot'
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
  capabilities?: string[];
}> {
  try {
    // This would connect to the actual desktop helper service
    // For now, we'll simulate the check
    const response = await fetch('http://localhost:8765/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      const status = await response.json();
      return {
        connected: true,
        version: status.version,
        capabilities: status.capabilities
      };
    }

    return { connected: false };
  } catch {
    return { connected: false };
  }
}

/**
 * Capture screenshot via desktop helper
 */
async function captureScreenshotViaDesktopHelper(options: z.infer<typeof screenshotRequestSchema>): Promise<{
  success: boolean;
  data?: string;
  format?: string;
  size?: number;
  dimensions?: { width: number; height: number };
  timestamp?: string;
  error?: string;
  details?: string;
}> {
  try {
    const response = await fetch('http://localhost:8765/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        region: options.region,
        display: options.display || 0,
        includeCursor: options.includeCursor,
        format: options.format,
        quality: options.quality
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout for screenshot
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

    // Validate response data
    if (!result.data) {
      return {
        success: false,
        error: 'Invalid response from desktop helper',
        details: 'No image data received'
      };
    }

    return {
      success: true,
      data: result.data, // base64 encoded image
      format: result.format || options.format,
      size: result.size || 0,
      dimensions: result.dimensions || { width: 0, height: 0 },
      timestamp: result.timestamp || new Date().toISOString()
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