'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import type { ScreenshotSource, ScreenshotRecord } from '@/lib/ohfixit/image-source-manager';
import type { ScreenshotResult, CaptureOptions } from '@/lib/ohfixit/screenshot-capture-service';
import { imageSourceManager } from '@/lib/ohfixit/image-source-manager';

// Enhanced sensitive region type for state management
export interface SensitiveRegion {
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
  verified?: boolean;
  redacted?: boolean;
}

// Redaction workflow state
export interface RedactionWorkflowState {
  // Current session
  sessionId: string;
  isActive: boolean;
  
  // Image source management
  currentImageUrl: string | null;
  currentSource: ScreenshotSource | null;
  sourceHistory: ScreenshotRecord[];
  
  // Detection and redaction
  detectedRegions: SensitiveRegion[];
  isDetecting: boolean;
  isProcessing: boolean;
  autoDetectEnabled: boolean;
  
  // UI state
  showRegions: boolean;
  selectedRegions: string[];
  captureModalOpen: boolean;
  selectedCaptureMethod: 'browser' | 'desktop' | 'file';
  
  // Permissions and capabilities
  permissions: {
    browser: boolean;
    desktop: boolean;
    file: boolean;
  };
  
  // Redaction results
  redactionHistory: RedactionResult[];
  lastRedactionUrl: string | null;
  
  // Error handling
  lastError: string | null;
  
  // Settings and preferences
  preferences: {
    preferredCaptureMethod: 'browser' | 'desktop';
    autoDetectOnLoad: boolean;
    defaultBlurIntensity: number;
    saveRedactionHistory: boolean;
  };
}

export interface RedactionResult {
  id: string;
  originalImageUrl: string;
  redactedImageUrl: string;
  regions: SensitiveRegion[];
  timestamp: Date;
  sourceMetadata: ScreenshotSource['metadata'];
}

// Actions interface
export interface RedactionWorkflowActions {
  // Session management
  startNewSession: () => void;
  endSession: () => void;
  
  // Image source actions
  setImageSource: (source: ScreenshotSource) => void;
  clearImageSource: () => void;
  switchToHistorySource: (sourceId: string) => Promise<boolean>;
  
  // Region management
  addDetectedRegions: (regions: SensitiveRegion[]) => void;
  addManualRegion: (region: Omit<SensitiveRegion, 'id' | 'timestamp'>) => void;
  updateRegion: (regionId: string, updates: Partial<SensitiveRegion>) => void;
  removeRegion: (regionId: string) => void;
  clearAllRegions: () => void;
  toggleRegionSelection: (regionId: string) => void;
  selectAllRegions: () => void;
  deselectAllRegions: () => void;
  
  // Detection actions
  setDetecting: (isDetecting: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  toggleAutoDetect: () => void;
  
  // UI actions
  toggleShowRegions: () => void;
  setCaptureModalOpen: (open: boolean) => void;
  setCaptureMethod: (method: 'browser' | 'desktop' | 'file') => void;
  
  // Permission actions
  updatePermissions: (permissions: Partial<RedactionWorkflowState['permissions']>) => void;
  
  // Redaction actions
  addRedactionResult: (result: RedactionResult) => void;
  setLastRedactionUrl: (url: string | null) => void;
  clearRedactionHistory: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<RedactionWorkflowState['preferences']>) => void;
  
  // Utility actions
  reset: () => void;
  exportState: () => Partial<RedactionWorkflowState>;
  importState: (state: Partial<RedactionWorkflowState>) => void;
}

type RedactionWorkflowStore = RedactionWorkflowState & RedactionWorkflowActions;

// Initial state
const initialState: RedactionWorkflowState = {
  sessionId: '',
  isActive: false,
  
  currentImageUrl: null,
  currentSource: null,
  sourceHistory: [],
  
  detectedRegions: [],
  isDetecting: false,
  isProcessing: false,
  autoDetectEnabled: true,
  
  showRegions: true,
  selectedRegions: [],
  captureModalOpen: false,
  selectedCaptureMethod: 'browser',
  
  permissions: {
    browser: false,
    desktop: false,
    file: true
  },
  
  redactionHistory: [],
  lastRedactionUrl: null,
  
  lastError: null,
  
  preferences: {
    preferredCaptureMethod: 'browser',
    autoDetectOnLoad: true,
    defaultBlurIntensity: 10,
    saveRedactionHistory: true
  }
};

// Generate session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create the store
export const useRedactionWorkflowStore = create<RedactionWorkflowStore>()(subscribeWithSelector(devtools((set, get) => ({
  ...initialState,
  
  // Session management
  startNewSession: () => {
    const sessionId = generateSessionId();
    set({
      sessionId,
      isActive: true,
      detectedRegions: [],
      selectedRegions: [],
      lastError: null
    });
  },
  
  endSession: () => {
    const state = get();
    
    // Cleanup blob URLs
    if (state.currentImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.currentImageUrl);
    }
    
    if (state.lastRedactionUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.lastRedactionUrl);
    }
    
    set({
      isActive: false,
      currentImageUrl: null,
      currentSource: null,
      detectedRegions: [],
      selectedRegions: [],
      lastRedactionUrl: null,
      lastError: null
    });
  },
  
  // Image source actions
  setImageSource: (source: ScreenshotSource) => {
    const state = get();
    
    // Cleanup previous image URL if it's a blob
    if (state.currentImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.currentImageUrl);
    }
    
    set({
      currentImageUrl: source.url,
      currentSource: source,
      detectedRegions: [], // Clear regions when switching images
      selectedRegions: [],
      lastError: null
    });
    
    // Update source history
    const sourceHistory = imageSourceManager.getSourceHistory();
    set({ sourceHistory });
  },
  
  clearImageSource: () => {
    const state = get();
    
    if (state.currentImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.currentImageUrl);
    }
    
    set({
      currentImageUrl: null,
      currentSource: null,
      detectedRegions: [],
      selectedRegions: []
    });
  },
  
  switchToHistorySource: async (sourceId: string) => {
    try {
      const success = imageSourceManager.switchToHistorySource(sourceId);
      if (success) {
        const source = imageSourceManager.getCurrentSource();
        if (source) {
          get().setImageSource(source);
          return true;
        }
      }
      return false;
    } catch (error) {
      get().setError(`Failed to switch to history source: ${error}`);
      return false;
    }
  },
  
  // Region management
  addDetectedRegions: (regions: SensitiveRegion[]) => {
    set(state => ({
      detectedRegions: [...state.detectedRegions, ...regions]
    }));
  },
  
  addManualRegion: (regionData) => {
    const region: SensitiveRegion = {
      ...regionData,
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      source: 'manual'
    };
    
    set(state => ({
      detectedRegions: [...state.detectedRegions, region]
    }));
  },
  
  updateRegion: (regionId: string, updates: Partial<SensitiveRegion>) => {
    set(state => ({
      detectedRegions: state.detectedRegions.map(region =>
        region.id === regionId ? { ...region, ...updates } : region
      )
    }));
  },
  
  removeRegion: (regionId: string) => {
    set(state => ({
      detectedRegions: state.detectedRegions.filter(region => region.id !== regionId),
      selectedRegions: state.selectedRegions.filter(id => id !== regionId)
    }));
  },
  
  clearAllRegions: () => {
    set({
      detectedRegions: [],
      selectedRegions: []
    });
  },
  
  toggleRegionSelection: (regionId: string) => {
    set(state => {
      const isSelected = state.selectedRegions.includes(regionId);
      return {
        selectedRegions: isSelected
          ? state.selectedRegions.filter(id => id !== regionId)
          : [...state.selectedRegions, regionId]
      };
    });
  },
  
  selectAllRegions: () => {
    set(state => ({
      selectedRegions: state.detectedRegions.map(region => region.id)
    }));
  },
  
  deselectAllRegions: () => {
    set({ selectedRegions: [] });
  },
  
  // Detection actions
  setDetecting: (isDetecting: boolean) => {
    set({ isDetecting });
  },
  
  setProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
  },
  
  toggleAutoDetect: () => {
    set(state => ({
      autoDetectEnabled: !state.autoDetectEnabled
    }));
  },
  
  // UI actions
  toggleShowRegions: () => {
    set(state => ({
      showRegions: !state.showRegions
    }));
  },
  
  setCaptureModalOpen: (open: boolean) => {
    set({ captureModalOpen: open });
  },
  
  setCaptureMethod: (method: 'browser' | 'desktop' | 'file') => {
    set({ selectedCaptureMethod: method });
  },
  
  // Permission actions
  updatePermissions: (permissions) => {
    set(state => ({
      permissions: { ...state.permissions, ...permissions }
    }));
  },
  
  // Redaction actions
  addRedactionResult: (result: RedactionResult) => {
    set(state => {
      const history = state.preferences.saveRedactionHistory
        ? [result, ...state.redactionHistory.slice(0, 9)] // Keep last 10
        : state.redactionHistory;
      
      return {
        redactionHistory: history,
        lastRedactionUrl: result.redactedImageUrl
      };
    });
    
    // Mark source as used in redaction
    imageSourceManager.markUsedInRedaction();
  },
  
  setLastRedactionUrl: (url: string | null) => {
    const state = get();
    
    // Cleanup previous URL if it's a blob
    if (state.lastRedactionUrl?.startsWith('blob:') && state.lastRedactionUrl !== url) {
      URL.revokeObjectURL(state.lastRedactionUrl);
    }
    
    set({ lastRedactionUrl: url });
  },
  
  clearRedactionHistory: () => {
    const state = get();
    
    // Cleanup blob URLs
    state.redactionHistory.forEach(result => {
      if (result.redactedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(result.redactedImageUrl);
      }
    });
    
    set({ redactionHistory: [] });
  },
  
  // Error handling
  setError: (error: string | null) => {
    set({ lastError: error });
  },
  
  clearError: () => {
    set({ lastError: null });
  },
  
  // Preferences
  updatePreferences: (preferences) => {
    set(state => ({
      preferences: { ...state.preferences, ...preferences }
    }));
  },
  
  // Utility actions
  reset: () => {
    const state = get();
    
    // Cleanup all blob URLs
    if (state.currentImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.currentImageUrl);
    }
    
    if (state.lastRedactionUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.lastRedactionUrl);
    }
    
    state.redactionHistory.forEach(result => {
      if (result.redactedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(result.redactedImageUrl);
      }
    });
    
    set(initialState);
  },
  
  exportState: () => {
    const state = get();
    return {
      sessionId: state.sessionId,
      detectedRegions: state.detectedRegions,
      preferences: state.preferences,
      sourceHistory: state.sourceHistory
    };
  },
  
  importState: (importedState) => {
    set(state => ({
      ...state,
      ...importedState
    }));
  }
}), {
  name: 'redaction-workflow-store'
})));

// Selectors for common state combinations
export const useRedactionProgress = () => {
  return useRedactionWorkflowStore(state => ({
    isDetecting: state.isDetecting,
    isProcessing: state.isProcessing,
    hasRegions: state.detectedRegions.length > 0,
    selectedCount: state.selectedRegions.length,
    totalRegions: state.detectedRegions.length
  }));
};

export const useImageSourceInfo = () => {
  return useRedactionWorkflowStore(state => ({
    currentImageUrl: state.currentImageUrl,
    currentSource: state.currentSource,
    hasImage: !!state.currentImageUrl,
    sourceType: state.currentSource?.type
  }));
};

export const useCaptureCapabilities = () => {
  return useRedactionWorkflowStore(state => ({
    permissions: state.permissions,
    selectedMethod: state.selectedCaptureMethod,
    preferredMethod: state.preferences.preferredCaptureMethod,
    modalOpen: state.captureModalOpen
  }));
};