import { sheetPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { getLanguageModel } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamObject } from 'ai';
import { z } from 'zod';

export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
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
      system: sheetPrompt,
      experimental_telemetry: { isEnabled: true },
      prompt,
      schema: z.object({
        csv: z.string().describe('CSV data'),
      }),
      ...(typeof temp === 'number' && !Number.isNaN(temp) ? { temperature: temp } : {}),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    dataStream.write({
      type: 'data-sheetDelta',
      data: draftContent,
      transient: true,
    });

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
      system: updateDocumentPrompt(document.content, 'sheet'),
      experimental_telemetry: { isEnabled: true },
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
      ...(typeof temp2 === 'number' && !Number.isNaN(temp2) ? { temperature: temp2 } : {}),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    return draftContent;
  },
});
