'use client';

import { BrowserAutomationEngine, BrowserAction, AutomationContext } from './browser-automation-engine';
import { ScriptGenerator, GeneratedScript } from './script-generator';

export interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  type: 'manual' | 'browser' | 'script' | 'verification';
  order: number;
  estimatedTime: number; // in seconds
  dependencies?: string[]; // step IDs that must complete first
  browserActions?: BrowserAction[];
  scriptTemplate?: string;
  scriptVariables?: Record<string, any>;
  verificationCriteria?: {
    type: 'element_exists' | 'element_text' | 'url_contains' | 'custom';
    selector?: string;
    expectedValue?: string;
    customCheck?: () => Promise<boolean>;
  };
  rollbackActions?: BrowserAction[];
  manualInstructions?: string;
  skipCondition?: () => Promise<boolean>;
}

export interface ExecutionProgress {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  progress: number; // 0-100
  message?: string;
  error?: string;
  result?: any;
  screenshot?: string;
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalSteps: number;
  completedSteps: number;
  currentStep?: string;
  steps: Map<string, ExecutionProgress>;
  overallProgress: number;
  estimatedTimeRemaining: number;
  canRollback: boolean;
}

export class PlaybookExecutor {
  private browserEngine?: BrowserAutomationEngine;
  private scriptGenerator: ScriptGenerator;
  private executions: Map<string, PlaybookExecution> = new Map();
  private progressCallbacks: Map<string, (progress: PlaybookExecution) => void> = new Map();

  constructor() {
    this.scriptGenerator = new ScriptGenerator();
  }

  setBrowserEngine(engine: BrowserAutomationEngine): void {
    this.browserEngine = engine;
  }

  async executePlaybook(
    playbookId: string,
    title: string,
    steps: PlaybookStep[],
    onProgress?: (progress: PlaybookExecution) => void
  ): Promise<string> {
    const executionId = `exec-${Date.now()}`;
    
    // Sort steps by order and validate dependencies
    const sortedSteps = this.sortStepsByDependencies(steps);
    
    const execution: PlaybookExecution = {
      id: executionId,
      playbookId,
      title,
      status: 'pending',
      startTime: new Date(),
      totalSteps: sortedSteps.length,
      completedSteps: 0,
      steps: new Map(),
      overallProgress: 0,
      estimatedTimeRemaining: this.calculateTotalEstimatedTime(sortedSteps),
      canRollback: true
    };

    // Initialize step progress
    sortedSteps.forEach(step => {
      execution.steps.set(step.id, {
        stepId: step.id,
        status: 'pending',
        progress: 0
      });
    });

    this.executions.set(executionId, execution);
    
    if (onProgress) {
      this.progressCallbacks.set(executionId, onProgress);
    }

    // Start execution asynchronously
    this.executeStepsSequentially(executionId, sortedSteps);

    return executionId;
  }

  private async executeStepsSequentially(executionId: string, steps: PlaybookStep[]): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'running';
    this.notifyProgress(executionId);

    try {
      for (const step of steps) {
        if (execution.status === 'cancelled') {
          break;
        }

        // Check if dependencies are met
        if (!this.areDependenciesMet(step, execution)) {
          this.updateStepProgress(executionId, step.id, {
            status: 'failed',
            error: 'Dependencies not met',
            progress: 0
          });
          continue;
        }

        // Check skip condition
        if (step.skipCondition && await step.skipCondition()) {
          this.updateStepProgress(executionId, step.id, {
            status: 'skipped',
            progress: 100,
            message: 'Step skipped due to condition'
          });
          continue;
        }

        execution.currentStep = step.id;
        await this.executeStep(executionId, step);
      }

      // Mark execution as completed if all steps succeeded
      const allStepsCompleted = Array.from(execution.steps.values())
        .every(progress => progress.status === 'completed' || progress.status === 'skipped');

      execution.status = allStepsCompleted ? 'completed' : 'failed';
      execution.endTime = new Date();
      execution.overallProgress = 100;
      execution.estimatedTimeRemaining = 0;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      console.error('Playbook execution failed:', error);
    }

    this.notifyProgress(executionId);
  }

  private async executeStep(executionId: string, step: PlaybookStep): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const stepProgress = execution.steps.get(step.id);
    if (!stepProgress) return;

    // Start step execution
    this.updateStepProgress(executionId, step.id, {
      status: 'running',
      startTime: new Date(),
      progress: 0,
      message: `Starting: ${step.title}`
    });

    try {
      let result: any;

      switch (step.type) {
        case 'browser':
          result = await this.executeBrowserStep(step);
          break;
        case 'script':
          result = await this.executeScriptStep(step);
          break;
        case 'verification':
          result = await this.executeVerificationStep(step);
          break;
        case 'manual':
          result = await this.executeManualStep(step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Mark step as completed
      this.updateStepProgress(executionId, step.id, {
        status: 'completed',
        endTime: new Date(),
        progress: 100,
        result,
        message: `Completed: ${step.title}`
      });

      execution.completedSteps++;

    } catch (error) {
      this.updateStepProgress(executionId, step.id, {
        status: 'failed',
        endTime: new Date(),
        progress: 0,
        error: error instanceof Error ? error.message : String(error),
        message: `Failed: ${step.title}`
      });
    }

    // Update overall progress
    this.updateOverallProgress(executionId);
  }

  private async executeBrowserStep(step: PlaybookStep): Promise<any> {
    if (!this.browserEngine || !step.browserActions) {
      throw new Error('Browser engine not available or no browser actions defined');
    }

    const results = [];
    for (const action of step.browserActions) {
      const result = await this.browserEngine.executeAction(action);
      results.push(result);
      
      if (!result.success) {
        throw new Error(`Browser action failed: ${result.error}`);
      }
    }

    return results;
  }

  private async executeScriptStep(step: PlaybookStep): Promise<any> {
    if (!step.scriptTemplate) {
      throw new Error('No script template defined for script step');
    }

    // Generate script
    const script = await this.scriptGenerator.generateScript(
      step.scriptTemplate,
      step.scriptVariables || {},
      this.detectPlatform()
    );

    // For now, return the generated script (actual execution would require user consent)
    return {
      scriptGenerated: true,
      scriptId: script.id,
      requiresConsent: script.requiresConsent,
      riskLevel: script.riskAssessment.level
    };
  }

  private async executeVerificationStep(step: PlaybookStep): Promise<any> {
    if (!step.verificationCriteria) {
      throw new Error('No verification criteria defined');
    }

    const criteria = step.verificationCriteria;

    switch (criteria.type) {
      case 'element_exists':
        if (!criteria.selector) throw new Error('Selector required for element_exists verification');
        const element = document.querySelector(criteria.selector);
        return { verified: !!element, element: !!element };

      case 'element_text':
        if (!criteria.selector || !criteria.expectedValue) {
          throw new Error('Selector and expected value required for element_text verification');
        }
        const textElement = document.querySelector(criteria.selector);
        const actualText = textElement?.textContent?.trim();
        const verified = actualText === criteria.expectedValue;
        return { verified, actualText, expectedText: criteria.expectedValue };

      case 'url_contains':
        if (!criteria.expectedValue) throw new Error('Expected value required for url_contains verification');
        const urlVerified = window.location.href.includes(criteria.expectedValue);
        return { verified: urlVerified, currentUrl: window.location.href };

      case 'custom':
        if (!criteria.customCheck) throw new Error('Custom check function required');
        const customResult = await criteria.customCheck();
        return { verified: customResult };

      default:
        throw new Error(`Unknown verification type: ${criteria.type}`);
    }
  }

  private async executeManualStep(step: PlaybookStep): Promise<any> {
    // Manual steps require user interaction
    // For now, we'll simulate completion after a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          manualStep: true,
          instructions: step.manualInstructions,
          completed: true
        });
      }, 2000); // Simulate 2 second delay for manual step
    });
  }

  private updateStepProgress(executionId: string, stepId: string, updates: Partial<ExecutionProgress>): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const stepProgress = execution.steps.get(stepId);
    if (!stepProgress) return;

    Object.assign(stepProgress, updates);
    execution.steps.set(stepId, stepProgress);

    this.notifyProgress(executionId);
  }

  private updateOverallProgress(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const totalSteps = execution.totalSteps;
    const completedSteps = Array.from(execution.steps.values())
      .filter(step => step.status === 'completed' || step.status === 'skipped').length;

    execution.overallProgress = Math.round((completedSteps / totalSteps) * 100);
    execution.completedSteps = completedSteps;

    // Update estimated time remaining
    const remainingSteps = totalSteps - completedSteps;
    const avgTimePerStep = 30; // seconds, rough estimate
    execution.estimatedTimeRemaining = remainingSteps * avgTimePerStep;
  }

  private notifyProgress(executionId: string): void {
    const execution = this.executions.get(executionId);
    const callback = this.progressCallbacks.get(executionId);
    
    if (execution && callback) {
      callback({ ...execution });
    }
  }

  private sortStepsByDependencies(steps: PlaybookStep[]): PlaybookStep[] {
    const sorted: PlaybookStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (step: PlaybookStep) => {
      if (visiting.has(step.id)) {
        throw new Error(`Circular dependency detected involving step: ${step.id}`);
      }
      if (visited.has(step.id)) return;

      visiting.add(step.id);

      // Visit dependencies first
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          const depStep = steps.find(s => s.id === depId);
          if (depStep) {
            visit(depStep);
          }
        }
      }

      visiting.delete(step.id);
      visited.add(step.id);
      sorted.push(step);
    };

    // Sort by order first, then handle dependencies
    const orderSorted = [...steps].sort((a, b) => a.order - b.order);
    
    for (const step of orderSorted) {
      visit(step);
    }

    return sorted;
  }

  private areDependenciesMet(step: PlaybookStep, execution: PlaybookExecution): boolean {
    if (!step.dependencies) return true;

    return step.dependencies.every(depId => {
      const depProgress = execution.steps.get(depId);
      return depProgress?.status === 'completed';
    });
  }

  private calculateTotalEstimatedTime(steps: PlaybookStep[]): number {
    return steps.reduce((total, step) => total + step.estimatedTime, 0);
  }

  private detectPlatform(): 'windows' | 'macos' | 'linux' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    return 'linux';
  }

  // Public methods for managing executions
  getExecution(executionId: string): PlaybookExecution | undefined {
    return this.executions.get(executionId);
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return false;

    execution.status = 'cancelled';
    execution.endTime = new Date();
    this.notifyProgress(executionId);
    return true;
  }

  async rollbackExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || !execution.canRollback) return false;

    // Implement rollback logic here
    // This would reverse completed steps in reverse order
    console.log(`Rolling back execution: ${executionId}`);
    return true;
  }

  getAllExecutions(): PlaybookExecution[] {
    return Array.from(this.executions.values());
  }

  clearCompletedExecutions(): void {
    for (const [id, execution] of this.executions.entries()) {
      if (execution.status === 'completed' || execution.status === 'failed') {
        this.executions.delete(id);
        this.progressCallbacks.delete(id);
      }
    }
  }
}
