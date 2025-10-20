// Core tournament data types
export type TeamName = 
  | "Team 1" | "Team 2" | "Team 3" | "Team 4" 
  | "Team 5" | "Team 6" | "Team 7" | "Team 8";

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
}

export interface Standing {
  team: TeamName;
  wins: number;
  losses: number;
  points: number;
}

// Team players data
export const TEAM_PLAYERS: Record<TeamName, string[]> = {
  "Team 1": ["Prajwal S", "Ananya", "Nithish B M", "Mohanraj", "Karthik", "Pratham Pote", "Anika"],
  "Team 2": ["Chaitanya", "Amrutha", "Manu", "Shreeharsha", "Shashikumar", "Abhishek", "Garima"],
  "Team 3": ["Nithin P", "Kiruthika", "Arya", "Hari Siva Shankar", "Alex", "Vikrant"],
  "Team 4": ["Vikram", "Anoohya", "Manish", "Khalid", "Naresh", "Kiran"],
  "Team 5": ["Aman", "Deepika", "Ramanan", "Chirag", "Prajwal P", "Kingsly"],
  "Team 6": ["Nithin Bhaskar", "Rubini", "Preetham", "Mithun", "Nattu", "Shiva"],
  "Team 7": ["Ninad", "Divya", "Suresh", "Srujan", "Aditya", "Nikhila"],
  "Team 8": ["Ajay", "Lakshitha", "Shreesha", "Ganesh", "Aswin", "Vipin"]
};

export const CATEGORIES: Category[] = [
  "Men's Singles 1",
  "Men's Singles 2",
  "Men's Doubles 1",
  "Men's Doubles 2",
  "Women's Singles",
  "Mixed Doubles",
];

export const POOL_A_TEAMS: TeamName[] = ["Team 1", "Team 2", "Team 3", "Team 4"];
export const POOL_B_TEAMS: TeamName[] = ["Team 5", "Team 6", "Team 7", "Team 8"];

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
    standings[team] = { team, wins: 0, losses: 0, points: 0 };
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
      standings[match.teamA]!.wins++;
      standings[match.teamA]!.points += 2;
      standings[match.teamB]!.losses++;
    } else if (teamBWins > teamAWins) {
      standings[match.teamB]!.wins++;
      standings[match.teamB]!.points += 2;
      standings[match.teamA]!.losses++;
    } else {
      // Category wins are equal — use total points as tiebreaker
      if (totalPointsA > totalPointsB) {
        standings[match.teamA]!.wins++;
        standings[match.teamA]!.points += 2;
        standings[match.teamB]!.losses++;
      } else if (totalPointsB > totalPointsA) {
        standings[match.teamB]!.wins++;
        standings[match.teamB]!.points += 2;
        standings[match.teamA]!.losses++;
      } else {
        // Fully tied: award 1 point each
        standings[match.teamA]!.points += 1;
        standings[match.teamB]!.points += 1;
      }
    }
  });
  
  const poolA = POOL_A_TEAMS.map(team => standings[team]!);
  const poolB = POOL_B_TEAMS.map(team => standings[team]!);
  
  return { poolA, poolB };
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