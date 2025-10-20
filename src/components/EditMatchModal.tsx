import { useState } from 'react';
import type { Match, CategoryScore } from '../types';
import { CATEGORIES, TEAM_PLAYERS, isDoublesCategory, getCategoryAbbreviation } from '../types';

interface EditMatchModalProps {
  match: Match;
  onClose: () => void;
  onSave: (scores: Match['scores']) => void;
}

export default function EditMatchModal({ match, onClose, onSave }: EditMatchModalProps) {
  const [scores, setScores] = useState<CategoryScore[]>(match.scores);

  const handleScoreChange = (
    categoryIndex: number, 
    field: keyof CategoryScore, 
    value: string | number
  ) => {
    const newScores = [...scores];
    if (field === 'teamAScore' || field === 'teamBScore') {
      newScores[categoryIndex] = {
        ...newScores[categoryIndex],
        [field]: typeof value === 'string' ? parseInt(value) || 0 : value
      };
    } else {
      newScores[categoryIndex] = {
        ...newScores[categoryIndex],
        [field]: value
      };
    }
    setScores(newScores);
  };

  const handleSave = () => {
    onSave(scores);
  };

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
      padding: '1rem',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '6px',
        padding: '1.25rem',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.75rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {CATEGORIES.map((category, index) => {
            const score = scores[index];
            const isDoubles = isDoublesCategory(category);

            return (
              <div key={category} style={{
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                {/* Category Header */}
                <div style={{
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  {getCategoryAbbreviation(category)}
                </div>

                {/* Player Selection and Scores */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}>
                  {/* Team A Player */}
                  <div>
                    <select
                      value={score.teamAPlayer1 || ''}
                      onChange={(e) => handleScoreChange(index, 'teamAPlayer1', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select Player</option>
                      {TEAM_PLAYERS[match.teamA]?.map((player) => (
                        <option key={player} value={player}>
                          {player}
                        </option>
                      ))}
                    </select>
                    {isDoubles && (
                      <select
                        value={score.teamAPlayer2 || ''}
                        onChange={(e) => handleScoreChange(index, 'teamAPlayer2', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          marginTop: '0.5rem'
                        }}
                      >
                        <option value="">Select Partner</option>
                        {TEAM_PLAYERS[match.teamA]?.map((player) => (
                          <option key={player} value={player}>
                            {player}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Score Inputs */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db'
                  }}>
                    <input
                      type="number"
                      value={score.teamAScore}
                      onChange={(e) => handleScoreChange(index, 'teamAScore', e.target.value)}
                      style={{
                        width: '50px',
                        padding: '0.25rem',
                        border: 'none',
                        textAlign: 'center',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                      min="0"
                      max="30"
                    />
                    <span style={{ fontWeight: '600', color: '#6b7280' }}>-</span>
                    <input
                      type="number"
                      value={score.teamBScore}
                      onChange={(e) => handleScoreChange(index, 'teamBScore', e.target.value)}
                      style={{
                        width: '50px',
                        padding: '0.25rem',
                        border: 'none',
                        textAlign: 'center',
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}
                      min="0"
                      max="30"
                    />
                  </div>

                  {/* Team B Player */}
                  <div>
                    <select
                      value={score.teamBPlayer1 || ''}
                      onChange={(e) => handleScoreChange(index, 'teamBPlayer1', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select Player</option>
                      {TEAM_PLAYERS[match.teamB]?.map((player) => (
                        <option key={player} value={player}>
                          {player}
                        </option>
                      ))}
                    </select>
                    {isDoubles && (
                      <select
                        value={score.teamBPlayer2 || ''}
                        onChange={(e) => handleScoreChange(index, 'teamBPlayer2', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          marginTop: '0.5rem'
                        }}
                      >
                        <option value="">Select Partner</option>
                        {TEAM_PLAYERS[match.teamB]?.map((player) => (
                          <option key={player} value={player}>
                            {player}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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