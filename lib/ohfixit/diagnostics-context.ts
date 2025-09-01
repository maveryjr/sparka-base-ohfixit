import 'server-only';

import { getRecord, getSessionKeyForIds } from '@/lib/ohfixit/diagnostics-store';
import { capabilityMap, detectOS } from '@/lib/ohfixit/os-capabilities';

export type DiagnosticsContextOptions = {
  userId?: string | null;
  anonymousId?: string | null;
  chatId: string;
  includeTips?: boolean;
};

function fmtNum(n?: number, digits = 0) {
  if (n === undefined || n === null || Number.isNaN(n)) return 'unknown';
  return n.toFixed(digits);
}

function safeJoin(items: Array<string | undefined | null>, sep = ', ') {
  return items.filter(Boolean).join(sep);
}

export async function buildDiagnosticsContext(
  opts: DiagnosticsContextOptions
): Promise<string | null> {
  const { userId, anonymousId, chatId } = opts;
  const { getRecordByChat } = await import('./diagnostics-store');
  const rec = await getRecordByChat({ userId, anonymousId, chatId });
  if (!rec) return null;

  const parts: string[] = [];

  // OS and capabilities (based on client UA when available)
  let osFamily: ReturnType<typeof detectOS> = 'Unknown';
  if (rec.client && rec.client.consent) {
    osFamily = detectOS(rec.client.data.userAgent || '', rec.client.data.platform);
  }
  const caps = capabilityMap(osFamily);

  parts.push(`OS: ${caps.family}`);
  parts.push(
    `Capabilities: browserAutomation=${caps.canBrowserAutomate ? 'yes' : 'no'}, shellScripts=${caps.canRunShellScripts ? 'yes' : 'no'}`,
  );
  if (caps.notes && caps.notes.length) {
    parts.push(`Notes: ${caps.notes.join(' ')}`);
  }

  // Client snapshot
  if (rec.client && rec.client.consent) {
    const d = rec.client.data;
    const langs = d.languages && d.languages.length ? d.languages.join(', ') : 'unknown';
    const screen = d.screen
      ? `${d.screen.width}x${d.screen.height} @${fmtNum(d.screen.dpr, 2)}x`
      : 'unknown';
    const device = d.device
      ? safeJoin([
          d.device.memoryGB !== undefined ? `${d.device.memoryGB} GB RAM` : undefined,
          d.device.cores !== undefined ? `${d.device.cores} cores` : undefined,
        ]) || 'unknown'
      : 'unknown';
    const net = d.network
      ? safeJoin([
          d.network.effectiveType ? `effectiveType=${d.network.effectiveType}` : undefined,
          d.network.downlink !== undefined ? `downlink=${fmtNum(d.network.downlink, 1)} Mbps` : undefined,
          d.network.rtt !== undefined ? `rtt=${fmtNum(d.network.rtt)} ms` : undefined,
          d.network.saveData !== undefined ? `saveData=${d.network.saveData ? 'on' : 'off'}` : undefined,
        ]) || 'unknown'
      : 'unknown';
    const battery = d.battery
      ? safeJoin([
          d.battery.level !== undefined ? `level=${fmtNum(d.battery.level * 100)}%` : undefined,
          d.battery.charging !== undefined ? `charging=${d.battery.charging ? 'yes' : 'no'}` : undefined,
        ]) || 'unknown'
      : 'unknown';
    const winSize = d.window
      ? `${d.window.innerWidth}x${d.window.innerHeight}`
      : 'unknown';

    parts.push('Client Snapshot:');
    parts.push(`- userAgent: ${d.userAgent}`);
    parts.push(`- platform: ${d.platform ?? 'unknown'}`);
    parts.push(`- languages: ${langs}`);
    parts.push(`- timeZone: ${d.timeZone ?? 'unknown'}`);
    parts.push(`- screen: ${screen}`);
    parts.push(`- device: ${device}`);
    parts.push(`- network: ${net}`);
    parts.push(`- battery: ${battery}`);
    parts.push(`- window: ${winSize}`);
  }

  // Network diagnostics
  if (rec.network && rec.network.results && rec.network.results.length) {
    parts.push('Network Checks:');
    for (const r of rec.network.results) {
      const status = r.ok ? 'OK' : 'FAIL';
      const statusCode = r.status !== undefined ? ` (${r.status})` : '';
      const latency = r.latencyMs !== undefined ? ` ${r.latencyMs}ms` : '';
      const err = r.error ? ` error=${r.error}` : '';
      parts.push(`- ${r.target}: ${status}${statusCode}${latency}${err}`);
    }
  }

  // Tips and constraints for the model
  if (opts.includeTips !== false) {
    parts.push('Modeling Constraints for You:');
    parts.push('- Do not claim to run shell or system commands. Provide copyable commands and explain what they do.');
    parts.push('- Use only registered tools to perform network or system actions; do not assume unrestricted access.');
    if (rec.client?.data?.network?.effectiveType && /(^|-)2g/.test(rec.client.data.network.effectiveType)) {
      parts.push('- Optimize for low bandwidth (2G). Keep responses concise and avoid large content.');
    } else if (rec.client?.data?.network?.saveData) {
      parts.push('- Data Saver is ON. Prefer concise text and avoid large media.');
    }
    if (osFamily === 'iOS' || osFamily === 'Android') {
      parts.push('- Mobile browser constraints apply. Prefer simple, step-by-step guidance.');
    }
  }

  const text = parts.join('\n');
  return text.length ? text : null;
}

export default buildDiagnosticsContext;
