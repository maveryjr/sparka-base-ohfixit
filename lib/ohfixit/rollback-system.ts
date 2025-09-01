import 'server-only';

import { z } from 'zod';

// Rollback action types
export interface RollbackAction {
  id: string;
  type: 'browser' | 'file' | 'registry' | 'network' | 'system' | 'manual';
  description: string;
  originalValue?: any;
  newValue?: any;
  path?: string;
  command?: string;
  browserActions?: Array<{
    action: string;
    selector?: string;
    value?: string;
  }>;
  manualInstructions?: string;
  timestamp: Date;
  reversible: boolean;
  priority: number; // Higher priority actions are rolled back first
}

export interface RollbackPoint {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  actions: RollbackAction[];
  systemState: {
    platform: string;
    browserVersion?: string;
    networkConfig?: any;
    installedSoftware?: string[];
    systemFiles?: Array<{ path: string; checksum: string; size: number }>;
  };
  tags: string[];
  canRollback: boolean;
  rollbackEstimatedTime: number; // seconds
}

export interface RollbackExecution {
  id: string;
  rollbackPointId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  startTime: Date;
  endTime?: Date;
  totalActions: number;
  completedActions: number;
  failedActions: number;
  currentAction?: string;
  progress: number;
  errors: Array<{
    actionId: string;
    error: string;
    timestamp: Date;
  }>;
  warnings: Array<{
    actionId: string;
    warning: string;
    timestamp: Date;
  }>;
}

export class RollbackSystem {
  private rollbackPoints: Map<string, RollbackPoint> = new Map();
  private executions: Map<string, RollbackExecution> = new Map();
  private maxRollbackPoints = 10; // Keep last 10 rollback points

  // Create a new rollback point before executing actions
  createRollbackPoint(
    name: string,
    description: string,
    actions: RollbackAction[],
    tags: string[] = []
  ): string {
    const id = `rollback-${Date.now()}`;
    
    const rollbackPoint: RollbackPoint = {
      id,
      name,
      description,
      timestamp: new Date(),
      actions: actions.sort((a, b) => b.priority - a.priority), // Sort by priority descending
      systemState: this.captureSystemState(),
      tags,
      canRollback: actions.every(action => action.reversible),
      rollbackEstimatedTime: this.estimateRollbackTime(actions)
    };

    this.rollbackPoints.set(id, rollbackPoint);
    this.cleanupOldRollbackPoints();

    return id;
  }

  // Execute rollback for a specific rollback point
  async executeRollback(
    rollbackPointId: string,
    onProgress?: (execution: RollbackExecution) => void
  ): Promise<string> {
    const rollbackPoint = this.rollbackPoints.get(rollbackPointId);
    if (!rollbackPoint) {
      throw new Error(`Rollback point not found: ${rollbackPointId}`);
    }

    if (!rollbackPoint.canRollback) {
      throw new Error('This rollback point contains non-reversible actions');
    }

    const executionId = `rollback-exec-${Date.now()}`;
    const execution: RollbackExecution = {
      id: executionId,
      rollbackPointId,
      status: 'pending',
      startTime: new Date(),
      totalActions: rollbackPoint.actions.length,
      completedActions: 0,
      failedActions: 0,
      progress: 0,
      errors: [],
      warnings: []
    };

    this.executions.set(executionId, execution);

    // Start rollback execution asynchronously
    this.performRollback(executionId, rollbackPoint, onProgress);

    return executionId;
  }

  private async performRollback(
    executionId: string,
    rollbackPoint: RollbackPoint,
    onProgress?: (execution: RollbackExecution) => void
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'running';
    this.notifyProgress(execution, onProgress);

    try {
      // Execute rollback actions in reverse priority order
      for (const action of rollbackPoint.actions) {
        execution.currentAction = action.id;
        
        try {
          await this.executeRollbackAction(action);
          execution.completedActions++;
        } catch (error) {
          execution.failedActions++;
          execution.errors.push({
            actionId: action.id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          });
        }

        execution.progress = Math.round(
          ((execution.completedActions + execution.failedActions) / execution.totalActions) * 100
        );
        this.notifyProgress(execution, onProgress);
      }

      // Determine final status
      if (execution.failedActions === 0) {
        execution.status = 'completed';
      } else if (execution.completedActions > 0) {
        execution.status = 'partial';
      } else {
        execution.status = 'failed';
      }

    } catch (error) {
      execution.status = 'failed';
      execution.errors.push({
        actionId: 'system',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }

    execution.endTime = new Date();
    execution.currentAction = undefined;
    this.notifyProgress(execution, onProgress);
  }

  private async executeRollbackAction(action: RollbackAction): Promise<void> {
    switch (action.type) {
      case 'browser':
        await this.rollbackBrowserAction(action);
        break;
      case 'file':
        await this.rollbackFileAction(action);
        break;
      case 'registry':
        await this.rollbackRegistryAction(action);
        break;
      case 'network':
        await this.rollbackNetworkAction(action);
        break;
      case 'system':
        await this.rollbackSystemAction(action);
        break;
      case 'manual':
        await this.rollbackManualAction(action);
        break;
      default:
        throw new Error(`Unknown rollback action type: ${action.type}`);
    }
  }

  private async rollbackBrowserAction(action: RollbackAction): Promise<void> {
    if (!action.browserActions) {
      throw new Error('Browser actions not defined for browser rollback');
    }

    // Execute browser actions to restore previous state
    for (const browserAction of action.browserActions) {
      // This would integrate with the browser automation engine
      console.log(`Executing browser rollback action: ${browserAction.action}`);
    }
  }

  private async rollbackFileAction(action: RollbackAction): Promise<void> {
    if (!action.path) {
      throw new Error('File path not defined for file rollback');
    }

    // Restore file to original state
    if (action.originalValue !== undefined) {
      // Restore file content
      console.log(`Restoring file: ${action.path}`);
    } else {
      // Delete file if it was created
      console.log(`Deleting created file: ${action.path}`);
    }
  }

  private async rollbackRegistryAction(action: RollbackAction): Promise<void> {
    if (!action.path) {
      throw new Error('Registry path not defined for registry rollback');
    }

    // Restore registry value (Windows only)
    console.log(`Restoring registry: ${action.path}`);
  }

  private async rollbackNetworkAction(action: RollbackAction): Promise<void> {
    // Restore network configuration
    console.log(`Restoring network configuration: ${action.description}`);
  }

  private async rollbackSystemAction(action: RollbackAction): Promise<void> {
    if (!action.command) {
      throw new Error('Command not defined for system rollback');
    }

    // Execute system command to restore state
    console.log(`Executing rollback command: ${action.command}`);
  }

  private async rollbackManualAction(action: RollbackAction): Promise<void> {
    // Manual actions require user intervention
    console.log(`Manual rollback required: ${action.manualInstructions}`);
  }

  private captureSystemState(): RollbackPoint['systemState'] {
    // Capture current system state for rollback verification
    return {
      platform: this.detectPlatform(),
      browserVersion: this.getBrowserVersion(),
      networkConfig: this.getNetworkConfig(),
      installedSoftware: this.getInstalledSoftware(),
      systemFiles: this.getSystemFiles()
    };
  }

  private detectPlatform(): string {
    // Detect current platform
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) return 'windows';
      if (userAgent.includes('mac')) return 'macos';
      return 'linux';
    }
    return 'unknown';
  }

  private getBrowserVersion(): string | undefined {
    if (typeof window !== 'undefined') {
      return navigator.userAgent;
    }
    return undefined;
  }

  private getNetworkConfig(): any {
    // Get current network configuration
    return {
      timestamp: new Date(),
      // This would contain actual network config in real implementation
    };
  }

  private getInstalledSoftware(): string[] {
    // Get list of installed software
    return []; // This would be populated in real implementation
  }

  private getSystemFiles(): Array<{ path: string; checksum: string; size: number }> {
    // Get checksums of critical system files
    return []; // This would be populated in real implementation
  }

  private estimateRollbackTime(actions: RollbackAction[]): number {
    // Estimate rollback time based on action types
    return actions.reduce((total, action) => {
      switch (action.type) {
        case 'browser': return total + 10; // 10 seconds per browser action
        case 'file': return total + 5; // 5 seconds per file action
        case 'registry': return total + 3; // 3 seconds per registry action
        case 'network': return total + 30; // 30 seconds for network changes
        case 'system': return total + 15; // 15 seconds per system command
        case 'manual': return total + 60; // 60 seconds for manual actions
        default: return total + 10;
      }
    }, 0);
  }

  private cleanupOldRollbackPoints(): void {
    const points = Array.from(this.rollbackPoints.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (points.length > this.maxRollbackPoints) {
      const toDelete = points.slice(this.maxRollbackPoints);
      toDelete.forEach(point => {
        this.rollbackPoints.delete(point.id);
      });
    }
  }

  private notifyProgress(
    execution: RollbackExecution,
    onProgress?: (execution: RollbackExecution) => void
  ): void {
    if (onProgress) {
      onProgress({ ...execution });
    }
  }

  // Public methods for managing rollback points
  getRollbackPoint(id: string): RollbackPoint | undefined {
    return this.rollbackPoints.get(id);
  }

  getAllRollbackPoints(): RollbackPoint[] {
    return Array.from(this.rollbackPoints.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getRollbackPointsByTag(tag: string): RollbackPoint[] {
    return Array.from(this.rollbackPoints.values())
      .filter(point => point.tags.includes(tag))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  deleteRollbackPoint(id: string): boolean {
    return this.rollbackPoints.delete(id);
  }

  getRollbackExecution(id: string): RollbackExecution | undefined {
    return this.executions.get(id);
  }

  getAllRollbackExecutions(): RollbackExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Utility methods for creating common rollback actions
  static createBrowserRollbackAction(
    description: string,
    browserActions: Array<{ action: string; selector?: string; value?: string }>,
    priority: number = 1
  ): RollbackAction {
    return {
      id: `browser-${Date.now()}`,
      type: 'browser',
      description,
      browserActions,
      timestamp: new Date(),
      reversible: true,
      priority
    };
  }

  static createFileRollbackAction(
    path: string,
    originalValue: any,
    newValue: any,
    priority: number = 2
  ): RollbackAction {
    return {
      id: `file-${Date.now()}`,
      type: 'file',
      description: `Restore file: ${path}`,
      path,
      originalValue,
      newValue,
      timestamp: new Date(),
      reversible: true,
      priority
    };
  }

  static createSystemRollbackAction(
    description: string,
    command: string,
    priority: number = 3
  ): RollbackAction {
    return {
      id: `system-${Date.now()}`,
      type: 'system',
      description,
      command,
      timestamp: new Date(),
      reversible: true,
      priority
    };
  }

  static createManualRollbackAction(
    description: string,
    instructions: string,
    priority: number = 4
  ): RollbackAction {
    return {
      id: `manual-${Date.now()}`,
      type: 'manual',
      description,
      manualInstructions: instructions,
      timestamp: new Date(),
      reversible: false, // Manual actions require user intervention
      priority
    };
  }
}

// Global rollback system instance
export const rollbackSystem = new RollbackSystem();
