import { useMemo, useState } from 'react';
import Section from './Section';
import { TournamentData } from '../hooks/useTournament';
import { calculatePlayerRankings } from '../utils/openskill';

type SortKey =
  | 'playerName'
  | 'matchesPlayed'
  | 'wins'
  | 'losses'
  | 'draws'
  | 'winPct'
  | 'ordinalScore';

function Head({
  short,
  full,
  className = '',
  onClick,
  children
}: {
  short: string;
  full: string;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-center transition-colors ${className}`}
    >
      <span className="sm:hidden">
        {short}
        {children}
      </span>
      <span className="hidden sm:inline">
        {full}
        {children}
      </span>
    </button>
  );
}

export default function PlayerRankings({ data }: { data: TournamentData }) {
  const [sortKey, setSortKey] = useState<SortKey>('ordinalScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Helper to change sort column or toggle direction
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Default player name sorting to A-Z (asc), numeric metrics to high-to-low (desc)
      setSortOrder(key === 'playerName' ? 'asc' : 'desc');
    }
  };

  const processedRankings = useMemo(() => {
    const rawRankings = calculatePlayerRankings(data);

    // 1. Calculate values for sorting
    const items = rawRankings.map((r) => {
      const draws = r.matchesPlayed - r.wins - r.losses;
      const winPct =
        r.matchesPlayed > 0
          ? (50 * (r.matchesPlayed - r.losses + r.wins)) / r.matchesPlayed
          : 0;
      return { ...r, draws, winPct };
    });

    // 2. Sort items based on active key and order
    items.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;

      let result = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        result = valA.localeCompare(valB);
      } else {
        result = (valA as number) < (valB as number) ? -1 : 1;
      }

      return sortOrder === 'asc' ? result : -result;
    });

    // 3. Calculate tied ranks dynamically based on sorted column value
    let currentRank = 1;
    return items.map((item, index, array) => {
      if (index > 0) {
        const prevItem = array[index - 1];
        if (item[sortKey] !== prevItem[sortKey]) {
          currentRank = index + 1;
        }
      }
      return { ...item, computedRank: currentRank };
    });
  }, [data, sortKey, sortOrder]);

  const cols =
    'grid items-center gap-x-1 px-3 sm:gap-x-2 sm:px-4 ' +
    'grid-cols-[minmax(0,1fr)_1.5rem_1.5rem_1.5rem_2.5rem_3rem_3rem] ' +
    'sm:grid-cols-[minmax(0,1fr)_3.5rem_3rem_3rem_4rem_5rem_5rem]';

  return (
    <Section title={`Leaderboard - ${data.title}`} note="">
      <div
        role="table"
        className="overflow-hidden rounded-2xl bg-sea-900 ring-1 ring-white/10"
      >
        <div
          role="row"
          className={`${cols} py-3 text-xs text-sand/60 sm:text-sm`}
        >
          <button
            type="button"
            onClick={() => handleSort('playerName')}
            className="flex items-center gap-1 font-medium text-left hover:text-white"
          >
            Player{' '}
            {sortKey === 'playerName' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <Head
            short="MP"
            full="Played"
            className="font-medium cursor-pointer hover:text-white"
            onClick={() => handleSort('matchesPlayed')}
          >
            {sortKey === 'matchesPlayed' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </Head>
          <Head
            short="W"
            full="Won"
            className="font-medium cursor-pointer hover:text-white"
            onClick={() => handleSort('wins')}
          >
            {sortKey === 'wins' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </Head>
          <Head
            short="L"
            full="Lost"
            className="font-medium cursor-pointer hover:text-white"
            onClick={() => handleSort('losses')}
          >
            {sortKey === 'losses' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </Head>
          <Head
            short="D"
            full="Draw"
            className="font-medium cursor-pointer hover:text-white"
            onClick={() => handleSort('draws')}
          >
            {sortKey === 'draws' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </Head>
          <Head
            short="%"
            full="Win %"
            className="font-medium text-sm cursor-pointer hover:text-white"
            onClick={() => handleSort('winPct')}
          >
            {sortKey === 'winPct' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </Head>
          <Head
            short="Score"
            full="Score"
            className="font-medium cursor-pointer hover:text-white"
            onClick={() => handleSort('ordinalScore')}
          >
            {sortKey === 'ordinalScore' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </Head>
        </div>

        {processedRankings.map((r) => (
          <div
            key={r.playerName}
            role="row"
            className={`${cols} border-t border-white/10 py-3 text-sm tabular-nums sm:text-base`}
          >
            <div className="flex min-w-0 items-center">
              <span
                className={`mr-2 inline-grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold sm:mr-3 sm:size-7 sm:text-sm ${
                  r.computedRank === 1 ? 'bg-sun text-sea-950' : 'bg-white/10'
                }`}
              >
                {r.computedRank}
              </span>
              <span className="truncate font-semibold">{r.playerName}</span>
            </div>
            <span className="text-center">{r.matchesPlayed}</span>
            <span className="text-center font-bold">{r.wins}</span>
            <span className="text-center">{r.losses}</span>
            <span className="text-center text-sand/80">{r.draws}</span>
            <span className="text-center text-sand/60">
              {r.winPct.toPrecision(3)}
            </span>
            <span className="text-center font-bold text-sun">
              {r.ordinalScore}
            </span>
          </div>
        ))}

        {processedRankings.length === 0 && (
          <div className="p-4 text-center text-sm text-sand/60">
            No played matches available to calculate player rankings.
          </div>
        )}
      </div>
    </Section>
  );
}
