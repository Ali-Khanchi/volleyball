import { useEffect, useState } from 'react';
import { parseTournament } from './parse.js';

const SRC = `${import.meta.env.BASE_URL}tournament.md`;
const REFRESH_MS = 15000;

function Section({ title, note, children }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {note && <p className="text-sm text-sand/60">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function MatchCard({ m, highlight = false }) {
  const sides = [
    { name: m.a, hint: m.hintA, score: m.setsA, won: m.done && m.win === 0 },
    { name: m.b, hint: m.hintB, score: m.setsB, won: m.done && m.win === 1 },
  ];
  return (
    <div
      className={`rounded-2xl bg-sea-900 p-4 ring-1 ${highlight ? 'ring-2 ring-sun/70' : 'ring-white/10'}`}
    >
      <div className="mb-3 flex items-center justify-between text-sm text-sand/60">
        <span className="font-medium">{m.label}</span>
        <span className={m.done ? 'text-sun' : ''}>{m.done ? 'Finished' : 'Not played yet'}</span>
      </div>
      <div className="space-y-2">
        {sides.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
              s.won ? 'bg-sun text-sea-950' : 'bg-sea-800/60 text-sand/80'
            }`}
          >
            <span className={`min-w-0 truncate ${s.won ? 'font-bold' : s.name ? 'font-medium' : 'italic text-sand/50'}`}>
              {s.name ?? s.hint}
            </span>
            <span className="text-2xl font-extrabold tabular-nums">{m.sets.length ? s.score : '–'}</span>
          </div>
        ))}
      </div>
      {m.sets.length > 0 && (
        <p className="mt-3 text-sm tabular-nums text-sand/60">
          {m.sets.map(([x, y]) => `${x}–${y}`).join(', ')}
        </p>
      )}
    </div>
  );
}

function Standings({ rows, seeded }) {
  const th = 'px-2 py-3 text-right font-medium';
  const td = 'px-2 py-3 text-right tabular-nums';
  return (
    <div className="overflow-x-auto rounded-2xl bg-sea-900 ring-1 ring-white/10">
      <table className="w-full min-w-[440px] text-left">
        <thead className="text-sm text-sand/60">
          <tr>
            <th className="py-3 pl-4 pr-2 font-medium">Team</th>
            <th className={th}>Played</th>
            <th className={th}>Won</th>
            <th className={th}>Lost</th>
            <th className={th}>Sets</th>
            <th className={`${th} pr-4`}>Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team} className="border-t border-white/10">
              <td className="py-3 pl-4 pr-2 font-semibold">
                <span
                  className={`mr-3 inline-grid size-7 place-items-center rounded-full text-sm ${
                    seeded && i === 0 ? 'bg-sun text-sea-950' : 'bg-white/10'
                  }`}
                >
                  {i + 1}
                </span>
                {r.team}
              </td>
              <td className={td}>{r.p}</td>
              <td className={`${td} font-bold`}>{r.w}</td>
              <td className={td}>{r.l}</td>
              <td className={td}>{r.sw}–{r.sl}</td>
              <td className={`${td} pr-4`}>{r.pf}–{r.pa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch(`${SRC}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = parseTournament(await res.text());
        if (!stopped) {
          setData(parsed);
          setError(null);
          setUpdated(new Date());
        }
      } catch (e) {
        if (!stopped) setError(e.message);
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="text-sand/70">
          {error ? `Couldn't load tournament.md (${error}). Check that it is in the public folder.` : 'Loading tournament…'}
        </p>
      </main>
    );
  }

  const { title, warnings, standings, rrMatches, rrPlayed, rrDone, semi1, semi2, third, final, champion } = data;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">{title}</h1>
        <p className="mt-3 text-sand/60">
          Updated {updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. This page refreshes on its own.
        </p>
      </header>

      {error && <p className="mt-4 text-sm text-sun">Couldn't refresh ({error}). Showing the last loaded scores.</p>}

      {warnings.length > 0 && (
        <ul className="mt-6 space-y-1 rounded-xl bg-sun/15 p-4 text-sm ring-1 ring-sun/40">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {champion && (
        <div className="mt-8 rounded-3xl bg-sun p-6 text-sea-950 sm:p-8">
          <p className="text-lg font-medium">Tournament champions</p>
          <p className="text-4xl font-extrabold tracking-tight sm:text-6xl">{champion}</p>
        </div>
      )}

      <Section
        title="Round robin"
        note={rrDone ? 'All matches played. Standings set the semi-finals.' : `${rrPlayed} of ${rrMatches.length} matches played. Standings are provisional.`}
      >
        <Standings rows={standings} seeded={rrDone} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rrMatches.map((m) => (
            <MatchCard key={m.label} m={m} />
          ))}
        </div>
      </Section>

      <Section title="Knockout" note="1st plays 4th, 2nd plays 3rd. Winners meet in the final.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <MatchCard m={semi1} />
            <MatchCard m={semi2} />
          </div>
          <div className="flex flex-col justify-center gap-4">
            <MatchCard m={final} highlight />
            <MatchCard m={third} />
          </div>
        </div>
      </Section>
    </main>
  );
}
