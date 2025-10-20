import type { Match } from '../types';
import { CATEGORIES, isDoublesCategory } from '../types';

interface ViewMatchModalProps {
  match: Match;
  onClose: () => void;
}

export default function ViewMatchModal({ match, onClose }: ViewMatchModalProps) {
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
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxSizing: 'border-box'
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
            {match.teamA} vs {match.teamB}
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
            const score = match.scores[index];
            const hasData = score && (score.teamAPlayer1 || score.teamBPlayer1 || score.teamAScore > 0 || score.teamBScore > 0);
            const isDoubles = isDoublesCategory(category);

            if (!hasData) return null;

              return (
              <div key={category} style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '1rem',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                fontSize: '0.875rem',
                flexWrap: 'wrap'
              }}>
                {/* Column 1: Match Type */}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '600', color: '#374151' }}>
                    {category}
                  </div>
                </div>
                
                {/* Column 2: Player Names */}
                <div style={{ textAlign: 'center', flex: '1 1 40%' }}>
                  <div style={{ color: '#6b7280' }}>
                    {isDoubles ? (
                      // Doubles format with 3 sub-columns: Team1 | vs | Team2
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr auto 1fr',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}>
                        {/* Team 1 players (stacked) */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontWeight: '500',
                            color: score.teamAScore > score.teamBScore ? '#059669' : '#6b7280'
                          }}>
                            {score.teamAPlayer1 || 'Player 1'}
                          </div>
                          <div style={{ 
                            fontWeight: '500',
                            color: score.teamAScore > score.teamBScore ? '#059669' : '#6b7280'
                          }}>
                            {score.teamAPlayer2 || 'Player 2'}
                          </div>
                        </div>
                        
                        {/* vs separator */}
                        <div style={{ fontWeight: '500', color: '#374151' }}>vs</div>
                        
                        {/* Team 2 players (stacked) */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontWeight: '500',
                            color: score.teamBScore > score.teamAScore ? '#059669' : '#6b7280'
                          }}>
                            {score.teamBPlayer1 || 'Player 1'}
                          </div>
                          <div style={{ 
                            fontWeight: '500',
                            color: score.teamBScore > score.teamAScore ? '#059669' : '#6b7280'
                          }}>
                            {score.teamBPlayer2 || 'Player 2'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Singles format with 3 sub-columns: Player1 | vs | Player2
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr auto 1fr',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}>
                        {/* Player 1 (centered) */}
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ 
                            fontWeight: '500',
                            color: score.teamAScore > score.teamBScore ? '#059669' : '#6b7280'
                          }}>
                            {score.teamAPlayer1 || 'Player 1'}
                          </span>
                        </div>
                        
                        {/* vs separator */}
                        <div style={{ fontWeight: '500', color: '#374151' }}>vs</div>
                        
                        {/* Player 2 (centered) */}
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ 
                            fontWeight: '500',
                            color: score.teamBScore > score.teamAScore ? '#059669' : '#6b7280'
                          }}>
                            {score.teamBPlayer1 || 'Player 2'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Column 3: Score */}
                <div style={{ 
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '1rem',
                  minWidth: '64px',
                  flex: '0 0 auto'
                }}>
                  <span style={{ color: score.teamAScore > score.teamBScore ? '#059669' : '#6b7280' }}>
                    {score.teamAScore}
                  </span>
                  <span style={{ margin: '0 0.25rem', color: '#6b7280' }}>-</span>
                  <span style={{ color: score.teamBScore > score.teamAScore ? '#059669' : '#6b7280' }}>
                    {score.teamBScore}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '1.25rem'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}