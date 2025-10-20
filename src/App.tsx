import { useState } from 'react';
import { AuthProvider, useAuth } from './auth';
import { useTournamentStore } from './store';
import type { Match } from './types';
import { isMatchPlayed } from './types';
import ViewMatchModal from './components/ViewMatchModal';
import EditMatchModal from './components/EditMatchModal';
import './App.css';

// Login Modal Component
function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (success) {
      setError('');
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setError('Invalid credentials. Try admin/admin123');
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
function StandingsTable({ poolA, poolB }: { poolA: any[]; poolB: any[] }) {
  const PoolTable = ({ title, data }: { title: string; data: any[] }) => {
    const sortedData = [...data].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.wins - a.wins;
    });

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
              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>#</th>
              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Team</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>W</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>L</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <tr key={row.team}>
                <td style={{ padding: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>{idx + 1}</td>
                <td style={{ padding: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>{row.team}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>{row.wins}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>{row.losses}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '700', fontSize: '0.875rem' }}>{row.points}</td>
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
      <PoolTable title="Pool A Standings" data={poolA} />
      <PoolTable title="Pool B Standings" data={poolB} />
    </div>
  );
}

// Matches List Component
function MatchesList({ matches, isAdmin, onUpdateMatch }: { 
  matches: Match[]; 
  isAdmin: boolean; 
  onUpdateMatch: (matchId: string, scores: Match['scores']) => void;
}) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const poolAMatches = matches.filter(m => m.pool === 'A');
  const poolBMatches = matches.filter(m => m.pool === 'B');

  const PoolMatches = ({ title, matches }: { title: string; matches: Match[] }) => (
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
            <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>Teams</th>
            <th style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.875rem' }}>Score</th>
            <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', fontSize: '0.875rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
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

            return (
              <tr key={match.id}>
                <td style={{ padding: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  {match.teamA} vs {match.teamB}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {matchPlayed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                        Matches: <span style={{ color: matchesWon.teamA > matchesWon.teamB ? '#059669' : '#374151' }}>{matchesWon.teamA}</span> - <span style={{ color: matchesWon.teamB > matchesWon.teamA ? '#059669' : '#374151' }}>{matchesWon.teamB}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Points: <span style={{ color: totalScores.teamA > totalScores.teamB ? '#059669' : '#6b7280' }}>{totalScores.teamA}</span> - <span style={{ color: totalScores.teamB > totalScores.teamA ? '#059669' : '#6b7280' }}>{totalScores.teamB}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.875rem' }}>TBD</div>
                  )}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setSelectedMatch(match);
                        setIsViewing(true);
                      }}
                      style={{
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        padding: '0.375rem 0.625rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
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
                          padding: '0.375rem 0.625rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
          onSave={(scores) => {
            onUpdateMatch(selectedMatch.id, scores);
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
  const { matches, standings, resetTournament, updateMatch } = useTournamentStore();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');

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
              backgroundColor: '#2563eb',
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
                Badminton Tournament
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                Pool Stage
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
        </div>

        {/* Data Persistence Info */}
        {isAdmin && (
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #16a34a',
            borderRadius: '6px',
            padding: '0.75rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            <strong>✅ Persistent Storage:</strong> Tournament data is now saved to the server. 
            Scores will persist across browser sessions and deployments.
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'standings' ? (
          <StandingsTable poolA={standings.poolA} poolB={standings.poolB} />
        ) : (
          <MatchesList matches={matches} isAdmin={isAdmin} onUpdateMatch={updateMatch} />
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
