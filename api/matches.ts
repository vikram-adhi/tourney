import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import path from 'path';
import type { Match, Standing } from '../src/types.js';
import { generateAllMatches, calculateStandings } from '../src/types.js';

// Simple file-based storage for tournament data
const DATA_FILE = '/tmp/tournament-data.json';

// Read tournament data from file
async function readTournamentData(): Promise<Match[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create it with default data
    const defaultMatches = generateAllMatches();
    await writeTournamentData(defaultMatches);
    return defaultMatches;
  }
}

// Write tournament data to file
async function writeTournamentData(matches: Match[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(matches, null, 2));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Return all matches
      const matches = await readTournamentData();
      res.status(200).json({ matches });
    } 
    else if (req.method === 'POST') {
      const body = req.body;
      
      if (body.matches) {
        // Full matches update (for initial save)
        await writeTournamentData(body.matches);
        res.status(200).json({ success: true, matches: body.matches });
      } else if (body.matchId && body.scores) {
        // Single match update
        const { matchId, scores } = body;
        
        const matches = await readTournamentData();
        const matchIndex = matches.findIndex(m => m.id === matchId);
        
        if (matchIndex === -1) {
          res.status(404).json({ error: 'Match not found' });
          return;
        }

        // Update the match
        matches[matchIndex] = {
          ...matches[matchIndex],
          scores
        };

        await writeTournamentData(matches);
        res.status(200).json({ success: true, matches });
      } else {
        res.status(400).json({ error: 'Missing required data' });
      }
    } 
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling matches request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}