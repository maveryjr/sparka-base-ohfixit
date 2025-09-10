'use client';

import type { ScreenshotResult } from './screenshot-capture-service';

// Types for screenshot source management
export interface ScreenshotSource {
  id: string;
  type: 'browser' | 'desktop' | 'upload' | 'default';
  url: string;
  metadata: ScreenshotMetadata;
}

export interface ScreenshotMetadata {
  captureMethod: string;
  timestamp: Date;
  dimensions: { width: number; height: number };
  fileSize?: number;
  filename?: string;
  format: string;
  quality?: number;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScreenshotRecord {
  id: string;
  source: ScreenshotSource;
  createdAt: Date;
  usedInRedaction: boolean;
  redactionCount: number;
}

/**
 * Manages screenshot sources, metadata, and cleanup operations
 */
export class ImageSourceManager {
  private currentSource: ScreenshotSource | null = null;
  private sourceHistory: ScreenshotRecord[] = [];
  private readonly MAX_HISTORY_SIZE = 5;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
    
    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  /**
   * Set the current image source from a screenshot result
   */
  async setImageSource(result: ScreenshotResult): Promise<ScreenshotSource> {
    if (!result.success || !result.data) {
      throw new Error('Invalid screenshot result');
    }

    // Clean up previous source if it's a blob URL
    if (this.currentSource?.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentSource.url);
    }

    const mappedType: ScreenshotSource['type'] =
      result.source === 'file' ? 'upload' : result.source;
    const source: ScreenshotSource = {
      id: this.generateId(),
      type: mappedType,
      url: result.data,
      metadata: {
        captureMethod: result.source,
        timestamp: new Date(result.timestamp),
        dimensions: result.dimensions,
        fileSize: result.size,
        format: result.format,
        quality: result.source === 'browser' ? 90 : undefined
      }
    };

    this.currentSource = source;
    this.addToHistory(source);

    return source;
  }

  /**
   * Set image source from a file upload
   */
  async setImageSourceFromFile(file: File): Promise<ScreenshotSource> {
    const url = URL.createObjectURL(file);
    const dimensions = await this.getImageDimensions(file);

    // Clean up previous source
    if (this.currentSource?.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentSource.url);
    }

    const source: ScreenshotSource = {
      id: this.generateId(),
      type: 'upload',
      url,
      metadata: {
        captureMethod: 'file_upload',
        timestamp: new Date(),
        dimensions,
        fileSize: file.size,
        filename: file.name,
        format: file.type.includes('jpeg') ? 'jpeg' : 'png'
      }
    };

    this.currentSource = source;
    this.addToHistory(source);

    return source;
  }

  /**
   * Set a default/placeholder image source
   */
  setDefaultImageSource(imageUrl: string): ScreenshotSource {
    // Clean up previous source
    if (this.currentSource?.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentSource.url);
    }

    const source: ScreenshotSource = {
      id: this.generateId(),
      type: 'default',
      url: imageUrl,
      metadata: {
        captureMethod: 'default_placeholder',
        timestamp: new Date(),
        dimensions: { width: 800, height: 600 }, // Default dimensions
        format: 'png'
      }
    };

    this.currentSource = source;
    return source;
  }

  /**
   * Get the current image URL
   */
  getCurrentImageUrl(): string | null {
    return this.currentSource?.url || null;
  }

  /**
   * Get the current image source
   */
  getCurrentSource(): ScreenshotSource | null {
    return this.currentSource;
  }

  /**
   * Get image metadata for the current source
   */
  getImageMetadata(): ScreenshotMetadata | null {
    return this.currentSource?.metadata || null;
  }

  /**
   * Get source history
   */
  getSourceHistory(): ScreenshotRecord[] {
    return [...this.sourceHistory];
  }

  /**
   * Get recent screenshots for quick access
   */
  getRecentScreenshots(limit: number = 3): ScreenshotRecord[] {
    return this.sourceHistory
      .filter(record => record.source.type !== 'default')
      .slice(0, limit);
  }

  /**
   * Switch to a previous source from history
   */
  switchToHistorySource(sourceId: string): boolean {
    const record = this.sourceHistory.find(r => r.source.id === sourceId);
    if (!record) return false;

    // Clean up current source
    if (this.currentSource?.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentSource.url);
    }

    this.currentSource = record.source;
    return true;
  }

  /**
   * Mark current source as used in redaction
   */
  markUsedInRedaction(): void {
    if (!this.currentSource) return;

    const record = this.sourceHistory.find(r => r.source.id === this.currentSource?.id);
    if (record) {
      record.usedInRedaction = true;
      record.redactionCount++;
    }
  }

  /**
   * Get file size information formatted for display
   */
  getFormattedFileSize(): string | null {
    const size = this.currentSource?.metadata.fileSize;
    if (!size) return null;

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Check if current source is valid and accessible
   */
  async validateCurrentSource(): Promise<boolean> {
    if (!this.currentSource) return false;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = this.currentSource!.url;
    });
  }

  /**
   * Update source metadata
   */
  updateSourceMetadata(updates: Partial<ScreenshotMetadata>): void {
    if (!this.currentSource) return;

    this.currentSource.metadata = {
      ...this.currentSource.metadata,
      ...updates
    };

    // Update in history as well
    const record = this.sourceHistory.find(r => r.source.id === this.currentSource?.id);
    if (record) {
      record.source.metadata = this.currentSource.metadata;
    }
  }

  /**
   * Create a copy of the current source with redaction applied
   */
  createRedactedSource(redactedImageUrl: string, regionCount: number): ScreenshotSource | null {
    if (!this.currentSource) return null;

    const redactedSource: ScreenshotSource = {
      id: this.generateId(),
      type: this.currentSource.type,
      url: redactedImageUrl,
      metadata: {
        ...this.currentSource.metadata,
        captureMethod: `${this.currentSource.metadata.captureMethod}_redacted`,
        timestamp: new Date()
      }
    };

    this.addToHistory(redactedSource, true, regionCount);
    return redactedSource;
  }

  /**
   * Cleanup blob URLs to prevent memory leaks
   */
  cleanup(): void {
    // Cleanup current source
    if (this.currentSource?.url.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentSource.url);
    }

    // Cleanup history
    this.sourceHistory.forEach(record => {
      if (record.source.url.startsWith('blob:')) {
        URL.revokeObjectURL(record.source.url);
      }
    });

    this.currentSource = null;
    this.sourceHistory = [];

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Export current source information for sharing/saving
   */
  exportSourceInfo(): {
    metadata: ScreenshotMetadata;
    stats: {
      historyCount: number;
      redactionCount: number;
      totalSizeBytes: number;
    };
  } | null {
    if (!this.currentSource) return null;

    const totalSize = this.sourceHistory.reduce(
      (sum, record) => sum + (record.source.metadata.fileSize || 0),
      0
    );

    const totalRedactions = this.sourceHistory.reduce(
      (sum, record) => sum + record.redactionCount,
      0
    );

    return {
      metadata: this.currentSource.metadata,
      stats: {
        historyCount: this.sourceHistory.length,
        redactionCount: totalRedactions,
        totalSizeBytes: totalSize
      }
    };
  }

  // Private methods

  private addToHistory(source: ScreenshotSource, usedInRedaction = false, redactionCount = 0): void {
    const record: ScreenshotRecord = {
      id: source.id,
      source,
      createdAt: new Date(),
      usedInRedaction,
      redactionCount
    };

    this.sourceHistory.unshift(record);

    // Cleanup old entries beyond max size
    while (this.sourceHistory.length > this.MAX_HISTORY_SIZE) {
      const removed = this.sourceHistory.pop();
      if (removed?.source.url.startsWith('blob:')) {
        URL.revokeObjectURL(removed.source.url);
      }
    }
  }

  private generateId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  private startCleanupInterval(): void {
    if (typeof window === 'undefined') return;

    this.cleanupInterval = setInterval(() => {
      // Remove old entries that are older than 30 minutes
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      const oldEntries = this.sourceHistory.filter(record => record.createdAt < cutoff);
      
      oldEntries.forEach(record => {
        if (record.source.url.startsWith('blob:')) {
          URL.revokeObjectURL(record.source.url);
        }
      });

      this.sourceHistory = this.sourceHistory.filter(record => record.createdAt >= cutoff);
    }, this.CLEANUP_INTERVAL);
  }
}

// Singleton instance
export const imageSourceManager = new ImageSourceManager();
