// Core tournament data types
export type TeamName = 
  | "Lord of the strings" | "The BaddyVerse" | "Silicon Swat" | "Herricanes"
  | "Rising Phoenix" | "Mighty Spartans" | "Racket Blitz" | "SmashOps";

export type Category = 
  | "Men's Singles 1"
  | "Men's Singles 2" 
  | "Men's Doubles 1"
  | "Men's Doubles 2"
  | "Women's Singles"
  | "Mixed Doubles";

export interface CategoryScore {
  category: Category;
  teamAScore: number;
  teamBScore: number;
  teamAPlayer1: string;
  teamAPlayer2?: string;
  teamBPlayer1: string;
  teamBPlayer2?: string;
}

export interface Match {
  id: string;
  teamA: TeamName;
  teamB: TeamName;
  pool: "A" | "B";
  scores: CategoryScore[];
  tieBreaker?: {
    teamAPlayers: string[]; // three player names
    teamBPlayers: string[]; // three player names
    teamAScore?: number; // tiebreak match score (e.g., 1 or 0)
    teamBScore?: number;
  };
}

export interface KnockoutMatch {
  id: string;
  teamA: TeamName | "TBD";
  teamB: TeamName | "TBD";
  type: "semi" | "final";
  scores: CategoryScore[];
  tieBreaker?: {
    teamAPlayers: string[];
    teamBPlayers: string[];
    teamAScore?: number;
    teamBScore?: number;
  };
}

export interface Standing {
  team: TeamName;
  wins: number;
  losses: number;
  points: number;
  // Sum of events (categories) won across only the matches this team won
  eventsWonInVictories: number;
  // Sum of total points scored across only the matches this team won
  pointsInVictories: number;
}

// Team players data
export const TEAM_PLAYERS: Record<TeamName, string[]> = {
  "Lord of the strings": ["Prajwal S", "Ananya", "Nithish B M", "Mohanraj", "Karthik", "Pratham Pote", "Anika"],
  "The BaddyVerse": ["Chaitanya", "Amrutha", "Manu", "Shreeharsha", "Shashikumar", "Abhishek", "Garima"],
  "Silicon Swat": ["Nithin P", "Kiruthika", "Arya", "Hari Siva Shankar", "Alex", "Vikrant"],
  "Herricanes": ["Vikram", "Anoohya", "Manish", "Khalid", "Naresh", "Kiran"],
  "Rising Phoenix": ["Aman", "Deepika", "Ramanan", "Chirag", "Prajwal P", "Kingsly"],
  "Mighty Spartans": ["Nithin Bhaskar", "Rubini", "Preetham", "Mithun", "Nattu", "Shiva"],
  "Racket Blitz": ["Ninad", "Divya", "Suresh", "Srujan", "Aditya", "Nikhila"],
  "SmashOps": ["Ajay", "Lakshitha", "Shreesha", "Ganesh", "Aswin", "Vipin"]
};

export const CATEGORIES: Category[] = [
  "Men's Singles 1",
  "Men's Singles 2",
  "Men's Doubles 1",
  "Men's Doubles 2",
  "Women's Singles",
  "Mixed Doubles",
];

// Pools: put the four specified teams in Pool B, others in Pool A
export const POOL_B_TEAMS: TeamName[] = [
  "Lord of the strings",
  "The BaddyVerse",
  "Silicon Swat",
  "Herricanes"
];

export const POOL_A_TEAMS: TeamName[] = [
  "Rising Phoenix",
  "Mighty Spartans",
  "Racket Blitz",
  "SmashOps"
];

// Helper functions
export function isDoublesCategory(category: string): boolean {
  return category.includes("Doubles");
}

export function getCategoryAbbreviation(category: Category): string {
  switch (category) {
    case "Men's Singles 1":
      return "MS";
    case "Men's Singles 2":
      return "RMS";
    case "Men's Doubles 1":
      return "MD";
    case "Men's Doubles 2":
      return "RMD";
    case "Women's Singles":
      return "WS";
    case "Mixed Doubles":
      return "XD";
    default:
      return category;
  }
}

export function generatePoolMatches(teams: TeamName[], poolName: "A" | "B"): Match[] {
  const matches: Match[] = [];
  let matchNum = 1;
  
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: `${poolName}-${matchNum++}`,
        teamA: teams[i],
        teamB: teams[j],
        pool: poolName,
        scores: CATEGORIES.map(cat => ({
          category: cat,
          teamAScore: 0,
          teamBScore: 0,
          teamAPlayer1: "",
          teamAPlayer2: isDoublesCategory(cat) ? "" : undefined,
          teamBPlayer1: "",
          teamBPlayer2: isDoublesCategory(cat) ? "" : undefined,
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

// Generate all tournament matches
export function generateAllMatches(): Match[] {
  return [
    ...generatePoolMatches(POOL_A_TEAMS, "A"),
    ...generatePoolMatches(POOL_B_TEAMS, "B")
  ];
}

// Calculate standings from matches
export function calculateStandings(matches: Match[]): { poolA: Standing[]; poolB: Standing[] } {
  const standings: Partial<Record<TeamName, Standing>> = {};
  
  // Initialize all teams
  [...POOL_A_TEAMS, ...POOL_B_TEAMS].forEach(team => {
    standings[team] = { team, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
  });

  // Also initialize any team names that appear in matches but are not in the POOL lists
  matches.forEach(m => {
    if (m.teamA && !(m.teamA in standings)) {
      // cast because loaded matches may contain earlier team strings that match TeamName at runtime
      (standings as any)[m.teamA] = { team: m.teamA as TeamName, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
    }
    if (m.teamB && !(m.teamB in standings)) {
      (standings as any)[m.teamB] = { team: m.teamB as TeamName, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
    }
  });
  
  matches.forEach(match => {
    // Only process matches that are complete (all categories filled)
    if (!isMatchComplete(match)) {
      return;
    }
    
    // Count category wins and also sum raw points across categories
    let teamAWins = 0;
    let teamBWins = 0;
    let totalPointsA = 0;
    let totalPointsB = 0;

    match.scores.forEach(score => {
      if (score.teamAScore > score.teamBScore) {
        teamAWins++;
      } else if (score.teamBScore > score.teamAScore) {
        teamBWins++;
      }
      totalPointsA += score.teamAScore;
      totalPointsB += score.teamBScore;
    });

    // Determine match winner by category wins; if tied, break tie by total points
    if (teamAWins > teamBWins) {
      if (!standings[match.teamA]) standings[match.teamA] = { team: match.teamA, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
      if (!standings[match.teamB]) standings[match.teamB] = { team: match.teamB, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
      standings[match.teamA]!.wins++;
      standings[match.teamA]!.points += 1;
      standings[match.teamB]!.losses++;
      // accumulate custom tie-break metrics for winning matches
      standings[match.teamA]!.eventsWonInVictories += teamAWins;
      standings[match.teamA]!.pointsInVictories += totalPointsA;
    } else if (teamBWins > teamAWins) {
      if (!standings[match.teamA]) standings[match.teamA] = { team: match.teamA, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
      if (!standings[match.teamB]) standings[match.teamB] = { team: match.teamB, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
      standings[match.teamB]!.wins++;
      standings[match.teamB]!.points += 1;
      standings[match.teamA]!.losses++;
      // accumulate custom tie-break metrics for winning matches
      standings[match.teamB]!.eventsWonInVictories += teamBWins;
      standings[match.teamB]!.pointsInVictories += totalPointsB;
    } else {
      // Category wins are equal — use total points as tiebreaker
      if (totalPointsA > totalPointsB) {
        if (!standings[match.teamA]) standings[match.teamA] = { team: match.teamA, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
        if (!standings[match.teamB]) standings[match.teamB] = { team: match.teamB, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
        standings[match.teamA]!.wins++;
        standings[match.teamA]!.points += 1;
        standings[match.teamB]!.losses++;
        // accumulate custom tie-break metrics for winning matches
        standings[match.teamA]!.eventsWonInVictories += teamAWins;
        standings[match.teamA]!.pointsInVictories += totalPointsA;
      } else if (totalPointsB > totalPointsA) {
        if (!standings[match.teamA]) standings[match.teamA] = { team: match.teamA, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
        if (!standings[match.teamB]) standings[match.teamB] = { team: match.teamB, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
        standings[match.teamB]!.wins++;
        standings[match.teamB]!.points += 1;
        standings[match.teamA]!.losses++;
        // accumulate custom tie-break metrics for winning matches
        standings[match.teamB]!.eventsWonInVictories += teamBWins;
        standings[match.teamB]!.pointsInVictories += totalPointsB;
      } else {
        // Fully tied on categories and points. If a tieBreaker result exists, use it to award the win.
        if (match.tieBreaker && typeof match.tieBreaker.teamAScore === 'number' && typeof match.tieBreaker.teamBScore === 'number') {
          if (match.tieBreaker.teamAScore > match.tieBreaker.teamBScore) {
            if (!standings[match.teamA]) standings[match.teamA] = { team: match.teamA, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
            if (!standings[match.teamB]) standings[match.teamB] = { team: match.teamB, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
            standings[match.teamA]!.wins++;
            standings[match.teamA]!.points += 1;
            standings[match.teamB]!.losses++;
            // accumulate custom tie-break metrics for winning matches
            standings[match.teamA]!.eventsWonInVictories += teamAWins; // categories were tied, but count categories won
            standings[match.teamA]!.pointsInVictories += totalPointsA;
          } else if (match.tieBreaker.teamBScore > match.tieBreaker.teamAScore) {
            if (!standings[match.teamA]) standings[match.teamA] = { team: match.teamA, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
            if (!standings[match.teamB]) standings[match.teamB] = { team: match.teamB, wins: 0, losses: 0, points: 0, eventsWonInVictories: 0, pointsInVictories: 0 };
            standings[match.teamB]!.wins++;
            standings[match.teamB]!.points += 1;
            standings[match.teamA]!.losses++;
            // accumulate custom tie-break metrics for winning matches
            standings[match.teamB]!.eventsWonInVictories += teamBWins;
            standings[match.teamB]!.pointsInVictories += totalPointsB;
          } else {
            // tieBreak also tied: leave unresolved (no points awarded)
          }
        } else {
          // No tiebreaker recorded yet: leave unresolved (no points awarded)
        }
      }
    }
  });
  
  // Build arrays for each pool and sort according to qualification criteria so the
  // UI points table updates order immediately when scores change.
  const poolA = POOL_A_TEAMS.map(team => standings[team]!);
  const poolB = POOL_B_TEAMS.map(team => standings[team]!);

  function sortForDisplay(pool: Standing[]) {
    return [...pool].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.eventsWonInVictories !== a.eventsWonInVictories) return b.eventsWonInVictories - a.eventsWonInVictories;
      if (b.pointsInVictories !== a.pointsInVictories) return b.pointsInVictories - a.pointsInVictories;
      // deterministic fallback
      return a.team.localeCompare(b.team);
    });
  }

  return { poolA: sortForDisplay(poolA), poolB: sortForDisplay(poolB) };
}

// Check if match has been played (has any scores)
export function isMatchPlayed(match: Match): boolean {
  return match.scores.some(score => 
    score.teamAScore > 0 || score.teamBScore > 0 || 
    score.teamAPlayer1 || score.teamBPlayer1
  );
}

// Check if match is complete: all categories have been updated (either a score entered or player name present)
export function isMatchComplete(match: Match): boolean {
  return match.scores.every(score => {
    const hasScore = (typeof score.teamAScore === 'number' && score.teamAScore !== 0) || (typeof score.teamBScore === 'number' && score.teamBScore !== 0);
    const hasPlayer = (score.teamAPlayer1 && score.teamAPlayer1.trim() !== '') || (score.teamBPlayer1 && score.teamBPlayer1.trim() !== '');
    return hasScore || hasPlayer;
  });
}

// Check if all pool matches are complete
export function areAllPoolMatchesComplete(matches: Match[]): boolean {
  return matches.every(match => isMatchComplete(match));
}

// Check if all matches for a particular pool are complete
export function arePoolMatchesComplete(matches: Match[], pool: "A" | "B"): boolean {
  const poolMatches = matches.filter(m => m.pool === pool);
  if (poolMatches.length === 0) return false;
  return poolMatches.every(isMatchComplete);
}

// Get top 2 teams from each pool based on standings
export function getQualifiedTeams(standings: { poolA: Standing[]; poolB: Standing[] }): {
  poolATop2: [TeamName, TeamName];
  poolBTop2: [TeamName, TeamName];
} {
  // Deterministic sort for qualification:
  // 1) points desc
  // 2) head-to-head points among tied teams (mini-league)
  // 3) point difference (totalFor - totalAgainst)
  // 4) totalFor (higher scored points)
  // 5) fallback to wins
  function sortPool(pool: Standing[]): Standing[] {
    // First, sort by points (match wins) desc and group ties
    const byPoints = [...pool].sort((a, b) => b.points - a.points);
    const result: Standing[] = [];

    for (let i = 0; i < byPoints.length;) {
      const j = byPoints.findIndex((s, idx) => idx >= i && s.points !== byPoints[i].points);
      const end = j === -1 ? byPoints.length : j;
      const group = byPoints.slice(i, end);

      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Apply custom tiebreaker for teams tied on points:
        // 1) eventsWonInVictories (higher better)
        // 2) pointsInVictories (higher better)
        // Fallbacks: wins, team name (deterministic)
        group.sort((a, b) => {
          if (b.eventsWonInVictories !== a.eventsWonInVictories) return b.eventsWonInVictories - a.eventsWonInVictories;
          if (b.pointsInVictories !== a.pointsInVictories) return b.pointsInVictories - a.pointsInVictories;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.team.localeCompare(b.team);
        });

        // If further ties remain after the metrics above, sorting by criteria order is deterministic
        result.push(...group);
      }

      i = end;
    }

    return result;
  }

  const sortedPoolA = sortPool(standings.poolA);
  const sortedPoolB = sortPool(standings.poolB);

  return {
    poolATop2: [sortedPoolA[0].team, sortedPoolA[1].team],
    poolBTop2: [sortedPoolB[0].team, sortedPoolB[1].team]
  };
}

// Generate knockout matches
export function generateKnockoutMatches(
  poolATop2: [TeamName | "TBD", TeamName | "TBD"], 
  poolBTop2: [TeamName | "TBD", TeamName | "TBD"]
): KnockoutMatch[] {
  return [
    {
      id: "semi-1",
      teamA: poolATop2[0], // Pool A 1st vs Pool B 2nd
      teamB: poolBTop2[1],
      type: "semi",
      scores: CATEGORIES.map(cat => ({
        category: cat,
        teamAScore: 0,
        teamBScore: 0,
        teamAPlayer1: "",
        teamAPlayer2: isDoublesCategory(cat) ? "" : undefined,
        teamBPlayer1: "",
        teamBPlayer2: isDoublesCategory(cat) ? "" : undefined,
      })),
      tieBreaker: {
        teamAPlayers: ['', '', ''],
        teamBPlayers: ['', '', ''],
        teamAScore: undefined,
        teamBScore: undefined,
      },
    },
    {
      id: "semi-2", 
      teamA: poolBTop2[0], // Pool B 1st vs Pool A 2nd
      teamB: poolATop2[1],
      type: "semi",
      scores: CATEGORIES.map(cat => ({
        category: cat,
        teamAScore: 0,
        teamBScore: 0,
        teamAPlayer1: "",
        teamAPlayer2: isDoublesCategory(cat) ? "" : undefined,
        teamBPlayer1: "",
        teamBPlayer2: isDoublesCategory(cat) ? "" : undefined,
      })),
      tieBreaker: {
        teamAPlayers: ['', '', ''],
        teamBPlayers: ['', '', ''],
        teamAScore: undefined,
        teamBScore: undefined,
      },
    },
    {
      id: "final",
      teamA: "TBD", // Winner of semi-1
      teamB: "TBD", // Winner of semi-2  
      type: "final",
      scores: CATEGORIES.map(cat => ({
        category: cat,
        teamAScore: 0,
        teamBScore: 0,
        teamAPlayer1: "",
        teamAPlayer2: isDoublesCategory(cat) ? "" : undefined,
        teamBPlayer1: "",
        teamBPlayer2: isDoublesCategory(cat) ? "" : undefined,
      })),
      tieBreaker: {
        teamAPlayers: ['', '', ''],
        teamBPlayers: ['', '', ''],
        teamAScore: undefined,
        teamBScore: undefined,
      },
    }
  ];
}

// Get winner of a knockout match
export function getKnockoutMatchWinner(match: KnockoutMatch): TeamName | "TBD" {
  if (!isKnockoutMatchComplete(match)) return "TBD";
  
  let teamAWins = 0;
  let teamBWins = 0;
  let totalPointsA = 0;
  let totalPointsB = 0;

  match.scores.forEach(score => {
    if (score.teamAScore > score.teamBScore) {
      teamAWins++;
    } else if (score.teamBScore > score.teamAScore) {
      teamBWins++;
    }
    totalPointsA += score.teamAScore;
    totalPointsB += score.teamBScore;
  });

  // Determine match winner by category wins; if tied, break tie by total points
  if (teamAWins > teamBWins) {
    return match.teamA as TeamName;
  } else if (teamBWins > teamAWins) {
    return match.teamB as TeamName;
  } else {
    // Category wins are equal — use total points as tiebreaker
    if (totalPointsA > totalPointsB) {
      return match.teamA as TeamName;
    } else if (totalPointsB > totalPointsA) {
      return match.teamB as TeamName;
    } else {
      // Fully tied: return TBD (this shouldn't happen in elimination)
      return "TBD";
    }
  }
}

// Check if knockout match is complete
export function isKnockoutMatchComplete(match: KnockoutMatch): boolean {
  if (match.teamA === "TBD" || match.teamB === "TBD") return false;
  
  return match.scores.every(score => {
    const hasScore = (typeof score.teamAScore === 'number' && score.teamAScore !== 0) || (typeof score.teamBScore === 'number' && score.teamBScore !== 0);
    const hasPlayer = (score.teamAPlayer1 && score.teamAPlayer1.trim() !== '') || (score.teamBPlayer1 && score.teamBPlayer1.trim() !== '');
    return hasScore || hasPlayer;
  });
}