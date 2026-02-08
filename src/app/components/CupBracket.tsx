import { Trophy } from 'lucide-react';
import type { Team } from '../types';

type BracketTeam = { label: string; teamId: string | null };
type BracketMatch = {
  id: string;
  home: BracketTeam;
  away: BracketTeam;
  homeScore?: number;
  awayScore?: number;
  penaltiesWinnerTeamId?: string;
  penaltiesHomeScore?: number;
  penaltiesAwayScore?: number;
};
type BracketRound = { title: string; matches: BracketMatch[] };

type CupBracketProps = {
  bracketRounds: BracketRound[];
  teams: Team[];
  finalWinner?: { teamId: string; teamName: string } | null;
};

const getTeamName = (teams: Team[], entry: BracketTeam) => {
  if (entry.teamId) {
    return teams.find(team => team.id === entry.teamId)?.name ?? entry.label;
  }
  return entry.label;
};

const splitMatches = (matches: BracketMatch[]) => {
  const half = Math.ceil(matches.length / 2);
  return {
    left: matches.slice(0, half),
    right: matches.slice(half),
  };
};

const getScoreLabel = (match: BracketMatch, side: 'home' | 'away') => {
  const score = side === 'home' ? match.homeScore : match.awayScore;
  if (score === undefined) return '';
  const penScore = side === 'home' ? match.penaltiesHomeScore : match.penaltiesAwayScore;
  const teamId = side === 'home' ? match.home.teamId : match.away.teamId;
  const winnerTag = match.penaltiesWinnerTeamId && teamId === match.penaltiesWinnerTeamId ? ' G' : '';
  if (match.penaltiesWinnerTeamId && penScore !== undefined) {
    return `${score} (${penScore}${winnerTag})`;
  }
  return `${score}`;
};

const MatchCard = ({
  match,
  teams,
  side,
}: {
  match: BracketMatch;
  teams: Team[];
  side: 'left' | 'right';
}) => {
  const homeName = getTeamName(teams, match.home);
  const awayName = getTeamName(teams, match.away);
  const isRight = side === 'right';

  return (
    <div className={`relative ${isRight ? 'pr-8' : 'pl-8'}`}>
      <div className="rounded-md border border-border bg-card px-3 py-2 text-sm flex items-center justify-between">
        <span>{homeName}</span>
        {match.homeScore !== undefined && match.awayScore !== undefined && (
          <span className="text-sm font-semibold text-primary">{getScoreLabel(match, 'home')}</span>
        )}
      </div>
      <div className="rounded-md border border-border bg-card px-3 py-2 text-sm mt-2 flex items-center justify-between">
        <span>{awayName}</span>
        {match.homeScore !== undefined && match.awayScore !== undefined && (
          <span className="text-sm font-semibold text-primary">{getScoreLabel(match, 'away')}</span>
        )}
      </div>
      <span
        className={`absolute top-1/2 -translate-y-1/2 h-px w-7 bg-border/60 ${
          isRight ? 'left-0 -ml-7' : 'right-0 -mr-7'
        }`}
      />
    </div>
  );
};

export function CupBracket({ bracketRounds, teams, finalWinner }: CupBracketProps) {
  const roundsByTitle = Object.fromEntries(bracketRounds.map(round => [round.title, round]));
  const finalRound = roundsByTitle.Final ?? bracketRounds.find(round => round.title === 'Final');
  const finalMatch = finalRound?.matches?.[0];

  const renderColumn = (roundTitle: string, side: 'left' | 'right') => {
    const round = roundsByTitle[roundTitle];
    if (!round) return null;
    const { left, right } = splitMatches(round.matches);
    const matches = side === 'left' ? left : right;
    const headerTitle = roundTitle === 'Semifinal'
      ? (side === 'left' ? 'Semifinal 1' : 'Semifinal 2')
      : roundTitle;

    return (
      <div className="space-y-8 pt-2">
        <h4 className="text-xs uppercase text-muted-foreground text-center leading-none">{headerTitle}</h4>
        <div className="space-y-6">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} teams={teams} side={side} />
          ))}
        </div>
      </div>
    );
  };

  const orderedTitles = ['32avos', '16vos', 'Octavos', 'Cuartos', 'Semifinal'];
  const availableTitles = orderedTitles.filter(title => Boolean(roundsByTitle[title]));
  const columns = availableTitles.length > 0
    ? [...availableTitles, 'Final', ...availableTitles.slice().reverse()]
    : ['Final'];
  const columnCount = columns.length;
  const minWidth = Math.max(3, columnCount) * 180;

  return (
    <div
      className="grid gap-10 relative"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`, minWidth }}
    >
      {columns.map((title, index) => {
        if (title === 'Final') {
          return (
            <div key={`final-${index}`} className="flex flex-col items-center justify-center gap-6">
              <Trophy className="w-12 h-12 text-primary" />
              {finalWinner && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Campeón</p>
                  <p className="text-lg font-semibold text-foreground">{finalWinner.teamName}</p>
                </div>
              )}
              {finalMatch && (
                <div className="space-y-2">
                  <div className="rounded-md border border-border bg-card px-3 py-2 text-sm flex items-center justify-between">
                    <span>{getTeamName(teams, finalMatch.home)}</span>
                    {finalMatch.homeScore !== undefined && finalMatch.awayScore !== undefined && (
                      <span className="text-sm font-semibold text-primary">{getScoreLabel(finalMatch, 'home')}</span>
                    )}
                  </div>
                  <div className="rounded-md border border-border bg-card px-3 py-2 text-sm flex items-center justify-between">
                    <span>{getTeamName(teams, finalMatch.away)}</span>
                    {finalMatch.homeScore !== undefined && finalMatch.awayScore !== undefined && (
                      <span className="text-sm font-semibold text-primary">{getScoreLabel(finalMatch, 'away')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }

        const side = index < columns.indexOf('Final') ? 'left' : 'right';
        return (
          <div key={`${title}-${index}`}>
            {renderColumn(title, side as 'left' | 'right')}
          </div>
        );
      })}
    </div>
  );
}
