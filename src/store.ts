import { useState, useEffect } from 'react';
import type { Match, Standing, KnockoutMatch } from './types';
import {
  generateAllMatches,
  calculateStandings,
  areAllPoolMatchesComplete,
  getQualifiedTeams,
  generateKnockoutMatches,
  getKnockoutMatchWinner,
  POOL_A_TEAMS,
  POOL_B_TEAMS,
} from './types';

// Tournament data structure for persistence
interface TournamentData {
  poolMatches: Match[];
  knockoutMatches: KnockoutMatch[];
}

let _supabaseClient: any | null | undefined = undefined;
async function getSupabaseClient() {
  if (_supabaseClient !== undefined) return _supabaseClient;
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!url || !key) {
      _supabaseClient = null;
      return null;
    }
    const mod = await import('@supabase/supabase-js');
    _supabaseClient = mod.createClient(url, key);
    return _supabaseClient;
  } catch (err) {
    console.warn('Could not initialize Supabase client:', err);
    _supabaseClient = null;
    return null;
  }
}

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

  private mapLegacyMatchNames(match: any): Match {
    const mappedA = (typeof match.teamA === 'string' && this.LEGACY_NAME_MAP[match.teamA]) ? this.LEGACY_NAME_MAP[match.teamA] : match.teamA;
    const mappedB = (typeof match.teamB === 'string' && this.LEGACY_NAME_MAP[match.teamB]) ? this.LEGACY_NAME_MAP[match.teamB] : match.teamB;
    return { ...match, teamA: mappedA, teamB: mappedB } as Match;
  }

  private async loadData() {
    try {
      this.isLoading = true;
      const supabase = await getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from('tournament').select('payload').eq('id', 'singleton').single();
        if (error) {
          console.warn('Supabase read failed, falling back to localStorage:', (error as any).message || error);
          this.loadFromLocalStorage();
        } else if (data && data.payload) {
      if (data.payload.poolMatches && Array.isArray(data.payload.poolMatches)) {
        const tournamentData = data.payload as TournamentData;
            // map legacy names and ensure tieBreaker shape
            this.matches = this.ensureTieBreakers((tournamentData.poolMatches || []).map(m => this.mapLegacyMatchNames(m as any)));
            this.knockoutMatches = (tournamentData.knockoutMatches || []).map(k => ({ ...k } as KnockoutMatch));
            this.initializeKnockoutMatches();
            // persist normalized names locally so UI shows updated labels next load
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
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Failed to load data from API, using localStorage:', error);
      this.loadFromLocalStorage();
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  private loadFromLocalStorage() {
    const savedData = localStorage.getItem('tournament-data');
        if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData.poolMatches && Array.isArray(parsedData.poolMatches)) {
          const tournamentData = parsedData as TournamentData;
          this.matches = this.ensureTieBreakers((tournamentData.poolMatches || []).map(m => this.mapLegacyMatchNames(m as any)));
          this.knockoutMatches = (tournamentData.knockoutMatches || []).map(k => ({ ...k } as KnockoutMatch));
          this.initializeKnockoutMatches();
          this.saveToLocalStorage();
        } else if (Array.isArray(parsedData)) {
          this.matches = this.ensureTieBreakers((parsedData as any[]).map(m => this.mapLegacyMatchNames(m)));
          this.initializeKnockoutMatches();
          this.saveToLocalStorage();
        } else {
          this.matches = generateAllMatches();
          this.initializeKnockoutMatches();
          this.saveToLocalStorage();
        }
      } catch (error) {
        console.error('Failed to parse localStorage data, resetting:', error);
        this.matches = generateAllMatches();
        this.initializeKnockoutMatches();
        this.saveToLocalStorage();
      }
    } else {
      const savedMatches = localStorage.getItem('tournament-matches');
      if (savedMatches) {
        try {
          this.matches = JSON.parse(savedMatches);
          this.initializeKnockoutMatches();
          this.saveToLocalStorage();
          localStorage.removeItem('tournament-matches');
        } catch (error) {
          console.error('Failed to migrate old localStorage data:', error);
          this.matches = generateAllMatches();
          this.initializeKnockoutMatches();
          this.saveToLocalStorage();
        }
      } else {
        this.matches = generateAllMatches();
        this.initializeKnockoutMatches();
        this.saveToLocalStorage();
      }
    }
  }

  private initializeKnockoutMatches() {
    // Ensure match.pool fields align with current pool membership (fixes persisted legacy pool tags)
    this.normalizeMatchPools(this.matches);

    if (areAllPoolMatchesComplete(this.matches)) {
      const standings = this.getStandings();
      const { poolATop2, poolBTop2 } = getQualifiedTeams(standings);
      const generatedKnockouts = generateKnockoutMatches(poolATop2, poolBTop2);

      if (this.knockoutMatches.length > 0) {
        this.knockoutMatches.forEach((existing, index) => {
          if (index < generatedKnockouts.length) {
            existing.teamA = generatedKnockouts[index].teamA;
            existing.teamB = generatedKnockouts[index].teamB;
          }
        });
      } else {
        this.knockoutMatches = generatedKnockouts;
      }

      this.updateFinalsTeams();
    } else {
      this.knockoutMatches = generateKnockoutMatches(['TBD', 'TBD'], ['TBD', 'TBD']);
    }
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

      final.teamA = semi1Winner;
      final.teamB = semi2Winner;
    }
  }

  private saveToLocalStorage() {
    const tournamentData: TournamentData = { poolMatches: this.matches, knockoutMatches: this.knockoutMatches };
    localStorage.setItem('tournament-data', JSON.stringify(tournamentData));
  }

  private async saveData() {
    try {
      this.saveToLocalStorage();
      const supabase = await getSupabaseClient();
      if (supabase) {
        const tournamentData: TournamentData = { poolMatches: this.matches, knockoutMatches: this.knockoutMatches };
        const { error } = await supabase.from('tournament').upsert({ id: 'singleton', payload: tournamentData });
        if (error) console.warn('Failed to save to Supabase, data saved locally:', (error as any).message || error);
      }
    } catch (error) {
      console.warn('Failed to save to API, data saved locally:', error);
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

  updateKnockoutMatch(matchId: string, scores: KnockoutMatch['scores']) {
    const matchIndex = this.knockoutMatches.findIndex(m => m.id === matchId);
    if (matchIndex !== -1) {
      this.knockoutMatches[matchIndex] = { ...this.knockoutMatches[matchIndex], scores };
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

  async updateKnockoutMatchAPI(matchId: string, scores: KnockoutMatch['scores']) {
    try {
      const matchIndex = this.knockoutMatches.findIndex(m => m.id === matchId);
      if (matchIndex !== -1) {
        this.knockoutMatches[matchIndex] = { ...this.knockoutMatches[matchIndex], scores };
        this.updateFinalsTeams();
        await this.saveData();
        this.notify();
      } else {
        console.warn('Knockout match not found locally when updating via API');
      }
    } catch (error) {
      console.error('Failed to update knockout match via API, using local update:', error);
      this.updateKnockoutMatch(matchId, scores);
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
    updateKnockoutMatch: (matchId: string, scores: KnockoutMatch['scores']) => tournamentStore.updateKnockoutMatchAPI(matchId, scores),
    resetTournament: () => tournamentStore.resetTournament(),
  };
}

