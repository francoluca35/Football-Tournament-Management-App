// Tipos de datos para la aplicación de torneo de fútbol

export type TournamentType = 'torneo' | 'copa';
export type Tiebreaker = 'points' | 'goalDifference' | 'goalsFor' | 'goalsAgainst';

export interface Division {
  id: string;
  name: string;
  tournamentType: TournamentType;
  regularPhaseMatches?: number; // Para copa: cuántas fechas antes de eliminación
  twoLeggedKnockout?: boolean; // Para copa: ida y vuelta en eliminatorias
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
  tiebreakers?: Tiebreaker[];
  maxTeams?: number;
  zonesEnabled?: boolean;
  zonesCount?: number;
  roundRobinHomeAway?: boolean;
}

export interface Team {
  id: string;
  name: string;
  divisionId: string;
  logoUrl?: string;
}

export type PlayerPosition = 'Arquero' | 'Defensor' | 'Mediocampista' | 'Delantero';

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: PlayerPosition;
}

export type FixtureType = 'regular' | 'round-of-16' | 'quarter-final' | 'semi-final' | 'final';

export interface Match {
  id: string;
  divisionId: string;
  matchday: number; // Número de fecha
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  fixtureType: FixtureType;
  isFirstLeg?: boolean; // Para ida y vuelta
  zone?: string;
}

export interface Standing {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
