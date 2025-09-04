import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';
import type { FileUIPart } from 'ai';

const OcrInput = z.object({
  attachments: z.array(z.any()).default([]),
});

export type OcrInput = z.infer<typeof OcrInput>;

export const OcrOutput = z.object({
  extractedText: z.string(),
  redactedText: z.string(),
  redactions: z.array(z.object({
    kind: z.enum(['email', 'phone', 'secret']),
    value: z.string(),
    replacement: z.string(),
  })),
});

export type OcrOutput = z.infer<typeof OcrOutput>;

export function redactText(text: string) {
  const redactions: Array<{ kind: 'email'|'phone'|'secret'; value: string; replacement: string }> = [];
  let redacted = text;

  // Emails
  redacted = redacted.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => {
    redactions.push({ kind: 'email', value: m, replacement: '<redacted-email>' });
    return '<redacted-email>';
  });
  // Phone numbers (very rough)
  redacted = redacted.replace(/(?:\+?\d[\s-]?)?(?:\(\d{3}\)|\d{3})[\s-]?\d{3}[\s-]?\d{4}/g, (m) => {
    redactions.push({ kind: 'phone', value: m, replacement: '<redacted-phone>' });
    return '<redacted-phone>';
  });
  // Secrets-like tokens (API keys patterns - rough)
  redacted = redacted.replace(/(sk-[A-Za-z0-9]{10,}|AIza[0-9A-Za-z\-_]{20,}|ghp_[0-9A-Za-z]{20,})/g, (m) => {
    redactions.push({ kind: 'secret', value: m, replacement: '<redacted-secret>' });
    return '<redacted-secret>';
  });

  return { redacted, redactions };
}

async function extractFromAttachments(attachments: FileUIPart[]): Promise<string> {
  // Placeholder extraction: use attachment filenames and any provided text metadata
  try {
    const lines: string[] = [];
    for (const att of attachments) {
      const anyAtt: any = att;
      const filename = anyAtt.filename || anyAtt.name || '';
      const type = anyAtt.type || anyAtt.contentType || '';
      if (filename) lines.push(`file: ${filename}`);
      if (type) lines.push(`type: ${type}`);
      if (anyAtt.text) lines.push(String(anyAtt.text));
      if (anyAtt.alt) lines.push(String(anyAtt.alt));
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

export async function runScreenshotOcr(attachments: FileUIPart[]): Promise<OcrOutput> {
  const extractedText = await extractFromAttachments(attachments);
  const { redacted, redactions } = redactText(extractedText);
  return { extractedText, redactedText: redacted, redactions };
}

export const screenshotOcr = tool({
  description: 'Extracts text hints from screenshots and redacts sensitive data before model use.',
  inputSchema: OcrInput,
  execute: async ({ attachments }): Promise<OcrOutput> => {
    return runScreenshotOcr(attachments as any);
  },
});

export default screenshotOcr;

