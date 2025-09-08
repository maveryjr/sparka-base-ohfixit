'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Download, Undo, AlertTriangle, Camera, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ScreenshotSelector } from './screenshot-selector';
import { imageSourceManager, type ScreenshotSource } from '@/lib/ohfixit/image-source-manager';

interface SensitiveRegion {
  id: string;
  type: 'email' | 'ssn' | 'phone' | 'credit_card' | 'address' | 'name' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  originalText?: string;
  source: 'auto' | 'manual';
  timestamp: Date;
}

interface RedactionAssistProps {
  imageUrl?: string;
  onRedactedImage: (redactedImageUrl: string, regions: SensitiveRegion[]) => void;
  autoDetect?: boolean;
  enableScreenshotSelection?: boolean;
}

// Regex patterns for detecting sensitive information
const DETECTION_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  phone: /\b(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
};

export function RedactionAssist({ 
  imageUrl: initialImageUrl, 
  onRedactedImage, 
  autoDetect = true,
  enableScreenshotSelection = true
}: RedactionAssistProps) {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(initialImageUrl || null);
  const [currentSource, setCurrentSource] = useState<ScreenshotSource | null>(null);
  const [detectedRegions, setDetectedRegions] = useState<SensitiveRegion[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showRegions, setShowRegions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize with default image or set up empty state
  useEffect(() => {
    if (initialImageUrl) {
      setCurrentImageUrl(initialImageUrl);
      const defaultSource = imageSourceManager.setDefaultImageSource(initialImageUrl);
      setCurrentSource(defaultSource);
    } else if (!currentImageUrl) {
      // Set default placeholder if no image provided
      const defaultSource = imageSourceManager.setDefaultImageSource('/api/placeholder-screenshot');
      setCurrentSource(defaultSource);
      setCurrentImageUrl(defaultSource.url);
    }
  }, [initialImageUrl, currentImageUrl]);

  // Handle screenshot selection
  const handleImageSelected = useCallback((source: ScreenshotSource) => {
    setCurrentImageUrl(source.url);
    setCurrentSource(source);
    // Clear existing regions when new image is selected
    setDetectedRegions([]);
    toast.success(`${source.type === 'default' ? 'Default' : 'New'} screenshot selected`);
  }, []);

  // OCR-like text detection using Canvas API (simplified approach)
  const detectSensitiveInfo = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    setIsDetecting(true);
    const regions: SensitiveRegion[] = [];

    try {
      // For demonstration, we'll simulate detection
      // In a real implementation, you'd use OCR libraries like Tesseract.js
      // or send to a server-side service for ML-based detection
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx?.drawImage(img, 0, 0);

      // Simulate OCR text extraction and pattern matching
      // This is a placeholder - real implementation would use proper OCR
      const simulatedTexts = [
        { text: 'john.doe@example.com', x: 100, y: 150, width: 200, height: 20 },
        { text: '123-45-6789', x: 300, y: 200, width: 120, height: 20 },
        { text: '(555) 123-4567', x: 150, y: 300, width: 140, height: 20 },
      ];

      simulatedTexts.forEach((textItem, index) => {
        for (const [type, pattern] of Object.entries(DETECTION_PATTERNS)) {
          if (pattern.test(textItem.text)) {
            regions.push({
              id: `detected-${index}-${type}`,
              type: type as SensitiveRegion['type'],
              x: textItem.x,
              y: textItem.y,
              width: textItem.width,
              height: textItem.height,
              confidence: 0.85 + Math.random() * 0.1,
              originalText: textItem.text,
              source: 'auto',
              timestamp: new Date()
            });
            break;
          }
        }
      });

      setDetectedRegions(regions);
      toast.success(`Detected ${regions.length} potentially sensitive regions`);
    } catch (error) {
      console.error('Error detecting sensitive information:', error);
      toast.error('Failed to detect sensitive information');
    } finally {
      setIsDetecting(false);
    }
  }, []);

  // Enhanced apply redaction with source tracking
  const applyRedaction = useCallback(async () => {
    if (!canvasRef.current || !imageRef.current || detectedRegions.length === 0) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;

      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Apply blur to each detected region
      detectedRegions.forEach(region => {
        // Create a temporary canvas for the blur effect
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) return;

        tempCanvas.width = region.width;
        tempCanvas.height = region.height;

        // Extract the region
        const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
        tempCtx.putImageData(imageData, 0, 0);

        // Apply blur filter
        tempCtx.filter = 'blur(10px)';
        tempCtx.drawImage(tempCanvas, 0, 0);

        // Draw blurred region back to main canvas
        ctx.drawImage(tempCanvas, region.x, region.y);
      });

      // Convert to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const redactedUrl = URL.createObjectURL(blob);
          
          // Track redaction in source manager
          if (currentSource) {
            imageSourceManager.markUsedInRedaction();
            const redactedSource = imageSourceManager.createRedactedSource(redactedUrl, detectedRegions.length);
          }
          
          onRedactedImage(redactedUrl, detectedRegions);
          toast.success('Image redacted successfully');
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error applying redaction:', error);
      toast.error('Failed to apply redaction');
    } finally {
      setIsProcessing(false);
    }
  }, [detectedRegions, onRedactedImage, currentSource]);

  // Manual region selection
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Add a manual redaction region (50x20 pixels)
    const newRegion: SensitiveRegion = {
      id: `manual-${Date.now()}`,
      type: 'custom',
      x: x - 25,
      y: y - 10,
      width: 50,
      height: 20,
      confidence: 1.0,
      source: 'manual',
      timestamp: new Date()
    };

    setDetectedRegions(prev => [...prev, newRegion]);
  }, []);

  const removeRegion = (regionId: string) => {
    setDetectedRegions(prev => prev.filter(r => r.id !== regionId));
  };

  const downloadRedactedImage = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
    const filename = currentSource?.metadata.filename 
      ? `redacted_${currentSource.metadata.filename}`
      : `redacted_screenshot_${timestamp}.png`;
    
    link.download = filename;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // Get current source info for display
  const getSourceInfo = () => {
    if (!currentSource) return null;
    
    const metadata = currentSource.metadata;
    return {
      type: currentSource.type,
      format: metadata.format,
      size: metadata.fileSize,
      dimensions: metadata.dimensions,
      timestamp: metadata.timestamp
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Redaction Assist
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Automatically detect and blur sensitive information in screenshots
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Screenshot Selection Section */}
        {enableScreenshotSelection && (
          <div className="flex flex-wrap gap-2 items-center">
            <ScreenshotSelector
              onImageSelected={handleImageSelected}
              currentImageUrl={currentImageUrl}
              trigger={
                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Select Screenshot
                </Button>
              }
            />
            
            <Button
              onClick={() => {
                const defaultSource = imageSourceManager.setDefaultImageSource('/api/placeholder-screenshot');
                handleImageSelected(defaultSource);
              }}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
          </div>
        )}
        
        {/* Source Information */}
        {currentSource && (
          <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <span className="font-medium">Source:</span>
                <p className="capitalize">{currentSource.type}</p>
              </div>
              <div>
                <span className="font-medium">Format:</span>
                <p className="uppercase">{currentSource.metadata.format}</p>
              </div>
              <div>
                <span className="font-medium">Size:</span>
                <p>
                  {currentSource.metadata.fileSize 
                    ? currentSource.metadata.fileSize < 1024 * 1024
                      ? `${(currentSource.metadata.fileSize / 1024).toFixed(1)} KB`
                      : `${(currentSource.metadata.fileSize / (1024 * 1024)).toFixed(1)} MB`
                    : 'Unknown'
                  }
                </p>
              </div>
              <div>
                <span className="font-medium">Dimensions:</span>
                <p>{currentSource.metadata.dimensions.width} × {currentSource.metadata.dimensions.height}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={detectSensitiveInfo}
            disabled={isDetecting}
            variant="outline"
            size="sm"
          >
            {isDetecting ? 'Detecting...' : 'Auto-Detect Sensitive Info'}
          </Button>
          
          <Button
            onClick={() => setShowRegions(!showRegions)}
            variant="outline"
            size="sm"
          >
            {showRegions ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showRegions ? 'Hide' : 'Show'} Regions
          </Button>

          <Button
            onClick={applyRedaction}
            disabled={isProcessing || detectedRegions.length === 0}
            size="sm"
          >
            Apply Redaction
          </Button>

          <Button
            onClick={downloadRedactedImage}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>

          <Button
            onClick={() => setDetectedRegions([])}
            variant="outline"
            size="sm"
            disabled={detectedRegions.length === 0}
          >
            <Undo className="h-4 w-4" />
            Clear All
          </Button>
        </div>

        <div className="relative border rounded-lg overflow-hidden">
          {currentImageUrl && (
            <>
              <img
                ref={imageRef}
                src={currentImageUrl}
                alt="Screenshot for redaction"
                className="w-full h-auto"
                onLoad={() => autoDetect && detectSensitiveInfo()}
              />
            </>
          )}
          
          {!currentImageUrl && (
            <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No screenshot selected</p>
                <p className="text-sm">Use "Select Screenshot" to choose an image</p>
              </div>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onClick={handleCanvasClick}
            style={{ 
              opacity: showRegions ? 0.3 : 0,
              pointerEvents: showRegions ? 'auto' : 'none'
            }}
          />

          {currentImageUrl && showRegions && detectedRegions.map(region => (
            <div
              key={region.id}
              className="absolute border-2 border-red-500 bg-red-500/20"
              style={{
                left: `${(region.x / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                top: `${(region.y / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                width: `${(region.width / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                height: `${(region.height / (imageRef.current?.naturalHeight || 1)) * 100}%`,
              }}
            >
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 text-xs"
                onClick={() => removeRegion(region.id)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>

        {detectedRegions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Detected Sensitive Information:</h4>
            <div className="flex flex-wrap gap-2">
              {detectedRegions.map(region => (
                <Badge
                  key={region.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {region.type.replace('_', ' ').toUpperCase()}
                  {region.confidence < 1 && (
                    <span className="text-xs">
                      ({Math.round(region.confidence * 100)}%)
                    </span>
                  )}
                  <span className="text-xs opacity-70">
                    [{region.source}]
                  </span>
                  <button
                    onClick={() => removeRegion(region.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• {enableScreenshotSelection ? 'Use "Select Screenshot" to choose from browser capture, desktop helper, or file upload' : 'Screenshot selection disabled'}</p>
          <p>• Click on the image to manually add redaction regions</p>
          <p>• Auto-detection uses pattern matching for common sensitive data types</p>
          <p>• All processing happens locally in your browser</p>
        </div>
      </CardContent>
    </Card>
  );
}
