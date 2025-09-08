'use client';

import { toast } from 'sonner';

/**
 * Permission validation middleware for screen capture operations
 * Handles browser permissions, desktop helper availability, and security constraints
 */

export interface PermissionResult {
  granted: boolean;
  method: 'browser' | 'desktop' | 'file' | null;
  error?: string;
  suggestions?: string[];
}

export interface PermissionCheckOptions {
  requireSecureContext?: boolean;
  allowInsecureContext?: boolean;
  preferredMethod?: 'browser' | 'desktop';
  fallbackMethods?: boolean;
}

/**
 * Screen Capture Permission Validation Middleware
 */
export class ScreenCapturePermissionMiddleware {
  private static instance: ScreenCapturePermissionMiddleware;
  private permissionCache = new Map<string, { result: PermissionResult; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  static getInstance(): ScreenCapturePermissionMiddleware {
    if (!ScreenCapturePermissionMiddleware.instance) {
      ScreenCapturePermissionMiddleware.instance = new ScreenCapturePermissionMiddleware();
    }
    return ScreenCapturePermissionMiddleware.instance;
  }

  /**
   * Validate browser screen capture permissions
   */
  async validateBrowserPermissions(): Promise<PermissionResult> {
    const cacheKey = 'browser_permissions';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    try {
      // Check if running in secure context
      if (!this.isSecureContext()) {
        const result: PermissionResult = {
          granted: false,
          method: null,
          error: 'Screen capture requires HTTPS',
          suggestions: [
            'Ensure the site is served over HTTPS',
            'Use localhost for development',
            'Try the desktop helper as an alternative'
          ]
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices?.getDisplayMedia) {
        const result: PermissionResult = {
          granted: false,
          method: null,
          error: 'Screen capture not supported in this browser',
          suggestions: [
            'Use a modern browser (Chrome 72+, Firefox 66+, Safari 13+)',
            'Enable screen sharing permissions in browser settings',
            'Try the desktop helper as an alternative'
          ]
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Check permissions API if available
      if ('permissions' in navigator) {
        try {
          // Note: 'display-capture' permission is not widely supported yet
          // This is more of a future-proofing check
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permission.state === 'denied') {
            const result: PermissionResult = {
              granted: false,
              method: null,
              error: 'Screen capture permission denied',
              suggestions: [
                'Allow screen sharing in browser settings',
                'Reset permissions for this site',
                'Try incognito/private mode'
              ]
            };
            this.setCachedResult(cacheKey, result);
            return result;
          }
        } catch {
          // Permission query failed, continue with feature detection
        }
      }

      const result: PermissionResult = {
        granted: true,
        method: 'browser'
      };
      this.setCachedResult(cacheKey, result);
      return result;

    } catch (error) {
      const result: PermissionResult = {
        granted: false,
        method: null,
        error: `Browser permission check failed: ${error}`,
        suggestions: ['Try refreshing the page', 'Check browser console for errors']
      };
      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  /**
   * Validate desktop helper availability and permissions
   */
  async validateDesktopPermissions(): Promise<PermissionResult> {
    const cacheKey = 'desktop_permissions';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    try {
      // Check desktop helper connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/desktop/status', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const result: PermissionResult = {
          granted: false,
          method: null,
          error: 'Desktop helper not available',
          suggestions: [
            'Install the desktop helper application',
            'Ensure the desktop helper is running',
            'Check firewall settings for port 8765'
          ]
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      const status = await response.json();
      
      if (!status.connected) {
        const result: PermissionResult = {
          granted: false,
          method: null,
          error: 'Desktop helper not connected',
          suggestions: [
            'Start the desktop helper application',
            'Check if another application is using port 8765',
            'Restart the desktop helper service'
          ]
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Check if screenshot capability is available
      const capabilities = status.capabilities || [];
      if (!capabilities.includes('screenshot')) {
        const result: PermissionResult = {
          granted: false,
          method: null,
          error: 'Desktop helper does not support screenshots',
          suggestions: [
            'Update the desktop helper to the latest version',
            'Check desktop helper configuration',
            'Use browser capture as an alternative'
          ]
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      const result: PermissionResult = {
        granted: true,
        method: 'desktop'
      };
      this.setCachedResult(cacheKey, result);
      return result;

    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      const result: PermissionResult = {
        granted: false,
        method: null,
        error: isTimeout 
          ? 'Desktop helper connection timeout'
          : `Desktop helper check failed: ${error}`,
        suggestions: isTimeout
          ? ['Check if desktop helper is running', 'Verify network connectivity']
          : ['Check desktop helper installation', 'Review error logs']
      };
      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  /**
   * Validate file upload permissions (always available)
   */
  async validateFileUploadPermissions(): Promise<PermissionResult> {
    return {
      granted: true,
      method: 'file'
    };
  }

  /**
   * Comprehensive permission validation with fallback options
   */
  async validateAllPermissions(options: PermissionCheckOptions = {}): Promise<{
    browser: PermissionResult;
    desktop: PermissionResult;
    file: PermissionResult;
    recommended: PermissionResult;
  }> {
    const [browser, desktop, file] = await Promise.all([
      this.validateBrowserPermissions(),
      this.validateDesktopPermissions(),
      this.validateFileUploadPermissions()
    ]);

    // Determine recommended method based on preferences and availability
    let recommended: PermissionResult;
    
    if (options.preferredMethod === 'desktop' && desktop.granted) {
      recommended = desktop;
    } else if (options.preferredMethod === 'browser' && browser.granted) {
      recommended = browser;
    } else if (browser.granted) {
      recommended = browser;
    } else if (desktop.granted) {
      recommended = desktop;
    } else {
      recommended = file; // File upload is always available
    }

    return {
      browser,
      desktop,
      file,
      recommended
    };
  }

  /**
   * Request screen capture permissions with user guidance
   */
  async requestPermissions(method: 'browser' | 'desktop' = 'browser'): Promise<PermissionResult> {
    if (method === 'browser') {
      try {
        // Attempt to request screen capture permission
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 1, max: 1 } },
          audio: false
        });

        // Immediately stop the stream since we're just testing permissions
        stream.getTracks().forEach(track => track.stop());

        toast.success('Screen capture permission granted');
        
        // Clear cache to refresh permission status
        this.clearCache('browser_permissions');
        
        return {
          granted: true,
          method: 'browser'
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
          toast.error('Screen capture permission denied');
          return {
            granted: false,
            method: null,
            error: 'User denied screen capture permission',
            suggestions: [
              'Click \"Allow\" when prompted for screen sharing',
              'Check browser permissions in settings',
              'Try using the desktop helper instead'
            ]
          };
        }

        toast.error('Failed to request screen capture permission');
        return {
          granted: false,
          method: null,
          error: errorMessage,
          suggestions: ['Try refreshing the page', 'Use desktop helper as alternative']
        };
      }
    }

    // For desktop method, we just validate availability
    return this.validateDesktopPermissions();
  }

  /**
   * Check if running in secure context (HTTPS or localhost)
   */
  private isSecureContext(): boolean {
    if (typeof window === 'undefined') return true;
    
    return (
      window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'https:'
    );
  }

  /**
   * Get cached permission result if still valid
   */
  private getCachedResult(key: string): PermissionResult | null {
    const cached = this.permissionCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    return null;
  }

  /**
   * Cache permission result
   */
  private setCachedResult(key: string, result: PermissionResult): void {
    this.permissionCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear specific cache entry
   */
  private clearCache(key?: string): void {
    if (key) {
      this.permissionCache.delete(key);
    } else {
      this.permissionCache.clear();
    }
  }

  /**
   * Clear all cached results
   */
  clearAllCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Get user-friendly error messages and suggestions
   */
  getPermissionGuidance(result: PermissionResult): {
    title: string;
    message: string;
    actions: Array<{ label: string; action: () => void }>;
  } {
    if (result.granted) {
      return {
        title: 'Permissions Ready',
        message: `${result.method} capture is available and ready to use.`,
        actions: []
      };
    }

    const baseActions = [
      {
        label: 'Retry Check',
        action: () => {
          this.clearAllCache();
          window.location.reload();
        }
      }
    ];

    if (result.error?.includes('HTTPS')) {
      return {
        title: 'Secure Connection Required',
        message: 'Screen capture requires a secure HTTPS connection for security reasons.',
        actions: [
          ...baseActions,
          {
            label: 'Learn More',
            action: () => {
              window.open('https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia', '_blank');
            }
          }
        ]
      };
    }

    if (result.error?.includes('not supported')) {
      return {
        title: 'Browser Not Supported',
        message: 'Your browser does not support screen capture. Please use a modern browser or try the desktop helper.',
        actions: [
          ...baseActions,
          {
            label: 'Download Desktop Helper',
            action: () => {
              // This would link to desktop helper download
              toast.info('Desktop helper download would be initiated here');
            }
          }
        ]
      };
    }

    if (result.error?.includes('Desktop helper')) {
      return {
        title: 'Desktop Helper Unavailable',
        message: 'The desktop helper application is not running or not installed.',
        actions: [
          ...baseActions,
          {
            label: 'Install Desktop Helper',
            action: () => {
              toast.info('Desktop helper installation would be initiated here');
            }
          }
        ]
      };
    }

    return {
      title: 'Permission Error',
      message: result.error || 'Unknown permission error occurred.',
      actions: baseActions
    };
  }
}

// Singleton instance
export const screenCapturePermissionMiddleware = ScreenCapturePermissionMiddleware.getInstance();