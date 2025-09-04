import { z } from 'zod';
import { streamObject } from 'ai';
import { getLanguageModel } from '@/lib/ai/providers';
import { codePrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';

export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  onCreateDocument: async ({
    title,
    description,
    dataStream,
    prompt,
    selectedModel,
  }) => {
    let draftContent = '';

    const temp = process.env.AI_JSON_TEMP ? Number(process.env.AI_JSON_TEMP) : undefined;
    const { fullStream } = streamObject({
      model: getLanguageModel(selectedModel),
      system: codePrompt,
      prompt,
      experimental_telemetry: { isEnabled: true },
      schema: z.object({
        code: z.string(),
      }),
      ...(typeof temp === 'number' && !Number.isNaN(temp) ? { temperature: temp } : {}),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: 'data-codeDelta',
            data: code ?? '',
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({
    document,
    description,
    dataStream,
    selectedModel,
  }) => {
    let draftContent = '';

    const temp2 = process.env.AI_JSON_TEMP ? Number(process.env.AI_JSON_TEMP) : undefined;
    const { fullStream } = streamObject({
      model: getLanguageModel(selectedModel),
      system: updateDocumentPrompt(document.content || '', 'code'),
      experimental_telemetry: { isEnabled: true },
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
      ...(typeof temp2 === 'number' && !Number.isNaN(temp2) ? { temperature: temp2 } : {}),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: 'data-codeDelta',
            data: code ?? '',
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
});
