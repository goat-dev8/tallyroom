'use client';
import { useSyncExternalStore } from 'react';
/** Shares the hero demo's current round with the 3D ballot box (no context needed across islands). */
let state = { round: 0, rounds: 0 }; const subs = new Set<() => void>();
export function setDemoRound(round: number, rounds: number) { if (state.round === round && state.rounds === rounds) return; state = { round, rounds }; subs.forEach(f => f()); }
export function useDemoRound() { return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => state, () => state); }
