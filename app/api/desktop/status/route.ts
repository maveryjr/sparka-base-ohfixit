import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Try to ping the desktop helper
    const isConnected = await checkDesktopHelperConnection();

    return NextResponse.json({
      connected: isConnected,
      status: isConnected ? 'available' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Desktop helper status check error:', error);
    return NextResponse.json({
      connected: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

async function checkDesktopHelperConnection(): Promise<boolean> {
  try {
    // Check if desktop helper is running by looking for the Tauri process
    // Since Tauri apps run locally, we'll use a different approach
    // For now, we'll simulate the check - in production this would use IPC or named pipes
    
    // Try to detect if the desktop helper is running by checking for a known file or process
    // This is a simplified check - the actual implementation would depend on your setup
    return true; // Assume connected for now - you can enhance this later
  } catch (error) {
    return false;
  }
}
