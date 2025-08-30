export type OSFamily = 'macOS' | 'Windows' | 'Linux' | 'iOS' | 'Android' | 'Unknown';

export type Capabilities = {
  family: OSFamily;
  canBrowserAutomate: boolean; // limited DOM-only automation
  canRunShellScripts: boolean; // false for browser-only MVP
  notes?: string[];
};

export function detectOS(userAgent: string, platform?: string): OSFamily {
  const ua = userAgent.toLowerCase();
  const pl = (platform || '').toLowerCase();
  if (ua.includes('mac os x') || pl.includes('mac')) return 'macOS';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Unknown';
}

export function capabilityMap(os: OSFamily): Capabilities {
  const base: Capabilities = {
    family: os,
    canBrowserAutomate: true,
    canRunShellScripts: false,
    notes: [
      'Automation limited to in-app DOM operations and safe URL opens in MVP.',
    ],
  };
  switch (os) {
    case 'Windows':
      base.notes?.push('PowerShell scripts can be suggested with preview.');
      return base;
    case 'macOS':
      base.notes?.push('zsh/bash commands can be suggested; user copies to Terminal.');
      return base;
    case 'Linux':
      base.notes?.push('Shell commands vary by distro; suggest carefully.');
      return base;
    case 'Android':
    case 'iOS':
      base.notes?.push('Mobile browsers restrict features; hide unsupported flows.');
      return base;
    default:
      return base;
  }
}
