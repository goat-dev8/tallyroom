import { fail } from './errors.js';
import { PRESET_IDS, RULE_PRESETS } from './presets.js';
import { DEFAULT_RULES } from './types.js';

export const TIEBREAK_OPTIONS = ['previous-round', 'lot'] as const;
export const QUOTA_OPTIONS = ['droop', 'hare'] as const;
export const OVERVOTE_OPTIONS = ['exhaust', 'skip', 'continuing'] as const;
export const SKIP_OPTIONS = ['continue', 'two-exhaust'] as const;
export const DUPLICATE_OPTIONS = ['ignore', 'skip'] as const;

export interface OptionError { status: 422; code: string; message: string; details?: Record<string, unknown> | null }

interface LooseRules {
  overvote?: unknown;
  skips?: unknown;
  duplicates?: unknown;
  batch?: unknown;
  tiebreak?: unknown;
  lotOrder?: unknown;
}

function oneOf(field: string, value: unknown, allowed: readonly string[], code: string): OptionError | null {
  if (value === undefined) return null;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return null;
  return { status: 422, code, message: `${field} must be one of: ${allowed.join(', ')}`, details: { field, value } };
}

/** Reject tie-break and STV option values the counter does not define. Unknown rule keys are handled earlier (400). */
export function validateTabulateOptions(value: { seats?: unknown; quota?: unknown; rules?: LooseRules | null; candidates: string[] }): OptionError | null {
  const rules = value.rules ?? {};
  const tiebreak = oneOf('rules.tiebreak', rules.tiebreak, TIEBREAK_OPTIONS, 'INVALID_TIEBREAK');
  if (tiebreak) return tiebreak;
  const overvote = oneOf('rules.overvote', rules.overvote, OVERVOTE_OPTIONS, 'INVALID_OVERVOTE');
  if (overvote) return overvote;
  const skips = oneOf('rules.skips', rules.skips, SKIP_OPTIONS, 'INVALID_SKIPS');
  if (skips) return skips;
  const duplicates = oneOf('rules.duplicates', rules.duplicates, DUPLICATE_OPTIONS, 'INVALID_DUPLICATES');
  if (duplicates) return duplicates;
  if (rules.batch !== undefined && typeof rules.batch !== 'boolean') {
    return { status: 422, code: 'INVALID_BATCH', message: 'rules.batch must be a boolean', details: { field: 'rules.batch' } };
  }
  if (rules.batch === true && value.seats !== undefined && value.seats !== 1) {
    // BUG-019: batch elimination is defined for single-winner IRV only; refuse it rather than silently ignore it.
    return { status: 422, code: 'INVALID_BATCH', message: 'rules.batch is only supported for single-winner IRV (seats: 1)', details: { field: 'rules.batch' } };
  }
  if (rules.lotOrder !== undefined) {
    const lot = rules.lotOrder;
    if (!Array.isArray(lot) || lot.some(n => typeof n !== 'string')) {
      return { status: 422, code: 'INVALID_LOT_ORDER', message: 'rules.lotOrder must be an array of candidate names', details: { field: 'rules.lotOrder' } };
    }
    const names = lot as string[];
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup !== undefined) return { status: 422, code: 'INVALID_LOT_ORDER', message: `rules.lotOrder contains a duplicate "${dup}"`, details: { field: 'rules.lotOrder', candidate: dup } };
    for (const c of value.candidates) {
      if (!names.includes(c)) return { status: 422, code: 'INVALID_LOT_ORDER', message: `rules.lotOrder is missing candidate "${c}"`, details: { field: 'rules.lotOrder', candidate: c } };
    }
  }
  if (value.quota !== undefined && (typeof value.quota !== 'string' || !(QUOTA_OPTIONS as readonly string[]).includes(value.quota))) {
    return { status: 422, code: 'INVALID_QUOTA', message: `quota must be one of: ${QUOTA_OPTIONS.join(', ')}`, details: { field: 'quota', value: value.quota as string } };
  }
  if (value.seats !== undefined && !Number.isInteger(value.seats)) {
    return { status: 422, code: 'INVALID_SEATS', message: 'seats must be an integer from 1 to the number of candidates', details: { field: 'seats' } };
  }
  return null;
}

/** Public description of the tie-break and multi-seat options the counter accepts. */
export function countingOptions() {
  return {
    defaults: {
      rules: { ...DEFAULT_RULES, duplicates: 'ignore' as const },
      description: 'If rules is omitted, the count uses overvote "exhaust", skips "continue", duplicates "ignore", batch false, and tiebreak "previous-round". These defaults are not the certified rules for Maine 2018, Alaska 2022, or New York City 2021. Under the defaults, Maine 2018 CD2 finishes Golden 142,558 and Poliquin 139,113, not the certified 142,440 and 138,931. Pass rules as the preset id "maine-2018", "alaska-2022", or "nyc-2021" to use that election\'s certified rules.',
    },
    presets: {
      field: 'rules',
      ids: PRESET_IDS,
      sets: RULE_PRESETS,
    },
    tiebreak: {
      field: 'rules.tiebreak',
      default: DEFAULT_RULES.tiebreak,
      options: [
        {
          id: 'previous-round',
          description: 'When candidates are tied for elimination, look back through earlier rounds and eliminate whoever had the fewest votes in the closest round that separates them. If every earlier round is also tied, use lot order.',
        },
        {
          id: 'lot',
          description: 'When candidates are tied for elimination, eliminate the one who appears last in rules.lotOrder. Earlier rounds are not consulted.',
        },
      ],
      lotOrder: {
        field: 'rules.lotOrder',
        description: 'Candidate names in lot order. The name that appears last is eliminated. Defaults to declaration order. Every candidate must appear exactly once.',
      },
    },
    stv: {
      seats: {
        field: 'seats',
        minimum: 1,
        description: 'Number of seats. Omit seats, or pass 1, for single-winner instant-runoff. An integer from 2 up to the number of candidates runs multi-seat single transferable vote.',
      },
      quota: {
        field: 'quota',
        default: 'droop',
        options: [
          { id: 'droop', description: 'floor(ballots / (seats + 1)) + 1' },
          { id: 'hare', description: 'ballots / seats, kept as an exact rational' },
        ],
      },
    },
    writeIn: {
      name: 'Write-in',
      description: 'A ballot mark "Write-in" is legal. It is a continuing candidate only when candidates lists "Write-in". Otherwise the mark is passed over, which is the Alaska 2022 convention. List "Write-in" to count that row, which is the New York City 2021 convention.',
    },
    rules: {
      overvote: { field: 'rules.overvote', default: DEFAULT_RULES.overvote, options: [...OVERVOTE_OPTIONS] },
      skips: { field: 'rules.skips', default: DEFAULT_RULES.skips, options: [...SKIP_OPTIONS] },
      duplicates: { field: 'rules.duplicates', default: 'ignore', options: [...DUPLICATE_OPTIONS] },
      batch: { field: 'rules.batch', default: DEFAULT_RULES.batch, description: 'When true, every candidate who cannot mathematically win is eliminated in the same round.' },
    },
  };
}

export function handleOptions(method: string): { status: number; body: unknown; headers?: Record<string, string> } {
  if (method !== 'GET') return fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed', null, { Allow: 'GET' });
  return { status: 200, body: countingOptions() };
}
