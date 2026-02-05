// Gestión de datos en localStorage (temporal, migrar a Supabase después)

import type { Division, Team, Player, Match } from './types';

const STORAGE_KEYS = {
  DIVISIONS: 'tournament_divisions',
  TEAMS: 'tournament_teams',
  PLAYERS: 'tournament_players',
  MATCHES: 'tournament_matches',
};

// Divisiones
export const getDivisions = (): Division[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DIVISIONS);
  return data ? JSON.parse(data) : [];
};

export const saveDivisions = (divisions: Division[]) => {
  localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(divisions));
};

// Equipos
export const getTeams = (): Team[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
  return data ? JSON.parse(data) : [];
};

export const saveTeams = (teams: Team[]) => {
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
};

// Jugadores
export const getPlayers = (): Player[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PLAYERS);
  return data ? JSON.parse(data) : [];
};

export const savePlayers = (players: Player[]) => {
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
};

// Partidos
export const getMatches = (): Match[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MATCHES);
  return data ? JSON.parse(data) : [];
};

export const saveMatches = (matches: Match[]) => {
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
};
