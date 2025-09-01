import { z } from 'zod';
import { tool } from 'ai';

export interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  actions: string[];
  expectedResult: string;
  troubleshooting?: string[];
  estimatedTime: string;
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
        estimatedTime: '5 minutes'
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
  }
];

// Simple function exports that can be used as tools
export const getPlaybook = async (params: {
  category?: 'Network' | 'Hardware' | 'System' | 'Security';
  symptoms?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  playbookId?: string;
}) => {
  const { category, symptoms, difficulty, playbookId } = params;
  
  if (playbookId) {
    const playbook = ISSUE_PLAYBOOKS.find(p => p.id === playbookId);
    return playbook || { error: 'Playbook not found' };
  }

  let filteredPlaybooks = ISSUE_PLAYBOOKS;

  if (category) {
    filteredPlaybooks = filteredPlaybooks.filter(p => p.category === category);
  }

  if (difficulty) {
    filteredPlaybooks = filteredPlaybooks.filter(p => p.difficulty === difficulty);
  }

  if (symptoms && symptoms.length > 0) {
    filteredPlaybooks = filteredPlaybooks.filter(playbook =>
      symptoms.some((symptom: string) =>
        playbook.symptoms.some(playbookSymptom =>
          playbookSymptom.toLowerCase().includes(symptom.toLowerCase()) ||
          symptom.toLowerCase().includes(playbookSymptom.toLowerCase())
        )
      )
    );
  }

  return {
    playbooks: filteredPlaybooks.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      description: p.description,
      difficulty: p.difficulty,
      estimatedTime: p.estimatedTime,
      symptoms: p.symptoms
    })),
    total: filteredPlaybooks.length
  };
};

export const executePlaybookStep = async (params: {
  playbookId: string;
  stepId: string;
  completed?: boolean;
  notes?: string;
}) => {
  const { playbookId, stepId, completed = false, notes } = params;
  
  const playbook = ISSUE_PLAYBOOKS.find(p => p.id === playbookId);
  if (!playbook) {
    return { error: 'Playbook not found' };
  }

  const step = playbook.steps.find(s => s.id === stepId);
  if (!step) {
    return { error: 'Step not found' };
  }

  return {
    playbook: {
      id: playbook.id,
      title: playbook.title
    },
    step: {
      id: step.id,
      title: step.title,
      description: step.description,
      actions: step.actions,
      expectedResult: step.expectedResult,
      troubleshooting: step.troubleshooting,
      estimatedTime: step.estimatedTime
    },
    completed,
    notes,
    nextSteps: playbook.steps.filter(s => 
      playbook.steps.indexOf(s) > playbook.steps.indexOf(step)
    ).slice(0, 2).map(s => ({
      id: s.id,
      title: s.title
    }))
  };
};
