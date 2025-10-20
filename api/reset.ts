import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'fs';
import { generateAllMatches } from '../src/types.js';

// Simple file-based storage for tournament data
const DATA_FILE = '/tmp/tournament-data.json';

// Write tournament data to file
async function writeTournamentData(matches: any[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(matches, null, 2));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      // Reset tournament data to initial state
      const defaultMatches = generateAllMatches();
      await writeTournamentData(defaultMatches);
      res.status(200).json({ success: true, matches: defaultMatches });
    } 
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error resetting tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}