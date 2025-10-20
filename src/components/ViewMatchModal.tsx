import type { Match } from '../types';
import { CATEGORIES, isDoublesCategory } from '../types';

interface ViewMatchModalProps {
  match: Match;
  onClose: () => void;
}

export default function ViewMatchModal({ match, onClose }: ViewMatchModalProps) {
  return (
    <div
      className="vm-overlay"
      style={{
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
        zIndex: 1000,
      }}
    >
      <div
        className="vm-modal"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #eee',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            {match.teamA} vs {match.teamB}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem',
              color: '#6b7280',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ padding: '0.5rem 1rem', overflow: 'auto', flex: '1 1 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {CATEGORIES.map((category, index) => {
              const raw = match.scores[index] ?? {
                teamAScore: 0,
                teamBScore: 0,
                teamAPlayer1: '',
                teamAPlayer2: '',
                teamBPlayer1: '',
                teamBPlayer2: '',
              } as any;

              const score = raw;
              const hasData = Boolean(
                score && (score.teamAPlayer1 || score.teamBPlayer1 || score.teamAScore > 0 || score.teamBScore > 0)
              );
              const isDoubles = isDoublesCategory(category);

              if (!hasData) return null;

              return (
                <div
                  key={category}
                  className="vm-category"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Category title */}
                  <div className="vm-category-title" style={{ textAlign: 'left', width: '100%' }}>
                    <div style={{ fontWeight: 600, color: '#374151' }}>{category}</div>
                  </div>

                  {/* Body: names (left) and score (right) */}
                  <div
                    className="vm-category-body"
                    style={{
                      gap: '1rem',
                      width: '100%',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div className="vm-category-names" style={{ textAlign: 'left', flex: '1 1 auto' }}>
                      <div style={{ color: '#6b7280' }}>
                        {isDoubles ? (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
                              gap: '0.5rem',
                              alignItems: 'center',
                            }}
                          >
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 500, color: score.teamAScore > score.teamBScore ? '#059669' : '#6b7280' }}>
                                {score.teamAPlayer1 || 'Player 1'}
                              </div>
                              <div style={{ fontWeight: 500, color: score.teamAScore > score.teamBScore ? '#059669' : '#6b7280' }}>
                                {score.teamAPlayer2 || 'Player 2'}
                              </div>
                            </div>

                            <div className="vm-vs" style={{ fontWeight: 500, color: '#374151', textAlign: 'center' }}>vs</div>

                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: 500, color: score.teamBScore > score.teamAScore ? '#059669' : '#6b7280' }}>
                                {score.teamBPlayer1 || 'Player 1'}
                              </div>
                              <div style={{ fontWeight: 500, color: score.teamBScore > score.teamAScore ? '#059669' : '#6b7280' }}>
                                {score.teamBPlayer2 || 'Player 2'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
                              gap: '0.5rem',
                              alignItems: 'center',
                            }}
                        >
                            <div style={{ textAlign: 'left' }}>
                              <span style={{ fontWeight: 500, color: score.teamAScore > score.teamBScore ? '#059669' : '#6b7280' }}>
                                {score.teamAPlayer1 || 'Player 1'}
                              </span>
                            </div>

                            <div className="vm-vs" style={{ fontWeight: 500, color: '#374151', textAlign: 'center' }}>vs</div>

                            <div style={{ textAlign: 'left' }}>
                              <span style={{ fontWeight: 500, color: score.teamBScore > score.teamAScore ? '#059669' : '#6b7280' }}>
                                {score.teamBPlayer1 || 'Player 2'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="vm-score" style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem', minWidth: '64px', flex: '0 0 auto' }}>
                      <span className="vm-score-a" style={{ color: score.teamAScore > score.teamBScore ? '#059669' : '#6b7280' }}>
                        {score.teamAScore}
                      </span>
                      <span className="vm-score-sep" style={{ margin: '0 0.5rem', color: '#6b7280' }}>-</span>
                      <span className="vm-score-b" style={{ color: score.teamBScore > score.teamAScore ? '#059669' : '#6b7280' }}>
                        {score.teamBScore}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #eee' }}>
          <button
            className="vm-close-bottom"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}