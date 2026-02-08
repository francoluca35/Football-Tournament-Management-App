// Tipos de datos para la aplicación de torneo de fútbol

export type TournamentType = 'torneo' | 'copa';
export type Tiebreaker = 'points' | 'goalDifference' | 'goalsFor' | 'goalsAgainst';

export interface Division {
  id: string;
  name: string;
}

export interface Competition {
  id: string;
  divisionId: string;
  name: string;
  tournamentType: TournamentType;
  startDate?: string;
  endDate?: string;
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
  tiebreakers?: Tiebreaker[];
  maxTeams?: number;
  zonesEnabled?: boolean;
  zonesCount?: number;
  roundRobinHomeAway?: boolean;
  groupCount?: number;
  twoLeggedKnockout?: boolean;
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
  firstName: string;
  lastName: string;
  number: number;
  position: PlayerPosition;
  photoUrl?: string;
}

export type FixtureType =
  | 'regular'
  | 'round-of-64'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-final'
  | 'semi-final'
  | 'final';

export type GoalType = 'goal' | 'ownGoal';
export type CardType = 'yellow' | 'doubleYellow' | 'red';

export interface AssistEvent {
  id: string;
  teamId: string;
  playerId: string;
  count: number;
}

export interface GoalEvent {
  id: string;
  teamId: string;
  playerId: string;
  type: GoalType;
  assistPlayerId?: string;
  isPenalty?: boolean;
  minute?: number;
}

export interface CardEvent {
  id: string;
  teamId: string;
  playerId: string;
  type: CardType;
}

export interface SubstitutionEvent {
  id: string;
  teamId: string;
  playerOutId: string;
  playerInId: string;
}

export interface Match {
  id: string;
  divisionId: string;
  competitionId?: string;
  matchday: number; // Número de fecha
  date?: string; // YYYY-MM-DD
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  penaltiesWinnerTeamId?: string;
  penaltiesHomeScore?: number;
  penaltiesAwayScore?: number;
  fixtureType: FixtureType;
  isFirstLeg?: boolean; // Para ida y vuelta
  zone?: string;
  goals?: GoalEvent[];
  assists?: AssistEvent[];
  cards?: CardEvent[];
  substitutions?: SubstitutionEvent[];
  status?: 'pending' | 'completed' | 'suspended';
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

export interface TournamentSettings {
  promotionsPerDivision: number;
  relegationsPerDivision: number;
  applyToCups: boolean;
}
