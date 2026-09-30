import { Match } from '../hooks/useTournament';

interface MatchSide {
  name: string | null;
  hint: string | null;
  score: number;
  won: boolean;
  players: string[];
  captain: string | null;
}

function Lineup({
  side,
  align = 'end'
}: {
  side: MatchSide;
  align?: 'start' | 'end';
}) {
  const isEnd = align === 'end';

  return (
    // Changed col-span-4 to col-span-5 and adjusted alignment classes based on prop
    <div
      className={`col-span-5 flex flex-col ${isEnd ? 'items-end text-right' : 'items-start text-left'} gap-2`}
    >
      <div
        className={`flex w-full flex-col ${isEnd ? 'items-end' : 'items-start'} gap-1.5`}
      >
        {side.players.length > 0 ? (
          side.players.map((player: string) => (
            <span
              key={player}
              // Removed max-w-35 to allow full width usage
              className="w-full truncate rounded-lg px-2.5 py-1 text-sm font-semibold text-sand/90 text-center"
            >
              {player === side.captain ? (
                <>
                  {player}
                  <span className="text-yellow-500 ml-1.5"> C</span>
                </>
              ) : (
                player
              )}
            </span>
          ))
        ) : (
          <span className="text-xs italic text-sand/40">No roster</span>
        )}
      </div>
    </div>
  );
}

export default function HeadonCard({
  m,
  highlight = false
}: {
  m: Match;
  highlight?: boolean;
}) {
  const sideA: MatchSide = {
    name: m.a,
    hint: m.hintA ?? null,
    score: m.ptsA,
    won: m.done && m.win === 0,
    players: m.playersA,
    captain: m.captainA
  };
  const sideB: MatchSide = {
    name: m.b,
    hint: m.hintB ?? null,
    score: m.ptsB,
    won: m.done && m.win === 1,
    players: m.playersB,
    captain: m.captainB
  };

  return (
    <div
      className={`min-w-0 rounded-2xl bg-sea-900 p-4 ring-1 sm:p-5 ${
        highlight ? 'ring-2 ring-sun/70' : 'ring-white/10'
      }`}
    >
      {/* Header Info */}
      <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-sand/60">
        <span className="truncate">{m.label}</span>
        <div className="flex items-center gap-2">
          {m.match_time && <span>{m.match_time}</span>}
          {m.match_time && <span>•</span>}
          <span className={m.done ? 'text-sun font-extrabold' : 'text-sand/40'}>
            {m.done ? 'Finished' : 'Upcoming'}
          </span>
        </div>
      </div>

      {/* Main Match Grid */}
      <div className="grid grid-cols-12 items-center gap-2">
        {/* Update Lineup side A container span */}
        <Lineup side={sideA} align="end" />

        {/* Update Score Center span from col-span-4 to col-span-2 */}
        <div className="col-span-2 flex items-center justify-center gap-1.5 text-2xl sm:text-3xl font-black tracking-tight">
          <span
            className={
              sideA.won ? 'text-sun scale-110 drop-shadow-md' : 'text-sand'
            }
          >
            {m.done ? sideA.score : '-'}
          </span>
          <span className="text-sand/30 font-light">:</span>
          <span
            className={
              sideB.won ? 'text-sun scale-110 drop-shadow-md' : 'text-sand'
            }
          >
            {m.done ? sideB.score : '-'}
          </span>
        </div>

        {/* Update Lineup side B container span */}
        <Lineup side={sideB} align="start" />
      </div>

      {/* Footer Info */}
      {m.refs && (
        <p className="mt-4 border-t border-white/5 pt-2 text-center text-xs text-sand/50">
          Ref: {m.refs}
        </p>
      )}
    </div>
  );
}
