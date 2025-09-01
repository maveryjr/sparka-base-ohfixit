/**
 * OhFixIt Health Check Engine
 * 
 * Preventive diagnostics system that checks system health to prevent repeat problems.
 * Covers: disk space, updates pending, antivirus status, time sync, DNS sanity, 
 * default browser sanity, extensions bloat, and more.
 */

export interface HealthCheckResult {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  score: number; // 0-100
  message: string;
  details?: string;
  recommendation?: string;
  fixable: boolean;
  category: 'system' | 'network' | 'security' | 'performance' | 'browser';
  lastChecked: Date;
  estimatedFixTime?: string;
}

export interface SystemInfo {
  platform: string;
  version: string;
  arch: string;
  memory: {
    total: number;
    available: number;
    used: number;
  };
  storage: {
    total: number;
    available: number;
    used: number;
  };
  uptime: number;
  userAgent: string;
}

export interface HealthCheckSummary {
  overallScore: number;
  overallStatus: 'healthy' | 'warning' | 'critical';
  totalChecks: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  checks: HealthCheckResult[];
  systemInfo: SystemInfo;
  lastRunTime: Date;
  nextRecommendedCheck: Date;
}

export class HealthCheckEngine {
  private checks: Map<string, HealthCheckResult> = new Map();
  private systemInfo: SystemInfo | null = null;

  constructor() {
    this.initializeChecks();
  }

  private initializeChecks() {
    // Initialize all health checks with default states
    const defaultChecks: Omit<HealthCheckResult, 'lastChecked'>[] = [
      {
        id: 'disk-space',
        name: 'Disk Space',
        status: 'unknown',
        score: 0,
        message: 'Checking available disk space...',
        category: 'system',
        fixable: true,
        estimatedFixTime: '5-10 minutes'
      },
      {
        id: 'system-updates',
        name: 'System Updates',
        status: 'unknown',
        score: 0,
        message: 'Checking for pending updates...',
        category: 'system',
        fixable: true,
        estimatedFixTime: '10-30 minutes'
      },
      {
        id: 'antivirus-status',
        name: 'Antivirus Protection',
        status: 'unknown',
        score: 0,
        message: 'Checking antivirus status...',
        category: 'security',
        fixable: true,
        estimatedFixTime: '2-5 minutes'
      },
      {
        id: 'time-sync',
        name: 'Time Synchronization',
        status: 'unknown',
        score: 0,
        message: 'Checking system time sync...',
        category: 'system',
        fixable: true,
        estimatedFixTime: '1-2 minutes'
      },
      {
        id: 'dns-health',
        name: 'DNS Configuration',
        status: 'unknown',
        score: 0,
        message: 'Testing DNS resolution...',
        category: 'network',
        fixable: true,
        estimatedFixTime: '2-5 minutes'
      },
      {
        id: 'default-browser',
        name: 'Default Browser',
        status: 'unknown',
        score: 0,
        message: 'Checking default browser settings...',
        category: 'browser',
        fixable: true,
        estimatedFixTime: '1-2 minutes'
      },
      {
        id: 'browser-extensions',
        name: 'Browser Extensions',
        status: 'unknown',
        score: 0,
        message: 'Analyzing browser extensions...',
        category: 'browser',
        fixable: true,
        estimatedFixTime: '3-5 minutes'
      },
      {
        id: 'startup-programs',
        name: 'Startup Programs',
        status: 'unknown',
        score: 0,
        message: 'Checking startup program load...',
        category: 'performance',
        fixable: true,
        estimatedFixTime: '5-10 minutes'
      },
      {
        id: 'network-connectivity',
        name: 'Network Connectivity',
        status: 'unknown',
        score: 0,
        message: 'Testing internet connectivity...',
        category: 'network',
        fixable: true,
        estimatedFixTime: '5-15 minutes'
      },
      {
        id: 'temp-files',
        name: 'Temporary Files',
        status: 'unknown',
        score: 0,
        message: 'Checking temporary file buildup...',
        category: 'performance',
        fixable: true,
        estimatedFixTime: '5-10 minutes'
      },
      {
        id: 'memory-usage',
        name: 'Memory Usage',
        status: 'unknown',
        score: 0,
        message: 'Analyzing memory consumption...',
        category: 'performance',
        fixable: true,
        estimatedFixTime: '2-5 minutes'
      },
      {
        id: 'firewall-status',
        name: 'Firewall Status',
        status: 'unknown',
        score: 0,
        message: 'Checking firewall configuration...',
        category: 'security',
        fixable: true,
        estimatedFixTime: '2-5 minutes'
      }
    ];

    defaultChecks.forEach(check => {
      this.checks.set(check.id, {
        ...check,
        lastChecked: new Date()
      });
    });
  }

  async runAllChecks(): Promise<HealthCheckSummary> {
    // Gather system information first
    this.systemInfo = await this.gatherSystemInfo();

    // Run all health checks in parallel
    const checkPromises = Array.from(this.checks.keys()).map(checkId => 
      this.runSingleCheck(checkId)
    );

    await Promise.allSettled(checkPromises);

    return this.generateSummary();
  }

  async runSingleCheck(checkId: string): Promise<HealthCheckResult> {
    const check = this.checks.get(checkId);
    if (!check) {
      throw new Error(`Health check ${checkId} not found`);
    }

    try {
      let result: HealthCheckResult;

      switch (checkId) {
        case 'disk-space':
          result = await this.checkDiskSpace();
          break;
        case 'system-updates':
          result = await this.checkSystemUpdates();
          break;
        case 'antivirus-status':
          result = await this.checkAntivirusStatus();
          break;
        case 'time-sync':
          result = await this.checkTimeSync();
          break;
        case 'dns-health':
          result = await this.checkDNSHealth();
          break;
        case 'default-browser':
          result = await this.checkDefaultBrowser();
          break;
        case 'browser-extensions':
          result = await this.checkBrowserExtensions();
          break;
        case 'startup-programs':
          result = await this.checkStartupPrograms();
          break;
        case 'network-connectivity':
          result = await this.checkNetworkConnectivity();
          break;
        case 'temp-files':
          result = await this.checkTempFiles();
          break;
        case 'memory-usage':
          result = await this.checkMemoryUsage();
          break;
        case 'firewall-status':
          result = await this.checkFirewallStatus();
          break;
        default:
          result = { ...check, status: 'unknown', message: 'Check not implemented' };
      }

      result.lastChecked = new Date();
      this.checks.set(checkId, result);
      return result;
    } catch (error) {
      const errorResult: HealthCheckResult = {
        ...check,
        status: 'unknown',
        score: 0,
        message: `Error running check: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date()
      };
      this.checks.set(checkId, errorResult);
      return errorResult;
    }
  }

  private async gatherSystemInfo(): Promise<SystemInfo> {
    // Use browser APIs and navigator to gather system info
    const memory = (navigator as any).deviceMemory ? {
      total: (navigator as any).deviceMemory * 1024 * 1024 * 1024, // Convert GB to bytes
      available: 0, // Not available in browser
      used: 0 // Not available in browser
    } : { total: 0, available: 0, used: 0 };

    // Estimate storage using Storage API if available
    let storage = { total: 0, available: 0, used: 0 };
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        storage = {
          total: estimate.quota || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          used: estimate.usage || 0
        };
      } catch (error) {
        console.warn('Could not estimate storage:', error);
      }
    }

    return {
      platform: navigator.platform,
      version: navigator.appVersion,
      arch: (navigator as any).userAgentData?.platform || 'unknown',
      memory,
      storage,
      uptime: performance.now(), // Approximate uptime since page load
      userAgent: navigator.userAgent
    };
  }

  private async checkDiskSpace(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('disk-space')!;
    
    if (!this.systemInfo?.storage.total) {
      return {
        ...baseCheck,
        status: 'warning',
        score: 50,
        message: 'Cannot determine disk space from browser',
        details: 'Storage information requires desktop helper app',
        recommendation: 'Install desktop helper for accurate disk space monitoring'
      };
    }

    const usedPercent = (this.systemInfo.storage.used / this.systemInfo.storage.total) * 100;
    const availableGB = this.systemInfo.storage.available / (1024 * 1024 * 1024);

    let status: HealthCheckResult['status'] = 'healthy';
    let score = 100;
    let message = `${availableGB.toFixed(1)} GB available`;
    let recommendation: string | undefined;

    if (usedPercent > 95) {
      status = 'critical';
      score = 10;
      message = `Critical: Only ${availableGB.toFixed(1)} GB available (${usedPercent.toFixed(1)}% used)`;
      recommendation = 'Free up disk space immediately to prevent system issues';
    } else if (usedPercent > 85) {
      status = 'warning';
      score = 40;
      message = `Warning: ${availableGB.toFixed(1)} GB available (${usedPercent.toFixed(1)}% used)`;
      recommendation = 'Consider cleaning up files or moving data to external storage';
    } else if (usedPercent > 70) {
      status = 'warning';
      score = 70;
      message = `${availableGB.toFixed(1)} GB available (${usedPercent.toFixed(1)}% used)`;
      recommendation = 'Monitor disk usage and clean up unnecessary files';
    }

    return {
      ...baseCheck,
      status,
      score,
      message,
      recommendation,
      details: `Total: ${(this.systemInfo.storage.total / (1024 * 1024 * 1024)).toFixed(1)} GB, Used: ${usedPercent.toFixed(1)}%`
    };
  }

  private async checkSystemUpdates(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('system-updates')!;
    
    // Browser cannot check system updates directly
    return {
      ...baseCheck,
      status: 'warning',
      score: 50,
      message: 'Cannot check system updates from browser',
      details: 'System update checking requires desktop helper app',
      recommendation: 'Install desktop helper to monitor system updates automatically'
    };
  }

  private async checkAntivirusStatus(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('antivirus-status')!;
    
    // Browser cannot check antivirus status directly
    return {
      ...baseCheck,
      status: 'warning',
      score: 50,
      message: 'Cannot verify antivirus status from browser',
      details: 'Antivirus checking requires desktop helper app',
      recommendation: 'Ensure you have active antivirus protection and install desktop helper for monitoring'
    };
  }

  private async checkTimeSync(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('time-sync')!;
    
    try {
      // Check if system time is reasonably close to server time
      const startTime = Date.now();
      const response = await fetch('/api/time', { method: 'HEAD' });
      const serverTime = new Date(response.headers.get('date') || '').getTime();
      const clientTime = Date.now();
      const networkDelay = (clientTime - startTime) / 2;
      const timeDiff = Math.abs(clientTime - serverTime - networkDelay);

      let status: HealthCheckResult['status'] = 'healthy';
      let score = 100;
      let message = 'System time is synchronized';
      let recommendation: string | undefined;

      if (timeDiff > 300000) { // 5 minutes
        status = 'critical';
        score = 10;
        message = `System time is off by ${Math.round(timeDiff / 1000)} seconds`;
        recommendation = 'Sync your system clock immediately';
      } else if (timeDiff > 60000) { // 1 minute
        status = 'warning';
        score = 60;
        message = `System time is off by ${Math.round(timeDiff / 1000)} seconds`;
        recommendation = 'Consider syncing your system clock';
      }

      return {
        ...baseCheck,
        status,
        score,
        message,
        recommendation,
        details: `Time difference: ${Math.round(timeDiff / 1000)} seconds`
      };
    } catch (error) {
      return {
        ...baseCheck,
        status: 'unknown',
        score: 0,
        message: 'Could not check time synchronization',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkDNSHealth(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('dns-health')!;
    
    try {
      const testDomains = ['google.com', 'cloudflare.com', 'github.com'];
      const startTime = Date.now();
      
      const results = await Promise.allSettled(
        testDomains.map(domain => 
          fetch(`https://${domain}`, { method: 'HEAD', mode: 'no-cors' })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const avgResponseTime = (Date.now() - startTime) / testDomains.length;

      let status: HealthCheckResult['status'] = 'healthy';
      let score = 100;
      let message = 'DNS resolution is working correctly';
      let recommendation: string | undefined;

      if (successCount === 0) {
        status = 'critical';
        score = 0;
        message = 'DNS resolution is failing';
        recommendation = 'Check your DNS settings or network connection';
      } else if (successCount < testDomains.length) {
        status = 'warning';
        score = 60;
        message = `DNS partially working (${successCount}/${testDomains.length} domains)`;
        recommendation = 'Some DNS queries are failing, check your DNS configuration';
      } else if (avgResponseTime > 5000) {
        status = 'warning';
        score = 70;
        message = `DNS is slow (${Math.round(avgResponseTime)}ms average)`;
        recommendation = 'Consider switching to faster DNS servers (1.1.1.1, 8.8.8.8)';
      }

      return {
        ...baseCheck,
        status,
        score,
        message,
        recommendation,
        details: `${successCount}/${testDomains.length} domains resolved, avg ${Math.round(avgResponseTime)}ms`
      };
    } catch (error) {
      return {
        ...baseCheck,
        status: 'critical',
        score: 0,
        message: 'DNS check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'Check your internet connection and DNS settings'
      };
    }
  }

  private async checkDefaultBrowser(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('default-browser')!;
    
    // Detect browser from user agent
    const userAgent = navigator.userAgent.toLowerCase();
    let browserName = 'Unknown';
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      browserName = 'Chrome';
    } else if (userAgent.includes('firefox')) {
      browserName = 'Firefox';
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      browserName = 'Safari';
    } else if (userAgent.includes('edg')) {
      browserName = 'Edge';
    }

    // Check if browser seems up to date (basic heuristic)
    const isLikelyOutdated = userAgent.includes('chrome/10') || 
                            userAgent.includes('firefox/9') ||
                            userAgent.includes('safari/60');

    let status: HealthCheckResult['status'] = 'healthy';
    let score = 100;
    let message = `Using ${browserName}`;
    let recommendation: string | undefined;

    if (isLikelyOutdated) {
      status = 'warning';
      score = 40;
      message = `${browserName} appears outdated`;
      recommendation = 'Update your browser to the latest version for security and performance';
    }

    return {
      ...baseCheck,
      status,
      score,
      message,
      recommendation,
      details: `Browser: ${browserName}, User Agent: ${navigator.userAgent}`
    };
  }

  private async checkBrowserExtensions(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('browser-extensions')!;
    
    // Browser cannot directly access extension information for security reasons
    return {
      ...baseCheck,
      status: 'warning',
      score: 50,
      message: 'Cannot analyze browser extensions from web page',
      details: 'Extension analysis requires browser-specific permissions',
      recommendation: 'Manually review your browser extensions and remove unused ones'
    };
  }

  private async checkStartupPrograms(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('startup-programs')!;
    
    // Browser cannot check startup programs
    return {
      ...baseCheck,
      status: 'warning',
      score: 50,
      message: 'Cannot check startup programs from browser',
      details: 'Startup program analysis requires desktop helper app',
      recommendation: 'Install desktop helper to monitor and optimize startup programs'
    };
  }

  private async checkNetworkConnectivity(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('network-connectivity')!;
    
    try {
      const connection = (navigator as any).connection;
      const startTime = Date.now();
      
      // Test connectivity with a simple request
      await fetch('/api/health', { method: 'HEAD' });
      const responseTime = Date.now() - startTime;

      let status: HealthCheckResult['status'] = 'healthy';
      let score = 100;
      let message = 'Network connectivity is good';
      let recommendation: string | undefined;

      if (responseTime > 5000) {
        status = 'warning';
        score = 40;
        message = `Slow network response (${responseTime}ms)`;
        recommendation = 'Check your internet connection speed';
      } else if (responseTime > 2000) {
        status = 'warning';
        score = 70;
        message = `Moderate network response (${responseTime}ms)`;
        recommendation = 'Network performance could be improved';
      }

      let details = `Response time: ${responseTime}ms`;
      if (connection) {
        details += `, Connection: ${connection.effectiveType || 'unknown'}`;
        if (connection.downlink) {
          details += `, Speed: ${connection.downlink} Mbps`;
        }
      }

      return {
        ...baseCheck,
        status,
        score,
        message,
        recommendation,
        details
      };
    } catch (error) {
      return {
        ...baseCheck,
        status: 'critical',
        score: 0,
        message: 'Network connectivity test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        recommendation: 'Check your internet connection'
      };
    }
  }

  private async checkTempFiles(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('temp-files')!;
    
    // Browser cannot access file system directly
    return {
      ...baseCheck,
      status: 'warning',
      score: 50,
      message: 'Cannot analyze temporary files from browser',
      details: 'File system analysis requires desktop helper app',
      recommendation: 'Install desktop helper to automatically clean temporary files'
    };
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('memory-usage')!;
    
    try {
      const memory = (performance as any).memory;
      if (!memory) {
        return {
          ...baseCheck,
          status: 'warning',
          score: 50,
          message: 'Memory information not available',
          details: 'Browser memory API not supported',
          recommendation: 'Use desktop helper for detailed memory monitoring'
        };
      }

      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const totalMB = memory.totalJSHeapSize / (1024 * 1024);
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
      const usedPercent = (usedMB / limitMB) * 100;

      let status: HealthCheckResult['status'] = 'healthy';
      let score = 100;
      let message = `Browser using ${usedMB.toFixed(1)} MB`;
      let recommendation: string | undefined;

      if (usedPercent > 90) {
        status = 'critical';
        score = 10;
        message = `High memory usage: ${usedMB.toFixed(1)} MB (${usedPercent.toFixed(1)}%)`;
        recommendation = 'Close unnecessary browser tabs and restart browser';
      } else if (usedPercent > 70) {
        status = 'warning';
        score = 60;
        message = `Moderate memory usage: ${usedMB.toFixed(1)} MB (${usedPercent.toFixed(1)}%)`;
        recommendation = 'Consider closing some browser tabs';
      }

      return {
        ...baseCheck,
        status,
        score,
        message,
        recommendation,
        details: `Used: ${usedMB.toFixed(1)} MB, Total: ${totalMB.toFixed(1)} MB, Limit: ${limitMB.toFixed(1)} MB`
      };
    } catch (error) {
      return {
        ...baseCheck,
        status: 'unknown',
        score: 0,
        message: 'Could not check memory usage',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkFirewallStatus(): Promise<HealthCheckResult> {
    const baseCheck = this.checks.get('firewall-status')!;
    
    // Browser cannot check firewall status
    return {
      ...baseCheck,
      status: 'warning',
      score: 50,
      message: 'Cannot check firewall status from browser',
      details: 'Firewall monitoring requires desktop helper app',
      recommendation: 'Ensure your firewall is enabled and install desktop helper for monitoring'
    };
  }

  private generateSummary(): HealthCheckSummary {
    const checks = Array.from(this.checks.values());
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    const criticalCount = checks.filter(c => c.status === 'critical').length;

    // Calculate overall score as weighted average
    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    const overallScore = Math.round(totalScore / checks.length);

    let overallStatus: HealthCheckSummary['overallStatus'] = 'healthy';
    if (criticalCount > 0) {
      overallStatus = 'critical';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    }

    const now = new Date();
    const nextRecommendedCheck = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      overallScore,
      overallStatus,
      totalChecks: checks.length,
      healthyCount,
      warningCount,
      criticalCount,
      checks: checks.sort((a, b) => {
        // Sort by status priority (critical first), then by score
        const statusOrder = { critical: 0, warning: 1, healthy: 2, unknown: 3 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        return statusDiff !== 0 ? statusDiff : a.score - b.score;
      }),
      systemInfo: this.systemInfo!,
      lastRunTime: now,
      nextRecommendedCheck
    };
  }

  getCheckById(checkId: string): HealthCheckResult | undefined {
    return this.checks.get(checkId);
  }

  getChecksByCategory(category: HealthCheckResult['category']): HealthCheckResult[] {
    return Array.from(this.checks.values()).filter(check => check.category === category);
  }

  getFixableIssues(): HealthCheckResult[] {
    return Array.from(this.checks.values()).filter(
      check => check.fixable && (check.status === 'warning' || check.status === 'critical')
    );
  }
}

// Singleton instance
export const healthCheckEngine = new HealthCheckEngine();
