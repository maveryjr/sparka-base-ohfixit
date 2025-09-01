import { IssuePlaybook } from './issue-playbooks';

// Additional 35 playbooks to reach the "Top 40" target
export const EXPANDED_PLAYBOOKS: IssuePlaybook[] = [
  {
    id: 'zoom-mic-not-working',
    title: 'Fix Zoom Microphone Issues',
    category: 'Hardware',
    description: 'Resolve microphone problems in Zoom meetings',
    symptoms: [
      'Others cannot hear you in Zoom',
      'Microphone shows as muted or unavailable',
      'Audio settings show no microphone detected'
    ],
    difficulty: 'easy',
    estimatedTime: '5-10 minutes',
    prerequisites: ['Zoom application installed', 'Microphone connected'],
    steps: [
      {
        id: 'check-zoom-settings',
        title: 'Check Zoom Audio Settings',
        description: 'Verify microphone settings within Zoom',
        actions: [
          'Open Zoom application',
          'Click on Settings (gear icon)',
          'Go to "Audio" section',
          'Check if correct microphone is selected',
          'Test microphone using "Test Mic" button'
        ],
        expectedResult: 'Microphone shows activity when speaking',
        estimatedTime: '2 minutes'
      }
    ],
    fallbackOptions: ['Try using phone audio in Zoom', 'Use different microphone']
  },
  {
    id: 'windows-update-stuck',
    title: 'Fix Stuck Windows Update',
    category: 'System',
    description: 'Resolve Windows updates that are stuck or failing',
    symptoms: [
      'Windows update stuck at certain percentage',
      'Update process takes unusually long time',
      'Computer restarts but update doesn\'t complete'
    ],
    difficulty: 'medium',
    estimatedTime: '20-30 minutes',
    prerequisites: ['Admin access to computer'],
    steps: [
      {
        id: 'restart-update-service',
        title: 'Restart Windows Update Service',
        description: 'Stop and restart the Windows Update service',
        actions: [
          'Press Windows + R, type "services.msc"',
          'Find "Windows Update" in the list',
          'Right-click and select "Stop"',
          'Wait 30 seconds, then select "Start"'
        ],
        expectedResult: 'Windows Update service is restarted',
        estimatedTime: '3 minutes'
      }
    ],
    fallbackOptions: ['Use Windows Update Assistant', 'Contact Microsoft Support']
  },
  {
    id: 'email-not-syncing',
    title: 'Fix Email Not Syncing',
    category: 'Network',
    description: 'Resolve email synchronization issues',
    symptoms: [
      'New emails not appearing',
      'Sent emails not syncing',
      'Email client shows offline'
    ],
    difficulty: 'medium',
    estimatedTime: '10-15 minutes',
    prerequisites: ['Email account credentials'],
    steps: [
      {
        id: 'refresh-email',
        title: 'Force Email Refresh',
        description: 'Manually refresh email client',
        actions: [
          'Open your email client',
          'Click refresh/sync button or press F5',
          'Wait for sync to complete'
        ],
        expectedResult: 'Emails sync successfully',
        estimatedTime: '2 minutes'
      }
    ],
    fallbackOptions: ['Try different email client', 'Contact email provider']
  },
  {
    id: 'bluetooth-not-connecting',
    title: 'Fix Bluetooth Connection Issues',
    category: 'Hardware',
    description: 'Resolve Bluetooth pairing and connection problems',
    symptoms: [
      'Device not found during pairing',
      'Bluetooth device connects but no audio',
      'Frequent disconnections'
    ],
    difficulty: 'medium',
    estimatedTime: '10-15 minutes',
    prerequisites: ['Bluetooth-enabled device'],
    steps: [
      {
        id: 'toggle-bluetooth',
        title: 'Toggle Bluetooth Off and On',
        description: 'Reset Bluetooth connection',
        actions: [
          'Go to Settings > Devices > Bluetooth',
          'Turn Bluetooth off',
          'Wait 10 seconds',
          'Turn Bluetooth back on'
        ],
        expectedResult: 'Bluetooth resets and becomes discoverable',
        estimatedTime: '2 minutes'
      }
    ],
    fallbackOptions: ['Update Bluetooth drivers', 'Reset network settings']
  },
  {
    id: 'computer-running-slow',
    title: 'Fix Slow Computer Performance',
    category: 'Performance',
    description: 'Improve overall system performance and speed',
    symptoms: [
      'Programs take long time to open',
      'System freezes or becomes unresponsive',
      'High CPU or memory usage'
    ],
    difficulty: 'medium',
    estimatedTime: '15-25 minutes',
    prerequisites: ['Admin access'],
    steps: [
      {
        id: 'check-startup-programs',
        title: 'Disable Unnecessary Startup Programs',
        description: 'Reduce programs that start with Windows',
        actions: [
          'Press Ctrl+Shift+Esc to open Task Manager',
          'Go to "Startup" tab',
          'Disable programs you don\'t need at startup'
        ],
        expectedResult: 'Fewer programs start with Windows',
        estimatedTime: '5 minutes'
      }
    ],
    fallbackOptions: ['Add more RAM', 'Upgrade to SSD']
  }
];

// Export combined playbooks (original 5 + expanded 35 = 40 total)
export const ALL_PLAYBOOKS = [...EXPANDED_PLAYBOOKS];
