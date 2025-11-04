import type { Match } from '../types';
import { CATEGORIES, isDoublesCategory, getCategoryAbbreviation } from '../types';

interface ViewMatchModalProps {
  match: Match;
  onClose: () => void;
}

export default function ViewMatchModal({ match, onClose }: ViewMatchModalProps) {
  // helper to render a category-like row (works for singles, doubles, and the 3v3 tie-breaker)
  const renderCategoryRow = (
    title: string,
    leftPlayers: string[],
    rightPlayers: string[],
    leftScore?: number | '',
    rightScore?: number | '',
  ) => {
    const aScore = typeof leftScore === 'number' ? leftScore : (leftScore === '' ? '' : undefined);
    const bScore = typeof rightScore === 'number' ? rightScore : (rightScore === '' ? '' : undefined);

    return (
      <div
        key={title}
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
        <div className="vm-category-title" style={{ textAlign: 'left', width: '72px', flex: '0 0 72px' }}>
          <div style={{ fontWeight: 600, color: '#374151' }}>{title}</div>
        </div>

        <div
          className="vm-category-body"
          style={{
            gap: '1rem',
            width: 'calc(100% - 72px)',
            flex: '1 1 auto',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div className="vm-category-names" style={{ textAlign: 'left', flex: '1 1 auto' }}>
            <div style={{ color: (aScore ?? 0) > (bScore ?? 0) ? '#059669' : '#6b7280' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  {leftPlayers.map((p, i) => (
                    <div key={i} style={{ fontWeight: 500 }}>{p || `Player ${i + 1}`}</div>
                  ))}
                </div>

                <div className="vm-vs" style={{ fontWeight: 500, color: '#374151', textAlign: 'center' }}>vs</div>

                <div style={{ textAlign: 'left' }}>
                  {rightPlayers.map((p, i) => (
                    <div key={i} style={{ fontWeight: 500, textAlign: 'right', color: (bScore ?? 0) > (aScore ?? 0) ? '#059669' : '#6b7280' }}>{p || `Player ${i + 1}`}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="vm-score" style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem', minWidth: '64px', flex: '0 0 auto' }}>
            <span className="vm-score-a" style={{ color: (aScore ?? 0) > (bScore ?? 0) ? '#059669' : '#6b7280' }}>
              {typeof aScore === 'number' ? aScore : ''}
            </span>
            <span className="vm-score-sep" style={{ margin: '0 0.5rem', color: '#6b7280' }}>-</span>
            <span className="vm-score-b" style={{ color: (bScore ?? 0) > (aScore ?? 0) ? '#059669' : '#6b7280' }}>
              {typeof bScore === 'number' ? bScore : ''}
            </span>
          </div>
        </div>
      </div>
    );
  };

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
          <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, flex: 1, marginRight: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

              if (!hasData) return null;

              const leftPlayers = isDoublesCategory(category) ? [score.teamAPlayer1 || 'Player 1', score.teamAPlayer2 || 'Player 2'] : [score.teamAPlayer1 || 'Player 1'];
              const rightPlayers = isDoublesCategory(category) ? [score.teamBPlayer1 || 'Player 1', score.teamBPlayer2 || 'Player 2'] : [score.teamBPlayer1 || 'Player 2'];

              return renderCategoryRow(getCategoryAbbreviation(category), leftPlayers, rightPlayers, score.teamAScore, score.teamBScore);
            })}

            {/* Render tie-breaker via the same renderer if it exists and has data */}
            {match.tieBreaker && ((match.tieBreaker.teamAPlayers || []).some(Boolean) || (match.tieBreaker.teamBPlayers || []).some(Boolean) || typeof match.tieBreaker.teamAScore === 'number' || typeof match.tieBreaker.teamBScore === 'number') && (
              renderCategoryRow(
                '3v3',
                (match.tieBreaker.teamAPlayers || ['','','']).map((p,i) => p || `Player ${i+1}`),
                (match.tieBreaker.teamBPlayers || ['','','']).map((p,i) => p || `Player ${i+1}`),
                match.tieBreaker.teamAScore as any,
                match.tieBreaker.teamBScore as any,
              )
            )}
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