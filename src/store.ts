import { useState, useEffect } from 'react';
import type { Match, Standing } from './types';
import { generateAllMatches, calculateStandings } from './types';

// API endpoints
const API_BASE = '/api';

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
      const response = await fetch(`${API_BASE}/matches`);
      if (response.ok) {
        const data = await response.json();
        this.matches = data.matches;
      } else {
        // Fallback to localStorage if API fails
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
      
      // Also try to save to API
      const response = await fetch(`${API_BASE}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matches: this.matches }),
      });
      
      if (!response.ok) {
        console.warn('Failed to save to API, data saved locally');
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
      const response = await fetch(`${API_BASE}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId, scores }),
      });
      
      if (response.ok) {
        const data = await response.json();
        this.matches = data.matches;
        this.saveToLocalStorage(); // Backup to localStorage
        this.notify();
      } else {
        // Fallback to local update
        this.updateMatch(matchId, scores);
      }
    } catch (error) {
      console.error('Failed to update via API, using local update:', error);
      this.updateMatch(matchId, scores);
    }
  }

  async resetTournament() {
    try {
      const response = await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        this.matches = data.matches;
        this.saveToLocalStorage(); // Backup to localStorage
        this.notify();
      } else {
        // Fallback to local reset
        this.matches = generateAllMatches();
        this.saveData();
        this.notify();
      }
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