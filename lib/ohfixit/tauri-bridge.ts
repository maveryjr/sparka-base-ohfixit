// Lightweight bridge to the Tauri Desktop Helper. All calls are best‑effort
// and no-ops when the helper/runtime is not available.

export function hasTauri(): boolean {
  try {
    return typeof window !== 'undefined' && !!(window as any).__TAURI__?.invoke;
  } catch {
    return false;
  }
}

export async function executeAllowlistedAction(
  actionId: string,
  parameters: Record<string, any> | undefined,
  token: string,
): Promise<void> {
  if (hasTauri()) {
    try {
      await (window as any).__TAURI__.invoke('execute_action', {
        actionId,
        parameters: JSON.stringify(parameters || {}),
        token,
      });
      return;
    } catch {
      // fall through to HTTP
    }
  }
  // HTTP fallback (helper status server)
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2500);
    await fetch('http://127.0.0.1:8765/automation/execute', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ actionId, parameters: parameters || {} }),
      signal: controller.signal,
      mode: 'cors',
    });
  } catch {
    // As a last resort, try deep link
    try {
      const params = new URLSearchParams({ actionId, token });
      window.location.href = `ohfixit://open?${params.toString()}`;
    } catch {}
  }
}

export async function executeRollback(
  actionId: string,
  rollbackId: string,
  token: string,
): Promise<void> {
  if (!hasTauri()) return;
  try {
    await (window as any).__TAURI__.invoke('execute_rollback', {
      actionId,
      rollbackId,
      token,
    });
  } catch {
    // no-op
  }
}
