// Gestión de datos en localStorage (temporal, migrar a Supabase después)

import type { Division, Team, Player, Match, Tiebreaker, TournamentSettings } from './types';

const STORAGE_KEYS = {
  DIVISIONS: 'tournament_divisions',
  TEAMS: 'tournament_teams',
  PLAYERS: 'tournament_players',
  MATCHES: 'tournament_matches',
  SETTINGS: 'tournament_settings',
  MOVEMENTS: 'tournament_movements',
};

const isBrowser = () => typeof window !== 'undefined';
const DEFAULT_TIEBREAKERS: Tiebreaker[] = ['points', 'goalDifference', 'goalsFor'];
const DEFAULT_SETTINGS: TournamentSettings = {
  promotionsPerDivision: 2,
  relegationsPerDivision: 2,
  applyToCups: false,
};

const normalizeDivision = (division: Division): Division => {
  return {
    ...division,
    pointsWin: division.pointsWin ?? 3,
    pointsDraw: division.pointsDraw ?? 1,
    pointsLoss: division.pointsLoss ?? 0,
    tiebreakers: division.tiebreakers && division.tiebreakers.length > 0
      ? division.tiebreakers
      : DEFAULT_TIEBREAKERS,
    zonesEnabled: division.zonesEnabled ?? false,
    zonesCount: division.zonesCount ?? 2,
    roundRobinHomeAway: division.roundRobinHomeAway ?? false,
  };
};

// Divisiones
export const getDivisions = (): Division[] => {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.DIVISIONS);
  return data ? JSON.parse(data).map(normalizeDivision) : [];
};

export const saveDivisions = (divisions: Division[]) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(divisions));
};

// Equipos
export const getTeams = (): Team[] => {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
  return data ? JSON.parse(data) : [];
};

export const saveTeams = (teams: Team[]) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
};

// Jugadores
const normalizePlayer = (player: Player & { name?: string }): Player => {
  if (player.firstName && player.lastName) {
    return player;
  }

  if (player.name) {
    const parts = player.name.trim().split(/\s+/);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ') || '';
    return {
      ...player,
      firstName,
      lastName,
    };
  }

  return {
    ...player,
    firstName: player.firstName ?? '',
    lastName: player.lastName ?? '',
  };
};

export const getPlayers = (): Player[] => {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
  return data ? JSON.parse(data).map(normalizePlayer) : [];
};

export const savePlayers = (players: Player[]) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
};

// Partidos
export const getMatches = (): Match[] => {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(STORAGE_KEYS.MATCHES);
  return data ? JSON.parse(data) : [];
};

export const saveMatches = (matches: Match[]) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
};

// Configuraciones generales
export const getTournamentSettings = (): TournamentSettings => {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!data) return DEFAULT_SETTINGS;
  const parsed = JSON.parse(data) as Partial<TournamentSettings>;
  return {
    promotionsPerDivision: Number.isFinite(parsed.promotionsPerDivision)
      ? Math.max(0, Math.floor(parsed.promotionsPerDivision as number))
      : DEFAULT_SETTINGS.promotionsPerDivision,
    relegationsPerDivision: Number.isFinite(parsed.relegationsPerDivision)
      ? Math.max(0, Math.floor(parsed.relegationsPerDivision as number))
      : DEFAULT_SETTINGS.relegationsPerDivision,
    applyToCups: typeof parsed.applyToCups === 'boolean'
      ? parsed.applyToCups
      : DEFAULT_SETTINGS.applyToCups,
  };
};

export const saveTournamentSettings = (settings: TournamentSettings) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const getMovementsLog = (): Record<string, string> => {
  if (!isBrowser()) return {};
  const data = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
  return data ? JSON.parse(data) : {};
};

export const saveMovementsLog = (log: Record<string, string>) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(log));
};
