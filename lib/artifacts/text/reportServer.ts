import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamText } from 'ai';

type StreamTextConfig = Parameters<typeof streamText>[0];

export class ReportDocumentWriter {
  private streamTextConfig: StreamTextConfig;

  private reportContent: string;

  constructor(streamTextConfig: StreamTextConfig) {
    this.streamTextConfig = streamTextConfig;
    this.reportContent = '';
  }

  createDocumentHandler = () => {
    return createDocumentHandler<'text'>({
      kind: 'text',
      onCreateDocument: async ({
        title,
        description,
        dataStream,
        prompt,
        selectedModel,
      }) => {
        let draftContent = '';

        const { fullStream } = streamText(this.streamTextConfig);

        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === 'text-delta') {
            const { text } = delta;

            draftContent += text;

            dataStream.write({
              type: 'data-textDelta',
              data: text,
              transient: true,
            });
          }
        }

        this.reportContent = draftContent;
        return draftContent;
      },
      onUpdateDocument: async () => {
        throw new Error('Not implemented');
      },
    });
  };

  getReportContent = () => {
    return this.reportContent;
  };
}
