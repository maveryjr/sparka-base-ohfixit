import type { ToolCall } from '@ai-sdk/provider-utils';
import {
  tool,
  type ModelMessage,
  type AssistantModelMessage,
  type ToolModelMessage,
} from 'ai';
import { z } from 'zod';
import type { ArtifactToolResult } from '../artifact-tool-result';

//##################
// Structured Outputs (Zod Schemas)
//##################

export const ConductResearchSchema = z.object({
  /**
   * Call this tool to conduct research on a specific topic.
   */
  research_topic: z
    .string()
    .describe(
      'The topic to research. Should be a single topic, and should be described in high detail (at least a paragraph).',
    ),
});

export const ResearchCompleteSchema = z.object({
  /**
   * Call this tool to indicate that the research is complete.
   */
});

export const SummarySchema = z.object({
  summary: z.string(),
  key_excerpts: z.string(),
});

export const ClarifyWithUserSchema = z.object({
  need_clarification: z
    .boolean()
    .describe('Whether the user needs to be asked a clarifying question.'),
  question: z
    .string()
    .describe('A question to ask the user to clarify the report scope'),
  verification: z
    .string()
    .describe(
      'Verify message that we will start research after the user has provided the necessary information.',
    ),
});

export const ResearchQuestionSchema = z.object({
  research_brief: z
    .string()
    .describe('A research question that will be used to guide the research.'),
  title: z.string().describe('The title of the research report.'),
});

export type ConductResearch = z.infer<typeof ConductResearchSchema>;
export type ResearchComplete = z.infer<typeof ResearchCompleteSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type ClarifyWithUser = z.infer<typeof ClarifyWithUserSchema>;
export type ResearchQuestion = z.infer<typeof ResearchQuestionSchema>;

//##################
// State Definitions
//##################

export interface AgentInputState {
  requestId: string;
  messageId: string;
  messages: ModelMessage[];
}

export interface AgentState {
  requestId: string;
  inputMessages: ModelMessage[];
  supervisor_messages: ModelMessage[];
  research_brief?: string;
  raw_notes: string[];
  notes: string[];
  final_report: string;
  reportResult: ArtifactToolResult;
  clarificationMessage?: string;
}

export type DeepResearchResult =
  | {
      type: 'clarifying_question';
      data: string;
    }
  | {
      type: 'report';
      data: ArtifactToolResult;
    };

export type ResponseMessage = AssistantModelMessage | ToolModelMessage;

export const leadResearcherTools = {
  conductResearch: tool({
    description: 'Call this tool to conduct research on a specific topic.',
    inputSchema: ConductResearchSchema,
    // No execute function - will be handled with custom execution
  }),
  researchComplete: tool({
    description: 'Call this tool to indicate that the research is complete.',
    inputSchema: ResearchCompleteSchema,
    // No execute function - will be handled with custom execution
  }),
};

export interface SupervisorState {
  requestId: string;
  supervisor_messages: ModelMessage[];
  tool_calls: ToolCall<string, any>[];
  research_brief: string;
  notes: string[];
  research_iterations: number;
  raw_notes: string[];
}

export interface ResearcherState {
  requestId: string;
  researcher_messages: ModelMessage[];
  tool_calls: ToolCall<string, any>[];
  tool_call_iterations: number;
  research_topic: string;
  compressed_research: string;
  raw_notes: string[];
}

export interface ResearcherOutputState {
  compressed_research: string;
  raw_notes: string[];
}

//##################
// Node IO
//##################

export interface ClarifyWithUserInput {
  requestId: string;
  messages: ModelMessage[];
}

export interface WriteResearchBriefInput {
  requestId: string;
  messages: ModelMessage[];
}

export interface WriteResearchBriefOutput {
  research_brief: string;
  title: string;
}

export interface SupervisorInput {
  requestId: string;
  supervisor_messages: ModelMessage[];
  research_brief: string;
  notes: string[];
  research_iterations: number;
  raw_notes: string[];
  tool_calls: ToolCall<string, any>[];
}

export interface SupervisorOutput {
  supervisor_messages: ModelMessage[];
  tool_calls: ToolCall<string, any>[];
  research_iterations: number;
}

export interface SupervisorToolsInput {
  requestId: string;
  supervisor_messages: ModelMessage[];
  research_brief: string;
  research_iterations: number;
  tool_calls: ToolCall<string, any>[];
}

export interface SupervisorToolsOutput {
  supervisor_messages: ModelMessage[];
  raw_notes: string[];
}

export interface ResearcherInput {
  requestId: string;
  researcher_messages: ModelMessage[];
  research_topic: string;
  tool_call_iterations: number;
}

export interface ResearcherOutput {
  researcher_messages: ModelMessage[];
  tool_calls: ToolCall<string, any>[];
  tool_call_iterations: number;
}

export interface CompressResearchInput {
  requestId: string;
  researcher_messages: ModelMessage[];
}

export type EndState =
  | {
      end_type: 'clarification_needed';
      messages: ModelMessage[];
    }
  | {
      end_type: 'research_complete';
      notes: string[];
      research_brief: string;
    };
