'use client';

// Types and Interfaces
export interface CaptureOptions {
  source: 'screen' | 'window' | 'tab';
  region?: BoundingBox;
  includeCursor: boolean;
  format: 'png' | 'jpeg';
  quality: number; // 1-100 for JPEG
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotResult {
  success: boolean;
  data?: string; // base64 or blob URL
  blob?: Blob;
  format: string;
  size: number;
  dimensions: { width: number; height: number };
  timestamp: string;
  source: 'browser' | 'desktop' | 'file';
  error?: string;
}

export interface Display {
  id: string;
  name: string;
  width: number;
  height: number;
  isPrimary: boolean;
}

// Abstract Strategy Interface
export abstract class CaptureStrategy {
  abstract capture(options: CaptureOptions): Promise<ScreenshotResult>;
  abstract validatePermissions(): Promise<boolean>;
}

// Browser Capture Strategy
export class BrowserCaptureStrategy extends CaptureStrategy {
  async validatePermissions(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async capture(options: CaptureOptions): Promise<ScreenshotResult> {
    try {
      if (!(await this.validatePermissions())) {
        throw new Error('Screen capture not supported');
      }

      const stream = await this.requestMediaStream();
      const blob = await this.createBlobFromStream(stream, options);
      
      // Clean up stream
      stream.getTracks().forEach(track => track.stop());

      const dimensions = await this.getBlobDimensions(blob);
      
      return {
        success: true,
        data: URL.createObjectURL(blob),
        blob,
        format: options.format,
        size: blob.size,
        dimensions,
        timestamp: new Date().toISOString(),
        source: 'browser'
      };
    } catch (error) {
      return {
        success: false,
        format: options.format,
        size: 0,
        dimensions: { width: 0, height: 0 },
        timestamp: new Date().toISOString(),
        source: 'browser',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async requestMediaStream(): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      video: {
        frameRate: { ideal: 1, max: 1 },
      },
      audio: false,
    };

    // Note: getDisplayMedia accepts DisplayMediaStreamConstraints in spec
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (navigator.mediaDevices.getDisplayMedia as any)(constraints);
  }

  private async createBlobFromStream(
    stream: MediaStream, 
    options: CaptureOptions
  ): Promise<Blob> {
    const video = document.createElement('video');
    video.srcObject = stream;
    
    // Some browsers require playsInline to avoid full screen
    (video as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
    video.muted = true;
    
    await video.play();
    
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    
    const width = Math.max(1, settings.width || video.videoWidth || 1280);
    const height = Math.max(1, settings.height || video.videoHeight || 720);
    
    // Scale down very large captures to keep file size reasonable
    const MAX_DIMENSION = 2000;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));
    
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Apply region cropping if specified
    if (options.region) {
      const { x, y, width: regionWidth, height: regionHeight } = options.region;
      ctx.drawImage(
        video,
        x, y, regionWidth, regionHeight,
        0, 0, outW, outH
      );
    } else {
      ctx.drawImage(video, 0, 0, outW, outH);
    }
    
    return new Promise((resolve, reject) => {
      const quality = options.format === 'jpeg' ? options.quality / 100 : undefined;
      const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        mimeType,
        quality
      );
    });
  }

  private async getBlobDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(blob);
    });
  }
}

// Desktop Capture Strategy
export class DesktopCaptureStrategy extends CaptureStrategy {
  async validatePermissions(): Promise<boolean> {
    try {
      const response = await fetch('/api/desktop/status');
      const status = await response.json();
      return status.connected;
    } catch {
      return false;
    }
  }

  async capture(options: CaptureOptions): Promise<ScreenshotResult> {
    try {
      if (!(await this.validatePermissions())) {
        throw new Error('Desktop helper not available');
      }

      const response = await fetch('/api/desktop/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: options.region,
          includeCursor: options.includeCursor,
          format: options.format,
          quality: options.quality
        })
      });

      if (!response.ok) {
        throw new Error(`Desktop capture failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Desktop capture failed');
      }

      // Convert base64 to blob
      const base64Data = result.data.split(',')[1] || result.data;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const blob = new Blob([byteArray], { type: mimeType });

      return {
        success: true,
        data: URL.createObjectURL(blob),
        blob,
        format: result.format,
        size: result.size,
        dimensions: result.dimensions,
        timestamp: result.timestamp,
        source: 'desktop'
      };
    } catch (error) {
      return {
        success: false,
        format: options.format,
        size: 0,
        dimensions: { width: 0, height: 0 },
        timestamp: new Date().toISOString(),
        source: 'desktop',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// File Upload Strategy
export class FileUploadStrategy extends CaptureStrategy {
  async validatePermissions(): Promise<boolean> {
    return true; // File upload is always available
  }

  async capture(options: CaptureOptions): Promise<ScreenshotResult> {
    try {
      const file = (options as unknown as { file: File }).file;
      if (!file || !this.validateImageFile(file)) {
        throw new Error('Invalid image file');
      }

      const dimensions = await this.getImageDimensions(file);
      const url = URL.createObjectURL(file);

      return {
        success: true,
        data: url,
        blob: file,
        format: file.type.includes('jpeg') ? 'jpeg' : 'png',
        size: file.size,
        dimensions,
        timestamp: new Date().toISOString(),
        source: 'file'
      };
    } catch (error) {
      return {
        success: false,
        format: 'unknown',
        size: 0,
        dimensions: { width: 0, height: 0 },
        timestamp: new Date().toISOString(),
        source: 'file',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validateImageFile(file: File): boolean {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}

// Main Screenshot Capture Service
export class ScreenshotCaptureService {
  private browserStrategy = new BrowserCaptureStrategy();
  private desktopStrategy = new DesktopCaptureStrategy();
  private fileStrategy = new FileUploadStrategy();

  async captureScreen(options: CaptureOptions): Promise<ScreenshotResult> {
    // Try browser capture first
    if (await this.browserStrategy.validatePermissions()) {
      const result = await this.browserStrategy.capture(options);
      if (result.success) return result;
    }

    // Fallback to desktop capture
    if (await this.desktopStrategy.validatePermissions()) {
      return await this.desktopStrategy.capture(options);
    }

    throw new Error('No capture method available');
  }

  async captureWindow(windowId?: string, options: Partial<CaptureOptions> = {}): Promise<ScreenshotResult> {
    const captureOptions: CaptureOptions = {
      source: 'window',
      includeCursor: false,
      format: 'png',
      quality: 90,
      ...options
    };

    return this.captureScreen(captureOptions);
  }

  async captureTab(tabId?: string, options: Partial<CaptureOptions> = {}): Promise<ScreenshotResult> {
    const captureOptions: CaptureOptions = {
      source: 'tab',
      includeCursor: false,
      format: 'png',
      quality: 90,
      ...options
    };

    return this.captureScreen(captureOptions);
  }

  async handleFileUpload(file: File): Promise<ScreenshotResult> {
    return await this.fileStrategy.capture({
      source: 'tab',
      includeCursor: false,
      format: 'png',
      quality: 90,
      // @ts-expect-error augmenting with file for upload strategy
      file,
    });
  }

  async validatePermissions(): Promise<{
    browser: boolean;
    desktop: boolean;
    file: boolean;
  }> {
    const [browser, desktop, file] = await Promise.all([
      this.browserStrategy.validatePermissions(),
      this.desktopStrategy.validatePermissions(),
      this.fileStrategy.validatePermissions()
    ]);

    return { browser, desktop, file };
  }

  async getAvailableDisplays(): Promise<Display[]> {
    try {
      const response = await fetch('/api/desktop/displays');
      if (!response.ok) return [];
      
      const result = await response.json();
      return result.displays || [];
    } catch {
      return [];
    }
  }
}

// Singleton instance
export const screenshotCaptureService = new ScreenshotCaptureService();
