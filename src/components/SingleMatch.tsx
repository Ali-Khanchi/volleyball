import { TournamentData } from '../hooks/useTournament';
import HeadonCard from './HeadonCard';
import Section from './Section';

export default function SingleMatches({
  tournamentData
}: {
  tournamentData: TournamentData;
}) {
  return (
    <>
      <Section
        title="1v1 Matches"
        note={
          tournamentData.rrDone
            ? 'All matches played. Standings set the semi-finals.'
            : `${tournamentData.rrPlayed} of ${tournamentData.rrMatches.length} matches played.`
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {tournamentData.rrMatches.map((m) => (
            <HeadonCard key={m.label} m={m} />
          ))}
        </div>
      </Section>
    </>
  );
}
