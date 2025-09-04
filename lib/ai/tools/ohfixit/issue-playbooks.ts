import { z } from 'zod';
import { tool } from 'ai';
import type { OSFamily } from '@/lib/ohfixit/os-capabilities';

export interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  actions: string[];
  expectedResult: string;
  troubleshooting?: string[];
  estimatedTime: string;
  // Device-specific overrides
  osOverrides?: Partial<Record<OSFamily, {
    actions?: string[];
    expectedResult?: string;
    troubleshooting?: string[];
    prerequisites?: string[];
  }>>;
  // Device capability requirements
  requiresCapability?: string[]; // e.g., ['canRunShellScripts', 'canBrowserAutomate']
  // Skip this step if these capabilities are missing
  skipIfMissingCapability?: string[];
}

export interface IssuePlaybook {
  id: string;
  title: string;
  category: string;
  description: string;
  symptoms: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  prerequisites: string[];
  steps: PlaybookStep[];
  fallbackOptions: string[];
  // Device-aware properties
  supportedOS?: OSFamily[];
  deviceRequirements?: string[];
  capabilityRequirements?: string[];
}

// Common issue playbooks
export const ISSUE_PLAYBOOKS: IssuePlaybook[] = [
  {
    id: 'wifi-slow',
    title: 'Fix Slow Wi-Fi Connection',
    category: 'Network',
    description: 'Diagnose and resolve slow internet connection issues',
    symptoms: [
      'Web pages load slowly',
      'Video streaming buffers frequently',
      'Downloads are very slow',
      'Online games lag or disconnect'
    ],
    difficulty: 'easy',
    estimatedTime: '10-15 minutes',
    prerequisites: ['Admin access to router', 'Device with Wi-Fi connection'],
    supportedOS: ['macOS', 'Windows', 'Linux', 'Android', 'iOS'],
    capabilityRequirements: ['canBrowserAutomate'],
    steps: [
      {
        id: 'speed-test',
        title: 'Test Current Speed',
        description: 'Measure your current internet speed to establish baseline',
        actions: [
          'Open a web browser',
          'Go to speedtest.net or fast.com',
          'Run the speed test',
          'Note down the download and upload speeds'
        ],
        expectedResult: 'You should see your current internet speeds displayed',
        estimatedTime: '2 minutes'
      },
      {
        id: 'restart-router',
        title: 'Restart Router and Modem',
        description: 'Power cycle your network equipment',
        actions: [
          'Unplug the power cable from your router',
          'Unplug the power cable from your modem',
          'Wait 30 seconds',
          'Plug in the modem first and wait 2 minutes',
          'Plug in the router and wait 2 minutes'
        ],
        expectedResult: 'All lights on router should be solid (not blinking)',
        troubleshooting: [
          'If lights are still blinking after 5 minutes, contact your ISP',
          'Make sure all cables are securely connected'
        ],
        estimatedTime: '5 minutes'
      },
      {
        id: 'check-interference',
        title: 'Check for Interference',
        description: 'Identify and minimize wireless interference',
        actions: [
          'Move closer to your router (within 10 feet)',
          'Check if speed improves',
          'Look for other devices that might interfere (microwaves, baby monitors)',
          'Try switching to 5GHz band if available'
        ],
        expectedResult: 'Speed should improve when closer to router',
        estimatedTime: '3 minutes'
      },
      {
        id: 'update-drivers',
        title: 'Update Network Drivers',
        description: 'Ensure your device has the latest network drivers',
        actions: [
          'Open Device Manager (Windows) or System Preferences (Mac)',
          'Find Network Adapters section',
          'Right-click on your Wi-Fi adapter',
          'Select "Update driver" and follow prompts'
        ],
        expectedResult: 'Driver update completes successfully',
        estimatedTime: '5 minutes',
        osOverrides: {
          macOS: {
            actions: [
              'Open System Preferences',
              'Go to Network settings',
              'Select your Wi-Fi connection',
              'Click "Advanced" and check for updates',
              'Or visit Apple menu > System Settings > General > Software Update'
            ],
            expectedResult: 'Network drivers updated successfully'
          },
          Linux: {
            actions: [
              'Open Terminal',
              'Run: sudo apt update && sudo apt upgrade (Ubuntu/Debian)',
              'Or: sudo dnf update (Fedora/CentOS)',
              'Restart your computer'
            ],
            expectedResult: 'System and network drivers updated'
          }
        },
        requiresCapability: ['canRunShellScripts']
      }
    ],
    fallbackOptions: [
      'Contact your Internet Service Provider',
      'Consider upgrading your internet plan',
      'Replace old router with newer model',
      'Use ethernet cable for critical devices'
    ]
  },
  {
    id: 'printer-offline',
    title: 'Fix Printer Showing Offline',
    category: 'Hardware',
    description: 'Resolve printer connectivity and offline status issues',
    symptoms: [
      'Printer shows as offline in print queue',
      'Print jobs get stuck in queue',
      'Computer cannot find printer',
      'Printer not responding to commands'
    ],
    difficulty: 'medium',
    estimatedTime: '15-20 minutes',
    prerequisites: ['Printer connected to same network', 'Admin access to computer'],
    steps: [
      {
        id: 'check-connections',
        title: 'Verify Physical Connections',
        description: 'Ensure all cables and connections are secure',
        actions: [
          'Check USB cable connection (if wired)',
          'Verify printer is connected to Wi-Fi network',
          'Ensure printer is powered on',
          'Check for any error messages on printer display'
        ],
        expectedResult: 'Printer shows ready status and no error messages',
        estimatedTime: '3 minutes'
      },
      {
        id: 'restart-print-spooler',
        title: 'Restart Print Spooler Service',
        description: 'Reset the Windows print spooler service',
        actions: [
          'Press Windows + R, type "services.msc"',
          'Find "Print Spooler" in the list',
          'Right-click and select "Restart"',
          'Wait for service to restart completely'
        ],
        expectedResult: 'Print Spooler service shows as "Running"',
        estimatedTime: '2 minutes'
      },
      {
        id: 'clear-print-queue',
        title: 'Clear Print Queue',
        description: 'Remove stuck print jobs from the queue',
        actions: [
          'Open Settings > Devices > Printers & scanners',
          'Click on your printer',
          'Click "Open queue"',
          'Select all documents and click "Cancel"'
        ],
        expectedResult: 'Print queue is empty',
        estimatedTime: '2 minutes'
      },
      {
        id: 'reinstall-printer',
        title: 'Remove and Reinstall Printer',
        description: 'Fresh installation of printer drivers',
        actions: [
          'Go to Settings > Devices > Printers & scanners',
          'Find your printer and click "Remove device"',
          'Click "Add a printer or scanner"',
          'Select your printer from the list or let Windows find it',
          'Follow installation prompts'
        ],
        expectedResult: 'Printer appears as available and online',
        estimatedTime: '8 minutes'
      }
    ],
    fallbackOptions: [
      'Download latest drivers from manufacturer website',
      'Try connecting via USB cable temporarily',
      'Reset printer to factory settings',
      'Contact printer manufacturer support'
    ]
  },
  {
    id: 'storage-full',
    title: 'Free Up Storage Space',
    category: 'System',
    description: 'Clean up disk space and optimize storage usage',
    symptoms: [
      'Low disk space warnings',
      'Computer running slowly',
      'Cannot save new files',
      'Programs crashing due to lack of space'
    ],
    difficulty: 'easy',
    estimatedTime: '20-30 minutes',
    prerequisites: ['Admin access to computer'],
    steps: [
      {
        id: 'check-storage',
        title: 'Analyze Storage Usage',
        description: 'Identify what is taking up the most space',
        actions: [
          'Open File Explorer (Windows) or Finder (Mac)',
          'Right-click on C: drive and select Properties',
          'Note the used vs available space',
          'Use built-in storage analyzer or download TreeSize'
        ],
        expectedResult: 'Clear view of storage usage by category',
        estimatedTime: '5 minutes'
      },
      {
        id: 'empty-trash',
        title: 'Empty Recycle Bin/Trash',
        description: 'Remove deleted files permanently',
        actions: [
          'Right-click on Recycle Bin (Windows) or Trash (Mac)',
          'Select "Empty Recycle Bin" or "Empty Trash"',
          'Confirm the action'
        ],
        expectedResult: 'Recycle Bin/Trash is empty',
        estimatedTime: '1 minute'
      },
      {
        id: 'clear-temp-files',
        title: 'Clear Temporary Files',
        description: 'Remove system and browser temporary files',
        actions: [
          'Press Windows + R, type "%temp%" and press Enter',
          'Select all files and delete them',
          'Run Disk Cleanup utility',
          'Clear browser cache and downloads'
        ],
        expectedResult: 'Several GB of space freed up',
        estimatedTime: '10 minutes'
      },
      {
        id: 'uninstall-programs',
        title: 'Remove Unused Programs',
        description: 'Uninstall programs you no longer use',
        actions: [
          'Open Settings > Apps > Apps & features',
          'Sort by size to see largest programs',
          'Identify programs you no longer use',
          'Click and select "Uninstall"'
        ],
        expectedResult: 'Unused programs removed, more space available',
        estimatedTime: '10 minutes'
      }
    ],
    fallbackOptions: [
      'Move files to external storage',
      'Use cloud storage services',
      'Upgrade to larger hard drive',
      'Use storage optimization tools'
    ]
  },
  {
    id: 'browser-popup-malware',
    title: 'Remove Browser Popup Malware',
    category: 'Security',
    description: 'Clean browser from malicious popups and redirects',
    symptoms: [
      'Constant popup advertisements',
      'Browser redirects to unwanted sites',
      'New tabs open automatically',
      'Homepage changed without permission'
    ],
    difficulty: 'medium',
    estimatedTime: '25-35 minutes',
    prerequisites: ['Admin access to computer', 'Internet connection'],
    steps: [
      {
        id: 'close-suspicious-tabs',
        title: 'Close All Browser Tabs',
        description: 'Start with a clean browser state',
        actions: [
          'Close all browser windows',
          'End browser processes in Task Manager if needed',
          'Restart browser in safe mode if available'
        ],
        expectedResult: 'Browser is completely closed',
        estimatedTime: '2 minutes'
      },
      {
        id: 'check-extensions',
        title: 'Review Browser Extensions',
        description: 'Remove suspicious or unknown extensions',
        actions: [
          'Open browser settings',
          'Go to Extensions or Add-ons section',
          'Review all installed extensions',
          'Remove any you don\'t recognize or remember installing',
          'Disable remaining extensions temporarily'
        ],
        expectedResult: 'Only trusted extensions remain enabled',
        estimatedTime: '5 minutes'
      },
      {
        id: 'reset-browser-settings',
        title: 'Reset Browser to Defaults',
        description: 'Restore browser to original settings',
        actions: [
          'Open browser settings',
          'Find "Reset" or "Restore" option',
          'Choose to reset to original defaults',
          'Confirm the reset action'
        ],
        expectedResult: 'Browser settings restored to defaults',
        estimatedTime: '3 minutes'
      },
      {
        id: 'run-malware-scan',
        title: 'Run Anti-Malware Scan',
        description: 'Scan system for malicious software',
        actions: [
          'Download Malwarebytes (free version)',
          'Install and run a full system scan',
          'Quarantine or remove any threats found',
          'Restart computer if prompted'
        ],
        expectedResult: 'System is clean of malware',
        estimatedTime: '15 minutes'
      }
    ],
    fallbackOptions: [
      'Use different browser temporarily',
      'Run Windows Defender full scan',
      'Contact computer technician',
      'Consider professional malware removal service'
    ]
  },
  {
    id: 'app-wont-open',
    title: 'Fix App That Won\'t Open',
    category: 'System',
    description: 'Resolve issues with applications that fail to launch or keep crashing',
    symptoms: [
      'App icon bounces but doesn\'t open',
      'Application crashes immediately on startup',
      'Error message when trying to open app',
      'App appears in task manager but no window shows'
    ],
    difficulty: 'medium',
    estimatedTime: '10-15 minutes',
    prerequisites: ['Admin access to computer'],
    steps: [
      {
        id: 'restart-app',
        title: 'Force Quit and Restart',
        description: 'Completely close the application and restart it',
        actions: [
          'Press Ctrl+Shift+Esc to open Task Manager (Windows) or Cmd+Option+Esc (Mac)',
          'Find the problematic application in the list',
          'Select it and click "End Task" or "Force Quit"',
          'Wait 10 seconds, then try opening the app again'
        ],
        expectedResult: 'Application should start normally',
        estimatedTime: '2 minutes'
      },
      {
        id: 'run-as-admin',
        title: 'Run as Administrator',
        description: 'Try running the application with elevated privileges',
        actions: [
          'Right-click on the application icon',
          'Select "Run as administrator" (Windows) or hold Cmd while opening (Mac)',
          'Click "Yes" if prompted by User Account Control'
        ],
        expectedResult: 'Application opens with admin privileges',
        estimatedTime: '1 minute'
      },
      {
        id: 'check-compatibility',
        title: 'Check Compatibility Mode',
        description: 'Run the app in compatibility mode for older Windows versions',
        actions: [
          'Right-click on the application executable',
          'Select "Properties"',
          'Go to "Compatibility" tab',
          'Check "Run this program in compatibility mode"',
          'Select an older Windows version from dropdown',
          'Click "Apply" and "OK"'
        ],
        expectedResult: 'Application runs in compatibility mode',
        estimatedTime: '3 minutes'
      },
      {
        id: 'reinstall-app',
        title: 'Reinstall Application',
        description: 'Uninstall and reinstall the problematic application',
        actions: [
          'Go to Settings > Apps > Apps & features',
          'Find the problematic application',
          'Click on it and select "Uninstall"',
          'Download the latest version from official website',
          'Install the application following setup wizard'
        ],
        expectedResult: 'Fresh installation of the application',
        estimatedTime: '10 minutes'
      }
    ],
    fallbackOptions: [
      'Check for Windows updates',
      'Run System File Checker (sfc /scannow)',
      'Contact application developer support',
      'Try alternative software'
    ]
  }
];

// Simple function exports that can be used as tools
const GetPlaybookInput = z.object({
  category: z.enum(['Network', 'Hardware', 'System', 'Security']).optional(),
  symptoms: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  playbookId: z.string().optional(),
  deviceOS: z.enum(['macOS', 'Windows', 'Linux', 'iOS', 'Android', 'Unknown']).optional(),
  deviceCapabilities: z.record(z.boolean()).optional(),
});

export const getPlaybook = tool({
  description: 'Get a troubleshooting playbook by ID or filter by category, symptoms, or difficulty. Supports device-aware adaptation.',
  inputSchema: GetPlaybookInput,
  execute: async ({ category, symptoms, difficulty, playbookId, deviceOS, deviceCapabilities }) => {
    if (playbookId) {
      let playbook = ISSUE_PLAYBOOKS.find((p) => p.id === playbookId);
      if (!playbook) {
        return { error: 'Playbook not found' };
      }

      // Adapt playbook for device if device info provided
      if (deviceOS || deviceCapabilities) {
        playbook = adaptPlaybookForDevice(playbook, deviceOS, deviceCapabilities);
      }

      return {
        playbook: {
          id: playbook.id,
          title: playbook.title,
          category: playbook.category,
          description: playbook.description,
          difficulty: playbook.difficulty,
          estimatedTime: playbook.estimatedTime,
          symptoms: playbook.symptoms,
          prerequisites: playbook.prerequisites,
          steps: playbook.steps.map(step => ({
            id: step.id,
            title: step.title,
            description: step.description,
            actions: step.actions,
            expectedResult: step.expectedResult,
            troubleshooting: step.troubleshooting,
            estimatedTime: step.estimatedTime,
          })),
          fallbackOptions: playbook.fallbackOptions,
        },
        adaptedForDevice: !!(deviceOS || deviceCapabilities),
        deviceOS,
        deviceCapabilities,
      };
    }

    let filteredPlaybooks = ISSUE_PLAYBOOKS;

    // Filter by device compatibility if device info provided
    if (deviceOS) {
      filteredPlaybooks = filteredPlaybooks.filter((playbook) => {
        // If playbook specifies supported OS, check compatibility
        if (playbook.supportedOS) {
          return playbook.supportedOS.includes(deviceOS);
        }
        // If no specific OS requirements, assume compatible
        return true;
      });
    }

    // Filter by device capabilities if provided
    if (deviceCapabilities) {
      filteredPlaybooks = filteredPlaybooks.filter((playbook) => {
        // If playbook specifies capability requirements, check if device meets them
        if (playbook.capabilityRequirements) {
          return playbook.capabilityRequirements.every(cap =>
            deviceCapabilities[cap] !== false
          );
        }
        return true;
      });
    }

    if (category) {
      filteredPlaybooks = filteredPlaybooks.filter((p) => p.category === category);
    }

    if (difficulty) {
      filteredPlaybooks = filteredPlaybooks.filter((p) => p.difficulty === difficulty);
    }

    if (symptoms && symptoms.length > 0) {
      filteredPlaybooks = filteredPlaybooks.filter((playbook) =>
        symptoms.some((symptom: string) =>
          playbook.symptoms.some((playbookSymptom) =>
            playbookSymptom.toLowerCase().includes(symptom.toLowerCase()) ||
            symptom.toLowerCase().includes(playbookSymptom.toLowerCase()),
          ),
        ),
      );
    }

    const response: any = {
      playbooks: filteredPlaybooks.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        description: p.description,
        difficulty: p.difficulty,
        estimatedTime: p.estimatedTime,
        symptoms: p.symptoms,
      })),
      total: filteredPlaybooks.length,
      filteredByDevice: !!(deviceOS || deviceCapabilities),
      deviceOS,
      deviceCapabilities,
    };

    // Clarify-loop: if many candidates and no strong filters, ask 1–2 questions
    if (!category && (!symptoms || symptoms.length === 0) && filteredPlaybooks.length > 1) {
      response.clarifyingQuestions = [
        'Is this issue occurring on Wi‑Fi or Ethernet?',
        'Is the problem limited to one app/site or affects all?',
      ];
    }

    return response;
  },
});

const ExecutePlaybookStepInput = z.object({
  playbookId: z.string(),
  stepId: z.string(),
  completed: z.boolean().optional(),
  notes: z.string().optional(),
  deviceOS: z.enum(['macOS', 'Windows', 'Linux', 'iOS', 'Android', 'Unknown']).optional(),
  deviceCapabilities: z.record(z.boolean()).optional(),
});

// Device-aware playbook adaptation
export function adaptPlaybookForDevice(
  playbook: IssuePlaybook,
  deviceOS?: OSFamily,
  deviceCapabilities?: Record<string, boolean>
): IssuePlaybook {
  if (!deviceOS && !deviceCapabilities) {
    return playbook;
  }

  const adaptedPlaybook = { ...playbook };

  // Filter steps based on device capabilities
  adaptedPlaybook.steps = playbook.steps.filter(step => {
    // Skip steps that require capabilities the device doesn't have
    if (step.skipIfMissingCapability && deviceCapabilities) {
      const missingCapabilities = step.skipIfMissingCapability.filter(cap =>
        !deviceCapabilities[cap]
      );
      if (missingCapabilities.length > 0) {
        return false;
      }
    }

    // Skip steps that require capabilities the device doesn't have
    if (step.requiresCapability && deviceCapabilities) {
      const hasRequiredCapabilities = step.requiresCapability.every(cap =>
        deviceCapabilities[cap]
      );
      if (!hasRequiredCapabilities) {
        return false;
      }
    }

    return true;
  });

  // Adapt steps for specific OS
  if (deviceOS) {
    adaptedPlaybook.steps = adaptedPlaybook.steps.map(step => {
      const osOverride = step.osOverrides?.[deviceOS];
      if (osOverride) {
        return {
          ...step,
          actions: osOverride.actions || step.actions,
          expectedResult: osOverride.expectedResult || step.expectedResult,
          troubleshooting: osOverride.troubleshooting || step.troubleshooting,
        };
      }
      return step;
    });
  }

  return adaptedPlaybook;
}

export const executePlaybookStep = tool({
  description: 'Execute or mark progress on a specific playbook step and get follow-up steps. Supports device-aware adaptation.',
  inputSchema: ExecutePlaybookStepInput,
  execute: async ({ playbookId, stepId, completed = false, notes, deviceOS, deviceCapabilities }) => {
    let playbook = ISSUE_PLAYBOOKS.find((p) => p.id === playbookId);
    if (!playbook) {
      return { error: 'Playbook not found' };
    }

    // Adapt playbook for device if device info provided
    if (deviceOS || deviceCapabilities) {
      playbook = adaptPlaybookForDevice(playbook, deviceOS, deviceCapabilities);
    }

    const step = playbook.steps.find((s) => s.id === stepId);
    if (!step) {
      return { error: 'Step not found' };
    }

    return {
      playbook: {
        id: playbook.id,
        title: playbook.title,
      },
      step: {
        id: step.id,
        title: step.title,
        description: step.description,
        actions: step.actions,
        expectedResult: step.expectedResult,
        troubleshooting: step.troubleshooting,
        estimatedTime: step.estimatedTime,
      },
      completed,
      notes,
      deviceAdapted: !!(deviceOS || deviceCapabilities),
      deviceOS,
      nextSteps: playbook.steps
        .filter((s) => playbook.steps.indexOf(s) > playbook.steps.indexOf(step))
        .slice(0, 2)
        .map((s) => ({
          id: s.id,
          title: s.title,
        })),
    };
  },
});
