import { tool } from 'ai';
import { z } from 'zod';

const Input = z.object({
  goal: z.string().min(3),
  urgency: z.enum(['low','medium','high']).default('medium'),
  hasAttachments: z.boolean().default(false),
});

type PlanItem = {
  id: string;
  kind: 'quick_fix' | 'guide' | 'playbook' | 'automation';
  tool: 'oneClickFixTool' | 'guideSteps' | 'getPlaybook' | 'automation';
  rationale: string;
  prompt: string; // text to send as next user message
};

export const orchestrate = tool({
  description: 'Suggests the best next tools (quick fix, guide, playbook, automation) based on the goal and urgency.',
  inputSchema: Input,
  execute: async ({ goal, urgency, hasAttachments }) => {
    const items: PlanItem[] = [];
    const lower = goal.toLowerCase();

    // Quick fix first for urgent or known issues
    if (urgency !== 'low') {
      items.push({
        id: 'quick',
        kind: 'quick_fix',
        tool: 'oneClickFixTool',
        rationale: 'Try fast, low-risk remedies first',
        prompt: `Problem: ${goal}. Find and show one-click fixes I can run.`,
      });
    }

    // If attachments (screenshots), a guide can leverage context better
    items.push({
      id: 'guide',
      kind: 'guide',
      tool: 'guideSteps',
      rationale: hasAttachments ? 'Use screenshot context to tailor steps' : 'Provide concrete, safe steps',
      prompt: `Goal: ${goal}`,
    });

    // For categories likely covered by playbooks
    if (/wifi|network|printer|storage|malware|app|install|update/i.test(lower)) {
      items.push({
        id: 'playbook',
        kind: 'playbook',
        tool: 'getPlaybook',
        rationale: 'Use a curated troubleshooting playbook for common issues',
        prompt: `Symptoms: ${goal}. Recommend a playbook with steps.`,
      });
    }

    // Automation when the goal mentions system actions
    if (/dns|wifi|cache|finder|restart|flush|reset/i.test(lower)) {
      items.push({
        id: 'auto',
        kind: 'automation',
        tool: 'automation',
        rationale: 'Propose safe, consent-gated actions to execute',
        prompt: `Goal: ${goal}. Generate a safe automation plan.`,
      });
    }

    return {
      summary: 'Recommended next steps and matching tools',
      items,
    };
  },
});

export default orchestrate;

