import { useState, useEffect } from 'react';
import type { Match, Standing, KnockoutMatch } from './types';
import { 
  generateAllMatches, 
  calculateStandings, 
  areAllPoolMatchesComplete,
  getQualifiedTeams,
  generateKnockoutMatches,
  getKnockoutMatchWinner
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

// Simple state management for the tournament app
class TournamentStore {
  private matches: Match[] = [];
  private knockoutMatches: KnockoutMatch[] = [];
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
        } else if (data && data.payload) {
          // Check if payload is new format (object with poolMatches and knockoutMatches)
          if (data.payload.poolMatches && Array.isArray(data.payload.poolMatches)) {
            // New format with separate pool and knockout matches
            const tournamentData = data.payload as TournamentData;
            this.matches = tournamentData.poolMatches;
            this.knockoutMatches = tournamentData.knockoutMatches || [];
            this.initializeKnockoutMatches(); // Update knockout matches based on current pool state
          } else if (Array.isArray(data.payload) && data.payload.length > 0) {
            // Old format - just pool matches array
            this.matches = data.payload as Match[];
            this.initializeKnockoutMatches();
          } else {
            // No valid data; generate defaults and save
            this.matches = generateAllMatches();
            this.initializeKnockoutMatches();
            await this.saveData();
          }
        } else {
          // No row yet or payload empty; generate defaults and save
          this.matches = generateAllMatches();
          this.initializeKnockoutMatches();
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
    const savedData = localStorage.getItem('tournament-data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Check if it's new format (object with poolMatches and knockoutMatches)
        if (parsedData.poolMatches && Array.isArray(parsedData.poolMatches)) {
          const tournamentData = parsedData as TournamentData;
          this.matches = tournamentData.poolMatches;
          this.knockoutMatches = tournamentData.knockoutMatches || [];
          this.initializeKnockoutMatches();
        } else if (Array.isArray(parsedData)) {
          // Old format - just matches array
          this.matches = parsedData;
          this.initializeKnockoutMatches();
        } else {
          // Invalid format, reset to defaults
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
      // Check for old format localStorage key
      const savedMatches = localStorage.getItem('tournament-matches');
      if (savedMatches) {
        try {
          this.matches = JSON.parse(savedMatches);
          this.initializeKnockoutMatches();
          // Save in new format and remove old key
          this.saveToLocalStorage();
          localStorage.removeItem('tournament-matches');
        } catch (error) {
          console.error('Failed to migrate old localStorage data:', error);
          this.matches = generateAllMatches();
          this.initializeKnockoutMatches();
          this.saveToLocalStorage();
        }
      } else {
        // No saved data, generate defaults
        this.matches = generateAllMatches();
        this.initializeKnockoutMatches();
        this.saveToLocalStorage();
      }
    }
  }

  private initializeKnockoutMatches() {
    // Check if pool matches are complete to determine semi-final teams
    if (areAllPoolMatchesComplete(this.matches)) {
      const standings = this.getStandings();
      const { poolATop2, poolBTop2 } = getQualifiedTeams(standings);
      
      // Update knockout matches with qualified teams
      const generatedKnockouts = generateKnockoutMatches(poolATop2, poolBTop2);
      
      // If we already have knockout matches, preserve scores but update teams
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
      
      // Update finals teams based on semi results
      this.updateFinalsTeams();
    } else {
      // Pool matches not complete, generate with TBD
      this.knockoutMatches = generateKnockoutMatches(["TBD", "TBD"], ["TBD", "TBD"]);
    }
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
    const tournamentData: TournamentData = {
      poolMatches: this.matches,
      knockoutMatches: this.knockoutMatches
    };
    localStorage.setItem('tournament-data', JSON.stringify(tournamentData));
  }

  private async saveData() {
    try {
      // Save to localStorage as backup
      this.saveToLocalStorage();
      // Upsert to Supabase (singleton id) if available
      const supabase = await getSupabaseClient();
      if (supabase) {
        const tournamentData: TournamentData = {
          poolMatches: this.matches,
          knockoutMatches: this.knockoutMatches
        };
        
        const { error } = await supabase.from('tournament').upsert({
          id: 'singleton',
          payload: tournamentData,
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

  getKnockoutMatches(): KnockoutMatch[] {
    return this.knockoutMatches;
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
      // Re-initialize knockout matches when pool matches update
      this.initializeKnockoutMatches();
      this.saveData();
      this.notify();
    }
  }

  updateKnockoutMatch(matchId: string, scores: KnockoutMatch['scores']) {
    const matchIndex = this.knockoutMatches.findIndex(m => m.id === matchId);
    if (matchIndex !== -1) {
      this.knockoutMatches[matchIndex] = {
        ...this.knockoutMatches[matchIndex],
        scores
      };
      // Update finals teams if semi results changed
      this.updateFinalsTeams();
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
        // Re-initialize knockout matches when pool matches update
        this.initializeKnockoutMatches();
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

  async updateKnockoutMatchAPI(matchId: string, scores: KnockoutMatch['scores']) {
    try {
      const matchIndex = this.knockoutMatches.findIndex(m => m.id === matchId);
      if (matchIndex !== -1) {
        this.knockoutMatches[matchIndex] = {
          ...this.knockoutMatches[matchIndex],
          scores
        };
        // Update finals teams if semi results changed
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
      // Reset to generated default and persist to Supabase
      this.matches = generateAllMatches();
      this.initializeKnockoutMatches();
      await this.saveData();
      this.notify();
    } catch (error) {
      console.error('Failed to reset via API, using local reset:', error);
      this.matches = generateAllMatches();
      this.initializeKnockoutMatches();
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
    knockoutMatches: tournamentStore.getKnockoutMatches(),
    standings: tournamentStore.getStandings(),
    isLoading: tournamentStore.loading,
    updateMatch: (matchId: string, scores: Match['scores']) => 
      tournamentStore.updateMatchAPI(matchId, scores),
    updateKnockoutMatch: (matchId: string, scores: KnockoutMatch['scores']) =>
      tournamentStore.updateKnockoutMatchAPI(matchId, scores),
    resetTournament: () => tournamentStore.resetTournament()
  };
}