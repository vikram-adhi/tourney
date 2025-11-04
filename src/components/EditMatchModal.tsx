import { useState } from 'react';
import type { Match, CategoryScore } from '../types';
import { CATEGORIES, TEAM_PLAYERS, isDoublesCategory, getCategoryAbbreviation } from '../types';

interface EditMatchModalProps {
  match: Match;
  onClose: () => void;
  onSave: (scores: Match['scores'], tieBreaker?: Match['tieBreaker']) => void;
}

export default function EditMatchModal({ match, onClose, onSave }: EditMatchModalProps) {
  const [scores, setScores] = useState<CategoryScore[]>(match.scores);
  const [tieBreaker, setTieBreaker] = useState<NonNullable<Match['tieBreaker']>>(() => {
    return (
      (match.tieBreaker as NonNullable<Match['tieBreaker']>) || { teamAPlayers: ['', '', ''], teamBPlayers: ['', '', ''], teamAScore: undefined, teamBScore: undefined }
    );
  });

  const handleScoreChange = (
    categoryIndex: number, 
    field: keyof CategoryScore, 
    value: string | number
  ) => {
    const newScores = [...scores];
    if (field === 'teamAScore' || field === 'teamBScore') {
      const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value;
      // Enforce maximum score of 21 for badminton
      const clampedValue = Math.min(Math.max(numericValue, 0), 21);
      newScores[categoryIndex] = {
        ...newScores[categoryIndex],
        [field]: clampedValue
      };
    } else {
      newScores[categoryIndex] = {
        ...newScores[categoryIndex],
        [field]: value
      };
    }
    setScores(newScores);
  };

  // compute tie condition once and reuse it (used by JSX and save logic)
  const teamWinsAndPoints = (() => {
    let teamAWins = 0;
    let teamBWins = 0;
    let totalPointsA = 0;
    let totalPointsB = 0;
    scores.forEach(s => {
      if (s.teamAScore > s.teamBScore) teamAWins++;
      else if (s.teamBScore > s.teamAScore) teamBWins++;
      totalPointsA += s.teamAScore;
      totalPointsB += s.teamBScore;
    });
    return { teamAWins, teamBWins, totalPointsA, totalPointsB };
  })();

  const showTie = teamWinsAndPoints.teamAWins === 3 && teamWinsAndPoints.teamBWins === 3 && teamWinsAndPoints.totalPointsA === teamWinsAndPoints.totalPointsB;

  const handleSave = () => {
    // Determine if tieBreaker has any meaningful data (players selected or a numeric score)
    const tieBreakerHasData = (tieBreaker.teamAPlayers || []).some(p => p && p.trim() !== '')
      || (tieBreaker.teamBPlayers || []).some(p => p && p.trim() !== '')
      || (typeof tieBreaker.teamAScore === 'number')
      || (typeof tieBreaker.teamBScore === 'number');

    // Persist tieBreaker if it has any data (so View can render it). Inputs still only show when showTie.
    onSave(scores, tieBreakerHasData ? tieBreaker : undefined);
  };

  return (
    <div className="edit-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '6px',
        padding: '1rem',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.5rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', flex: 1, marginRight: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Edit: {match.teamA} vs {match.teamB}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {CATEGORIES.map((category, index) => {
            const score = scores[index];
            const isDoubles = isDoublesCategory(category);

            return (
              <div key={category} style={{
                padding: '0.5rem 0.5rem',
                backgroundColor: 'transparent',
                borderRadius: '0',
                border: 'none'
              }}>
                {/* Category Header */}
                <div style={{
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.75rem',
                  marginBottom: '0.375rem'
                }}>
                  {getCategoryAbbreviation(category)}
                </div>

                {/* Vertical Layout: Team A */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.125rem',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
                    <select
                      value={score.teamAPlayer1 || ''}
                      onChange={(e) => handleScoreChange(index, 'teamAPlayer1', e.target.value)}
                      style={{
                        flex: 1,
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        padding: '0.25rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        backgroundColor: 'white',
                        textAlign: 'center',
                        minHeight: '28px',
                        color: score.teamAPlayer1 ? '#374151' : '#9ca3af'
                      }}
                    >
                      <option value="">{isDoubles ? "Select Player 1" : "Select Player"}</option>
                      {TEAM_PLAYERS[match.teamA]?.map((player) => (
                        <option key={player} value={player}>
                          {player}
                        </option>
                      ))}
                    </select>
                    {isDoubles && (
                      <>
                        <span style={{ alignSelf: 'center', fontSize: '0.7rem', color: '#6b7280' }}>/</span>
                        <select
                          value={score.teamAPlayer2 || ''}
                          onChange={(e) => handleScoreChange(index, 'teamAPlayer2', e.target.value)}
                          style={{
                              flex: 1,
                              width: '100%',
                              minWidth: 0,
                              boxSizing: 'border-box',
                              padding: '0.25rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              backgroundColor: 'white',
                              textAlign: 'center',
                              minHeight: '28px',
                              color: score.teamAPlayer2 ? '#374151' : '#9ca3af'
                            }}
                        >
                          <option value="">Select Player 2</option>
                          {TEAM_PLAYERS[match.teamA]?.map((player) => (
                            <option key={player} value={player}>
                              {player}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                  <input
                    type="number"
                    value={score.teamAScore}
                    onChange={(e) => handleScoreChange(index, 'teamAScore', e.target.value)}
                    style={{
                      width: '50px',
                      padding: '0.25rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      minHeight: '28px'
                    }}
                    min="0"
                    max="21"
                  />
                </div>

                {/* VS divider */}
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  margin: '0.125rem 0'
                }}>
                  vs
                </div>

                {/* Vertical Layout: Team B */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
                    <select
                      value={score.teamBPlayer1 || ''}
                      onChange={(e) => handleScoreChange(index, 'teamBPlayer1', e.target.value)}
                      style={{
                        flex: 1,
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        padding: '0.25rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        backgroundColor: 'white',
                        textAlign: 'center',
                        minHeight: '28px',
                        color: score.teamBPlayer1 ? '#374151' : '#9ca3af'
                      }}
                    >
                      <option value="">{isDoubles ? "Select Player 1" : "Select Player"}</option>
                      {TEAM_PLAYERS[match.teamB]?.map((player) => (
                        <option key={player} value={player}>
                          {player}
                        </option>
                      ))}
                    </select>
                    {isDoubles && (
                      <>
                        <span style={{ alignSelf: 'center', fontSize: '0.7rem', color: '#6b7280' }}>/</span>
                        <select
                          value={score.teamBPlayer2 || ''}
                          onChange={(e) => handleScoreChange(index, 'teamBPlayer2', e.target.value)}
                          style={{
                              flex: 1,
                              width: '100%',
                              minWidth: 0,
                              boxSizing: 'border-box',
                              padding: '0.25rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              backgroundColor: 'white',
                              textAlign: 'center',
                              minHeight: '28px',
                              color: score.teamBPlayer2 ? '#374151' : '#9ca3af'
                            }}
                        >
                          <option value="">Select Player 2</option>
                          {TEAM_PLAYERS[match.teamB]?.map((player) => (
                            <option key={player} value={player}>
                              {player}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                  <input
                    type="number"
                    value={score.teamBScore}
                    onChange={(e) => handleScoreChange(index, 'teamBScore', e.target.value)}
                    style={{
                      width: '50px',
                      padding: '0.25rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      minHeight: '28px'
                    }}
                    min="0"
                    max="21"
                  />
                </div>
              </div>
            );
          })}
          {/* Tie-breaker inputs: show when computed showTie is true */}
          {showTie && (
            <div style={{ padding: '0.5rem 0.5rem', borderTop: '1px solid #eef2ff', marginTop: '0.5rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Tie-breaker (3v3)</div>

              {/* Team A name */}
              <div style={{ fontSize: '0.75rem', color: '#374151', marginBottom: '0.15rem' }}>{match.teamA}</div>

              {/* Team A selects + score on same line */}
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  {[0,1,2].map(i => (
                    <select
                      key={i}
                      value={tieBreaker.teamAPlayers[i] || ''}
                      onChange={(e) => { const clone = { ...tieBreaker }; clone.teamAPlayers = [...(clone.teamAPlayers || ['', '', ''])]; clone.teamAPlayers[i] = e.target.value; setTieBreaker(clone); }}
                      style={{
                        flex: 1,
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        padding: '0.25rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        backgroundColor: 'white',
                        textAlign: 'center',
                        minHeight: '28px',
                        color: tieBreaker.teamAPlayers[i] ? '#374151' : '#9ca3af'
                      }}
                    >
                      <option value="">Select Player</option>
                      {TEAM_PLAYERS[match.teamA]?.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ))}
                </div>
                <input type="number" placeholder="" value={tieBreaker.teamAScore ?? ''} onChange={(e) => { const clone = { ...tieBreaker }; clone.teamAScore = parseInt(e.target.value) || 0; setTieBreaker(clone); }} style={{ width: '50px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', minHeight: '28px' }} />
              </div>

              {/* Centered vs */}
              <div style={{ textAlign: 'center', fontWeight: 600, color: '#374151', margin: '0.25rem 0' }}>vs</div>

              {/* Team B name */}
              <div style={{ fontSize: '0.75rem', color: '#374151', marginBottom: '0.15rem' }}>{match.teamB}</div>

              {/* Team B selects + score on same line */}
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  {[0,1,2].map(i => (
                    <select
                      key={i}
                      value={tieBreaker.teamBPlayers[i] || ''}
                      onChange={(e) => { const clone = { ...tieBreaker }; clone.teamBPlayers = [...(clone.teamBPlayers || ['', '', ''])]; clone.teamBPlayers[i] = e.target.value; setTieBreaker(clone); }}
                      style={{
                        flex: 1,
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        padding: '0.25rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        backgroundColor: 'white',
                        textAlign: 'center',
                        minHeight: '28px',
                        color: tieBreaker.teamBPlayers[i] ? '#374151' : '#9ca3af'
                      }}
                    >
                      <option value="">Select Player</option>
                      {TEAM_PLAYERS[match.teamB]?.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ))}
                </div>
                <input type="number" placeholder="" value={tieBreaker.teamBScore ?? ''} onChange={(e) => { const clone = { ...tieBreaker }; clone.teamBScore = parseInt(e.target.value) || 0; setTieBreaker(clone); }} style={{ width: '50px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', minHeight: '28px' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.75rem',
          marginTop: '1.25rem'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}
          >
            Save Match
          </button>
        </div>
      </div>
    </div>
  );
}