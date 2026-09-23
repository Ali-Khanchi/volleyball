import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Match {
  label: string;
  stage: string;
  a: string | null;
  b: string | null;
  hintA: string;
  hintB: string;
  ptsA: number;
  ptsB: number;
  played: boolean;
  win: 0 | 1 | null;
  done: boolean;
  winner: string | null;
  loser: string | null;
  refs: string;
}

export interface StandingRow {
  team: string;
  players: string[];
  p: number;
  w: number;
  l: number;
  pf: number;
  pa: number;
}

export interface EventItem {
  id: number;
  name: string | null;
}

export interface TournamentData {
  events: EventItem[];
  selectedEventId: number;
  title: string;
  warnings: string[];
  standings: StandingRow[];
  rrMatches: Match[];
  rrPlayed: number;
  rrDone: boolean;
  semi1: Match;
  semi2: Match;
  third: Match;
  final: Match;
  champion: string | null;
}

const HINTS: Record<string, [string, string]> = {
  semi1: ['1st in round robin', '4th in round robin'],
  semi2: ['2nd in round robin', '3rd in round robin'],
  third: ['Loser of semi-final 1', 'Loser of semi-final 2'],
  final: ['Winner of semi-final 1', 'Winner of semi-final 2']
};

const STAGE_LABEL: Record<string, string> = {
  semi1: 'Semi-final 1',
  semi2: 'Semi-final 2',
  third: 'Third place',
  final: 'Final'
};

type TeamRef = { id: number; name: string | null } | null;

interface RawMatch {
  id: number;
  match_order: number | null;
  stage: string;
  score0: number | null;
  score1: number | null;
  refs: string | null;
  team0: TeamRef;
  team1: TeamRef;
}

function toMatch(row: RawMatch, label: string): Match {
  const a = row.team0?.name ?? null;
  const b = row.team1?.name ?? null;
  const ptsA = row.score0 ?? 0;
  const ptsB = row.score1 ?? 0;
  const played = row.score0 !== null && row.score1 !== null;
  const win: 0 | 1 | null = played
    ? ptsA > ptsB
      ? 0
      : ptsB > ptsA
        ? 1
        : null
    : null;
  const [hintA, hintB] = HINTS[row.stage] ?? ['', ''];
  return {
    label,
    stage: row.stage,
    a,
    b,
    hintA,
    hintB,
    ptsA,
    ptsB,
    played,
    win,
    done: played && win !== null,
    winner: win !== null ? [a, b][win] : null,
    loser: win !== null ? [a, b][1 - win] : null,
    refs: row.refs ?? ''
  };
}

const EMPTY_ROW = (stage: string): RawMatch => ({
  id: -1,
  match_order: null,
  stage,
  score0: null,
  score1: null,
  refs: null,
  team0: null,
  team1: null
});

/**
 * Loads a tournament (by event name, or the most recent event if omitted)
 * and stays in sync via a Supabase realtime subscription on `matches`.
 */
export function useTournament(initialEventName?: string) {
  const [data, setData] = useState<TournamentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      // 1. Fetch all available events ordered by date
      const { data: eventsList, error: eventsErr } = await supabase
        .from('events')
        .select('id, name')
        .order('date', { ascending: false });

      if (eventsErr) throw eventsErr;
      if (!eventsList || eventsList.length === 0)
        throw new Error('No tournament events found');

      // 2. Determine active event ID
      let currentId = selectedEventId;
      if (!currentId) {
        if (initialEventName) {
          const matched = eventsList.find((e) => e.name === initialEventName);
          currentId = matched ? matched.id : eventsList[0].id;
        } else {
          currentId = eventsList[eventsList.length - 1].id;
        }
        setSelectedEventId(currentId);
      }

      const event = eventsList.find((e) => e.id === currentId) ?? eventsList[0];

      // let eventQuery = supabase.from('events').select('id, name');
      // eventQuery = eventName
      //   ? eventQuery.eq('name', eventName)
      //   : eventQuery.order('date', { ascending: false });
      // const { data: events, error: eventErr } = await eventQuery.limit(1);
      // if (eventErr) throw eventErr;
      // const event = events?.[0];
      // if (!event) throw new Error('No tournament event found');

      const { data: matchRows, error: matchErr } = await supabase
        .from('matches')
        .select(
          'id, match_order, stage, score0, score1, refs, team0(id,name), team1(id,name)'
        )
        .eq('event_id', event.id)
        .order('match_order', { ascending: true });
      if (matchErr) throw matchErr;

      const rows = (matchRows ?? []) as unknown as RawMatch[];
      const rrRows = rows.filter((r) => r.stage === 'round_robin');
      const rrMatches = rrRows.map((r, i) =>
        toMatch(r, `Match ${r.match_order ?? i + 1}`)
      );
      const rrPlayed = rrMatches.filter((m) => m.done).length;

      const teamIds = new Set<number>();
      for (const r of rrRows) {
        if (r.team0?.id) teamIds.add(r.team0.id);
        if (r.team1?.id) teamIds.add(r.team1.id);
      }

      const rosters = new Map<number, string[]>();
      if (teamIds.size > 0) {
        const { data: memberRows, error: memberErr } = await supabase
          .from('team_memberships')
          .select('team_id, player:player_id(name)')
          .in('team_id', [...teamIds]);
        if (memberErr) throw memberErr;
        for (const m of memberRows ?? []) {
          const teamId = (m as any).team_id as number;
          const name = (m as any).player?.name as string | undefined;
          if (!name) continue;
          const list = rosters.get(teamId) ?? [];
          list.push(name);
          rosters.set(teamId, list);
        }
      }

      const table = new Map<string, StandingRow>();
      for (const r of rrRows) {
        for (const t of [r.team0, r.team1]) {
          if (t?.name && !table.has(t.name)) {
            table.set(t.name, {
              team: t.name,
              players: rosters.get(t.id) ?? [],
              p: 0,
              w: 0,
              l: 0,
              pf: 0,
              pa: 0
            });
          }
        }
      }
      for (const m of rrMatches) {
        if (!m.done || !m.a || !m.b) continue;
        const A = table.get(m.a);
        const B = table.get(m.b);
        if (!A || !B) continue;
        A.p++;
        B.p++;
        A.pf += m.ptsA;
        A.pa += m.ptsB;
        B.pf += m.ptsB;
        B.pa += m.ptsA;
        if (m.win === 0) {
          A.w++;
          B.l++;
        } else {
          B.w++;
          A.l++;
        }
      }
      const standings = [...table.values()].sort(
        (x, y) =>
          y.w - x.w ||
          y.pf - y.pa - (x.pf - x.pa) ||
          y.pf - x.pf ||
          x.team.localeCompare(y.team)
      );

      const koRows = Object.fromEntries(
        rows.filter((r) => r.stage in STAGE_LABEL).map((r) => [r.stage, r])
      );
      const makeKo = (stage: string) =>
        toMatch(koRows[stage] ?? EMPTY_ROW(stage), STAGE_LABEL[stage]);

      const semi1 = makeKo('semi1');
      const semi2 = makeKo('semi2');
      const third = makeKo('third');
      const final = makeKo('final');

      const warnings: string[] = [];
      if (rrRows.length === 0)
        warnings.push('No round robin matches found for this event.');

      setData({
        events: eventsList,
        selectedEventId: event.id,
        title: event.name ?? 'Volleyball Tournament',
        warnings,
        standings,
        rrMatches,
        rrPlayed,
        rrDone: rrMatches.length > 0 && rrPlayed === rrMatches.length,
        semi1,
        semi2,
        third,
        final,
        champion: final.winner
      });
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }, [initialEventName, selectedEventId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'volleyball', table: 'matches' },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { data, error, setSelectedEventId };
}
