/**
 * ReactionOverlay
 * Floating emoji reactions that appear over the canvas and fade out after 2.5s.
 * Reactions are stored in SessionContext (received via Ably session:reaction events).
 * Rendered inside InFrontOfTheCanvas.
 */

'use client';

import { useSession } from './SessionContext';

export function ReactionOverlay() {
  const { reactions } = useSession();

  if (reactions.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 400,
        overflow: 'hidden',
      }}
    >
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          style={{
            position: 'absolute',
            left: `${reaction.x}%`,
            top: `${reaction.y}%`,
            fontSize: 36,
            lineHeight: 1,
            animation: 'reactionFloat 2.5s ease-out forwards',
            userSelect: 'none',
          }}
        >
          {reaction.emoji}
        </div>
      ))}
      <style>{`
        @keyframes reactionFloat {
          0%   { opacity: 1; transform: scale(0.5) translateY(0); }
          20%  { opacity: 1; transform: scale(1.2) translateY(-10px); }
          60%  { opacity: 0.9; transform: scale(1) translateY(-40px); }
          100% { opacity: 0; transform: scale(0.8) translateY(-80px); }
        }
      `}</style>
    </div>
  );
}
