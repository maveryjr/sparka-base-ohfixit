import 'server-only';

import { tool } from 'ai';
import { z } from 'zod';

const AnalyzeInput = z.object({
  script: z.string().min(1),
  shell: z.enum(['bash', 'zsh', 'powershell', 'cmd']).default('bash'),
  platform: z.enum(['windows', 'macos', 'linux']).optional(),
});

const AnalyzeOutput = z.object({
  level: z.enum(['low', 'medium', 'high']),
  factors: z.array(z.string()),
  mitigations: z.array(z.string()),
  requiresConsent: z.boolean(),
});

export const analyzeScript = tool({
  description: 'Static risk analysis for shell/PowerShell scripts prior to execution; returns risk level and mitigations.',
  inputSchema: AnalyzeInput,
  execute: async ({ script, shell, platform }) => {
    const factors: string[] = [];
    const mitigations: string[] = [];

    const riskyPatterns: Array<{ re: RegExp; label: string; mitigation: string; level: 'low'|'medium'|'high' }>
      = [
        { re: /(rm\s+-rf\s+\/?(?!\/tmp\b|\.)\S+)/i, label: 'Recursive delete', mitigation: 'Confirm target path and create backup', level: 'high' },
        { re: /:\\Windows\\System32|\/System\//i, label: 'System path modification', mitigation: 'Avoid changing system directories', level: 'high' },
        { re: /(sudo\s+|Start-Process\s+Power\w*\s+-Verb\s+RunAs)/i, label: 'Privilege escalation', mitigation: 'Prompt user and log consent', level: 'medium' },
        { re: /(netsh\s+|ifconfig\s+|networksetup\s+)/i, label: 'Network reconfiguration', mitigation: 'Warn about connectivity drop', level: 'medium' },
        { re: /(killall\s+|Stop-Process\s+)/i, label: 'Process termination', mitigation: 'Ensure safe targets', level: 'low' },
      ];

    let maxLevel: 'low'|'medium'|'high' = 'low';
    for (const pat of riskyPatterns) {
      if (pat.re.test(script)) {
        factors.push(pat.label);
        mitigations.push(pat.mitigation);
        if (pat.level === 'high') maxLevel = 'high';
        else if (pat.level === 'medium' && maxLevel !== 'high') maxLevel = 'medium';
      }
    }

    const requiresConsent = maxLevel !== 'low' || /sudo|RunAs/i.test(script);
    return { level: maxLevel, factors, mitigations, requiresConsent } as z.infer<typeof AnalyzeOutput>;
  },
});

export default analyzeScript;

