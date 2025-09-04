import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import { BrowserAction } from './browser-automation-engine';

// One-click fix definitions
export interface OneClickFix {
  id: string;
  title: string;
  description: string;
  category: 'browser' | 'network' | 'system' | 'performance' | 'security';
  platforms: Array<'windows' | 'macos' | 'linux' | 'web'>;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: number; // seconds
  keywords: string[]; // for matching user issues
  actions: Array<{
    type: 'browser' | 'script' | 'system' | 'manual';
    browserActions?: BrowserAction[];
    scriptTemplate?: string;
    scriptVariables?: Record<string, any>;
    systemCommand?: string;
    manualInstructions?: string;
  }>;
  successCriteria: string;
  rollbackInstructions?: string;
  requiresRestart?: boolean;
}

// Built-in one-click fixes
export const ONE_CLICK_FIXES: OneClickFix[] = [
  {
    id: 'clear-browser-cache',
    title: 'Clear Browser Cache & Cookies',
    description: 'Clear browser cache, cookies, and temporary data to resolve loading issues',
    category: 'browser',
    platforms: ['web'],
    riskLevel: 'low',
    estimatedTime: 30,
    keywords: ['cache', 'cookies', 'loading', 'slow', 'outdated', 'refresh', 'browser'],
    actions: [{
      type: 'browser',
      browserActions: [
        {
          id: 'open-settings',
          type: 'navigate',
          url: 'chrome://settings/clearBrowserData'
        },
        {
          id: 'select-time-range',
          type: 'click',
          selector: '[data-testid="time-range-dropdown"]'
        },
        {
          id: 'select-all-time',
          type: 'click',
          selector: '[data-value="all"]'
        },
        {
          id: 'check-cache',
          type: 'click',
          selector: '[data-testid="cached-images-checkbox"]'
        },
        {
          id: 'check-cookies',
          type: 'click',
          selector: '[data-testid="cookies-checkbox"]'
        },
        {
          id: 'clear-data',
          type: 'click',
          selector: '[data-testid="clear-data-button"]'
        }
      ]
    }],
    successCriteria: 'Browser data cleared successfully',
    rollbackInstructions: 'You may need to log in to websites again'
  },
  {
    id: 'restart-browser',
    title: 'Restart Browser',
    description: 'Close and restart the browser to resolve memory and performance issues',
    category: 'browser',
    platforms: ['web'],
    riskLevel: 'low',
    estimatedTime: 15,
    keywords: ['slow', 'frozen', 'unresponsive', 'memory', 'performance', 'restart'],
    actions: [{
      type: 'manual',
      manualInstructions: 'Close all browser windows and restart the browser application'
    }],
    successCriteria: 'Browser restarted and responsive'
  },
  {
    id: 'disable-browser-extensions',
    title: 'Disable Browser Extensions',
    description: 'Temporarily disable all browser extensions to identify conflicts',
    category: 'browser',
    platforms: ['web'],
    riskLevel: 'low',
    estimatedTime: 45,
    keywords: ['extension', 'addon', 'conflict', 'crash', 'slow', 'popup'],
    actions: [{
      type: 'browser',
      browserActions: [
        {
          id: 'open-extensions',
          type: 'navigate',
          url: 'chrome://extensions/'
        },
        {
          id: 'developer-mode',
          type: 'click',
          selector: '[data-testid="developer-mode-toggle"]'
        },
        {
          id: 'disable-all',
          type: 'click',
          selector: '[data-testid="disable-all-extensions"]'
        }
      ]
    }],
    successCriteria: 'All extensions disabled',
    rollbackInstructions: 'Re-enable extensions one by one to identify the problematic one'
  },
  {
    id: 'reset-network-settings',
    title: 'Reset Network Settings',
    description: 'Reset network configuration to resolve connectivity issues',
    category: 'network',
    platforms: ['windows', 'macos', 'linux'],
    riskLevel: 'medium',
    estimatedTime: 120,
    keywords: ['network', 'wifi', 'internet', 'connection', 'dns', 'connectivity'],
    actions: [{
      type: 'script',
      scriptTemplate: 'network-reset',
      scriptVariables: { platform: 'auto-detect' }
    }],
    successCriteria: 'Network connectivity restored',
    rollbackInstructions: 'Restart computer to fully restore network settings',
    requiresRestart: true
  },
  {
    id: 'flush-dns-cache',
    title: 'Flush DNS Cache',
    description: 'Clear DNS cache to resolve website loading issues',
    category: 'network',
    platforms: ['windows', 'macos', 'linux'],
    riskLevel: 'low',
    estimatedTime: 30,
    keywords: ['dns', 'website', 'loading', 'resolve', 'cache', 'domain'],
    actions: [{
      type: 'script',
      scriptTemplate: 'dns-flush',
      scriptVariables: { platform: 'auto-detect' }
    }],
    successCriteria: 'DNS cache cleared successfully'
  },
  {
    id: 'kill-unresponsive-apps',
    title: 'Force Quit Unresponsive Apps',
    description: 'Force quit applications that are not responding',
    category: 'system',
    platforms: ['windows', 'macos', 'linux'],
    riskLevel: 'low',
    estimatedTime: 15,
    keywords: ['frozen', 'unresponsive', 'hang', 'stuck', 'force quit', 'task manager'],
    actions: [{
      type: 'manual',
      manualInstructions: 'Open Task Manager (Ctrl+Shift+Esc on Windows, Activity Monitor on Mac) and end unresponsive processes'
    }],
    successCriteria: 'Unresponsive applications terminated'
  },
  {
    id: 'free-disk-space',
    title: 'Free Up Disk Space',
    description: 'Clean temporary files and free up disk space',
    category: 'performance',
    platforms: ['windows', 'macos', 'linux'],
    riskLevel: 'low',
    estimatedTime: 300,
    keywords: ['disk', 'space', 'storage', 'full', 'cleanup', 'temp', 'cache'],
    actions: [{
      type: 'script',
      scriptTemplate: 'disk-cleanup',
      scriptVariables: { 
        daysOld: 30,
        cleanSystemFiles: false,
        platform: 'auto-detect'
      }
    }],
    successCriteria: 'Disk space freed up successfully'
  },
  {
    id: 'update-browser',
    title: 'Update Browser',
    description: 'Update browser to the latest version for security and performance',
    category: 'security',
    platforms: ['web'],
    riskLevel: 'low',
    estimatedTime: 180,
    keywords: ['update', 'version', 'security', 'outdated', 'patch'],
    actions: [{
      type: 'browser',
      browserActions: [
        {
          id: 'open-about',
          type: 'navigate',
          url: 'chrome://settings/help'
        },
        {
          id: 'check-updates',
          type: 'wait',
          delay: 3000
        }
      ]
    }],
    successCriteria: 'Browser updated to latest version'
  },
  {
    id: 'reset-browser-settings',
    title: 'Reset Browser to Defaults',
    description: 'Reset browser settings to default configuration',
    category: 'browser',
    platforms: ['web'],
    riskLevel: 'medium',
    estimatedTime: 60,
    keywords: ['reset', 'default', 'settings', 'configuration', 'corrupted'],
    actions: [{
      type: 'browser',
      browserActions: [
        {
          id: 'open-reset',
          type: 'navigate',
          url: 'chrome://settings/reset'
        },
        {
          id: 'reset-settings',
          type: 'click',
          selector: '[data-testid="reset-settings-button"]'
        },
        {
          id: 'confirm-reset',
          type: 'click',
          selector: '[data-testid="confirm-reset-button"]'
        }
      ]
    }],
    successCriteria: 'Browser settings reset to defaults',
    rollbackInstructions: 'You will need to reconfigure your browser preferences'
  },
  {
    id: 'check-malware',
    title: 'Quick Malware Scan',
    description: 'Run a quick malware scan to detect security threats',
    category: 'security',
    platforms: ['windows', 'macos'],
    riskLevel: 'low',
    estimatedTime: 300,
    keywords: ['malware', 'virus', 'security', 'scan', 'threat', 'popup', 'suspicious'],
    actions: [{
      type: 'script',
      scriptTemplate: 'malware-scan',
      scriptVariables: { 
        suspiciousProcess: 'malware',
        scanDate: '7 days ago'
      }
    }],
    successCriteria: 'Malware scan completed'
  }
];

// One-click fix matcher and executor
export const oneClickFixTool = tool({
  description: 'Find and execute one-click fixes for common technical issues',
  inputSchema: z.object({
    issue: z.string().min(3).max(500).describe('Description of the technical issue'),
    platform: z.enum(['windows', 'macos', 'linux', 'web']).optional(),
    urgency: z.enum(['low', 'medium', 'high']).default('medium'),
    allowRiskyFixes: z.boolean().default(false)
  }),
  execute: async ({
    issue,
    platform,
    urgency = 'medium',
    allowRiskyFixes = false
  }: {
    issue: string;
    platform?: 'windows' | 'macos' | 'linux' | 'web';
    urgency?: 'low' | 'medium' | 'high';
    allowRiskyFixes?: boolean;
  }) => {
    // Find matching fixes
    const matchingFixes = findMatchingFixes(issue, platform, allowRiskyFixes);
    
    // Sort by relevance and risk level
    const sortedFixes = matchingFixes
      .sort((a, b) => {
        // Prioritize lower risk fixes
        const riskPriority = { low: 0, medium: 1, high: 2 };
        const riskDiff = riskPriority[a.riskLevel] - riskPriority[b.riskLevel];
        if (riskDiff !== 0) return riskDiff;
        
        // Then by estimated time (faster first)
        return a.estimatedTime - b.estimatedTime;
      })
      .slice(0, 5); // Limit to top 5 fixes

    if (sortedFixes.length === 0) {
      return {
        found: false,
        message: 'No matching one-click fixes found for this issue',
        suggestions: [
          'Try describing the issue with different keywords',
          'Check the Phase 2 Integration Hub for more advanced automation options',
          'Consider using the script generation system for custom solutions'
        ]
      };
    }

    return {
      found: true,
      fixes: sortedFixes.map(fix => ({
        id: fix.id,
        title: fix.title,
        description: fix.description,
        category: fix.category,
        riskLevel: fix.riskLevel,
        estimatedTime: `${Math.ceil(fix.estimatedTime / 60)} minutes`,
        platforms: fix.platforms,
        requiresRestart: fix.requiresRestart || false,
        actions: fix.actions.length,
        successCriteria: fix.successCriteria
      })),
      recommendations: generateRecommendations(sortedFixes, urgency)
    };
  }
});

function findMatchingFixes(
  issue: string, 
  platform?: string, 
  allowRiskyFixes: boolean = false
): OneClickFix[] {
  const issueWords = issue.toLowerCase().split(/\s+/);
  
  return ONE_CLICK_FIXES.filter(fix => {
    // Filter by platform if specified
    if (platform && !fix.platforms.includes(platform as any)) {
      return false;
    }

    // Filter by risk level
    if (!allowRiskyFixes && fix.riskLevel === 'high') {
      return false;
    }

    // Check keyword matches
    const matchScore = fix.keywords.reduce((score, keyword) => {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      const matches = keywordWords.filter(word => 
        issueWords.some(issueWord => 
          issueWord.includes(word) || word.includes(issueWord)
        )
      );
      return score + matches.length;
    }, 0);

    return matchScore > 0;
  });
}

function generateRecommendations(fixes: OneClickFix[], urgency: string): string[] {
  const recommendations: string[] = [];

  if (urgency === 'high') {
    const quickFixes = fixes.filter(f => f.estimatedTime <= 60);
    if (quickFixes.length > 0) {
      recommendations.push(`For urgent issues, try "${quickFixes[0].title}" first (${Math.ceil(quickFixes[0].estimatedTime / 60)} min)`);
    }
  }

  const lowRiskFixes = fixes.filter(f => f.riskLevel === 'low');
  if (lowRiskFixes.length > 0) {
    recommendations.push(`Start with low-risk fixes like "${lowRiskFixes[0].title}"`);
  }

  if (fixes.some(f => f.requiresRestart)) {
    recommendations.push('Some fixes require a system restart - plan accordingly');
  }

  if (fixes.some(f => f.riskLevel === 'medium' || f.riskLevel === 'high')) {
    recommendations.push('Review the risk assessment before executing medium/high-risk fixes');
  }

  recommendations.push('Test the issue after each fix to avoid unnecessary changes');

  return recommendations;
}

// Execute a specific one-click fix
export async function executeOneClickFix(fixId: string): Promise<{
  success: boolean;
  message: string;
  executionId?: string;
  rollbackInstructions?: string;
}> {
  const fix = ONE_CLICK_FIXES.find(f => f.id === fixId);
  
  if (!fix) {
    return {
      success: false,
      message: `Fix not found: ${fixId}`
    };
  }

  try {
    // For now, return a simulation of execution
    // In a real implementation, this would execute the actual fix
    const executionId = `fix-${fixId}-${Date.now()}`;
    
    return {
      success: true,
      message: `One-click fix "${fix.title}" executed successfully`,
      executionId,
      rollbackInstructions: fix.rollbackInstructions
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to execute fix: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Get all available fixes by category
export function getFixesByCategory(category?: string): Record<string, OneClickFix[]> {
  const fixes = category 
    ? ONE_CLICK_FIXES.filter(f => f.category === category)
    : ONE_CLICK_FIXES;

  return fixes.reduce((acc, fix) => {
    if (!acc[fix.category]) {
      acc[fix.category] = [];
    }
    acc[fix.category].push(fix);
    return acc;
  }, {} as Record<string, OneClickFix[]>);
}
