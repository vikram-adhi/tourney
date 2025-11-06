import { useState, useEffect } from 'react';
import type { Match, Standing, KnockoutMatch } from './types';
import {
  generateAllMatches,
  calculateStandings,
  arePoolMatchesComplete,
  getQualifiedTeams,
  generateKnockoutMatches,
  getKnockoutMatchWinner,
  POOL_A_TEAMS,
  POOL_B_TEAMS,
} from './types';
import { getSupabaseClient } from './supabaseClient';

// Tournament data structure for persistence
interface TournamentData {
  poolMatches: Match[];
  knockoutMatches: KnockoutMatch[];
}

// Use `src/supabaseClient.ts` for client initialization. If missing, store will operate in-memory only.

class TournamentStore {
  private matches: Match[] = [];
  private knockoutMatches: KnockoutMatch[] = [];
  private listeners: (() => void)[] = [];
  private isLoading = false;

  get loading() {
    return this.isLoading;
  }

  constructor() {
    this.loadData();
  }

  // Map legacy placeholder names (Team 1..Team 8) to current team names
  private LEGACY_NAME_MAP: Record<string, string> = {
    'Team 1': 'Lord of the strings',
    'Team 2': 'The BaddyVerse',
    'Team 3': 'Silicon Swat',
    'Team 4': 'Herricanes',
    'Team 5': 'Rising Phoenix',
    'Team 6': 'Mighty Spartans',
    'Team 7': 'Racket Blitz',
    'Team 8': 'SmashOps'
  };

  // Ensure every match has a tieBreaker object so it renders and persists consistently
  private ensureTieBreakers(matches: Match[]) {
    return matches.map(m => {
      if (!m.tieBreaker) {
        return {
          ...m,
          tieBreaker: { teamAPlayers: ['', '', ''], teamBPlayers: ['', '', ''], teamAScore: undefined, teamBScore: undefined }
        } as Match;
      }
      // if tieBreaker exists but players array missing, normalize shape
      const tb = m.tieBreaker as any;
      const normalized = {
        teamAPlayers: Array.isArray(tb.teamAPlayers) ? tb.teamAPlayers.slice(0,3).concat(Array(3 - (tb.teamAPlayers||[]).length).fill('')).slice(0,3) : ['', '', ''],
        teamBPlayers: Array.isArray(tb.teamBPlayers) ? tb.teamBPlayers.slice(0,3).concat(Array(3 - (tb.teamBPlayers||[]).length).fill('')).slice(0,3) : ['', '', ''],
        teamAScore: typeof tb.teamAScore === 'number' ? tb.teamAScore : undefined,
        teamBScore: typeof tb.teamBScore === 'number' ? tb.teamBScore : undefined,
      };
      return { ...m, tieBreaker: normalized } as Match;
    });
  }

  // Ensure knockout matches have normalized tieBreaker shapes as well
  private ensureKnockoutTieBreakers(knockouts: KnockoutMatch[]) {
    return knockouts.map(k => {
      if (!k.tieBreaker) {
        return {
          ...k,
          tieBreaker: { teamAPlayers: ['', '', ''], teamBPlayers: ['', '', ''], teamAScore: undefined, teamBScore: undefined }
        } as KnockoutMatch;
      }
      const tb = k.tieBreaker as any;
      const normalized = {
        teamAPlayers: Array.isArray(tb.teamAPlayers) ? tb.teamAPlayers.slice(0,3).concat(Array(3 - (tb.teamAPlayers||[]).length).fill('')).slice(0,3) : ['', '', ''],
        teamBPlayers: Array.isArray(tb.teamBPlayers) ? tb.teamBPlayers.slice(0,3).concat(Array(3 - (tb.teamBPlayers||[]).length).fill('')).slice(0,3) : ['', '', ''],
        teamAScore: typeof tb.teamAScore === 'number' ? tb.teamAScore : undefined,
        teamBScore: typeof tb.teamBScore === 'number' ? tb.teamBScore : undefined,
      };
      return { ...k, tieBreaker: normalized } as KnockoutMatch;
    });
  }

  private mapLegacyMatchNames(match: any): Match {
    const mappedA = (typeof match.teamA === 'string' && this.LEGACY_NAME_MAP[match.teamA]) ? this.LEGACY_NAME_MAP[match.teamA] : match.teamA;
    const mappedB = (typeof match.teamB === 'string' && this.LEGACY_NAME_MAP[match.teamB]) ? this.LEGACY_NAME_MAP[match.teamB] : match.teamB;
    return { ...match, teamA: mappedA, teamB: mappedB } as Match;
  }

  private async loadData() {
    try {
      this.isLoading = true;
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('tournament').select('payload').eq('id', 'singleton').single();
        if (error) {
          console.warn('Supabase read failed, operating in-memory only:', (error as any).message || error);
          this.matches = generateAllMatches();
          this.initializeKnockoutMatches();
        } else if (data && data.payload) {
          if (data.payload.poolMatches && Array.isArray(data.payload.poolMatches)) {
            const tournamentData = data.payload as TournamentData;
            // map legacy names and ensure tieBreaker shape
            this.matches = this.ensureTieBreakers((tournamentData.poolMatches || []).map(m => this.mapLegacyMatchNames(m as any)));
            this.knockoutMatches = this.ensureKnockoutTieBreakers((tournamentData.knockoutMatches || []) as KnockoutMatch[]);
            this.initializeKnockoutMatches();
            // persist normalized names back to Supabase
            await this.saveData();
          } else if (Array.isArray(data.payload) && data.payload.length > 0) {
            this.matches = this.ensureTieBreakers((data.payload as any[]).map(m => this.mapLegacyMatchNames(m)));
            this.initializeKnockoutMatches();
            await this.saveData();
          } else {
            this.matches = generateAllMatches();
            this.initializeKnockoutMatches();
            await this.saveData();
          }
        } else {
          this.matches = generateAllMatches();
          this.initializeKnockoutMatches();
          await this.saveData();
        }
      } else {
        // Supabase is not configured; fall back to in-memory generation.
        this.matches = generateAllMatches();
        this.initializeKnockoutMatches();
      }
    } catch (error) {
      console.error('Failed to load data from API, operating in-memory:', error);
      this.matches = generateAllMatches();
      this.initializeKnockoutMatches();
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  // localStorage migration removed. The app now expects Supabase for persistence.

  private initializeKnockoutMatches() {
    // Ensure match.pool fields align with current pool membership (fixes persisted legacy pool tags)
    this.normalizeMatchPools(this.matches);

    // If both pools are complete, fill all semi slots. If only one pool is complete,
    // place that pool's top2 into their semi slots and leave the opponents as TBD.
    const standings = this.getStandings();
    const poolAComplete = arePoolMatchesComplete(this.matches, 'A');
    const poolBComplete = arePoolMatchesComplete(this.matches, 'B');

    if (poolAComplete && poolBComplete) {
      const { poolATop2, poolBTop2 } = getQualifiedTeams(standings);
      const generatedKnockouts = generateKnockoutMatches(poolATop2, poolBTop2);

      if (this.knockoutMatches.length > 0) {
        this.knockoutMatches.forEach((existing, index) => {
          if (index < generatedKnockouts.length) {
            const gen = generatedKnockouts[index];
            // If teams changed (including becoming "TBD"), reset scores and tieBreaker
            if (existing.teamA !== gen.teamA || existing.teamB !== gen.teamB) {
              existing.teamA = gen.teamA;
              existing.teamB = gen.teamB;
              existing.scores = gen.scores.slice();
              existing.tieBreaker = {
                teamAPlayers: Array.isArray(gen.tieBreaker?.teamAPlayers) ? gen.tieBreaker!.teamAPlayers.slice(0,3) : ['', '', ''],
                teamBPlayers: Array.isArray(gen.tieBreaker?.teamBPlayers) ? gen.tieBreaker!.teamBPlayers.slice(0,3) : ['', '', ''],
                teamAScore: typeof gen.tieBreaker?.teamAScore === 'number' ? gen.tieBreaker!.teamAScore : undefined,
                teamBScore: typeof gen.tieBreaker?.teamBScore === 'number' ? gen.tieBreaker!.teamBScore : undefined,
              };
            }
          }
        });
      } else {
        this.knockoutMatches = generatedKnockouts;
      }

      this.updateFinalsTeams();
    } else if (poolAComplete || poolBComplete) {
      // One pool is complete: compute its top2 and insert into the semis; leave the other pool as TBD
      const poolATop2: [any, any] = poolAComplete ? getQualifiedTeams(standings).poolATop2 : ['TBD', 'TBD'];
      const poolBTop2: [any, any] = poolBComplete ? getQualifiedTeams(standings).poolBTop2 : ['TBD', 'TBD'];
      const generatedKnockouts = generateKnockoutMatches(poolATop2, poolBTop2);

      if (this.knockoutMatches.length > 0) {
        this.knockoutMatches.forEach((existing, index) => {
          if (index < generatedKnockouts.length) {
            const gen = generatedKnockouts[index];
            if (existing.teamA !== gen.teamA || existing.teamB !== gen.teamB) {
              existing.teamA = gen.teamA;
              existing.teamB = gen.teamB;
              existing.scores = gen.scores.slice();
              existing.tieBreaker = {
                teamAPlayers: Array.isArray(gen.tieBreaker?.teamAPlayers) ? gen.tieBreaker!.teamAPlayers.slice(0,3) : ['', '', ''],
                teamBPlayers: Array.isArray(gen.tieBreaker?.teamBPlayers) ? gen.tieBreaker!.teamBPlayers.slice(0,3) : ['', '', ''],
                teamAScore: typeof gen.tieBreaker?.teamAScore === 'number' ? gen.tieBreaker!.teamAScore : undefined,
                teamBScore: typeof gen.tieBreaker?.teamBScore === 'number' ? gen.tieBreaker!.teamBScore : undefined,
              };
            }
          }
        });
      } else {
        this.knockoutMatches = generatedKnockouts;
      }

      // Final teams remain TBD until semis are played
      this.updateFinalsTeams();
    } else {
      this.knockoutMatches = generateKnockoutMatches(['TBD', 'TBD'], ['TBD', 'TBD']);
    }

    // Extra safety: if any knockout match currently has a TBD participant, ensure its
    // scores and tieBreaker are reset to the empty template so stale scores don't persist
    const emptyTemplate = generateKnockoutMatches(['TBD', 'TBD'], ['TBD', 'TBD']);
    this.knockoutMatches.forEach(k => {
      if (k.teamA === 'TBD' || k.teamB === 'TBD') {
        const tpl = emptyTemplate.find(e => e.id === k.id)!;
        k.scores = tpl.scores.slice();
        k.tieBreaker = {
          teamAPlayers: Array.isArray(tpl.tieBreaker?.teamAPlayers) ? tpl.tieBreaker!.teamAPlayers.slice(0,3) : ['', '', ''],
          teamBPlayers: Array.isArray(tpl.tieBreaker?.teamBPlayers) ? tpl.tieBreaker!.teamBPlayers.slice(0,3) : ['', '', ''],
          teamAScore: typeof tpl.tieBreaker?.teamAScore === 'number' ? tpl.tieBreaker!.teamAScore : undefined,
          teamBScore: typeof tpl.tieBreaker?.teamBScore === 'number' ? tpl.tieBreaker!.teamBScore : undefined,
        };
      }
    });
  }

  // Align persisted match.pool values to the configured pools in types.ts
  private normalizeMatchPools(matches: Match[]) {
    matches.forEach(m => {
      const aInA = POOL_A_TEAMS.includes(m.teamA as any);
      const aInB = POOL_B_TEAMS.includes(m.teamA as any);
      const bInA = POOL_A_TEAMS.includes(m.teamB as any);
      const bInB = POOL_B_TEAMS.includes(m.teamB as any);

      // If both teams belong to the same pool, enforce that pool value.
      if ((aInA && bInA) && m.pool !== 'A') m.pool = 'A';
      else if ((aInB && bInB) && m.pool !== 'B') m.pool = 'B';

      // If one team is known to be in a pool and the other is not, use the known pool.
      else if (aInA || bInA) m.pool = 'A';
      else if (aInB || bInB) m.pool = 'B';
      // otherwise leave as-is (could be knockout or unexpected team)
    });
  }

  private updateFinalsTeams() {
    const semi1 = this.knockoutMatches.find(m => m.id === 'semi-1');
    const semi2 = this.knockoutMatches.find(m => m.id === 'semi-2');
    const final = this.knockoutMatches.find(m => m.id === 'final');

    if (semi1 && semi2 && final) {
      const semi1Winner = getKnockoutMatchWinner(semi1);
      const semi2Winner = getKnockoutMatchWinner(semi2);

      // If final teams change (including becoming "TBD"), reset their scores so stale scores don't remain
      if (final.teamA !== semi1Winner) {
        final.teamA = semi1Winner;
        // reset scores/tieBreaker for final when its participant changed
        const emptyFinal = generateKnockoutMatches(['TBD','TBD'], ['TBD','TBD']).find(m => m.id === 'final')!;
        final.scores = emptyFinal.scores.slice();
        final.tieBreaker = {
          teamAPlayers: Array.isArray(emptyFinal.tieBreaker?.teamAPlayers) ? emptyFinal.tieBreaker!.teamAPlayers.slice(0,3) : ['', '', ''],
          teamBPlayers: Array.isArray(emptyFinal.tieBreaker?.teamBPlayers) ? emptyFinal.tieBreaker!.teamBPlayers.slice(0,3) : ['', '', ''],
          teamAScore: typeof emptyFinal.tieBreaker?.teamAScore === 'number' ? emptyFinal.tieBreaker!.teamAScore : undefined,
          teamBScore: typeof emptyFinal.tieBreaker?.teamBScore === 'number' ? emptyFinal.tieBreaker!.teamBScore : undefined,
        };
      }
      if (final.teamB !== semi2Winner) {
        final.teamB = semi2Winner;
        final.scores = generateKnockoutMatches(['TBD','TBD'], ['TBD','TBD']).find(m => m.id === 'final')!.scores.slice();
        const emptyFinal2 = generateKnockoutMatches(['TBD','TBD'], ['TBD','TBD']).find(m => m.id === 'final')!;
        final.tieBreaker = {
          teamAPlayers: Array.isArray(emptyFinal2.tieBreaker?.teamAPlayers) ? emptyFinal2.tieBreaker!.teamAPlayers.slice(0,3) : ['', '', ''],
          teamBPlayers: Array.isArray(emptyFinal2.tieBreaker?.teamBPlayers) ? emptyFinal2.tieBreaker!.teamBPlayers.slice(0,3) : ['', '', ''],
          teamAScore: typeof emptyFinal2.tieBreaker?.teamAScore === 'number' ? emptyFinal2.tieBreaker!.teamAScore : undefined,
          teamBScore: typeof emptyFinal2.tieBreaker?.teamBScore === 'number' ? emptyFinal2.tieBreaker!.teamBScore : undefined,
        };
      }
    }
  }

  private saveToLocalStorage() {
    // no-op: localStorage persistence removed in favor of Supabase-only persistence
  }

  private async saveData() {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const tournamentData: TournamentData = { poolMatches: this.matches, knockoutMatches: this.knockoutMatches };
        const { error } = await supabase.from('tournament').upsert({ id: 'singleton', payload: tournamentData });
        if (error) console.warn('Failed to save to Supabase:', (error as any).message || error);
      } else {
        // Supabase not configured — operate in-memory only. Changes won't persist across page reloads.
        console.warn('Supabase not configured; changes are in-memory only. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to persist data.');
      }
    } catch (error) {
      console.warn('Failed to save to API:', error);
    }
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getMatches(): Match[] {
    return this.matches;
  }

  getKnockoutMatches(): KnockoutMatch[] {
    return this.knockoutMatches;
  }

  getStandings(): { poolA: Standing[]; poolB: Standing[] } {
    return calculateStandings(this.matches);
  }

  updateMatch(matchId: string, scores: Match['scores'], tieBreaker?: Match['tieBreaker']) {
    const matchIndex = this.matches.findIndex(m => m.id === matchId);
    if (matchIndex !== -1) {
      const updated = { ...this.matches[matchIndex], scores } as Match;
      if (tieBreaker) updated.tieBreaker = tieBreaker;
      this.matches[matchIndex] = updated;
      this.initializeKnockoutMatches();
      this.saveData();
      this.notify();
    }
  }

  updateKnockoutMatch(matchId: string, scores: KnockoutMatch['scores'], tieBreaker?: Match['tieBreaker']) {
    const matchIndex = this.knockoutMatches.findIndex(m => m.id === matchId);
    if (matchIndex !== -1) {
      const updated = { ...this.knockoutMatches[matchIndex], scores } as KnockoutMatch;
      if (tieBreaker) {
        const tb = tieBreaker as any;
        updated.tieBreaker = {
          teamAPlayers: Array.isArray(tb.teamAPlayers) ? tb.teamAPlayers.slice(0,3).concat(Array(3 - (tb.teamAPlayers||[]).length).fill('')).slice(0,3) : ['', '', ''],
          teamBPlayers: Array.isArray(tb.teamBPlayers) ? tb.teamBPlayers.slice(0,3).concat(Array(3 - (tb.teamBPlayers||[]).length).fill('')).slice(0,3) : ['', '', ''],
          teamAScore: typeof tb.teamAScore === 'number' ? tb.teamAScore : undefined,
          teamBScore: typeof tb.teamBScore === 'number' ? tb.teamBScore : undefined,
        };
      }
      this.knockoutMatches[matchIndex] = updated;
      this.updateFinalsTeams();
      this.saveData();
      this.notify();
    }
  }

  async updateMatchAPI(matchId: string, scores: Match['scores'], tieBreaker?: Match['tieBreaker']) {
    try {
      const matchIndex = this.matches.findIndex(m => m.id === matchId);
      if (matchIndex !== -1) {
        const updated = { ...this.matches[matchIndex], scores } as Match;
        if (tieBreaker) updated.tieBreaker = tieBreaker;
        this.matches[matchIndex] = updated;
        this.initializeKnockoutMatches();
        await this.saveData();
        this.notify();
      } else {
        console.warn('Match not found locally when updating via Supabase fallback');
      }
    } catch (error) {
      console.error('Failed to update via API, using local update:', error);
      this.updateMatch(matchId, scores, tieBreaker);
    }
  }

  async updateKnockoutMatchAPI(matchId: string, scores: KnockoutMatch['scores'], tieBreaker?: Match['tieBreaker']) {
    try {
      const matchIndex = this.knockoutMatches.findIndex(m => m.id === matchId);
      if (matchIndex !== -1) {
        const updated = { ...this.knockoutMatches[matchIndex], scores } as KnockoutMatch;
        if (tieBreaker) {
          const tb = tieBreaker as any;
          updated.tieBreaker = {
            teamAPlayers: Array.isArray(tb.teamAPlayers) ? tb.teamAPlayers.slice(0,3).concat(Array(3 - (tb.teamAPlayers||[]).length).fill('')).slice(0,3) : ['', '', ''],
            teamBPlayers: Array.isArray(tb.teamBPlayers) ? tb.teamBPlayers.slice(0,3).concat(Array(3 - (tb.teamBPlayers||[]).length).fill('')).slice(0,3) : ['', '', ''],
            teamAScore: typeof tb.teamAScore === 'number' ? tb.teamAScore : undefined,
            teamBScore: typeof tb.teamBScore === 'number' ? tb.teamBScore : undefined,
          };
        }
        this.knockoutMatches[matchIndex] = updated;
        this.updateFinalsTeams();
        await this.saveData();
        this.notify();
      } else {
        console.warn('Knockout match not found locally when updating via API');
      }
    } catch (error) {
      console.error('Failed to update knockout match via API, using local update:', error);
      this.updateKnockoutMatch(matchId, scores, tieBreaker);
    }
  }

  async resetTournament() {
    try {
      this.matches = generateAllMatches();
      this.initializeKnockoutMatches();
      await this.saveData();
      this.notify();
    } catch (error) {
      console.error('Failed to reset via API, using local reset:', error);
      this.matches = generateAllMatches();
      this.initializeKnockoutMatches();
      this.saveToLocalStorage();
      this.notify();
    }
  }
}

const tournamentStore = new TournamentStore();

export function useTournamentStore() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = tournamentStore.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  return {
    matches: tournamentStore.getMatches(),
    knockoutMatches: tournamentStore.getKnockoutMatches(),
    standings: tournamentStore.getStandings(),
    isLoading: tournamentStore.loading,
  updateMatch: (matchId: string, scores: Match['scores'], tieBreaker?: Match['tieBreaker']) => tournamentStore.updateMatchAPI(matchId, scores, tieBreaker),
  updateKnockoutMatch: (matchId: string, scores: KnockoutMatch['scores'], tieBreaker?: Match['tieBreaker']) => tournamentStore.updateKnockoutMatchAPI(matchId, scores, tieBreaker),
    resetTournament: () => tournamentStore.resetTournament(),
  };
}

