import { useState, useEffect } from 'react';
import type { Match, Standing } from './types';
import { generateAllMatches, calculateStandings } from './types';
// We'll dynamically import the Supabase client at runtime so missing package or envs
// don't break the whole app. _supabaseClient caches the client or `null` if unavailable.
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

// Simple state management for the tournament app
class TournamentStore {
  private matches: Match[] = [];
  private listeners: (() => void)[] = [];
  private isLoading = false;

  // expose loading state so the value is actually read
  get loading() {
    return this.isLoading;
  }

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      this.isLoading = true;
      // Try reading from Supabase table 'tournament' (singleton row with id='singleton')
      const supabase = await getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('tournament')
          .select('payload')
          .eq('id', 'singleton')
          .single();

        if (error) {
          console.warn('Supabase read failed, falling back to localStorage:', (error as any).message || error);
          this.loadFromLocalStorage();
        } else if (data && data.payload && Array.isArray(data.payload) && data.payload.length > 0) {
          // Payload exists and has matches
          this.matches = data.payload as Match[];
        } else {
          // No row yet or payload empty; generate defaults and save
          this.matches = generateAllMatches();
          await this.saveData();
        }
      } else {
        // Supabase not configured or unavailable — use localStorage fallback
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
    const savedMatches = localStorage.getItem('tournament-matches');
    if (savedMatches) {
      this.matches = JSON.parse(savedMatches);
    } else {
      this.matches = generateAllMatches();
      this.saveToLocalStorage();
    }
  }

  private saveToLocalStorage() {
    localStorage.setItem('tournament-matches', JSON.stringify(this.matches));
  }

  private async saveData() {
    try {
      // Save to localStorage as backup
      this.saveToLocalStorage();
      // Upsert to Supabase (singleton id) if available
      const supabase = await getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from('tournament').upsert({
          id: 'singleton',
          payload: this.matches,
        });

        if (error) {
          console.warn('Failed to save to Supabase, data saved locally:', (error as any).message || error);
        }
      }
    } catch (error) {
      console.warn('Failed to save to API, data saved locally:', error);
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener());
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

  getStandings(): { poolA: Standing[]; poolB: Standing[] } {
    return calculateStandings(this.matches);
  }

  updateMatch(matchId: string, scores: Match['scores']) {
    const matchIndex = this.matches.findIndex(m => m.id === matchId);
    if (matchIndex !== -1) {
      this.matches[matchIndex] = {
        ...this.matches[matchIndex],
        scores
      };
      this.saveData();
      this.notify();
    }
  }

  async updateMatchAPI(matchId: string, scores: Match['scores']) {
    try {
      // Update local matches and persist
      const matchIndex = this.matches.findIndex(m => m.id === matchId);
      if (matchIndex !== -1) {
        this.matches[matchIndex] = {
          ...this.matches[matchIndex],
          scores
        };
        await this.saveData();
        this.notify();
      } else {
        console.warn('Match not found locally when updating via Supabase fallback');
      }
    } catch (error) {
      console.error('Failed to update via API, using local update:', error);
      this.updateMatch(matchId, scores);
    }
  }

  async resetTournament() {
    try {
      // Reset to generated default and persist to Supabase
      this.matches = generateAllMatches();
      await this.saveData();
      this.notify();
    } catch (error) {
      console.error('Failed to reset via API, using local reset:', error);
      this.matches = generateAllMatches();
      this.saveData();
      this.notify();
    }
  }
}

// Singleton store instance
const tournamentStore = new TournamentStore();

// React hook to use the tournament store
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
    standings: tournamentStore.getStandings(),
    isLoading: tournamentStore.loading,
    updateMatch: (matchId: string, scores: Match['scores']) => 
      tournamentStore.updateMatchAPI(matchId, scores),
    resetTournament: () => tournamentStore.resetTournament()
  };
}