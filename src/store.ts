import { useState, useEffect } from 'react';
import type { Match, Standing, KnockoutMatch, TeamInfo, AnyTeamName } from './types';
import {
  generateAllMatches,
  calculateStandings,
  arePoolMatchesComplete,
  getQualifiedTeams,
  generateKnockoutMatches,
  getKnockoutMatchWinner,
  isKnockoutMatchComplete,
  CATEGORIES,
  isDoublesCategory,
  POOL_A_TEAMS,
  POOL_B_TEAMS,
} from './types';
import { getSupabaseClient } from './supabaseClient';

// Tournament data structure for persistence
interface TournamentData {
  teams?: TeamInfo[];
  poolMatches: Match[];
  knockoutMatches: KnockoutMatch[];
}

// Use `src/supabaseClient.ts` for client initialization. If missing, store will operate in-memory only.

class TournamentStore {
  private static readonly SEASON2_TEAMS: TeamInfo[] = [
    { name: 'BaddyVerse', pool: 'A', players: ['Chaitanya', 'Amrutha', 'Kishore', 'Shashi', 'Mahesh', 'Manjunath', 'Tanu'] },
    { name: 'Vortex Tamers', pool: 'A', players: ['Preetham', 'Anika', 'Ramkumar', 'Somnath', 'Shekar', 'Aditya'] },
    { name: 'Vortex Smashers', pool: 'A', players: ['Shreesha', 'Deepika', 'Manu', 'Vipin', 'Kiran', 'Prince', 'Navya'] },
    { name: 'Silicon Smashers', pool: 'A', players: ['Anoohya', 'Udhay', 'Manish', 'Ganesh', 'Mithun', 'Nattu', 'Hari'] },
    { name: 'Ninja Bandits 🥷', pool: 'B', players: ['Nithin Bhaskar', 'Sreeharsha', 'Nithish BM', 'Sachu', 'Aswin', 'Abhishek N C', 'Bhavya'] },
    { name: 'Spear Smashers', pool: 'B', players: ['Nithin P', 'Palanisami', 'Mohan', 'Sukesh', 'Prasanna', 'Alex', 'Garima'] },
    { name: 'Elite Smashers', pool: 'B', players: ['Ajay', 'Vikram', 'Naseer', 'Khalid', 'Harshavardhan', 'Andrew', 'Divya'] },
    { name: 'Shuttle Strikers', pool: 'B', players: ['Lakshitha', 'Suresh', 'Srujan', 'Jashwanth', 'Abhishek', 'Vikrant'] },
  ];

  private static readonly SEASON2_NAME_MAP: Record<string, string> = {
    'Team 1': 'BaddyVerse',
    'Team 4': 'Vortex Tamers',
    'Team 6': 'Vortex Smashers',
    'Team 8': 'Silicon Smashers',
    'Team 2': 'Ninja Bandits 🥷',
    'Team 3': 'Spear Smashers',
    'Team 5': 'Elite Smashers',
    'Team 7': 'Shuttle Strikers',
    'SoS': 'Shuttle Strikers',
  };

  private season: '1' | '2' = '2';
  private teams: TeamInfo[] = [];

  setSeason(season: string) {
    const normalized = season === '2' ? '2' : '1';
    if (normalized === this.season) return;
    this.season = normalized;
    void this.loadData();
  }

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
    // Only map placeholder Team 1..Team 8 to Season 1 names.
    // Season 2 uses Team 1..Team 8 as real team names.
    if (this.season !== '1') return match as Match;
    const mappedA = (typeof match.teamA === 'string' && this.LEGACY_NAME_MAP[match.teamA]) ? this.LEGACY_NAME_MAP[match.teamA] : match.teamA;
    const mappedB = (typeof match.teamB === 'string' && this.LEGACY_NAME_MAP[match.teamB]) ? this.LEGACY_NAME_MAP[match.teamB] : match.teamB;
    return { ...match, teamA: mappedA, teamB: mappedB } as Match;
  }

  private mapLegacyKnockoutMatchNames(match: any): KnockoutMatch {
    if (this.season !== '1') return match as KnockoutMatch;
    const mappedA = (typeof match.teamA === 'string' && this.LEGACY_NAME_MAP[match.teamA]) ? this.LEGACY_NAME_MAP[match.teamA] : match.teamA;
    const mappedB = (typeof match.teamB === 'string' && this.LEGACY_NAME_MAP[match.teamB]) ? this.LEGACY_NAME_MAP[match.teamB] : match.teamB;
    return { ...match, teamA: mappedA, teamB: mappedB } as KnockoutMatch;
  }

  private getRowId() {
    return `season:${this.season}`;
  }

  private generatePoolMatchesFromTeams(teams: string[], poolName: 'A' | 'B'): Match[] {
    const matches: Match[] = [];
    let matchNum = 1;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `${poolName}-${matchNum++}`,
          teamA: teams[i] as any,
          teamB: teams[j] as any,
          pool: poolName,
          scores: CATEGORIES.map(cat => ({
            category: cat,
            teamAScore: 0,
            teamBScore: 0,
            teamAPlayer1: '',
            teamAPlayer2: isDoublesCategory(cat) ? '' : undefined,
            teamBPlayer1: '',
            teamBPlayer2: isDoublesCategory(cat) ? '' : undefined,
          })),
          tieBreaker: {
            teamAPlayers: ['', '', ''],
            teamBPlayers: ['', '', ''],
            teamAScore: undefined,
            teamBScore: undefined,
          },
        });
      }
    }

    return matches;
  }

  private generateMatchesFromRoster(teams: TeamInfo[]): Match[] {
    const poolA = teams.filter(t => t.pool === 'A').map(t => t.name);
    const poolB = teams.filter(t => t.pool === 'B').map(t => t.name);
    return [
      ...this.generatePoolMatchesFromTeams(poolA, 'A'),
      ...this.generatePoolMatchesFromTeams(poolB, 'B'),
    ];
  }

  private createDefaultSeasonData(): TournamentData {
    if (this.season === '2') {
      const teams = TournamentStore.SEASON2_TEAMS;
      return {
        teams,
        poolMatches: this.generateMatchesFromRoster(teams),
        knockoutMatches: [],
      };
    }

    return {
      poolMatches: generateAllMatches(),
      knockoutMatches: [],
    };
  }

  private async loadData() {
    try {
      this.isLoading = true;
      const supabase = getSupabaseClient();
      if (!supabase) {
        const seed = this.createDefaultSeasonData();
        this.teams = seed.teams ?? [];
        this.matches = this.ensureTieBreakers(seed.poolMatches);
        this.knockoutMatches = this.ensureKnockoutTieBreakers(seed.knockoutMatches);
        this.initializeKnockoutMatches();
        return;
      }

      const rowId = this.getRowId();
      const { data, error } = await supabase.from('tournament').select('payload').eq('id', rowId).single();

      if (error || !data?.payload) {
        // Backward-compat migration for Season 1
        if (this.season === '1') {
          const legacy = await supabase.from('tournament').select('payload').eq('id', 'singleton').single();
          if (legacy.data?.payload) {
            const legacyPayload = legacy.data.payload as any;
            const tournamentData: TournamentData = legacyPayload.poolMatches
              ? legacyPayload
              : Array.isArray(legacyPayload)
                ? { poolMatches: legacyPayload, knockoutMatches: [] }
                : this.createDefaultSeasonData();

            this.teams = Array.isArray((tournamentData as any).teams) ? (tournamentData as any).teams : [];
            this.matches = this.ensureTieBreakers((tournamentData.poolMatches || []).map(m => this.mapLegacyMatchNames(m as any)));
            this.knockoutMatches = this.ensureKnockoutTieBreakers(((tournamentData.knockoutMatches || []) as any[]).map(m => this.mapLegacyKnockoutMatchNames(m)));
            this.initializeKnockoutMatches();

            // persist into season:1 row for future loads
            await this.saveData();
            return;
          }
        }

        // No row for this season yet — seed it
        const seed = this.createDefaultSeasonData();
        this.teams = seed.teams ?? [];
        this.matches = this.ensureTieBreakers(seed.poolMatches);
        this.knockoutMatches = this.ensureKnockoutTieBreakers(seed.knockoutMatches);
        this.initializeKnockoutMatches();
        await this.saveData();
        return;
      }

      const payload = data.payload as any;
      if (payload.poolMatches && Array.isArray(payload.poolMatches)) {
        const tournamentData = payload as TournamentData;
        this.teams = Array.isArray(tournamentData.teams) ? tournamentData.teams : (this.season === '2' ? TournamentStore.SEASON2_TEAMS : []);
        this.matches = this.ensureTieBreakers((tournamentData.poolMatches || []).map(m => this.mapLegacyMatchNames(m as any)));
        this.knockoutMatches = this.ensureKnockoutTieBreakers(((tournamentData.knockoutMatches || []) as any[]).map(m => this.mapLegacyKnockoutMatchNames(m)));

        // Season 2: migrate legacy Team 1..Team 8 naming to the configured Season 2 names.
        if (this.season === '2') {
          let changed = false;
          const rename = (name: any) => {
            if (typeof name !== 'string') return name;
            return TournamentStore.SEASON2_NAME_MAP[name] ?? name;
          };

          const fixPlayers = (team: TeamInfo) => {
            // Team 4 rename: Vishal -> Shekar
            if (team.name !== 'Vortex Tamers' && team.name !== 'Team 4') return team;
            if (!Array.isArray(team.players) || team.players.length === 0) return team;
            if (!team.players.includes('Vishal')) return team;
            changed = true;
            return { ...team, players: team.players.map(p => (p === 'Vishal' ? 'Shekar' : p)) };
          };

          this.teams = (this.teams || []).map(t => {
            const nextName = rename(t.name);
            if (nextName !== t.name) changed = true;
            return fixPlayers({ ...t, name: nextName });
          });

          this.matches = this.matches.map(m => {
            const nextA = rename(m.teamA);
            const nextB = rename(m.teamB);
            if (nextA !== m.teamA || nextB !== m.teamB) changed = true;
            return { ...m, teamA: nextA, teamB: nextB } as Match;
          });

          this.knockoutMatches = this.knockoutMatches.map(k => {
            const nextA = k.teamA === 'TBD' ? 'TBD' : rename(k.teamA);
            const nextB = k.teamB === 'TBD' ? 'TBD' : rename(k.teamB);
            if (nextA !== k.teamA || nextB !== k.teamB) changed = true;
            return { ...k, teamA: nextA, teamB: nextB } as KnockoutMatch;
          });

          if (changed) {
            await this.saveData();
          }
        }

        this.initializeKnockoutMatches();

        // ensure Season 2 roster is persisted at least once
        if (this.season === '2' && (!tournamentData.teams || tournamentData.teams.length === 0)) {
          await this.saveData();
        }
      } else if (Array.isArray(payload) && payload.length > 0) {
        // legacy payload shape: Match[] only
        this.teams = this.season === '2' ? TournamentStore.SEASON2_TEAMS : [];
        this.matches = this.ensureTieBreakers((payload as any[]).map(m => this.mapLegacyMatchNames(m)));
        this.knockoutMatches = this.ensureKnockoutTieBreakers([]);

        // Season 2: if we loaded legacy Match[] with Team 1..Team 8 names, migrate and persist.
        if (this.season === '2') {
          const rename = (name: any) => {
            if (typeof name !== 'string') return name;
            return TournamentStore.SEASON2_NAME_MAP[name] ?? name;
          };
          let changed = false;
          this.matches = this.matches.map(m => {
            const nextA = rename(m.teamA);
            const nextB = rename(m.teamB);
            if (nextA !== m.teamA || nextB !== m.teamB) changed = true;
            return { ...m, teamA: nextA, teamB: nextB } as Match;
          });
          if (changed) {
            await this.saveData();
          }
        }

        this.initializeKnockoutMatches();
        await this.saveData();
      } else {
        const seed = this.createDefaultSeasonData();
        this.teams = seed.teams ?? [];
        this.matches = this.ensureTieBreakers(seed.poolMatches);
        this.knockoutMatches = this.ensureKnockoutTieBreakers(seed.knockoutMatches);
        this.initializeKnockoutMatches();
        await this.saveData();
      }
    } catch (error) {
      console.error('Failed to load data from API, operating in-memory:', error);
      const seed = this.createDefaultSeasonData();
      this.teams = seed.teams ?? [];
      this.matches = this.ensureTieBreakers(seed.poolMatches);
      this.knockoutMatches = this.ensureKnockoutTieBreakers(seed.knockoutMatches);
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
        const existingById = new Map(this.knockoutMatches.map(m => [m.id, m] as const));
        this.knockoutMatches = generatedKnockouts.map(gen => {
          const existing = existingById.get(gen.id);
          if (!existing) return gen;

          // Important: the generated template always has final participants as TBD.
          // Never treat that as a "participants changed" signal for an existing final,
          // otherwise finals scores will be wiped on refresh.
          if (gen.id === 'final') return existing;

          // If teams changed (including becoming "TBD"), reset scores and tieBreaker
          if (existing.teamA !== gen.teamA || existing.teamB !== gen.teamB) {
            existing.teamA = gen.teamA;
            existing.teamB = gen.teamB;
            existing.scores = gen.scores.slice();
            existing.tieBreaker = {
              teamAPlayers: Array.isArray(gen.tieBreaker?.teamAPlayers) ? gen.tieBreaker!.teamAPlayers.slice(0, 3) : ['', '', ''],
              teamBPlayers: Array.isArray(gen.tieBreaker?.teamBPlayers) ? gen.tieBreaker!.teamBPlayers.slice(0, 3) : ['', '', ''],
              teamAScore: typeof gen.tieBreaker?.teamAScore === 'number' ? gen.tieBreaker!.teamAScore : undefined,
              teamBScore: typeof gen.tieBreaker?.teamBScore === 'number' ? gen.tieBreaker!.teamBScore : undefined,
            };
          }

          return existing;
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
        const existingById = new Map(this.knockoutMatches.map(m => [m.id, m] as const));
        this.knockoutMatches = generatedKnockouts.map(gen => {
          const existing = existingById.get(gen.id);
          if (!existing) return gen;

          if (gen.id === 'final') return existing;

          if (existing.teamA !== gen.teamA || existing.teamB !== gen.teamB) {
            existing.teamA = gen.teamA;
            existing.teamB = gen.teamB;
            existing.scores = gen.scores.slice();
            existing.tieBreaker = {
              teamAPlayers: Array.isArray(gen.tieBreaker?.teamAPlayers) ? gen.tieBreaker!.teamAPlayers.slice(0, 3) : ['', '', ''],
              teamBPlayers: Array.isArray(gen.tieBreaker?.teamBPlayers) ? gen.tieBreaker!.teamBPlayers.slice(0, 3) : ['', '', ''],
              teamAScore: typeof gen.tieBreaker?.teamAScore === 'number' ? gen.tieBreaker!.teamAScore : undefined,
              teamBScore: typeof gen.tieBreaker?.teamBScore === 'number' ? gen.tieBreaker!.teamBScore : undefined,
            };
          }

          return existing;
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
      // Bracket consistency rule:
      // - Finals participants should only be set when the corresponding semi is COMPLETE and has a decided winner.
      // - If a semi becomes incomplete/undecided again (e.g. someone edits and clears scores), finals must revert to TBD.
      const semi1Ready = semi1.teamA !== 'TBD' && semi1.teamB !== 'TBD' && isKnockoutMatchComplete(semi1);
      const semi2Ready = semi2.teamA !== 'TBD' && semi2.teamB !== 'TBD' && isKnockoutMatchComplete(semi2);

      const semi1Winner = semi1Ready ? getKnockoutMatchWinner(semi1) : 'TBD';
      const semi2Winner = semi2Ready ? getKnockoutMatchWinner(semi2) : 'TBD';

      const desiredFinalTeamA = semi1Winner !== 'TBD' ? semi1Winner : 'TBD';
      const desiredFinalTeamB = semi2Winner !== 'TBD' ? semi2Winner : 'TBD';

      const shouldResetFinal = (final.teamA !== desiredFinalTeamA) || (final.teamB !== desiredFinalTeamB);

      if (shouldResetFinal) {
        final.teamA = desiredFinalTeamA;
        final.teamB = desiredFinalTeamB;

        // Reset scores/tieBreaker for final when its participants truly changed.
        const emptyFinal = generateKnockoutMatches(['TBD', 'TBD'], ['TBD', 'TBD']).find(m => m.id === 'final')!;
        final.scores = emptyFinal.scores.slice();
        final.tieBreaker = {
          teamAPlayers: Array.isArray(emptyFinal.tieBreaker?.teamAPlayers) ? emptyFinal.tieBreaker!.teamAPlayers.slice(0, 3) : ['', '', ''],
          teamBPlayers: Array.isArray(emptyFinal.tieBreaker?.teamBPlayers) ? emptyFinal.tieBreaker!.teamBPlayers.slice(0, 3) : ['', '', ''],
          teamAScore: typeof emptyFinal.tieBreaker?.teamAScore === 'number' ? emptyFinal.tieBreaker!.teamAScore : undefined,
          teamBScore: typeof emptyFinal.tieBreaker?.teamBScore === 'number' ? emptyFinal.tieBreaker!.teamBScore : undefined,
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
        const tournamentData: TournamentData = { teams: this.teams, poolMatches: this.matches, knockoutMatches: this.knockoutMatches };
        const { error } = await supabase.from('tournament').upsert({ id: this.getRowId(), payload: tournamentData });
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

  getTeams(): TeamInfo[] {
    return this.teams;
  }

  getStandings(): { poolA: Standing[]; poolB: Standing[] } {
    if (this.season === '2' && Array.isArray(this.teams) && this.teams.length > 0) {
      const poolA = this.teams.filter(t => t.pool === 'A').map(t => t.name as AnyTeamName);
      const poolB = this.teams.filter(t => t.pool === 'B').map(t => t.name as AnyTeamName);
      return calculateStandings(this.matches, poolA, poolB);
    }
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
      if (matchId === 'semi-1' || matchId === 'semi-2') {
        this.updateFinalsTeams();
      }
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
        if (matchId === 'semi-1' || matchId === 'semi-2') {
          this.updateFinalsTeams();
        }
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
      const seed = this.createDefaultSeasonData();
      this.teams = seed.teams ?? [];
      this.matches = this.ensureTieBreakers(seed.poolMatches);
      this.knockoutMatches = this.ensureKnockoutTieBreakers(seed.knockoutMatches);
      this.initializeKnockoutMatches();
      await this.saveData();
      this.notify();
    } catch (error) {
      console.error('Failed to reset via API, using local reset:', error);
      const seed = this.createDefaultSeasonData();
      this.teams = seed.teams ?? [];
      this.matches = this.ensureTieBreakers(seed.poolMatches);
      this.knockoutMatches = this.ensureKnockoutTieBreakers(seed.knockoutMatches);
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
    teams: tournamentStore.getTeams(),
    standings: tournamentStore.getStandings(),
    isLoading: tournamentStore.loading,
    updateMatch: (matchId: string, scores: Match['scores'], tieBreaker?: Match['tieBreaker']) => tournamentStore.updateMatchAPI(matchId, scores, tieBreaker),
    updateKnockoutMatch: (matchId: string, scores: KnockoutMatch['scores'], tieBreaker?: Match['tieBreaker']) => tournamentStore.updateKnockoutMatchAPI(matchId, scores, tieBreaker),
    resetTournament: () => tournamentStore.resetTournament(),
    setSeason: (season: string) => tournamentStore.setSeason(season),
  };
}

