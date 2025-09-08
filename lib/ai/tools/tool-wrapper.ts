import type { Tool } from 'ai';
import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('tools.wrapper');

/**
 * Wraps a tool to add error handling and result validation to prevent _zod errors
 */
export function wrapToolForSafety<TInput, TOutput>(
  tool: Tool<TInput, TOutput>,
  toolName: string
): Tool<TInput, TOutput> {
  return {
    ...tool,
    execute: async (input: TInput): Promise<TOutput> => {
      try {
        log.debug({ toolName, input }, 'Executing tool');
        
        const result = await tool.execute(input);
        
        // Validate that the result is not undefined or null
        if (result === undefined || result === null) {
          log.warn({ toolName }, 'Tool returned null or undefined result');
          // Return a safe default result rather than undefined
          return {} as TOutput;
        }
        
        // Validate that the result is serializable (no functions, symbols, etc.)
        try {
          JSON.stringify(result);
        } catch (serializationError) {
          log.error({ 
            toolName, 
            error: serializationError,
            resultType: typeof result 
          }, 'Tool returned non-serializable result');
          
          // Return a safe error response
          return {
            error: 'Tool execution completed but result is not serializable',
            originalError: serializationError instanceof Error ? serializationError.message : 'Unknown serialization error'
          } as unknown as TOutput;
        }
        
        log.debug({ toolName, resultType: typeof result }, 'Tool executed successfully');
        return result;
        
      } catch (error) {
        log.error({ 
          toolName, 
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : error 
        }, 'Tool execution failed');
        
        // Return a safe error response rather than throwing
        return {
          error: `Tool ${toolName} execution failed`,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: String(error)
        } as unknown as TOutput;
      }
    }
  };
}

/**
 * Wraps all tools in a tools object for safety
 */
export function wrapAllToolsForSafety<T extends Record<string, any>>(tools: T): T {
  const wrappedTools = {} as T;
  
  for (const [name, tool] of Object.entries(tools)) {
    if (tool && typeof tool === 'object' && typeof tool.execute === 'function') {
      wrappedTools[name as keyof T] = wrapToolForSafety(tool, name);
    } else {
      // Keep non-tool objects as-is
      wrappedTools[name as keyof T] = tool;
    }
  }
  
  return wrappedTools;
}