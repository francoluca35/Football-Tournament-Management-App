// Utilidades para generar fixtures y calcular tablas de posiciones

import type { Match, Standing, Team } from './types';

// Genera un ID único simple
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Mezcla aleatoriamente un array (algoritmo Fisher-Yates)
export const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Genera fixture round-robin (todos contra todos)
export const generateRoundRobinFixture = (
  teams: Team[],
  divisionId: string
): Match[] => {
  const matches: Match[] = [];
  const teamsCopy = [...teams];
  
  if (teamsCopy.length % 2 !== 0) {
    // Si es impar, agregar un "bye" (equipo fantasma)
    teamsCopy.push({ id: 'bye', name: 'BYE', divisionId } as Team);
  }

  const numRounds = teamsCopy.length - 1;
  const matchesPerRound = teamsCopy.length / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teamsCopy[match];
      const away = teamsCopy[teamsCopy.length - 1 - match];

      if (home.id !== 'bye' && away.id !== 'bye') {
        matches.push({
          id: generateId(),
          divisionId,
          matchday: round + 1,
          homeTeamId: home.id,
          awayTeamId: away.id,
          fixtureType: 'regular',
        });
      }
    }

    // Rotar equipos (mantener el primero fijo)
    teamsCopy.splice(1, 0, teamsCopy.pop()!);
  }

  return matches;
};

// Calcula la tabla de posiciones
export const calculateStandings = (
  teams: Team[],
  matches: Match[]
): Standing[] => {
  const standings: Record<string, Standing> = {};

  // Inicializar standings
  teams.forEach(team => {
    standings[team.id] = {
      teamId: team.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  });

  // Calcular estadísticas
  matches.forEach(match => {
    if (match.homeScore !== undefined && match.awayScore !== undefined) {
      const homeStanding = standings[match.homeTeamId];
      const awayStanding = standings[match.awayTeamId];

      if (homeStanding && awayStanding) {
        homeStanding.played++;
        awayStanding.played++;

        homeStanding.goalsFor += match.homeScore;
        homeStanding.goalsAgainst += match.awayScore;
        awayStanding.goalsFor += match.awayScore;
        awayStanding.goalsAgainst += match.homeScore;

        if (match.homeScore > match.awayScore) {
          homeStanding.won++;
          homeStanding.points += 3;
          awayStanding.lost++;
        } else if (match.homeScore < match.awayScore) {
          awayStanding.won++;
          awayStanding.points += 3;
          homeStanding.lost++;
        } else {
          homeStanding.drawn++;
          awayStanding.drawn++;
          homeStanding.points++;
          awayStanding.points++;
        }

        homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
        awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;
      }
    }
  });

  // Ordenar por puntos, diferencia de gol, goles a favor
  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
};

// Convierte una imagen a base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
