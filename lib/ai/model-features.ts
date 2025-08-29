import type { ImageModelId, ModelId } from '@/lib/ai/model-id';

export interface ModelFeatures {
  reasoning: boolean;
  functionCalling: boolean;
  knowledgeCutoff?: Date;
  input: {
    image: boolean;
    text: boolean;
    pdf: boolean;
    audio: boolean;
  };
  output: {
    image: boolean;
    text: boolean;
    audio: boolean;
  };
  fixedTemperature?: number;
}

export const modelFeatures: Record<ModelId, ModelFeatures> = {
  'amazon/nova-lite': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'amazon/nova-micro': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'amazon/nova-pro': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'anthropic/claude-3-opus': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'anthropic/claude-3.5-sonnet': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'anthropic/claude-3.5-haiku': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'anthropic/claude-3.7-sonnet': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'anthropic/claude-opus-4': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'anthropic/claude-sonnet-4': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2025-03-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'anthropic/claude-opus-4.1': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-04-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'google/gemini-2.5-flash': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2025-01-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: true,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'google/gemini-2.5-pro': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2025-01-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: true,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'google/gemini-2.0-flash': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-08-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: true,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'google/gemini-2.0-flash-lite': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-08-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: true,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'google/gemini-2.5-flash-lite': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2025-01-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: true,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  'openai/o3-mini': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2023-10-01'),
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/o3': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2025-03-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/o4-mini': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-05-31'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
    fixedTemperature: 1,
  },
  'openai/gpt-4.1': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-06-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-4.1-mini': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-06-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-4.1-nano': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-4o': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2023-10-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-4o-mini': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2023-10-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  'openai/gpt-5': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-10-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-5-mini': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-05-31'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-5-nano': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-05-31'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-4-turbo': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2023-12-01'),
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-3.5-turbo': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2021-09-01'),
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-3.5-turbo-instruct': {
    reasoning: false,
    functionCalling: false,
    knowledgeCutoff: new Date('2021-09-01'),
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-oss-120b': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-04-01'),
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'openai/gpt-oss-20b': {
    reasoning: false,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-04-01'),
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'xai/grok-2': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'xai/grok-2-vision': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'xai/grok-3': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'xai/grok-3-fast': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'xai/grok-3-mini': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'xai/grok-3-mini-fast': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'zai/glm-4.5': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-04-01'),
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'zai/glm-4.5-air': {
    reasoning: true,
    functionCalling: true,
    knowledgeCutoff: new Date('2024-04-01'),
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  // Cohere Command family (official: docs.cohere.com)
  'cohere/command-a': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'cohere/command-r': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'cohere/command-r-plus': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Mistral Pixtral (official: mistral.ai)
  'mistral/pixtral-12b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/pixtral-large': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Meta Llama 3.2 Vision Instruct (official: ai.meta.com)
  'meta/llama-3.2-11b': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: true,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-3.2-90b': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: true,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Perplexity Sonar (official: docs.perplexity.ai)
  'perplexity/sonar': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'perplexity/sonar-pro': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'perplexity/sonar-reasoning': {
    reasoning: true,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'perplexity/sonar-reasoning-pro': {
    reasoning: true,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  // Anthropic legacy 3-series
  'anthropic/claude-3-haiku': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: true,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // DeepSeek
  'deepseek/deepseek-r1': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'deepseek/deepseek-r1-distill-llama-70b': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'deepseek/deepseek-v3': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'deepseek/deepseek-v3.1': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'deepseek/deepseek-v3.1-base': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'deepseek/deepseek-v3.1-thinking': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Google Gemma
  'google/gemma-2-9b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Inception
  'inception/mercury-coder-small': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Meta Llama (text-only)
  'meta/llama-3-70b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-3-8b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-3.1-70b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-3.1-8b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-3.2-1b': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-3.2-3b': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-3.3-70b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-4-maverick': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'meta/llama-4-scout': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Mistral family (text-only unless noted)
  'mistral/codestral': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/devstral-small': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/magistral-medium': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/magistral-small': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/ministral-3b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/ministral-8b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/mistral-large': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/mistral-saba-24b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/mistral-small': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'mistral/mixtral-8x22b-instruct': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Moonshot AI
  'moonshotai/kimi-k2': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Morph
  'morph/morph-v3-fast': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'morph/morph-v3-large': {
    reasoning: false,
    functionCalling: false,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // OpenAI o-series legacy
  'openai/o1': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Vercel v0
  'vercel/v0-1.0-md': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'vercel/v0-1.5-md': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // xAI
  'xai/grok-4': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Zhipu AI (ZAI)
  'zai/glm-4.5v': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: true,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },

  // Alibaba Qwen3 (text-only here)
  'alibaba/qwen-3-14b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'alibaba/qwen-3-235b': {
    reasoning: true,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'alibaba/qwen-3-30b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'alibaba/qwen-3-32b': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
  'alibaba/qwen3-coder': {
    reasoning: false,
    functionCalling: true,
    input: {
      image: false,
      text: true,
      pdf: false,
      audio: false,
    },
    output: {
      image: false,
      text: true,
      audio: false,
    },
  },
};

export const imageModelsFeatures: Partial<Record<ImageModelId, ModelFeatures>> =
  {
    'openai/gpt-image-1': {
      reasoning: false,
      functionCalling: false,
      knowledgeCutoff: new Date('2025-04-01'),
      input: {
        image: true,
        text: true,
        pdf: false,
        audio: false,
      },
      output: {
        image: true,
        text: false,
        audio: false,
      },
    },
  };
