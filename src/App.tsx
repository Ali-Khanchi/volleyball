import { useTournament, StandingRow, Match } from './hooks/useTournament';

interface MatchSide {
  name: string | null;
  hint: string | null;
  score: number;
  won: boolean;
}

function Section({
  title,
  note,
  children
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {note && <p className="text-sm text-sand/60">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function MatchCard({
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

/* Header labels: short on phones, full on larger screens */
function Head({
  short,
  full,
  className = ''
}: {
  short: string;
  full: string;
  className?: string;
}) {
  return (
    <span className={`text-center ${className}`}>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </span>
  );
}

function Standings({ rows, seeded }: { rows: StandingRow[]; seeded: boolean }) {
  const cols =
    'grid items-center gap-x-1 px-3 sm:gap-x-2 sm:px-4 ' +
    'grid-cols-[minmax(0,1fr)_1.5rem_1.5rem_1.5rem_1.5rem_1.5rem_1.5rem_1.5rem] ' +
    'sm:grid-cols-[minmax(0,1fr)_3.5rem_3rem_3rem_3rem_3rem_4rem_5rem]';

  return (
    <div
      role="table"
      className="overflow-hidden rounded-2xl bg-sea-900 ring-1 ring-white/10"
    >
      <div
        role="row"
        className={`${cols} py-3 text-xs text-sand/60 sm:text-sm`}
      >
        <span role="columnheader" className="font-medium">
          Team
        </span>
        <Head short="MP" full="Played" className="font-medium" />
        <Head short="W" full="Won" className="font-medium" />
        <Head short="L" full="Lost" className="font-medium" />
        <Head short="GF" full="GF" className="font-medium" />
        <Head short="GA" full="GA" className="font-medium" />
        <Head short="GD" full="GD" className="font-medium" />{' '}
        <Head short="Pts" full="Points" className="font-medium" />
      </div>

      {rows.map((r, i) => (
        <div
          key={r.team}
          role="row"
          className={`${cols} border-t border-white/10 py-3 text-sm tabular-nums sm:text-base`}
        >
          <div className="flex min-w-0 items-center">
            <span
              className={`mr-2 inline-grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold sm:mr-3 sm:size-7 sm:text-sm ${
                seeded && i === 0 ? 'bg-sun text-sea-950' : 'bg-white/10'
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="wrap-break-word font-semibold leading-tight">
                {r.team}
              </div>
              {r.players.length > 0 && (
                <div className="mt-0.5 wrap-break-word text-xs leading-snug text-sand/60 sm:text-sm">
                  {r.players.join(', ')}
                </div>
              )}
            </div>
          </div>
          <span className="text-center">{r.p}</span>
          <span className="text-center font-bold">{r.w}</span>
          <span className="text-center">{r.l}</span>
          <span className="text-center">{r.pf}</span>
          <span className="text-center">{r.pa}</span>
          <span className="text-center">{r.pf - r.pa}</span>
          <span className="text-center font-bold">{r.w * 3}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { data, error, setSelectedEventId } = useTournament();

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="wrap-break-word text-sand/70">
          {error
            ? `Couldn't load the tournament (${error}). Check your Supabase env vars and that the volleyball schema is exposed.`
            : 'Loading tournament…'}
        </p>
      </main>
    );
  }

  const {
    events,
    selectedEventId,
    title,
    warnings,
    standings,
    rrMatches,
    rrPlayed,
    rrDone,
    semi1,
    semi2,
    third,
    final,
    champion
  } = data;

  // Check if knockout stage has any valid matches scheduled or played
  const hasKnockout = [semi1, semi2, third, final].some(
    (m) => m.a !== null || m.b !== null || m.played
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="wrap-break-word text-4xl font-extrabold tracking-tight sm:text-7xl">
            {title}
          </h1>

          {/* Event selection dropdown */}
          {events.length > 1 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              className="rounded-xl bg-sea-900 px-3 py-2 text-sm font-medium text-sand ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-sun/70"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={() => location.reload()}
          aria-label="Refresh"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sand/80 transition hover:bg-white/20 active:scale-95 sm:size-11"
        >
          <svg
            className="size-4 sm:size-5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M16 10a6 6 0 1 1-1.76-4.24" />
            <path d="M16 3v4h-4" />
          </svg>
        </button>
      </header>

      {error && (
        <p className="mt-4 text-sm text-sun">
          Couldn't refresh ({error}). Showing the last loaded scores.
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="mt-6 space-y-1 wrap-break-word rounded-xl bg-sun/15 p-4 text-sm ring-1 ring-sun/40">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {champion && (
        <div className="mt-8 rounded-3xl bg-sun p-5 text-sea-950 sm:p-8">
          <p className="text-lg font-medium">Tournament champions</p>
          <p className="wrap-break-word text-3xl font-extrabold tracking-tight sm:text-6xl">
            {champion}
          </p>
        </div>
      )}

      <Section
        title="Round robin"
        note={
          rrDone
            ? 'All matches played. Standings set the semi-finals.'
            : `${rrPlayed} of ${rrMatches.length} matches played. Standings are provisional.`
        }
      >
        <Standings rows={standings} seeded={rrDone} />
        <details
          open
          className="group mt-4 rounded-3xl bg-sea-800/40 ring-1 ring-white/10"
        >
          <summary className="flex cursor-pointer list-none items-center gap-4 rounded-3xl px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-lg font-bold">Group stage</span>
                <span className="text-sm text-sand/60">
                  {rrPlayed} of {rrMatches.length} played
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sun transition-all"
                  style={{
                    width: `${rrMatches.length ? (rrPlayed / rrMatches.length) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10">
              <svg
                className="size-4 transition-transform group-open:rotate-180"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M5 8l5 5 5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </summary>

          <div className="grid grid-cols-1 gap-3 px-3 pb-3 sm:grid-cols-2 sm:gap-4 sm:px-4 sm:pb-4 lg:grid-cols-3">
            {rrMatches.map((m) => (
              <MatchCard key={m.label} m={m} />
            ))}
          </div>
        </details>
      </Section>

      {hasKnockout && (
        <Section
          title="Knockout"
          note="1st plays 4th, 2nd plays 3rd. Winners meet in the final."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <MatchCard m={semi1} />
              <MatchCard m={semi2} />
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-4">
              <MatchCard m={third} />
              <MatchCard m={final} highlight />
            </div>
          </div>
        </Section>
      )}
    </main>
  );
}
