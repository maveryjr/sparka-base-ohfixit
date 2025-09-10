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
  if (!hasTauri()) return;
  try {
    await (window as any).__TAURI__.invoke('execute_action', {
      actionId,
      parameters: JSON.stringify(parameters || {}),
      token,
    });
  } catch {
    // Silently ignore – helper UI will surface status if open
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

