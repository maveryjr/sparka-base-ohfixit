'use client';

// Browser automation engine for safe DOM manipulation
export interface BrowserAction {
  id: string;
  type: 'click' | 'type' | 'scroll' | 'wait' | 'navigate' | 'extract' | 'check';
  selector?: string;
  value?: string;
  url?: string;
  delay?: number;
  expectedResult?: string;
  fallback?: BrowserAction;
}

export interface AutomationContext {
  domain: string;
  allowedDomains: string[];
  maxActions: number;
  timeoutMs: number;
  safetyLevel: 'strict' | 'moderate' | 'permissive';
}

export interface ActionResult {
  success: boolean;
  element?: Element | null;
  value?: any;
  error?: string;
  screenshot?: string;
}

export class BrowserAutomationEngine {
  private context: AutomationContext;
  private actionLog: Array<{ action: BrowserAction; result: ActionResult; timestamp: Date }> = [];
  private isRunning = false;

  constructor(context: AutomationContext) {
    this.context = context;
  }

  async executeAction(action: BrowserAction): Promise<ActionResult> {
    if (!this.isActionSafe(action)) {
      return {
        success: false,
        error: 'Action blocked by safety policy'
      };
    }

    const startTime = Date.now();
    let result: ActionResult;

    try {
      switch (action.type) {
        case 'click':
          result = await this.performClick(action);
          break;
        case 'type':
          result = await this.performType(action);
          break;
        case 'scroll':
          result = await this.performScroll(action);
          break;
        case 'wait':
          result = await this.performWait(action);
          break;
        case 'navigate':
          result = await this.performNavigate(action);
          break;
        case 'extract':
          result = await this.performExtract(action);
          break;
        case 'check':
          result = await this.performCheck(action);
          break;
        default:
          result = {
            success: false,
            error: `Unknown action type: ${action.type}`
          };
      }

      // Log the action
      this.actionLog.push({
        action,
        result,
        timestamp: new Date()
      });

      // Check timeout
      if (Date.now() - startTime > this.context.timeoutMs) {
        return {
          success: false,
          error: 'Action timeout exceeded'
        };
      }

      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      this.actionLog.push({
        action,
        result: errorResult,
        timestamp: new Date()
      });

      return errorResult;
    }
  }

  private async performClick(action: BrowserAction): Promise<ActionResult> {
    if (!action.selector) {
      return { success: false, error: 'Selector required for click action' };
    }

    const element = document.querySelector(action.selector);
    if (!element) {
      return { success: false, error: `Element not found: ${action.selector}` };
    }

    // Safety check - ensure element is clickable and visible
    if (!this.isElementSafe(element)) {
      return { success: false, error: 'Element not safe to click' };
    }

    try {
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Wait a bit for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Perform click
      (element as HTMLElement).click();

      return {
        success: true,
        element,
        value: 'Click performed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Click failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async performType(action: BrowserAction): Promise<ActionResult> {
    if (!action.selector || !action.value) {
      return { success: false, error: 'Selector and value required for type action' };
    }

    const element = document.querySelector(action.selector) as HTMLInputElement | HTMLTextAreaElement;
    if (!element) {
      return { success: false, error: `Element not found: ${action.selector}` };
    }

    if (!this.isElementSafe(element) || !this.isInputElement(element)) {
      return { success: false, error: 'Element not safe for typing' };
    }

    try {
      // Focus the element
      element.focus();
      
      // Clear existing value
      element.value = '';
      
      // Type the new value
      element.value = action.value;
      
      // Trigger input events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      return {
        success: true,
        element,
        value: action.value
      };
    } catch (error) {
      return {
        success: false,
        error: `Type failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async performScroll(action: BrowserAction): Promise<ActionResult> {
    try {
      if (action.selector) {
        const element = document.querySelector(action.selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          return { success: false, error: `Element not found: ${action.selector}` };
        }
      } else {
        // Scroll the page
        const scrollY = action.value ? parseInt(action.value) : 0;
        window.scrollTo({ top: scrollY, behavior: 'smooth' });
      }

      return {
        success: true,
        value: 'Scroll performed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Scroll failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async performWait(action: BrowserAction): Promise<ActionResult> {
    const delay = action.delay || 1000;
    
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      return {
        success: true,
        value: `Waited ${delay}ms`
      };
    } catch (error) {
      return {
        success: false,
        error: `Wait failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async performNavigate(action: BrowserAction): Promise<ActionResult> {
    if (!action.url) {
      return { success: false, error: 'URL required for navigate action' };
    }

    // Safety check - ensure URL is allowed
    if (!this.isUrlSafe(action.url)) {
      return { success: false, error: 'URL not allowed by safety policy' };
    }

    try {
      window.location.href = action.url;
      return {
        success: true,
        value: `Navigated to ${action.url}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async performExtract(action: BrowserAction): Promise<ActionResult> {
    if (!action.selector) {
      return { success: false, error: 'Selector required for extract action' };
    }

    try {
      const elements = document.querySelectorAll(action.selector);
      const values = Array.from(elements).map(el => ({
        text: el.textContent?.trim(),
        html: el.innerHTML,
        attributes: this.getElementAttributes(el)
      }));

      return {
        success: true,
        value: values,
        element: elements[0] || null
      };
    } catch (error) {
      return {
        success: false,
        error: `Extract failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async performCheck(action: BrowserAction): Promise<ActionResult> {
    if (!action.selector) {
      return { success: false, error: 'Selector required for check action' };
    }

    try {
      const element = document.querySelector(action.selector);
      const exists = !!element;
      const visible = element ? this.isElementVisible(element) : false;
      const enabled = element ? !element.hasAttribute('disabled') : false;

      return {
        success: true,
        element,
        value: {
          exists,
          visible,
          enabled,
          text: element?.textContent?.trim(),
          value: (element as HTMLInputElement)?.value
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private isActionSafe(action: BrowserAction): boolean {
    // Check if we're on an allowed domain
    const currentDomain = window.location.hostname;
    if (!this.context.allowedDomains.includes(currentDomain) && 
        !this.context.allowedDomains.includes('*')) {
      return false;
    }

    // Check action limits
    if (this.actionLog.length >= this.context.maxActions) {
      return false;
    }

    // Additional safety checks based on context
    if (this.context.safetyLevel === 'strict') {
      // Only allow very safe actions
      if (action.type === 'navigate' && action.url) {
        return this.isUrlSafe(action.url);
      }
      if (action.selector && this.isDangerousSelector(action.selector)) {
        return false;
      }
    }

    return true;
  }

  private isElementSafe(element: Element): boolean {
    // Check if element is visible and interactable
    if (!this.isElementVisible(element)) {
      return false;
    }

    // Check for dangerous elements
    const tagName = element.tagName.toLowerCase();
    const dangerousTags = ['script', 'iframe', 'object', 'embed'];
    if (dangerousTags.includes(tagName)) {
      return false;
    }

    // Check for dangerous attributes
    if (element.hasAttribute('onclick') && 
        element.getAttribute('onclick')?.includes('javascript:')) {
      return false;
    }

    return true;
  }

  private isInputElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return ['input', 'textarea', 'select'].includes(tagName);
  }

  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           style.opacity !== '0';
  }

  private isUrlSafe(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Check against allowed domains
      if (!this.context.allowedDomains.includes(urlObj.hostname) &&
          !this.context.allowedDomains.includes('*')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private isDangerousSelector(selector: string): boolean {
    const dangerousPatterns = [
      /javascript:/i,
      /eval\(/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /outerHTML\s*=/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(selector));
  }

  private getElementAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  async executeSequence(actions: BrowserAction[]): Promise<ActionResult[]> {
    this.isRunning = true;
    const results: ActionResult[] = [];

    try {
      for (const action of actions) {
        if (!this.isRunning) {
          break; // Allow cancellation
        }

        const result = await this.executeAction(action);
        results.push(result);

        // Stop on first failure unless fallback is available
        if (!result.success && !action.fallback) {
          break;
        }

        // Execute fallback if main action failed
        if (!result.success && action.fallback) {
          const fallbackResult = await this.executeAction(action.fallback);
          results.push(fallbackResult);
        }
      }
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  stop(): void {
    this.isRunning = false;
  }

  getActionLog(): Array<{ action: BrowserAction; result: ActionResult; timestamp: Date }> {
    return [...this.actionLog];
  }

  clearLog(): void {
    this.actionLog = [];
  }

  // Take screenshot for debugging/verification
  async takeScreenshot(): Promise<string | null> {
    try {
      // Use html2canvas or similar library in real implementation
      // For now, return a placeholder
      return 'data:image/png;base64,placeholder';
    } catch {
      return null;
    }
  }
}

// Factory function to create safe automation contexts
export function createAutomationContext(options: {
  allowedDomains?: string[];
  maxActions?: number;
  timeoutMs?: number;
  safetyLevel?: 'strict' | 'moderate' | 'permissive';
}): AutomationContext {
  return {
    domain: window.location.hostname,
    allowedDomains: options.allowedDomains || [window.location.hostname],
    maxActions: options.maxActions || 10,
    timeoutMs: options.timeoutMs || 30000,
    safetyLevel: options.safetyLevel || 'strict'
  };
}
