// Compatibility shim — superseded by useDemoEnter.
// Kept to avoid breaking older imports during the Perfect Demo migration.

export interface DemoWorkspace {
  id: string;
  email: string;
  resort_name: string;
  status: string;
}

export function useDemoWorkspace() {
  return {
    workspaceId: null as string | null,
    workspace: null as DemoWorkspace | null,
    savedEmail: null as string | null,
    isLoading: false,
    error: null as string | null,
    hasExistingWorkspace: false,
    saveWorkspace: () => {},
    clearWorkspace: () => {},
    fetchWorkspace: async () => null,
    generateTokens: async () => null,
    regenerateCredentials: async () => null,
    reseedData: async () => false,
  };
}

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function mapToSupportedTimezone(detected: string): string {
  return detected || 'UTC';
}
