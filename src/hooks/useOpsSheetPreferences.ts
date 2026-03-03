/**
 * useOpsSheetPreferences – Persist Master Ops Sheet UI state in localStorage.
 */
const STORAGE_KEY = 'ops-sheet-prefs';

interface OpsSheetPrefs {
  dept: string;
  date: string;
  filter: string;
  attentionMode: boolean;
}

const DEFAULTS: OpsSheetPrefs = {
  dept: 'DIVE',
  date: '',
  filter: 'all',
  attentionMode: false,
};

export function loadOpsPrefs(): OpsSheetPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveOpsPrefs(partial: Partial<OpsSheetPrefs>) {
  try {
    const current = loadOpsPrefs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
  } catch {
    // silent
  }
}
