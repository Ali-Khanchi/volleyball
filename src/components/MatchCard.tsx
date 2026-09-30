import { Match } from '../hooks/useTournament';

interface MatchSide {
  name: string | null;
  hint: string | null;
  score: number;
  won: boolean;
}

export default function MatchCard({
  m,
  highlight = false
}: {
  m: Match;
  highlight?: boolean;
}) {
  const sides: MatchSide[] = [
    {
      name: m.a,
      hint: m.hintA ?? null,
      score: m.ptsA,
      won: m.done && m.win === 0
    },
    {
      name: m.b,
      hint: m.hintB ?? null,
      score: m.ptsB,
      won: m.done && m.win === 1
    }
  ];
  return (
    <div
      className={`min-w-0 rounded-2xl bg-sea-900 p-3 ring-1 sm:p-4 ${highlight ? 'ring-2 ring-sun/70' : 'ring-white/10'}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-sand/60">
        <span className="min-w-0 truncate font-medium">{m.label}</span>
        <span className={`shrink-0 ${m.done ? 'text-sun' : ''}`}>
          {m.match_time}
        </span>
        <span className={`shrink-0 ${m.done ? 'text-sun' : ''}`}>
          {m.done ? 'Finished' : 'Not played yet'}
        </span>
      </div>
      <div className="space-y-2">
        {sides.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
              s.won ? 'bg-sun text-sea-950' : 'bg-sea-800/60 text-sand/80'
            }`}
          >
            <span
              className={`min-w-0 truncate ${s.won ? 'font-bold' : s.name ? 'font-medium' : 'italic text-sand/50'}`}
            >
              {s.name ?? s.hint}
            </span>
            <span className="shrink-0 text-2xl font-extrabold tabular-nums">
              {m.played ? s.score : '-'}
            </span>
          </div>
        ))}
      </div>
      {m.refs && (
        <p className="mt-2 wrap-break-word text-xs text-sand/50">
          Refs: {m.refs}
        </p>
      )}
    </div>
  );
}
