import 'server-only';

import { tool, type Tool } from 'ai';
import { z } from 'zod';
import type { ModelMessage, FileUIPart } from 'ai';
import type { Session } from 'next-auth';
import type { ModelId } from '@/lib/ai/model-id';
import type { StreamWriter } from '../../types';
import { generateObject } from 'ai';
import { getLanguageModel } from '@/lib/ai/providers';
import buildDiagnosticsContext from '@/lib/ohfixit/diagnostics-context';

// Schema for a single guide step
export const GuideStepSchema = z.object({
  id: z.string().describe('Stable id for the step'),
  title: z.string().min(3).max(120).describe('Short user-facing title'),
  rationale: z
    .string()
    .min(3)
    .max(400)
    .describe('Why this step is recommended in plain language'),
  actions: z
    .array(
      z.object({
        kind: z
          .enum(['instruction', 'open_url', 'check_setting'])
          .describe('Action type to suggest to the user'),
        text: z
          .string()
          .min(1)
          .max(400)
          .describe('Concrete instruction users can follow'),
        url: z.string().url().optional().describe('URL to open if applicable'),
      }),
    )
    .min(1)
    .max(10)
    .describe('One or more concrete actions that the user can try'),
  fallback: z
    .string()
    .min(3)
    .max(200)
    .optional()
    .describe('What to try next if this step did not work'),
});

export type GuideStep = z.infer<typeof GuideStepSchema>;

export const GuidePlanSchema = z.object({
  summary: z
    .string()
    .min(3)
    .max(300)
    .describe('High-level summary of the plan in user-friendly terms'),
  steps: z.array(GuideStepSchema).min(1).max(12),
});

export type GuidePlan = z.infer<typeof GuidePlanSchema>;

// Enhanced inputs to the tool with AI analysis capabilities
export const GuideInputsSchema = z.object({
  goal: z
    .string()
    .min(3)
    .max(300)
    .describe('User goal/problem statement extracted from conversation'),
  contextHint: z
    .string()
    .max(500)
    .optional()
    .describe('Optional context like OS/app or recent screenshot description'),
  attachments: z
    .array(z.any())
    .optional()
    .describe('Screenshots and files attached to the message'),
  diagnosticsContext: z
    .string()
    .optional()
    .describe('System diagnostics and client information'),
  conversationContext: z
    .array(z.any())
    .optional()
    .describe('Previous messages and context for better understanding'),
});

export type GuideInputs = z.infer<typeof GuideInputsSchema>;

// Schema for AI-powered issue analysis
export const IssueAnalysisSchema = z.object({
  issueType: z.string().describe('The specific type of technical issue detected'),
  errorCodes: z.array(z.string()).optional().describe('Any error codes or messages detected'),
  affectedComponents: z.array(z.string()).describe('System components, applications, or hardware affected'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('How critical this issue appears to be'),
  context: z.string().describe('Additional context about the issue from screenshots and diagnostics'),
  recommendedApproach: z.string().describe('High-level approach to resolve this specific issue'),
});

export type IssueAnalysis = z.infer<typeof IssueAnalysisSchema>;

// Issue pattern detection and categorization
interface IssuePattern {
  pattern: RegExp;
  category: string;
  errorCode?: string;
  description: string;
}

const ISSUE_PATTERNS: IssuePattern[] = [
  // Windows drive mapping conflicts
  {
    pattern: /(local device name is already in use|ERROR_ALREADY_ASSIGNED|drive mapping conflict|net use)/i,
    category: 'windows_drive_mapping_conflict',
    errorCode: '85',
    description: 'Network drive mapping conflict (The local device name is already in use)'
  },
  // Printer errors
  {
    pattern: /(?:0x000004005|cannot connect to network printer|printer installation stuck|HP LaserJet|Hewlett-Packard)/i,
    category: 'printer_error',
    errorCode: '0x000004005',
    description: 'Network printer connection/installation error'
  },
  {
    pattern: /(?:0x0000007c|printer offline|printer not responding)/i,
    category: 'printer_error',
    errorCode: '0x0000007c',
    description: 'Printer offline or not responding'
  },
  {
    pattern: /(?:0x000006e4|printer spooler|spooler service)/i,
    category: 'printer_error',
    errorCode: '0x000006e4',
    description: 'Print spooler service error'
  },
  // Network errors
  {
    pattern: /(?:DNS|dns probe finished no internet|unable to resolve host)/i,
    category: 'network_error',
    description: 'DNS resolution or network connectivity issue'
  },
  {
    pattern: /(?:wifi|wi-fi|wireless|internet connection|no internet)/i,
    category: 'network_error',
    description: 'Wi-Fi or internet connectivity issue'
  },
  {
    pattern: /(?:ERR_NETWORK_CHANGED|network changed|connection reset)/i,
    category: 'network_error',
    description: 'Network connection changed or reset'
  },
  // Windows system errors
  {
    pattern: /(?:windows update|windows 10|windows 11)/i,
    category: 'windows_system',
    description: 'Windows system or update issue'
  },
  {
    pattern: /(?:0x80070005|access denied|permission denied)/i,
    category: 'windows_system',
    errorCode: '0x80070005',
    description: 'Access denied or permission error'
  },
  {
    pattern: /(?:0x80070490|element not found|component store)/i,
    category: 'windows_system',
    errorCode: '0x80070490',
    description: 'Windows component store corruption'
  },
  // Driver errors
  {
    pattern: /(?:driver|device manager|hardware not recognized)/i,
    category: 'driver_error',
    description: 'Device driver or hardware recognition issue'
  },
  {
    pattern: /(?:code 10|code 28|code 31|code 39|code 41|code 43)/i,
    category: 'driver_error',
    description: 'Device Manager error codes'
      return [
  // Application errors
  {
    pattern: /(?:application not responding|app frozen|program not responding)/i,
    category: 'application_error',
    description: 'Application freezing or not responding'
            { kind: 'instruction' as const, text: 'Restart the affected application or system component.' },
            { kind: 'instruction' as const, text: 'Check if the issue persists after restart.' },
    pattern: /(?:runtime error|exception|crash|has stopped working)/i,
    category: 'application_error',
    description: 'Application crash or runtime error'
  },
  // Browser errors
  {
    pattern: /(?:ERR_CONNECTION_REFUSED|connection refused|site cannot be reached)/i,
    category: 'browser_error',
            { kind: 'instruction' as const, text: 'Open Command Prompt as Administrator.' },
            { kind: 'instruction' as const, text: 'List network mappings: `net use`' },
            { kind: 'instruction' as const, text: 'List logical disks: `wmic logicaldisk get name,providername`' },
            { kind: 'instruction' as const, text: 'Optional — list volumes: `diskpart` ➜ `list volume` (then `exit`)' },
            { kind: 'instruction' as const, text: 'Optional (PowerShell) — list PSDrives: `Get-PSDrive -PSProvider FileSystem`' },
            { kind: 'instruction' as const, text: 'Check for subst mappings: `subst`' }
  },
  // Hardware errors
  {
    pattern: /(?:blue screen|bsod|stop code|0x0000000a|0x0000001e)/i,
    category: 'hardware_error',
    description: 'Blue screen of death or system crash'
  },
  {
            { kind: 'instruction' as const, text: 'If G: appears in `net use`, remove it: `net use G: /delete /yes`' },
            { kind: 'instruction' as const, text: 'If G: is a local volume (from `wmic`/`diskpart`), eject/unmount or change its letter.' },
            { kind: 'instruction' as const, text: 'If a subst exists for G:, remove it: `subst G: /d`' },
            { kind: 'instruction' as const, text: 'If a PSDrive named G exists, remove it: `Remove-PSDrive -Name G`' },
            { kind: 'instruction' as const, text: 'If multiple mappings exist, carefully clear all network mappings: `net use * /delete` (then re-create only the desired one)' }

// Generate specific steps based on detected issue category
function generateStepsForIssue(category: string, errorCode?: string, context?: string): GuideStep[] {
  switch (category) {
    case 'windows_drive_mapping_conflict':
      return [
        {
          actions: []
          actions: [
            { kind: 'instruction', text: 'Restart the affected application or system component.' },
            { kind: 'instruction', text: 'Check if the issue persists after restart.' },
          ],
          fallback: 'If the issue remains after restart, proceed to specific diagnostics.'
        },
            { kind: 'instruction' as const, text: 'Review sign-in/login scripts or Group Policy Preferences that map G: at logon; ensure they skip if already mapped.' },
            { kind: 'instruction' as const, text: 'Check startup tasks or scripts for repeated mapping commands without cleanup.' }
          title: 'Enumerate current drives and mappings',
          rationale: 'Identify what is already using the target drive letter (e.g., G:).',
          actions: [
            { kind: 'instruction', text: 'Open Command Prompt as Administrator.' },
            { kind: 'instruction', text: 'List network mappings: `net use`' },
            { kind: 'instruction', text: 'List logical disks: `wmic logicaldisk get name,providername`' },
            { kind: 'instruction', text: 'Optional — list volumes: `diskpart` ➜ `list volume` (then `exit`)' },
            { kind: 'instruction', text: 'Optional (PowerShell) — list PSDrives: `Get-PSDrive -PSProvider FileSystem`' },
            { kind: 'instruction' as const, text: 'Run `net use` to confirm G: points to the expected path and Status is OK.' },
            { kind: 'instruction' as const, text: 'If the problem recurs, check Event Viewer (System and Applications) for drive mapping events.' }
          fallback: 'Proceed to clear any conflicting or stale mappings found.'
        },
        {
          id: 'clear-conflicts',
          title: 'Clear conflicting or stale mappings',
          rationale: 'Remove mappings that occupy the letter or conflict with the desired network path.',
          actions: [
            { kind: 'instruction', text: 'If G: appears in `net use`, remove it: `net use G: /delete /yes`' },
            { kind: 'instruction' as const, text: 'If a local/removable device uses G:, reassign it to another letter or disconnect it.' },
            { kind: 'instruction' as const, text: 'If a subst drive frequently uses the path, remove the subst or choose a different letter for the network share.' },
            { kind: 'instruction' as const, text: 'As a workaround, map to a different letter (e.g., Z:) and update scripts/expectations accordingly.' }
            { kind: 'instruction', text: 'If multiple mappings exist, carefully clear all network mappings: `net use * /delete` (then re-create only the desired one)' }
          ],
          fallback: 'After clearing conflicts, re-map the network drive.'
        },
        {
          id: 'remap-reliably',
            { kind: 'instruction' as const, text: 'Map after ensuring G: is free: `net use G: "\\\\server\\share" /persistent:yes`' },
            { kind: 'instruction' as const, text: 'If credentials are needed: `net use G: "\\\\server\\share" /user:DOMAIN\\user password /persistent:yes`' },
            { kind: 'instruction' as const, text: 'If G: keeps conflicting, temporarily map to Z: to verify the share works, then investigate why G: is in use.' }
            { kind: 'instruction', text: 'Map after ensuring G: is free: `net use G: \\\\\\\\\\u{005C} `' }
          ].slice(0,1) // placeholder overwritten below
        },
        {
          id: 'policy-scripts',
          title: 'Optional checks for policy/script interference',
          rationale: 'Login scripts or Group Policy Preferences can auto-map drives repeatedly.',
          actions: [
            { kind: 'instruction', text: 'Review sign-in/login scripts or Group Policy Preferences that map G: at logon; ensure they skip if already mapped.' },
            { kind: 'instruction', text: 'Check startup tasks or scripts for repeated mapping commands without cleanup.' }
          ],
          fallback: 'If policies/scripts are clean, verify mapping success and logs.'
        },
        {
          id: 'verify-and-log',
          title: 'Verification and logging',
          rationale: 'Confirm the mapping and gather evidence if the issue recurs.',
          actions: [
            { kind: 'instruction', text: 'Run `net use` to confirm G: points to the expected path and Status is OK.' },
            { kind: 'instruction', text: 'If the problem recurs, check Event Viewer (System and Applications) for drive mapping events.' }
          ],
          fallback: 'If intermittent, consider workarounds below.'
        },
        {
          id: 'workarounds',
          title: 'Troubleshooting pitfalls and workarounds',
          rationale: 'Provide alternatives if G: must remain free or is frequently occupied.',
          actions: [
            { kind: 'instruction', text: 'If a local/removable device uses G:, reassign it to another letter or disconnect it.' },
            { kind: 'instruction', text: 'If a subst drive frequently uses the path, remove the subst or choose a different letter for the network share.' },
            { kind: 'instruction', text: 'As a workaround, map to a different letter (e.g., Z:) and update scripts/expectations accordingly.' }
          ]
        }
      ].map((s) => {
        // Fill the remap step commands (delayed to avoid escaping noise above)
        if (s.id === 'remap-reliably') {
          s.actions = [
            { kind: 'instruction', text: 'Map after ensuring G: is free: `net use G: "\\\\\\\Eir\\d" /persistent:yes`' },
            { kind: 'instruction', text: 'If credentials are needed: `net use G: "\\\\\\\Eir\\d" /user:DOMAIN\\user password /persistent:yes`' },
            { kind: 'instruction', text: 'If G: keeps conflicting, temporarily map to Z: to verify the share works, then investigate why G: is in use.' }
          ];
        }
        return s;
      });
    case 'printer_error':
      if (errorCode === '0x000004005') {
        return [
          {
            id: 'printer-network-check',
            title: 'Verify printer network connectivity',
            rationale: 'This specific error often occurs when the printer cannot be reached on the network.',
            actions: [
              {
                kind: 'instruction',
                text: 'Ensure the printer is powered on and connected to the same network as your PC.',
              },
              {
                kind: 'instruction',
                text: 'Try to access the printer\'s web interface by entering its IP address in a browser.',
              },
              {
                kind: 'instruction',
                text: 'Check if the printer name "HewlettPackardLaserJet2420" is visible in your network devices.',
              }
            ],
            fallback: 'If the printer isn\'t visible on the network, proceed to the next step.'
          },
          {
            id: 'printer-driver-check',
            title: 'Check printer driver and spooler',
            rationale: 'Corrupt printer drivers or spooler issues can prevent proper installation.',
            actions: [
              {
                kind: 'instruction',
                text: 'Open Device Manager and check if there are any printer-related errors (yellow exclamation marks).',
              },
              {
                kind: 'instruction',
                text: 'Restart the Print Spooler service: Open Services (services.msc), find "Print Spooler", right-click and select Restart.',
              },
              {
                kind: 'open_url',
                text: 'Download the latest HP LaserJet 2420 driver from HP\'s official website.',
                url: 'https://support.hp.com/us-en/drivers/laserjet-pro-200-color-m251nw'
              }
            ],
            fallback: 'If the spooler won\'t restart or drivers are missing, try the next step.'
          },
          {
            id: 'printer-connection-methods',
            title: 'Try alternative connection methods',
            rationale: 'Sometimes USB connection works when network installation fails.',
            actions: [
              {
                kind: 'instruction',
                text: 'Try connecting the printer directly via USB cable if available.',
              },
              {
                kind: 'instruction',
                text: 'Remove the printer from Windows and try re-adding it using the IP address instead of network discovery.',
              },
              {
                kind: 'instruction',
                text: 'Check Windows Firewall settings - temporarily disable it to test if it\'s blocking the connection.'
              }
            ]
          }
        ];
      }
      // Generic printer steps
      return [
        {
          id: 'printer-basics',
          title: 'Check printer basics',
          rationale: 'Most printer issues start with basic connectivity problems.',
          actions: [
            { kind: 'instruction', text: 'Ensure the printer is powered on and has paper/toner.' },
            { kind: 'instruction', text: 'Verify the printer is connected to the network (check router).'},
            { kind: 'instruction', text: 'Try printing a test page directly from the printer.'}
          ],
          fallback: 'If basic connectivity is working, proceed to driver check.'
        },
        {
          id: 'printer-drivers',
          title: 'Update printer drivers',
          rationale: 'Outdated or corrupt drivers cause most printer installation issues.',
          actions: [
            { kind: 'instruction', text: 'Download the latest driver from the manufacturer\'s website.'},
            { kind: 'instruction', text: 'Uninstall old printer drivers before installing new ones.'},
            { kind: 'instruction', text: 'Restart your computer after driver installation.'}
          ],
          fallback: 'If drivers are up to date, check Windows services.'
        }
      ];

    case 'network_error':
      return [
        {
          id: 'network-diagnostics',
          title: 'Run network diagnostics',
          rationale: 'Network issues require systematic troubleshooting.',
          actions: [
            { kind: 'instruction', text: 'Run Windows Network Diagnostics: Settings > Network & Internet > Status > Network troubleshooter.'},
            { kind: 'instruction', text: 'Check if other devices can connect to the same network.'},
            { kind: 'instruction', text: 'Try connecting to a different Wi-Fi network to isolate the issue.'}
          ],
          fallback: 'If diagnostics don\'t identify the issue, check hardware.'
        },
        {
          id: 'network-hardware',
          title: 'Check network hardware',
          rationale: 'Physical network components can fail or need reset.',
          actions: [
            { kind: 'instruction', text: 'Restart your router and modem (unplug for 30 seconds).'},
            { kind: 'instruction', text: 'Check Ethernet cable connections if using wired connection.'},
            { kind: 'instruction', text: 'Update your network adapter drivers in Device Manager.'}
          ],
          fallback: 'If hardware checks out, verify Windows network settings.'
        }
      ];

    case 'windows_system':
      return [
        {
          id: 'windows-updates',
          title: 'Check Windows updates',
          rationale: 'Many Windows issues are resolved through system updates.',
          actions: [
            { kind: 'instruction', text: 'Open Settings > Windows Update and check for updates.'},
            { kind: 'instruction', text: 'Install all available updates, especially optional ones.'},
            { kind: 'instruction', text: 'Restart your computer after installing updates.'}
          ],
          fallback: 'If updates don\'t help, run system maintenance tools.'
        },
        {
          id: 'system-maintenance',
          title: 'Run system maintenance',
          rationale: 'Corrupted system files can cause various Windows issues.',
          actions: [
            { kind: 'instruction', text: 'Run System File Checker: Open Command Prompt as admin and run "sfc /scannow".'},
            { kind: 'instruction', text: 'Run DISM: In admin Command Prompt, run "DISM /Online /Cleanup-Image /RestoreHealth".'},
            { kind: 'instruction', text: 'Check disk for errors: Run "chkdsk /f /r" in admin Command Prompt.'}
          ],
          fallback: 'If maintenance tools find issues, restart and test again.'
        }
      ];

    case 'driver_error':
      return [
        {
          id: 'driver-update',
          title: 'Update device drivers',
          rationale: 'Device recognition issues are usually driver-related.',
          actions: [
            { kind: 'instruction', text: 'Open Device Manager and look for devices with yellow exclamation marks.'},
            { kind: 'instruction', text: 'Right-click problematic devices and select "Update driver".'},
            { kind: 'instruction', text: 'If Windows can\'t find drivers, download them from the manufacturer\'s website.'}
          ],
          fallback: 'If driver updates don\'t work, try uninstalling and reinstalling.'
        },
        {
          id: 'driver-clean-install',
          title: 'Clean driver installation',
          rationale: 'Sometimes a complete driver reinstall is needed.',
          actions: [
            { kind: 'instruction', text: 'Uninstall the device in Device Manager, then restart your computer.'},
            { kind: 'instruction', text: 'Windows should automatically reinstall the driver, or manually install the latest version.'},
            { kind: 'instruction', text: 'Test the device after driver installation.'}
          ]
        }
      ];

    case 'application_error':
      return [
        {
          id: 'app-basic-troubleshooting',
          title: 'Basic application troubleshooting',
          rationale: 'Most application issues can be resolved with simple steps.',
          actions: [
            { kind: 'instruction', text: 'Close the application completely and restart it.'},
            { kind: 'instruction', text: 'Check if the application is up to date in its settings or official website.'},
            { kind: 'instruction', text: 'Try running the application as administrator (right-click > Run as administrator).'}
          ],
          fallback: 'If the issue persists, check for conflicts with other applications.'
        },
        {
          id: 'app-compatibility',
          title: 'Check application compatibility',
          rationale: 'Compatibility issues often cause crashes and errors.',
          actions: [
            { kind: 'instruction', text: 'Check the application\'s system requirements and ensure your system meets them.'},
            { kind: 'instruction', text: 'Run the application in compatibility mode: right-click exe > Properties > Compatibility tab.'},
            { kind: 'instruction', text: 'Temporarily disable antivirus software to check if it\'s interfering.'}
          ],
          fallback: 'Consider reinstalling the application if compatibility issues persist.'
        }
      ];

    case 'browser_error':
      return [
        {
          id: 'browser-network-check',
          title: 'Check browser network settings',
          rationale: 'Browser connection errors often have simple network-related causes.',
          actions: [
            { kind: 'instruction', text: 'Clear browser cache and cookies: Settings > Privacy > Clear browsing data.'},
            { kind: 'instruction', text: 'Try accessing the site in an incognito/private window.'},
            { kind: 'instruction', text: 'Disable browser extensions temporarily to check for conflicts.'}
          ],
          fallback: 'If the issue persists, check your network configuration.'
        },
        {
          id: 'browser-dns',
          title: 'Check DNS and network settings',
          rationale: 'DNS issues can prevent browser connections.',
          actions: [
            { kind: 'instruction', text: 'Flush DNS cache: Open Command Prompt and run "ipconfig /flushdns".'},
            { kind: 'instruction', text: 'Try using Google DNS: Settings > Network > Change adapter options > Properties > IPv4 > Use DNS: 8.8.8.8'},
            { kind: 'instruction', text: 'Restart your router and computer.'}
          ]
        }
      ];

    case 'hardware_error':
      if (context?.includes('blue screen') || context?.includes('bsod')) {
        return [
          {
            id: 'bsod-diagnosis',
            title: 'Analyze BSOD error details',
            rationale: 'Blue screen errors provide specific information about the cause.',
            actions: [
              { kind: 'instruction', text: 'Note the exact stop code and any file mentioned in the BSOD.'},
              { kind: 'instruction', text: 'Check Event Viewer: Windows + R > eventvwr > Windows Logs > System for error details.'},
              { kind: 'instruction', text: 'Update all device drivers, especially graphics and chipset drivers.'}
            ],
            fallback: 'Use the stop code to search for specific solutions online.'
          },
          {
            id: 'hardware-stress-test',
            title: 'Test hardware components',
            rationale: 'BSOD errors are often caused by failing hardware.',
            actions: [
              { kind: 'instruction', text: 'Run Windows Memory Diagnostic: Windows + R > mdsched.exe'},
              { kind: 'instruction', text: 'Check disk health: Windows + R > cmd > chkdsk /f /r'},
              { kind: 'instruction', text: 'Monitor temperatures using Task Manager > Performance tab.'}
            ]
          }
        ];
      }
      return [
        {
          id: 'hardware-basics',
          title: 'Check hardware basics',
          rationale: 'Most hardware issues start with basic checks.',
          actions: [
            { kind: 'instruction', text: 'Check all cable connections and power supplies.'},
            { kind: 'instruction', text: 'Clean dust from vents and fans if overheating is suspected.'},
            { kind: 'instruction', text: 'Test the hardware on another system if possible.'}
          ],
          fallback: 'If basic checks pass, run diagnostic tools.'
        },
        {
          id: 'hardware-diagnostics',
          title: 'Run hardware diagnostics',
          rationale: 'Built-in tools can identify failing hardware components.',
          actions: [
            { kind: 'instruction', text: 'Run Windows Hardware Troubleshooter: Settings > Update & Security > Troubleshoot.'},
            { kind: 'instruction', text: 'Use manufacturer diagnostic tools for specific components.'},
            { kind: 'instruction', text: 'Check device manager for hardware errors (yellow exclamation marks).'}
          ]
        }
      ];

    default:
      // Fallback to original generic steps
      return [
        {
          id: 'step-1',
          title: 'Verify the basics',
          rationale: 'Simple checks often resolve common issues quickly.',
          actions: [
            { kind: 'instruction', text: 'Restart the affected application and try the action again.'},
            { kind: 'instruction', text: 'Ensure your internet connection is stable.'},
            { kind: 'instruction', text: 'Check if other similar functions are working.'}
          ],
          fallback: 'If the issue persists, proceed to the next step.'
        },
        {
          id: 'step-2',
          title: 'Gather more information',
          rationale: 'Specific error details help identify the root cause.',
          actions: [
            { kind: 'instruction', text: 'Take a screenshot of any error messages.'},
            { kind: 'instruction', text: 'Note the exact error message or code.'},
            { kind: 'instruction', text: 'Try the same action on a different device if possible.'}
          ],
          fallback: 'Use the collected information to search for specific solutions.'
        }
      ];
  }
}

// Analyze the goal and context to detect issue patterns
function analyzeIssue(goal: string, contextHint?: string): { category: string; errorCode?: string; context?: string } {
  const combinedText = `${goal} ${contextHint || ''}`.toLowerCase();

  for (const pattern of ISSUE_PATTERNS) {
    if (pattern.pattern.test(combinedText)) {
      return {
        category: pattern.category,
        errorCode: pattern.errorCode,
        context: pattern.description
      };
    }
  }

  return { category: 'generic', context: 'General technical issue' };
}

// AI-powered screenshot and diagnostics analysis
async function analyzeScreenshotsAndDiagnostics({
  goal,
  contextHint,
  attachments,
  diagnosticsContext,
  conversationContext,
  selectedModel
}: {
  goal: string;
  contextHint?: string;
  attachments?: FileUIPart[];
  diagnosticsContext?: string;
  conversationContext?: ModelMessage[];
  selectedModel: ModelId;
}): Promise<IssueAnalysis> {
  // Build analysis prompt with all available context
  const analysisPrompt = `You are an expert technical troubleshooter. Analyze the user's issue by examining the provided information and generate a detailed analysis.

User's problem: "${goal}"
${contextHint ? `Additional context: ${contextHint}` : ''}

${diagnosticsContext ? `System diagnostics:\n${diagnosticsContext}` : ''}

${attachments && attachments.length > 0 ? `Attached files/screenshots: ${attachments.map(att => `${att.type}: ${att.filename || 'unnamed'}`).join(', ')}` : ''}

${conversationContext && conversationContext.length > 0 ? `Conversation context: ${conversationContext.slice(-3).map(msg => msg.content?.toString()).join(' | ')}` : ''}

Based on this information, provide a detailed technical analysis of the issue.`;

  try {
    const analysis = await generateObject({
      model: getLanguageModel(selectedModel),
      schema: IssueAnalysisSchema,
      prompt: analysisPrompt,
    });

    return analysis.object;
  } catch (error) {
    console.error('Failed to analyze issue with AI:', error);
    // Fallback to pattern-based analysis
    const patternAnalysis = analyzeIssue(goal, contextHint);
    return {
      issueType: patternAnalysis.category,
      errorCodes: patternAnalysis.errorCode ? [patternAnalysis.errorCode] : [],
      affectedComponents: ['Unknown'],
      severity: 'medium' as const,
      context: patternAnalysis.context || 'General technical issue detected',
      recommendedApproach: 'Systematic troubleshooting approach'
    };
  }
}

// Generate specific steps based on AI analysis
function generateStepsFromAnalysis(analysis: IssueAnalysis): GuideStep[] {
  const { issueType, errorCodes, affectedComponents, severity, context, recommendedApproach } = analysis;

  // Base steps that apply to most issues
  const baseSteps: GuideStep[] = [
    {
      id: 'verify-basics',
      title: 'Verify basic functionality',
      rationale: 'Most issues can be isolated by checking fundamental operations first.',
      actions: [
        {
          kind: 'instruction',
          text: 'Restart the affected application or system component.',
        },
        {
          kind: 'instruction',
          text: 'Check if the issue persists after restart.',
        },
      ],
      fallback: 'If the issue remains after restart, proceed to specific diagnostics.'
    }
  ];

  // Issue-specific steps based on analysis
  switch (issueType.toLowerCase()) {
    case 'printer_error':
    case 'network_printer':
      return [
        ...baseSteps,
        {
          id: 'printer-connectivity',
          title: 'Check printer network connectivity',
          rationale: 'Printer issues often stem from network connectivity problems.',
          actions: [
            {
              kind: 'instruction',
              text: `Verify the printer ${affectedComponents[0] || 'device'} is powered on and connected to the network.`,
            },
            {
              kind: 'instruction',
              text: 'Check the printer\'s network settings and IP address.',
            },
            ...(errorCodes?.length ? [{
              kind: 'instruction' as const,
              text: `Note the error code(s): ${errorCodes.join(', ')} for further research.`
            }] : [])
          ],
          fallback: 'If connectivity is confirmed, check printer drivers and software.'
        }
      ];

    case 'network_error':
    case 'connectivity_issue':
      return [
        ...baseSteps,
        {
          id: 'network-diagnostics',
          title: 'Run network diagnostics',
          rationale: 'Network issues require systematic testing of connectivity.',
          actions: [
            {
              kind: 'instruction',
              text: 'Check if other devices can connect to the same network.',
            },
            {
              kind: 'instruction',
              text: 'Restart your router and modem (unplug for 30 seconds).',
            },
            {
              kind: 'instruction',
              text: 'Run network troubleshooter from Windows Settings.'
            }
          ],
          fallback: 'If network diagnostics pass, the issue may be application-specific.'
        }
      ];

    case 'application_crash':
    case 'software_error':
      return [
        ...baseSteps,
        {
          id: 'application-diagnostics',
          title: 'Check application health',
          rationale: 'Application crashes often have specific causes that can be diagnosed.',
          actions: [
            {
              kind: 'instruction',
              text: 'Check Windows Event Viewer for application error details.',
            },
            {
              kind: 'instruction',
              text: `Verify ${affectedComponents[0] || 'the application'} is compatible with your system.`,
            },
            {
              kind: 'instruction',
              text: 'Try running the application as administrator.'
            }
          ],
          fallback: 'If the application won\'t start, consider reinstallation.'
        }
      ];

    case 'hardware_failure':
    case 'device_error':
      return [
        ...baseSteps,
        {
          id: 'hardware-check',
          title: 'Perform hardware diagnostics',
          rationale: 'Hardware issues require physical inspection and testing.',
          actions: [
            {
              kind: 'instruction',
              text: 'Check all cable connections and power sources.',
            },
            {
              kind: 'instruction',
              text: 'Test the hardware component on another system if possible.',
            },
            {
              kind: 'instruction',
              text: 'Run hardware diagnostics from BIOS or manufacturer tools.'
            }
          ],
          fallback: 'If hardware tests fail, the component may need replacement.'
        }
      ];

    default:
      // Generic troubleshooting steps with AI insights
      return [
        ...baseSteps,
        {
          id: 'specific-diagnostics',
          title: 'Perform targeted diagnostics',
          rationale: recommendedApproach || 'Systematic approach to isolate the root cause.',
          actions: [
            {
              kind: 'instruction',
              text: `Focus on ${affectedComponents.join(', ') || 'affected components'}.`,
            },
            {
              kind: 'instruction',
              text: 'Document any error messages or unusual behavior.',
            },
            ...(errorCodes?.length ? [{
              kind: 'instruction' as const,
              text: `Research error code(s): ${errorCodes.join(', ')} online.`
            }] : [])
          ],
          fallback: 'If specific diagnostics don\'t resolve the issue, gather more information.'
        }
      ];
  }
}

// Factory function that creates the guideSteps tool with AI analysis capabilities
export function createGuideSteps({
  session,
  dataStream,
  messageId,
  selectedModel,
  attachments,
  contextForLLM,
  chatId,
}: {
  session: Session;
  dataStream: StreamWriter;
  messageId: string;
  selectedModel: ModelId;
  attachments: FileUIPart[];
  contextForLLM: ModelMessage[];
  chatId: string;
}) {
  return tool({
    description:
      'Returns a step-by-step guide (summary + steps) to help the user resolve their specific issue by analyzing screenshots, diagnostics data, and system context using AI.',
    inputSchema: GuideInputsSchema,
    execute: async ({ goal, contextHint, attachments: inputAttachments }): Promise<GuidePlan> => {
      // Get diagnostics context for the current session
      const diagnosticsContext = await buildDiagnosticsContext({
        userId: session?.user?.id || null,
        anonymousId: (session as any)?.anonymousId || null,
        chatId,
      });

      // Use AI to analyze screenshots and diagnostics
      const analysis = await analyzeScreenshotsAndDiagnostics({
        goal,
        contextHint,
        attachments: inputAttachments || attachments,
        diagnosticsContext: diagnosticsContext || undefined,
        conversationContext: contextForLLM,
        selectedModel
      });

      // Generate specific steps based on AI analysis
      const steps = generateStepsFromAnalysis(analysis);

      // Create AI-powered summary
      const summary = `AI Analysis: ${analysis.issueType} affecting ${analysis.affectedComponents.join(', ')}. ${analysis.recommendedApproach}. Follow these AI-generated steps tailored to your specific situation.`;

      return { summary, steps };
    },
  });
}

// Legacy export for backward compatibility (will be removed)
export const guideSteps = createGuideSteps({
  session: {} as any,
  dataStream: {} as any,
  messageId: '',
  selectedModel: 'gpt-4o' as ModelId,
  attachments: [],
  contextForLLM: [],
  chatId: '',
});

export default guideSteps;
