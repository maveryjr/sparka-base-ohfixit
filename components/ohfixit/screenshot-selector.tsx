'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Monitor, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  History,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { screenshotCaptureService, type CaptureOptions, type ScreenshotResult } from '@/lib/ohfixit/screenshot-capture-service';
import { imageSourceManager, type ScreenshotSource } from '@/lib/ohfixit/image-source-manager';

interface ScreenshotSelectorProps {
  onImageSelected: (source: ScreenshotSource) => void;
  currentImageUrl?: string | null;
  className?: string;
  trigger?: React.ReactNode;
}

interface CaptureMethod {
  id: 'browser' | 'desktop' | 'file';
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  loading: boolean;
}

export function ScreenshotSelector({
  onImageSelected,
  currentImageUrl,
  className,
  trigger
}: ScreenshotSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'browser' | 'desktop' | 'file'>('browser');
  const [isCapturing, setIsCapturing] = useState(false);
  const [permissions, setPermissions] = useState({
    browser: false,
    desktop: false,
    file: true
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [captureResult, setCaptureResult] = useState<ScreenshotResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check permissions when modal opens
  const handleModalOpen = useCallback(async (open: boolean) => {
    setIsModalOpen(open);
    
    if (open) {
      try {
        const perms = await screenshotCaptureService.validatePermissions();
        setPermissions(perms);
        
        // Select the first available method
        if (perms.browser) setSelectedMethod('browser');
        else if (perms.desktop) setSelectedMethod('desktop');
        else setSelectedMethod('file');
        
        // Load recent screenshots for history
        const recent = imageSourceManager.getRecentScreenshots(3);
        console.log('Recent screenshots:', recent);
      } catch (error) {
        console.error('Failed to check permissions:', error);
        toast.error('Failed to check capture permissions');
      }
    } else {
      // Cleanup preview when modal closes
      if (previewImage?.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
      setPreviewImage(null);
      setCaptureResult(null);
    }
  }, [previewImage]);

  // Browser screen capture
  const handleBrowserCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      const options: CaptureOptions = {
        source: 'screen',
        includeCursor: false,
        format: 'png',
        quality: 90
      };
      
      const result = await screenshotCaptureService.captureScreen(options);
      
      if (result.success && result.data) {
        setPreviewImage(result.data);
        setCaptureResult(result);
        toast.success('Screenshot captured successfully');
      } else {
        throw new Error(result.error || 'Capture failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Don't show error for user cancellation
      if (!errorMessage.includes('cancel') && !errorMessage.includes('abort')) {
        toast.error(`Screenshot capture failed: ${errorMessage}`);
      }
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Desktop capture
  const handleDesktopCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      const options: CaptureOptions = {
        source: 'screen',
        includeCursor: false,
        format: 'png',
        quality: 90
      };
      
      const result = await screenshotCaptureService.captureScreen(options);
      
      if (result.success && result.data) {
        setPreviewImage(result.data);
        setCaptureResult(result);
        toast.success('Desktop screenshot captured successfully');
      } else {
        throw new Error(result.error || 'Desktop capture failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Desktop capture failed: ${errorMessage}`);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // File upload handler
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    try {
      const result = await screenshotCaptureService.handleFileUpload(file);
      
      if (result.success && result.data) {
        setPreviewImage(result.data);
        setCaptureResult(result);
        toast.success('Image uploaded successfully');
      } else {
        throw new Error(result.error || 'File upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`File upload failed: ${errorMessage}`);
    } finally {
      setIsCapturing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // Confirm selection and close modal
  const handleConfirmSelection = useCallback(async () => {
    if (!captureResult) return;

    try {
      const source = await imageSourceManager.setImageSource(captureResult);
      onImageSelected(source);
      setIsModalOpen(false);
      toast.success('Screenshot selected for redaction');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to set image source: ${errorMessage}`);
    }
  }, [captureResult, onImageSelected]);

  // Use default placeholder
  const handleUseDefault = useCallback(() => {
    const defaultSource = imageSourceManager.setDefaultImageSource('/api/placeholder-screenshot');
    onImageSelected(defaultSource);
    setIsModalOpen(false);
    toast.success('Using default screenshot');
  }, [onImageSelected]);

  // Select from history
  const handleSelectFromHistory = useCallback(async (sourceId: string) => {
    try {
      const success = imageSourceManager.switchToHistorySource(sourceId);
      if (success) {
        const source = imageSourceManager.getCurrentSource();
        if (source) {
          onImageSelected(source);
          setIsModalOpen(false);
          toast.success('Previous screenshot selected');
        }
      } else {
        toast.error('Failed to select previous screenshot');
      }
    } catch (error) {
      toast.error('Failed to select from history');
    }
  }, [onImageSelected]);

  const captureMethods: CaptureMethod[] = [
    {
      id: 'browser',
      name: 'Browser Capture',
      description: 'Capture your screen using browser APIs',
      icon: Monitor,
      available: permissions.browser,
      loading: isCapturing && selectedMethod === 'browser'
    },
    {
      id: 'desktop',
      name: 'Desktop Helper',
      description: 'Use desktop helper for enhanced capture',
      icon: Camera,
      available: permissions.desktop,
      loading: isCapturing && selectedMethod === 'desktop'
    },
    {
      id: 'file',
      name: 'Upload File',
      description: 'Upload an existing image file',
      icon: Upload,
      available: permissions.file,
      loading: isCapturing && selectedMethod === 'file'
    }
  ];

  const recentScreenshots = imageSourceManager.getRecentScreenshots(3);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <Dialog open={isModalOpen} onOpenChange={handleModalOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className={className}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Select Screenshot
            </Button>
          )}
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Screenshot for Redaction</DialogTitle>
          </DialogHeader>
          
          <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="browser" disabled={!permissions.browser}>
                Browser
              </TabsTrigger>
              <TabsTrigger value="desktop" disabled={!permissions.desktop}>
                Desktop
              </TabsTrigger>
              <TabsTrigger value="file">
                Upload
              </TabsTrigger>
              <TabsTrigger value="history">
                History
              </TabsTrigger>
            </TabsList>
            
            {/* Browser Capture Tab */}
            <TabsContent value="browser" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Browser Screen Capture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Capture your screen using the browser's built-in screen sharing API. 
                    You'll be prompted to select which screen or window to capture.
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {permissions.browser ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">Browser capture available</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">Browser capture not supported</span>
                      </>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleBrowserCapture}
                    disabled={!permissions.browser || isCapturing}
                    className="w-full"
                  >
                    {isCapturing && selectedMethod === 'browser' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Screen
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Desktop Capture Tab */}
            <TabsContent value="desktop" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Desktop Helper Capture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use the desktop helper application for enhanced screenshot capabilities 
                    with better performance and additional features.
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {permissions.desktop ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">Desktop helper connected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-orange-600">Desktop helper not available</span>
                      </>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleDesktopCapture}
                    disabled={!permissions.desktop || isCapturing}
                    className="w-full"
                  >
                    {isCapturing && selectedMethod === 'desktop' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <Monitor className="h-4 w-4 mr-2" />
                        Capture with Desktop Helper
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* File Upload Tab */}
            <TabsContent value="file" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Image File
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload an existing image file from your device. Supports PNG, JPEG, and WebP formats 
                    up to 10MB in size.
                  </p>
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCapturing}
                    className="w-full"
                    variant="outline"
                  >
                    {isCapturing && selectedMethod === 'file' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Screenshots
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentScreenshots.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentScreenshots.map((record) => (
                        <Card 
                          key={record.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleSelectFromHistory(record.source.id)}
                        >
                          <CardContent className="p-4">
                            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2">
                              <img
                                src={record.source.url}
                                alt="Recent screenshot"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="space-y-1">
                              <Badge variant="secondary" className="text-xs">
                                {record.source.type}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {record.createdAt.toLocaleString()}
                              </p>
                              {record.usedInRedaction && (
                                <Badge variant="outline" className="text-xs">
                                  Used in redaction
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No recent screenshots</p>
                      <p className="text-sm text-muted-foreground">
                        Capture or upload an image to see it here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Preview Area */}
          {previewImage && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <img
                    src={previewImage}
                    alt="Screenshot preview"
                    className="w-full max-h-96 object-contain rounded-lg border"
                  />
                  {captureResult && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Format:</span>
                        <p className="font-medium">{captureResult.format.toUpperCase()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Size:</span>
                        <p className="font-medium">
                          {captureResult.size < 1024 * 1024 
                            ? `${(captureResult.size / 1024).toFixed(1)} KB`
                            : `${(captureResult.size / (1024 * 1024)).toFixed(1)} MB`
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dimensions:</span>
                        <p className="font-medium">
                          {captureResult.dimensions.width} × {captureResult.dimensions.height}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Source:</span>
                        <p className="font-medium capitalize">{captureResult.source}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleUseDefault}
              className="flex-1"
            >
              Use Default Screenshot
            </Button>
            
            {currentImageUrl && (
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
              >
                Keep Current
              </Button>
            )}
            
            <Button
              onClick={handleConfirmSelection}
              disabled={!previewImage}
              className="flex-1"
            >
              {previewImage ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Use This Screenshot
                </>
              ) : (
                'Select Screenshot First'
              )}
            </Button>
          </div>
          
          {/* Info Section */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Privacy Note</p>
                <p className="text-muted-foreground">
                  All screenshot processing happens locally in your browser. 
                  Images are not uploaded to external servers unless you explicitly share them.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}