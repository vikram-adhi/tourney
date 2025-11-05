import { useState } from 'react';
import { AuthProvider, useAuth } from './auth';
import { useTournamentStore } from './store';
import type { Match, KnockoutMatch } from './types';
import { isMatchPlayed, isKnockoutMatchComplete, arePoolMatchesComplete } from './types';
import ViewMatchModal from './components/ViewMatchModal';
import EditMatchModal from './components/EditMatchModal';
import './App.css';

// Login Modal Component
function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      setError('');
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setError('Invalid credentials.');
    }
  };

  if (!isOpen) return null;


  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Admin Login</h2>
          <p style={{ color: '#666', margin: 0 }}>Enter admin credentials to manage tournament</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              padding: '0.75rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Standings Table Component
function StandingsTable({ poolA, poolB, poolAComplete, poolBComplete }: { poolA: any[]; poolB: any[]; poolAComplete: boolean; poolBComplete: boolean }) {
  const PoolTable = ({ title, data, complete }: { title: string; data: any[]; complete: boolean }) => {
    // Sort by points descending. If equal, keep existing order (stable).
    const sortedData = [...data].sort((a, b) => b.points - a.points);

  return (
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
          {title}
        </h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Team</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>W</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>L</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>Pts</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.75rem' }}>Events (wins)</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.75rem' }}>Points (wins)</th>
            </tr>
          </thead>
            <tbody>
            {sortedData.map((row, idx) => (
              <tr key={row.team}>
                <td style={{ padding: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  {/* show ordinal badges for 1st/2nd and green for qualified teams only when pool is complete */}
                  <span style={{ marginRight: '0.4rem' }}>{complete && idx === 0 ? '🥇' : complete && idx === 1 ? '🥈' : ''}</span>
                  <span style={{ color: complete && (idx === 0 || idx === 1) ? '#059669' : '#111827' }}>{row.team}</span>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>{row.wins}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>{row.losses}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '700', fontSize: '0.875rem' }}>{row.points}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>{row.eventsWonInVictories ?? 0}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>{row.pointsInVictories ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem'
    }}>
      <PoolTable title="Pool A Standings" data={poolA} complete={poolAComplete} />
      <PoolTable title="Pool B Standings" data={poolB} complete={poolBComplete} />
    </div>
  );
}

// Matches List Component
function MatchesList({ matches, isAdmin, onUpdateMatch, qualifiedA, qualifiedB, poolAComplete, poolBComplete }: { 
  matches: Match[]; 
  isAdmin: boolean; 
  onUpdateMatch: (matchId: string, scores: Match['scores'], tieBreaker?: Match['tieBreaker']) => void;
  qualifiedA: string[];
  qualifiedB: string[];
  poolAComplete: boolean;
  poolBComplete: boolean;
}) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedPools, setExpandedPools] = useState<{ [key: string]: boolean }>({
    'Pool A': true,
    'Pool B': false
  });
  
  const poolAMatches = matches.filter(m => m.pool === 'A');
  const poolBMatches = matches.filter(m => m.pool === 'B');

  const PoolMatches = ({ title, matches }: { title: string; matches: Match[] }) => {
    const isExpanded = expandedPools[title];
    const toggleExpanded = () => {
      setExpandedPools(prev => ({
        ...prev,
        [title]: !prev[title]
      }));
    };

    return (
      <div style={{
        backgroundColor: 'white',
        padding: '0.375rem',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div 
          onClick={toggleExpanded}
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            margin: '0 0 0.375rem 0',
            padding: '0.5rem 0.25rem',
            minHeight: 'auto'
          }}
        >
          <h3 style={{ 
            margin: '0', 
            fontSize: '0.9rem', 
            fontWeight: '600',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center'
          }}>
            {title}
          </h3>
          <span style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px'
          }}>
            ▶
          </span>
        </div>

        {isExpanded && (
          <div className="matches-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {matches.map((match) => {
          const matchPlayed = isMatchPlayed(match);
          let matchesWon = { teamA: 0, teamB: 0 };
          let totalScores = { teamA: 0, teamB: 0 };

          if (matchPlayed) {
            match.scores.forEach(score => {
              if (score.teamAScore > score.teamBScore) {
                matchesWon.teamA++;
              } else if (score.teamBScore > score.teamAScore) {
                matchesWon.teamB++;
              }
              totalScores.teamA += score.teamAScore;
              totalScores.teamB += score.teamBScore;
            });
          }

          // Prepare tie-break display as match score (1-0) with winner in green
          let tbNode: null | JSX.Element = null;
          if (matchPlayed && matchesWon.teamA === matchesWon.teamB && match.tieBreaker && typeof match.tieBreaker.teamAScore === 'number' && typeof match.tieBreaker.teamBScore === 'number') {
            // winner is determined by tieBreaker team scores; show match-style 1-0 with winner colored green
            const teamAWonTB = match.tieBreaker.teamAScore > match.tieBreaker.teamBScore;
            const leftStyle = { color: teamAWonTB ? '#059669' : '#374151' } as React.CSSProperties;
            const rightStyle = { color: teamAWonTB ? '#374151' : '#059669' } as React.CSSProperties;
            tbNode = (
              <span style={{ marginLeft: '0.25rem' }}>
                (TB: <span style={leftStyle}>{teamAWonTB ? '1' : '0'}</span> - <span style={rightStyle}>{teamAWonTB ? '0' : '1'}</span>)
              </span>
            );
          }

            // determine per-match winner so we can color the winner green immediately
            const poolQualified = title.includes('A') ? qualifiedA : qualifiedB;
            const poolComplete = title.includes('A') ? poolAComplete : poolBComplete;

            // decide match winner (teamA/teamB) based on matchesWon and tieBreaker
            let matchWinner: 'A' | 'B' | null = null;
            if (matchPlayed) {
              if (matchesWon.teamA > matchesWon.teamB) matchWinner = 'A';
              else if (matchesWon.teamB > matchesWon.teamA) matchWinner = 'B';
              else if (match.tieBreaker && typeof match.tieBreaker.teamAScore === 'number' && typeof match.tieBreaker.teamBScore === 'number') {
                if (match.tieBreaker.teamAScore > match.tieBreaker.teamBScore) matchWinner = 'A';
                else if (match.tieBreaker.teamBScore > match.tieBreaker.teamAScore) matchWinner = 'B';
              }
            }

            return (
            <div key={match.id} className="match-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 88px', gap: '0.375rem', alignItems: 'center', padding: '0.5rem', background: 'white', borderRadius: '4px', border: '1px solid #f3f4f6' }}>
              <div className="match-col match-teams" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                <span style={{ color: matchWinner === 'A' ? '#059669' : '#111827' }}>{match.teamA}</span>
                <span className="match-vs" style={{ margin: '0 0.35rem' }}>vs</span>
                <span style={{ color: matchWinner === 'B' ? '#059669' : '#111827' }}>{match.teamB}</span>
              </div>

              <div className="match-col match-stats" style={{ textAlign: 'left' }}>
                {matchPlayed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                      Matches: <span style={{ color: matchesWon.teamA > matchesWon.teamB ? '#059669' : '#374151' }}>{matchesWon.teamA}</span> - <span style={{ color: matchesWon.teamB > matchesWon.teamA ? '#059669' : '#374151' }}>{matchesWon.teamB}</span>{tbNode}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Points: <span style={{ color: totalScores.teamA > totalScores.teamB ? '#059669' : '#6b7280' }}>{totalScores.teamA}</span> - <span style={{ color: totalScores.teamB > totalScores.teamA ? '#059669' : '#6b7280' }}>{totalScores.teamB}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>TBD</div>
                )}
              </div>

              <div className="match-col match-actions" style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setSelectedMatch(match);
                      setIsViewing(true);
                    }}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    View
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedMatch(match);
                        setIsEditing(true);
                      }}
                      style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <PoolMatches title="Pool A Matches" matches={poolAMatches} />
        <PoolMatches title="Pool B Matches" matches={poolBMatches} />
      </div>

      {selectedMatch && isViewing && (
        <ViewMatchModal 
          match={selectedMatch} 
          onClose={() => {
            setSelectedMatch(null);
            setIsViewing(false);
          }}
        />
      )}

      {selectedMatch && isEditing && (
        <EditMatchModal 
          match={selectedMatch} 
          onClose={() => {
            setSelectedMatch(null);
            setIsEditing(false);
          }}
          onSave={(scores, tieBreaker) => {
            onUpdateMatch(selectedMatch.id, scores, tieBreaker);
            setSelectedMatch(null);
            setIsEditing(false);
          }}
        />
      )}
    </>
  );
}

// Knockout Matches Component  
function KnockoutMatches({ knockoutMatches, isAdmin, onUpdateMatch }: { 
  knockoutMatches: KnockoutMatch[]; 
  isAdmin: boolean; 
  onUpdateMatch: (matchId: string, scores: KnockoutMatch['scores'], tieBreaker?: Match['tieBreaker']) => void;
}) {
  const [selectedMatch, setSelectedMatch] = useState<KnockoutMatch | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const semiMatches = knockoutMatches.filter(m => m.type === 'semi');
  const finalMatches = knockoutMatches.filter(m => m.type === 'final');

  const KnockoutSection = ({ title, matches }: { title: string; matches: KnockoutMatch[] }) => {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '0.375rem',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          margin: '0 0 0.375rem 0',
          padding: '0.5rem 0.25rem',
          minHeight: 'auto'
        }}>
          <h3 style={{ 
            margin: '0', 
            fontSize: '0.9rem', 
            fontWeight: '600',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center'
          }}>
            {title}
          </h3>
        </div>

        <div className="matches-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {matches.map((match) => {
            const matchPlayed = isKnockoutMatchComplete(match);
            let matchesWon = { teamA: 0, teamB: 0 };
            let totalScores = { teamA: 0, teamB: 0 };

            if (matchPlayed) {
              match.scores.forEach(score => {
                if (score.teamAScore > score.teamBScore) {
                  matchesWon.teamA++;
                } else if (score.teamBScore > score.teamAScore) {
                  matchesWon.teamB++;
                }
                totalScores.teamA += score.teamAScore;
                totalScores.teamB += score.teamBScore;
              });
            }

            let tbNode: null | JSX.Element = null;
            if (matchPlayed && matchesWon.teamA === matchesWon.teamB && match.tieBreaker && typeof match.tieBreaker.teamAScore === 'number' && typeof match.tieBreaker.teamBScore === 'number') {
              const teamAWonTB = match.tieBreaker.teamAScore > match.tieBreaker.teamBScore;
              const leftStyle = { color: teamAWonTB ? '#059669' : '#374151' } as React.CSSProperties;
              const rightStyle = { color: teamAWonTB ? '#374151' : '#059669' } as React.CSSProperties;
              tbNode = (
                <span style={{ marginLeft: '0.25rem' }}>
                  (TB: <span style={leftStyle}>{teamAWonTB ? '1' : '0'}</span> - <span style={rightStyle}>{teamAWonTB ? '0' : '1'}</span>)
                </span>
              );
            }

            const teamADisplay = match.teamA === "TBD" ? "TBD" : match.teamA;
            const teamBDisplay = match.teamB === "TBD" ? "TBD" : match.teamB;

            return (
              <div key={match.id} className="match-row" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 88px', 
                gap: '0.375rem', 
                alignItems: 'center', 
                padding: '0.5rem', 
                background: 'white', 
                borderRadius: '4px', 
                border: '1px solid #f3f4f6' 
              }}>
                <div className="match-col match-teams" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {teamADisplay} vs {teamBDisplay}
                </div>

                <div className="match-col match-stats" style={{ textAlign: 'left' }}>
                  {matchPlayed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                        Matches: <span style={{ color: matchesWon.teamA > matchesWon.teamB ? '#059669' : '#374151' }}>{matchesWon.teamA}</span> - <span style={{ color: matchesWon.teamB > matchesWon.teamA ? '#059669' : '#374151' }}>{matchesWon.teamB}</span>{tbNode}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Points: <span style={{ color: totalScores.teamA > totalScores.teamB ? '#059669' : '#6b7280' }}>{totalScores.teamA}</span> - <span style={{ color: totalScores.teamB > totalScores.teamA ? '#059669' : '#6b7280' }}>{totalScores.teamB}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.8rem' }}>
                      {match.teamA === "TBD" || match.teamB === "TBD" ? "TBD" : "Not Played"}
                    </div>
                  )}
                </div>

                <div className="match-col match-actions" style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setSelectedMatch(match);
                        setIsViewing(true);
                      }}
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      View
                    </button>
                    {isAdmin && match.teamA !== "TBD" && match.teamB !== "TBD" && (
                      <button
                        onClick={() => {
                          setSelectedMatch(match);
                          setIsEditing(true);
                        }}
                        style={{
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Convert KnockoutMatch to Match format for modals
  const convertToMatch = (knockoutMatch: KnockoutMatch): Match => ({
    id: knockoutMatch.id,
    teamA: knockoutMatch.teamA as any,
    teamB: knockoutMatch.teamB as any,
    pool: 'A' as any, // Dummy value for knockout matches
    scores: knockoutMatch.scores
  });

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <KnockoutSection title="Semi Finals" matches={semiMatches} />
        <KnockoutSection title="Finals" matches={finalMatches} />
      </div>

      {selectedMatch && isViewing && (
        <ViewMatchModal 
          match={convertToMatch(selectedMatch)} 
          onClose={() => {
            setSelectedMatch(null);
            setIsViewing(false);
          }}
        />
      )}

      {selectedMatch && isEditing && (
        <EditMatchModal 
          match={convertToMatch(selectedMatch)} 
          onClose={() => {
            setSelectedMatch(null);
            setIsEditing(false);
          }}
          onSave={(scores, tieBreaker) => {
            onUpdateMatch(selectedMatch.id, scores, tieBreaker);
            setSelectedMatch(null);
            setIsEditing(false);
          }}
        />
      )}
    </>
  );
}

function AppContent() {
  const { isAdmin, logout } = useAuth();
  const { matches, knockoutMatches, standings, resetTournament, updateMatch, updateKnockoutMatch } = useTournamentStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'knockouts'>('standings');

  // compute qualified teams (top2) for display in matches and standings
  const qualifiedA = standings.poolA ? standings.poolA.slice(0, 2).map((s: any) => s.team) : [];
  const qualifiedB = standings.poolB ? standings.poolB.slice(0, 2).map((s: any) => s.team) : [];

  const poolAComplete = arePoolMatchesComplete(matches, 'A');
  const poolBComplete = arePoolMatchesComplete(matches, 'B');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0.5rem 1rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: '#059669',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>
              🏸
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>
                Racquet Rumble Badminton Tournament
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                Season 1
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isAdmin ? (
              <>
                <button
                  onClick={resetTournament}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={logout}
                  style={{
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Login as Admin"
              >
                👤
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          padding: '0.125rem',
          width: 'fit-content',
          margin: '0 auto 1rem auto'
        }}>
          <button
            onClick={() => setActiveTab('standings')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: activeTab === 'standings' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Pool Standings
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: activeTab === 'matches' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Matches
          </button>
          <button
            onClick={() => setActiveTab('knockouts')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: activeTab === 'knockouts' ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Knockouts
          </button>
        </div>

        {/* Data Persistence Info removed — using Supabase for persistence; UI banner omitted */}

        {/* Tab Content */}
        {activeTab === 'standings' ? (
          <StandingsTable poolA={standings.poolA} poolB={standings.poolB} poolAComplete={poolAComplete} poolBComplete={poolBComplete} />
        ) : activeTab === 'matches' ? (
          <MatchesList matches={matches} isAdmin={isAdmin} onUpdateMatch={updateMatch} qualifiedA={qualifiedA} qualifiedB={qualifiedB} poolAComplete={poolAComplete} poolBComplete={poolBComplete} />
        ) : (
          <KnockoutMatches knockoutMatches={knockoutMatches} isAdmin={isAdmin} onUpdateMatch={updateKnockoutMatch} />
        )}
      </main>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
