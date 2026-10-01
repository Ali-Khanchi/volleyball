import { rating, rate, ordinal, Rating } from 'openskill';
import { TournamentData, Match } from '../hooks/useTournament';

export interface PlayerRankingRow {
  rank: number;
  playerName: string;
  mu: number;
  sigma: number;
  ordinalScore: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

/**
 * Calculates logarithmic Margin of Victory (MoV) weights for side-out scoring.
 * Prevents runaway rating increases from huge point differentials.
 */
function calculateMovWeight(ptsA: number, ptsB: number): number {
  const diff = Math.abs(ptsA - ptsB);
  if (diff === 0) return 1.0;
  // Natural log scaling with a strict upper cap of 1.8
  const weight = 1.0 + 0.3 * Math.log(diff + 1);
  return Math.min(weight, 1.8);
}

export function calculatePlayerRankings(
  data: TournamentData | null
): PlayerRankingRow[] {
  if (!data) return [];

  // Fallback to current event matches if allHistoricalMatches is not yet populated
  const matchesToProcess = data.allHistoricalMatches?.length
    ? data.allHistoricalMatches
    : [
        ...data.rrMatches,
        data.semi1,
        data.semi2,
        data.third,
        data.final
      ].filter((m): m is Match => Boolean(m));

  const historicalPlayedMatches = matchesToProcess.filter((m) => m && m.played);
  const ratingsMap = new Map<string, Rating>();
  const statsMap = new Map<
    string,
    { matchesPlayed: number; wins: number; losses: number }
  >();

  const getOrCreatePlayer = (name: string): Rating => {
    if (!ratingsMap.has(name)) {
      ratingsMap.set(name, rating());
      statsMap.set(name, { matchesPlayed: 0, wins: 0, losses: 0 });
    }
    return ratingsMap.get(name)!;
  };

  for (const match of historicalPlayedMatches) {
    if (!match.playersA.length || !match.playersB.length) continue;

    const teamARatings = match.playersA.map((p) => getOrCreatePlayer(p));
    const teamBRatings = match.playersB.map((p) => getOrCreatePlayer(p));

    // Determine match outcome:
    // rank: [1, 2] = Team A Wins
    // rank: [2, 1] = Team B Wins
    // rank: [1, 1] = Tie / Draw
    let ranks = [1, 1];
    let winner: 'A' | 'B' | 'DRAW' = 'DRAW';

    if (match.win === 0) {
      ranks = [1, 2];
      winner = 'A';
    } else if (match.win === 1) {
      ranks = [2, 1];
      winner = 'B';
    } else if (match.ptsA > match.ptsB) {
      ranks = [1, 2];
      winner = 'A';
    } else if (match.ptsB > match.ptsA) {
      ranks = [2, 1];
      winner = 'B';
    }

    // Calculate Margin of Victory (MoV) weight
    const movWeight = calculateMovWeight(match.ptsA ?? 0, match.ptsB ?? 0);
    const weightsA = match.playersA.map(() => movWeight);
    const weightsB = match.playersB.map(() => movWeight);

    // Rate the match using OpenSkill functional API
    const [updatedTeamA, updatedTeamB] = rate([teamARatings, teamBRatings], {
      rank: ranks,
      weight: [weightsA, weightsB]
    });

    // Update ratings and historical match statistics
    match.playersA.forEach((p, idx) => {
      ratingsMap.set(p, updatedTeamA[idx]);
      const st = statsMap.get(p)!;
      st.matchesPlayed += 1;
      if (winner === 'A') st.wins += 1;
      else if (winner === 'B') st.losses += 1;
    });

    match.playersB.forEach((p, idx) => {
      ratingsMap.set(p, updatedTeamB[idx]);
      const st = statsMap.get(p)!;
      st.matchesPlayed += 1;
      if (winner === 'B') st.wins += 1;
      else if (winner === 'A') st.losses += 1;
    });
  }

  const results: Omit<PlayerRankingRow, 'rank'>[] = [];

  ratingsMap.forEach((r, playerName) => {
    const st = statsMap.get(playerName)!;

    // Scales the distribution so 1 mu ≈ 25 Elo points:
    const BASELINE_SCORE = 1000;
    const SCALE_FACTOR = 25;

    const score = Math.round(ordinal(r) * SCALE_FACTOR + BASELINE_SCORE);

    results.push({
      playerName,
      mu: r.mu,
      sigma: r.sigma,
      ordinalScore: score,
      matchesPlayed: st.matchesPlayed,
      wins: st.wins,
      losses: st.losses
    });
  });

  // Sort by ordinal score descending, breaking ties with total wins
  results.sort((a, b) => b.ordinalScore - a.ordinalScore || b.wins - a.wins);

  return results.map((row, idx) => ({
    ...row,
    rank: idx + 1
  }));
}
