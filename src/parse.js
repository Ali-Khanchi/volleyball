const norm = (s) => s.trim().toLowerCase();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// "25-20, 22-25, 15-12" -> [[25,20],[22,25],[15,12]]
export function parseScores(text = '') {
  return text
    .split(',')
    .map((p) => p.trim().match(/^(\d+)\s*[-:–]\s*(\d+)$/))
    .filter(Boolean)
    .map((m) => [Number(m[1]), Number(m[2])]);
}

function result(sets) {
  let setsA = 0,
    setsB = 0,
    ptsA = 0,
    ptsB = 0;
  for (const [x, y] of sets) {
    if (x > y) setsA++;
    else if (y > x) setsB++;
    ptsA += x;
    ptsB += y;
  }
  const win = setsA > setsB ? 0 : setsB > setsA ? 1 : null;
  return {
    sets,
    setsA,
    setsB,
    ptsA,
    ptsB,
    win,
    done: sets.length > 0 && win !== null
  };
}

function makeTie(label, a, b, scoreText, hintA, hintB) {
  const r = result(a && b ? parseScores(scoreText) : []);
  return {
    label,
    a,
    b,
    hintA,
    hintB,
    ...r,
    winner: r.done ? [a, b][r.win] : null,
    loser: r.done ? [a, b][1 - r.win] : null
  };
}

const KO_ALIASES = {
  semi1: 'semi1',
  semifinal1: 'semi1',
  semi2: 'semi2',
  semifinal2: 'semi2',
  third: 'third',
  thirdplace: 'third',
  '3rdplace': 'third',
  bronze: 'third',
  final: 'final'
};

export function parseTournament(md) {
  const warnings = [];
  const title = md.match(/^#\s+(.+)$/m)?.[1].trim() ?? 'Volleyball tournament';

  // split "## Heading" sections into their "- item" lines
  const sections = {};
  let current = null;
  for (const raw of md.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
    const line = raw.trim();
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      current = norm(h[1]);
      sections[current] = [];
    } else if (current && /^[-*]\s+/.test(line)) {
      sections[current].push(line.replace(/^[-*]\s+/, ''));
    }
  }

  const teamLines = sections.teams ?? [];
  const teams = teamLines.map((l) => l.split(':')[0].trim());
  const players = Object.fromEntries(
    teamLines.map((l) => {
      const [name, ...rest] = l.split(':');
      return [
        name.trim(),
        rest
          .join(':')
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      ];
    })
  );
  if (teams.length !== 4)
    warnings.push('Add exactly 4 teams under "## Teams".');
  const byName = Object.fromEntries(teams.map((t) => [norm(t), t]));

  const refs = {};
  for (const line of sections.refs ?? []) {
    const m = line.match(/^(.+?)\s*(?::\s*(.*))?$/);
    const s = slug(m[1]);
    refs[KO_ALIASES[s] ?? s] = (m[2] ?? '').trim();
  }

  // round robin
  const pairKey = (a, b) => [a, b].sort().join('|');
  const rr = new Map();
  for (const line of sections['round robin'] ?? []) {
    const m = line.match(/^(.+?)\s+vs\.?\s+(.+?)\s*(?::\s*(.*))?$/i);
    const a = m && byName[norm(m[1])];
    const b = m && byName[norm(m[2])];
    if (!a || !b || a === b) {
      warnings.push(
        `Can't read round robin line: "${line}" (check the team names)`
      );
      continue;
    }
    rr.set(pairKey(a, b), { a, b, ...result(parseScores(m[3] ?? '')) });
  }
  // any pairing not mentioned in the file still shows up as "not played yet"
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const k = pairKey(teams[i], teams[j]);
      if (!rr.has(k)) rr.set(k, { a: teams[i], b: teams[j], ...result([]) });
    }
  }
  const rrMatches = [...rr.values()].map((m, i) => ({
    ...m,
    label: `Match ${i + 1}`,
    refs: refs[`match${i + 1}`] ?? ''
  }));
  const rrPlayed = rrMatches.filter((m) => m.done).length;
  const rrDone = teams.length === 4 && rrPlayed === rrMatches.length;

  // standings: wins, then set difference, then point difference
  const table = Object.fromEntries(
    teams.map((t) => [
      t,
      {
        team: t,
        players: players[t],
        p: 0,
        w: 0,
        l: 0,
        sw: 0,
        sl: 0,
        pf: 0,
        pa: 0
      }
    ])
  );
  for (const m of rrMatches.filter((m) => m.done)) {
    const A = table[m.a],
      B = table[m.b];
    A.p++;
    B.p++;
    A.sw += m.setsA;
    A.sl += m.setsB;
    A.pf += m.ptsA;
    A.pa += m.ptsB;
    B.sw += m.setsB;
    B.sl += m.setsA;
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
  const standings = Object.values(table).sort(
    (x, y) =>
      y.w - x.w ||
      y.sw - y.sl - (x.sw - x.sl) ||
      y.pf - y.pa - (x.pf - x.pa) ||
      x.team.localeCompare(y.team)
  );
  const seeds = rrDone ? standings.map((r) => r.team) : [];

  // knockout
  const ko = {};
  for (const line of sections.knockout ?? []) {
    const m = line.match(/^(.+?)\s*(?::\s*(.*))?$/);
    const key = KO_ALIASES[slug(m[1])];
    if (!key) {
      warnings.push(
        `Unknown knockout line: "${line}" (use Semi 1, Semi 2, Third place, Final)`
      );
      continue;
    }
    ko[key] = m[2] ?? '';
  }
  const semi1 = makeTie(
    'Semi-final 1',
    seeds[0],
    seeds[3],
    ko.semi1,
    '1st in round robin',
    '4th in round robin'
  );
  const semi2 = makeTie(
    'Semi-final 2',
    seeds[1],
    seeds[2],
    ko.semi2,
    '2nd in round robin',
    '3rd in round robin'
  );
  const third = makeTie(
    'Third place',
    semi1.loser,
    semi2.loser,
    ko.third,
    'Loser of semi-final 1',
    'Loser of semi-final 2'
  );
  const final = makeTie(
    'Final',
    semi1.winner,
    semi2.winner,
    ko.final,
    'Winner of semi-final 1',
    'Winner of semi-final 2'
  );

  semi1.refs = refs.semi1 ?? '';
  semi2.refs = refs.semi2 ?? '';
  third.refs = refs.third ?? '';
  final.refs = refs.final ?? '';

  return {
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
    champion: final.winner
  };
}
