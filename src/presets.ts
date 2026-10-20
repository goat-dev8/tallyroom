import { ALASKA_2022_SPECIAL } from './elections/alaska-2022-special.js';
import { MAINE_2018_CD2 } from './elections/maine-2018-cd2.js';
import { NYC_2021_DEM_MAYOR } from './elections/nyc-2021-dem-mayor.js';
import { Rules } from './types.js';

/** Certified rule sets. Pass `rules` as one of these ids instead of an object. */
export const RULE_PRESETS: Record<string, Partial<Rules>> = {
  'maine-2018': MAINE_2018_CD2.rules,
  'alaska-2022': ALASKA_2022_SPECIAL.rules,
  'nyc-2021': NYC_2021_DEM_MAYOR.rules,
};

export const PRESET_IDS = Object.keys(RULE_PRESETS);

export function resolveRules(rules: unknown): { ok: true; rules?: Partial<Rules> } | { ok: false; error: string } {
  if (rules === undefined) return { ok: true };
  if (typeof rules === 'string') {
    const preset = RULE_PRESETS[rules];
    if (!preset) return { ok: false, error: `Unknown rules preset "${rules}". Expected ${PRESET_IDS.join(', ')}` };
    return { ok: true, rules: preset };
  }
  if (typeof rules !== 'object' || rules === null || Array.isArray(rules)) {
    return { ok: false, error: 'rules must be an object or a preset id: maine-2018, alaska-2022, nyc-2021' };
  }
  return { ok: true, rules: rules as Partial<Rules> };
}
