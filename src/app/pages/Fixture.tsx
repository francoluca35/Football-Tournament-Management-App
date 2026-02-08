import { useState, useEffect } from 'react';
import { Calendar, Shuffle, Plus, Edit2, Trash2, Save, Trophy, Download } from 'lucide-react';
import { getDivisions, getTeams, getMatches, saveMatches, getPlayers, getCompetitions } from '../storage';
import type { Match, Team, GoalEvent, CardEvent, SubstitutionEvent, AssistEvent, Competition } from '../types';
import { generateId, generateRoundRobinFixture, shuffle, calculateStandings } from '../utils';
import html2canvas from 'html2canvas';

export function Fixture() {
  const [divisions, setDivisions] = useState(getDivisions());
  const [competitions, setCompetitions] = useState<Competition[]>(getCompetitions());
  const [teams, setTeams] = useState(getTeams());
  const [players, setPlayers] = useState(getPlayers());
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'suspended'>('all');
  const [scoreForm, setScoreForm] = useState({
    homeScore: '',
    awayScore: '',
    penaltiesWinnerTeamId: '',
    penaltiesHomeScore: '',
    penaltiesAwayScore: '',
    goals: [] as GoalEvent[],
    assists: [] as AssistEvent[],
    cards: [] as CardEvent[],
    substitutions: [] as SubstitutionEvent[],
  });
  const [quickGoalForm, setQuickGoalForm] = useState({
    teamId: '',
    playerId: '',
    count: 1,
  });
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [editingFixtureMatch, setEditingFixtureMatch] = useState<Match | null>(null);
  const [matchForm, setMatchForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    matchday: 1,
    date: '',
  });
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardTeamId, setCardTeamId] = useState<string | null>(null);
  const [isGoalDetailOpen, setIsGoalDetailOpen] = useState(false);
  const [goalDetailPlayerId, setGoalDetailPlayerId] = useState<string | null>(null);
  const [scheduleConfig, setScheduleConfig] = useState({
    matchesPerDay: 3,
    days: {
      friday: true,
      saturday: true,
      sunday: true,
    },
  });
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  useEffect(() => {
    setDivisions(getDivisions());
    setCompetitions(getCompetitions());
    setTeams(getTeams());
    setPlayers(getPlayers());
    setMatches(getMatches());
    if (getDivisions().length > 0 && !selectedDivision) {
      setSelectedDivision(getDivisions()[0].id);
    }
  }, []);

  useEffect(() => {
    if (!selectedDivision) return;
    const divisionCompetitions = competitions.filter(c => c.divisionId === selectedDivision);
    if (divisionCompetitions.length > 0) {
      setSelectedCompetition(prev =>
        divisionCompetitions.some(c => c.id === prev) ? prev : divisionCompetitions[0].id
      );
    } else {
      setSelectedCompetition('');
    }
  }, [selectedDivision, competitions]);

  // (moved) knockout generation effect lives after derived competitionMatches

  const divisionTeams = teams.filter(t => t.divisionId === selectedDivision);
  const divisionCompetitions = competitions.filter(c => c.divisionId === selectedDivision);
  const selectedCompetitionData = competitions.find(c => c.id === selectedCompetition);
  const competitionMatches = matches.filter(m =>
    m.divisionId === selectedDivision &&
    (m.competitionId
      ? m.competitionId === selectedCompetition
      : divisionCompetitions.length <= 1)
  );
  const divisionMatches = competitionMatches;

  useEffect(() => {
    if (!selectedCompetitionData || selectedCompetitionData.tournamentType !== 'copa') {
      return;
    }
    if (!selectedCompetition) return;

    const groupMatches = competitionMatches.filter(match => match.fixtureType === 'regular' && match.zone);
    const knockoutMatches = competitionMatches.filter(match => match.fixtureType !== 'regular');
    const groupStageComplete = groupMatches.length > 0
      && groupMatches.every(match => match.homeScore !== undefined && match.awayScore !== undefined);

    const zoneMap = new Map<string, Set<string>>();
    groupMatches.forEach(match => {
      if (!match.zone) return;
      if (!zoneMap.has(match.zone)) {
        zoneMap.set(match.zone, new Set());
      }
      const set = zoneMap.get(match.zone);
      set?.add(match.homeTeamId);
      set?.add(match.awayTeamId);
    });

    const groupStandings = Array.from(zoneMap.entries()).map(([zone, teamIds]) => {
      const groupTeams = Array.from(teamIds)
        .map(id => teams.find(t => t.id === id))
        .filter(Boolean)
        .map(team => team as Team);
      const zoneMatches = groupMatches.filter(match => match.zone === zone);
      const standings = calculateStandings(groupTeams, zoneMatches, {
        pointsWin: selectedCompetitionData.pointsWin,
        pointsDraw: selectedCompetitionData.pointsDraw,
        pointsLoss: selectedCompetitionData.pointsLoss,
        tiebreakers: selectedCompetitionData.tiebreakers,
      });
      return { zone, standings };
    }).sort((a, b) => a.zone.localeCompare(b.zone));

    if (groupStageComplete && knockoutMatches.length === 0 && groupStandings.length > 0) {
      const pairs = buildKnockoutPairsFromGroups(groupStandings)
        .filter(pair => pair[0].teamId && pair[1].teamId)
        .map(pair => ({ homeTeamId: pair[0].teamId as string, awayTeamId: pair[1].teamId as string }));

      if (pairs.length > 0) {
        const fixtureType = getRoundLabel(pairs.length);
        const newMatches = createKnockoutMatches(pairs, fixtureType);
        const updated = [...matches, ...newMatches];
        saveMatches(updated);
        setMatches(updated);
        return;
      }
    }

    const roundsOrder: Match['fixtureType'][] = [
      'round-of-64',
      'round-of-32',
      'round-of-16',
      'quarter-final',
      'semi-final',
      'final',
    ];
    for (let i = 0; i < roundsOrder.length; i += 1) {
      const round = roundsOrder[i];
      const roundMatches = knockoutMatches.filter(match => match.fixtureType === round);
      if (roundMatches.length === 0) continue;

      const allPlayed = roundMatches.every(match => match.homeScore !== undefined && match.awayScore !== undefined);
      if (!allPlayed) break;

      if (round === 'final') {
        break;
      }

      const nextRound = roundsOrder[i + 1];
      const nextRoundExists = knockoutMatches.some(match => match.fixtureType === nextRound);
      if (nextRoundExists) continue;

      const winners = roundMatches
        .map(match => resolveMatchWinner(match))
        .filter((id): id is string => Boolean(id));

      if (winners.length === roundMatches.length) {
        const nextPairs: Array<{ homeTeamId: string; awayTeamId: string }> = [];
        for (let j = 0; j < winners.length; j += 2) {
          if (winners[j] && winners[j + 1]) {
            nextPairs.push({ homeTeamId: winners[j], awayTeamId: winners[j + 1] });
          }
        }
        if (nextPairs.length > 0) {
          const newMatches = createKnockoutMatches(nextPairs, nextRound);
          const updated = [...matches, ...newMatches];
          saveMatches(updated);
          setMatches(updated);
        }
      }
      break;
    }
  }, [selectedCompetition, selectedCompetitionData, matches, teams, competitionMatches]);
  
  const groupMatches = divisionMatches.filter(match => match.fixtureType === 'regular' && match.zone);
  const groupStageComplete = groupMatches.length > 0
    && groupMatches.every(match => match.homeScore !== undefined && match.awayScore !== undefined);

  const matchdays = (() => {
    const unique = [...new Set(divisionMatches.map(m => m.matchday))];
    const sorted = unique.sort((a, b) => a - b);

    if (!selectedCompetitionData || selectedCompetitionData.tournamentType !== 'copa') {
      return sorted;
    }

    if (!groupStageComplete) {
      return sorted;
    }

    const roundRank: Record<Match['fixtureType'], number> = {
      'round-of-64': 1,
      'round-of-32': 2,
      'round-of-16': 3,
      'quarter-final': 4,
      'semi-final': 5,
      'final': 6,
      'regular': 0,
    };

    const getMatchdayInfo = (matchday: number) => {
      const matchesInDay = divisionMatches.filter(match => match.matchday === matchday);
      const allNonRegular = matchesInDay.length > 0 && matchesInDay.every(match => match.fixtureType !== 'regular');
      const sameType = allNonRegular && matchesInDay.every(match => match.fixtureType === matchesInDay[0].fixtureType);
      const roundType = sameType ? matchesInDay[0].fixtureType : 'regular';
      const isCompleted = matchesInDay.every(match => match.homeScore !== undefined && match.awayScore !== undefined);
      return {
        matchday,
        isKnockout: allNonRegular && sameType,
        isCompleted,
        rank: roundRank[roundType],
      };
    };

    const info = sorted.map(getMatchdayInfo);
    return info
      .sort((a, b) => {
        const bucket = (item: typeof a) => {
          if (item.isKnockout && !item.isCompleted) return 0; // próximos
          if (item.isKnockout && item.isCompleted) return 1; // jugados
          return 2; // grupos
        };
        const bucketDiff = bucket(a) - bucket(b);
        if (bucketDiff !== 0) return bucketDiff;

        if (bucket(a) === 2) {
          return a.matchday - b.matchday;
        }

        const rankDiff = b.rank - a.rank;
        if (rankDiff !== 0) return rankDiff;
        return a.matchday - b.matchday;
      })
      .map(item => item.matchday);
  })();

  const getMatchStatus = (match: Match) => {
    if (match.status === 'suspended') return 'suspended';
    if (match.homeScore !== undefined && match.awayScore !== undefined) return 'completed';
    return 'pending';
  };

  const getRoundTitle = (fixtureType: Match['fixtureType']) => {
    switch (fixtureType) {
      case 'round-of-64':
        return '32vo de final';
      case 'round-of-32':
        return '16vo de final';
      case 'round-of-16':
        return '8vo de final';
      case 'quarter-final':
        return '4to final';
      case 'semi-final':
        return 'Semifinal';
      case 'final':
        return 'Final';
      default:
        return 'Fecha';
    }
  };

  const getMatchdayTitle = (matchesInMatchday: Match[], matchday: number) => {
    if (matchesInMatchday.length === 0) return `Fecha ${matchday}`;
    const nonRegular = matchesInMatchday.filter(match => match.fixtureType !== 'regular');
    if (nonRegular.length === matchesInMatchday.length) {
      const roundType = nonRegular[0].fixtureType;
      const sameRound = nonRegular.every(match => match.fixtureType === roundType);
      if (sameRound) {
        return getRoundTitle(roundType);
      }
    }
    return `Fecha ${matchday}`;
  };

  const formatDateLabel = (value?: string) => {
    if (!value) return 'Sin fecha';
    return value;
  };

  const getAllowedWeekdays = () => {
    const weekdays: number[] = [];
    if (scheduleConfig.days.friday) weekdays.push(5);
    if (scheduleConfig.days.saturday) weekdays.push(6);
    if (scheduleConfig.days.sunday) weekdays.push(0);
    return weekdays;
  };

  const getGroupLabel = (index: number) => {
    if (index >= 0 && index < 26) {
      return `Grupo ${String.fromCharCode(65 + index)}`;
    }
    return `Grupo ${index + 1}`;
  };

  const splitIntoZones = (teamsToSplit: Team[], count: number) => {
    const zones: Team[][] = Array.from({ length: count }, () => []);
    teamsToSplit.forEach((team, index) => {
      zones[index % count].push(team);
    });
    return zones;
  };

  const resolveMatchWinner = (match: Match) => {
    if (match.homeScore === undefined || match.awayScore === undefined) return null;
    if (match.homeScore === match.awayScore) {
      return match.penaltiesWinnerTeamId ?? null;
    }
    return match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
  };

  const getPreferredFinalMatch = (matchesList: Match[]) => {
    const finals = matchesList.filter(match => match.fixtureType === 'final');
    if (finals.length === 0) return null;
    return [...finals].sort((a, b) => {
      const aHasPen = a.penaltiesWinnerTeamId ? 1 : 0;
      const bHasPen = b.penaltiesWinnerTeamId ? 1 : 0;
      if (aHasPen !== bHasPen) return bHasPen - aHasPen;
      const aDecided = a.homeScore !== undefined && a.awayScore !== undefined && a.homeScore !== a.awayScore ? 1 : 0;
      const bDecided = b.homeScore !== undefined && b.awayScore !== undefined && b.homeScore !== b.awayScore ? 1 : 0;
      if (aDecided !== bDecided) return bDecided - aDecided;
      const aSecondLeg = a.isFirstLeg === false ? 1 : 0;
      const bSecondLeg = b.isFirstLeg === false ? 1 : 0;
      if (aSecondLeg !== bSecondLeg) return bSecondLeg - aSecondLeg;
      return (b.matchday ?? 0) - (a.matchday ?? 0);
    })[0];
  };

  const finalWinner = (() => {
    if (!selectedCompetitionData || selectedCompetitionData.tournamentType !== 'copa') return null;
    const finalMatch = getPreferredFinalMatch(competitionMatches);
    if (!finalMatch || finalMatch.homeScore === undefined || finalMatch.awayScore === undefined) return null;
    if (finalMatch.homeScore === finalMatch.awayScore) {
      if (!finalMatch.penaltiesWinnerTeamId) return null;
      const winnerName = teams.find(t => t.id === finalMatch.penaltiesWinnerTeamId)?.name ?? 'Campeón';
      return { teamId: finalMatch.penaltiesWinnerTeamId, teamName: winnerName };
    }
    const winnerId = finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeTeamId : finalMatch.awayTeamId;
    const winnerName = teams.find(t => t.id === winnerId)?.name ?? 'Campeón';
    return { teamId: winnerId, teamName: winnerName };
  })();

  const buildKnockoutPairsFromGroups = (groupStandings: Array<{ zone: string; standings: ReturnType<typeof calculateStandings> }>) => {
    const qualifiers = groupStandings.flatMap(group => {
      const first = group.standings[0];
      const second = group.standings[1];
      return [
        first ? { label: `1ro ${group.zone}`, teamId: first.teamId } : { label: `1ro ${group.zone}`, teamId: null },
        second ? { label: `2do ${group.zone}`, teamId: second.teamId } : { label: `2do ${group.zone}`, teamId: null },
      ];
    });

    const ordered = qualifiers.slice().sort((a, b) => a.label.localeCompare(b.label));
    const pairs: Array<[typeof qualifiers[number], typeof qualifiers[number]]> = [];
    for (let i = 0; i < ordered.length; i += 4) {
      const one = ordered[i];
      const two = ordered[i + 1];
      const three = ordered[i + 2];
      const four = ordered[i + 3];
      if (one && four) pairs.push([one, four]);
      if (two && three) pairs.push([two, three]);
    }
    return pairs;
  };

  const getRoundLabel = (matchCount: number) => {
    if (matchCount >= 32) return 'round-of-64' as const;
    if (matchCount === 16) return 'round-of-32' as const;
    if (matchCount === 8) return 'round-of-16' as const;
    if (matchCount === 4) return 'quarter-final' as const;
    if (matchCount === 2) return 'semi-final' as const;
    return 'final' as const;
  };

  const createKnockoutMatches = (pairs: Array<{ homeTeamId: string; awayTeamId: string }>, fixtureType: Match['fixtureType']) => {
    const nextMatchday = competitionMatches.reduce((max, match) => Math.max(max, match.matchday), 0) + 1;
    return pairs.map(pair => ({
      id: generateId(),
      divisionId: selectedDivision,
      competitionId: selectedCompetition || undefined,
      matchday: nextMatchday,
      homeTeamId: pair.homeTeamId,
      awayTeamId: pair.awayTeamId,
      fixtureType,
    }));
  };

  const getDatesBetween = (start: string, end: string, allowedDays: number[]) => {
    const dates: string[] = [];
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return dates;
    if (startDate > endDate) return dates;

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      if (allowedDays.includes(cursor.getDay())) {
        dates.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  };

  const buildDatedMatches = (matchesToUpdate: Match[]) => {
    const startDate = selectedCompetitionData?.startDate;
    const endDate = selectedCompetitionData?.endDate;
    const allowedDays = getAllowedWeekdays();

    if (!startDate || !endDate) return matchesToUpdate;
    if (allowedDays.length === 0) return matchesToUpdate;
    if (scheduleConfig.matchesPerDay < 1) return matchesToUpdate;

    const dates = getDatesBetween(startDate, endDate, allowedDays);
    if (dates.length === 0) return matchesToUpdate;

    const sortedMatches = [...matchesToUpdate].sort((a, b) => a.matchday - b.matchday);
    return sortedMatches.map((match, index) => {
      const dateIndex = Math.floor(index / scheduleConfig.matchesPerDay);
      const date = dates[dateIndex];
      return {
        ...match,
        date,
      };
    });
  };

  const assignDatesToMatches = (matchesToUpdate: Match[]) => {
    const startDate = selectedCompetitionData?.startDate;
    const endDate = selectedCompetitionData?.endDate;
    const allowedDays = getAllowedWeekdays();

    if (!startDate || !endDate) {
      alert('Definí fecha de inicio y fin en la división para asignar fechas.');
      return;
    }
    if (allowedDays.length === 0) {
      alert('Seleccioná al menos un día para jugar.');
      return;
    }
    if (scheduleConfig.matchesPerDay < 1) {
      alert('La cantidad de partidos por día debe ser mayor a 0.');
      return;
    }

    const dates = getDatesBetween(startDate, endDate, allowedDays);
    if (dates.length === 0) {
      alert('No hay fechas disponibles con los días seleccionados.');
      return;
    }

    const updatedMatches = buildDatedMatches(matchesToUpdate);

    const otherMatches = matches.filter(m => m.divisionId !== selectedDivision);
    const allMatches = [...otherMatches, ...updatedMatches];
    saveMatches(allMatches);
    setMatches(allMatches);
  };

  const generateRandomFixture = () => {
    if (!selectedCompetitionData) {
      alert('Seleccioná un torneo para generar el fixture');
      return;
    }
    if (divisionTeams.length < 2) {
      alert('Necesitas al menos 2 equipos para generar un fixture');
      return;
    }

    if (divisionMatches.length > 0) {
      if (!confirm('Ya existe un fixture para esta división. ¿Deseas reemplazarlo?')) {
        return;
      }
    }

    const shuffledTeams = shuffle(divisionTeams);
    const useZones = Boolean(
      selectedCompetitionData?.tournamentType === 'copa'
        || (selectedCompetitionData?.zonesEnabled && (selectedCompetitionData.zonesCount ?? 0) > 1)
    );
    const zoneCount = selectedCompetitionData?.tournamentType === 'copa'
      ? Math.max(2, selectedCompetitionData.groupCount ?? selectedCompetitionData.zonesCount ?? 2)
      : Math.max(2, selectedCompetitionData?.zonesCount ?? 2);
    const doubleRoundRobin = Boolean(
      selectedCompetitionData?.tournamentType === 'torneo' && selectedCompetitionData.roundRobinHomeAway
    );

    const zoneMatches = useZones
      ? splitIntoZones(shuffledTeams, zoneCount).flatMap((zoneTeams, index) =>
          generateRoundRobinFixture(zoneTeams, selectedDivision, {
            doubleRoundRobin,
            zone: selectedCompetitionData?.tournamentType === 'copa'
              ? getGroupLabel(index)
              : `Zona ${index + 1}`,
            competitionId: selectedCompetition,
          })
        )
      : generateRoundRobinFixture(shuffledTeams, selectedDivision, {
          doubleRoundRobin,
          competitionId: selectedCompetition,
        });

    const newMatches = buildDatedMatches(zoneMatches);
    
    const otherMatches = matches.filter(m =>
      m.divisionId !== selectedDivision ||
      (selectedCompetition
        ? m.competitionId !== selectedCompetition
        : m.competitionId !== undefined)
    );
    const allMatches = [...otherMatches, ...newMatches];
    
    saveMatches(allMatches);
    setMatches(allMatches);
  };

  const openMatchModal = (match?: Match) => {
    if (match) {
      setEditingFixtureMatch(match);
      setMatchForm({
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        matchday: match.matchday,
        date: match.date || '',
      });
    } else {
      setEditingFixtureMatch(null);
      setMatchForm({
        homeTeamId: divisionTeams[0]?.id || '',
        awayTeamId: divisionTeams[1]?.id || '',
        matchday: matchdays.length > 0 ? matchdays[matchdays.length - 1] + 1 : 1,
        date: selectedCompetitionData?.startDate ?? '',
      });
    }
    setIsMatchModalOpen(true);
  };

  const closeMatchModal = () => {
    setIsMatchModalOpen(false);
    setEditingFixtureMatch(null);
  };

  const saveManualMatch = () => {
    if (!matchForm.homeTeamId || !matchForm.awayTeamId) {
      alert('Seleccioná los dos equipos.');
      return;
    }
    if (matchForm.homeTeamId === matchForm.awayTeamId) {
      alert('Los equipos deben ser distintos.');
      return;
    }
    if (!selectedDivision) {
      alert('Seleccioná una división.');
      return;
    }
    if (!selectedCompetition) {
      alert('Seleccioná un torneo.');
      return;
    }

    const newMatch: Match = {
      id: editingFixtureMatch?.id ?? generateId(),
      divisionId: selectedDivision,
      competitionId: selectedCompetition || undefined,
      matchday: Number(matchForm.matchday) || 1,
      date: matchForm.date || undefined,
      homeTeamId: matchForm.homeTeamId,
      awayTeamId: matchForm.awayTeamId,
      fixtureType: 'regular',
      zone: editingFixtureMatch?.zone,
      isFirstLeg: editingFixtureMatch?.isFirstLeg,
    };

    const updatedMatches = editingFixtureMatch
      ? matches.map(m => (m.id === editingFixtureMatch.id ? { ...m, ...newMatch } : m))
      : [...matches, newMatch];

    saveMatches(updatedMatches);
    setMatches(updatedMatches);
    closeMatchModal();
  };

  const deleteFixture = () => {
    if (!confirm('¿Estás seguro de eliminar todo el fixture de este torneo?')) {
      return;
    }

    const otherMatches = matches.filter(m =>
      m.divisionId !== selectedDivision ||
      (selectedCompetition
        ? m.competitionId !== selectedCompetition
        : m.competitionId !== undefined)
    );
    saveMatches(otherMatches);
    setMatches(otherMatches);
  };

  const saveScore = () => {
    if (!editingMatch) return;

    const homeScore = parseInt(scoreForm.homeScore);
    const awayScore = parseInt(scoreForm.awayScore);

    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
      alert('Los goles deben ser números válidos');
      return;
    }

    const isKnockout = editingMatch.fixtureType !== 'regular';
    const isSecondLeg = !editingMatch.isFirstLeg;
    const isPenaltyRequired = isKnockout && isSecondLeg && homeScore === awayScore;

    let penaltiesWinnerTeamId: string | undefined;
    let penaltiesHomeScore: number | undefined;
    let penaltiesAwayScore: number | undefined;

    if (isPenaltyRequired) {
      const homePen = Number(scoreForm.penaltiesHomeScore);
      const awayPen = Number(scoreForm.penaltiesAwayScore);
      const winnerId = scoreForm.penaltiesWinnerTeamId;

      if (!winnerId || (winnerId !== editingMatch.homeTeamId && winnerId !== editingMatch.awayTeamId)) {
        alert('Seleccioná quién ganó en penales.');
        return;
      }
      if (!Number.isFinite(homePen) || !Number.isFinite(awayPen) || homePen < 0 || awayPen < 0 || homePen > 5 || awayPen > 5) {
        alert('Los penales deben estar entre 0 y 5.');
        return;
      }
      if (homePen === awayPen) {
        alert('Los penales no pueden terminar empatados.');
        return;
      }
      if ((winnerId === editingMatch.homeTeamId && homePen <= awayPen) || (winnerId === editingMatch.awayTeamId && awayPen <= homePen)) {
        alert('El ganador debe tener más penales convertidos.');
        return;
      }

      penaltiesWinnerTeamId = winnerId;
      penaltiesHomeScore = homePen;
      penaltiesAwayScore = awayPen;
    }

    const updatedMatches = matches.map(m =>
      m.id === editingMatch.id
        ? {
            ...m,
            homeScore,
            awayScore,
            penaltiesWinnerTeamId,
            penaltiesHomeScore,
            penaltiesAwayScore,
            goals: scoreForm.goals,
            assists: scoreForm.assists,
            cards: scoreForm.cards,
            substitutions: scoreForm.substitutions,
            status: 'completed' as const,
          }
        : m
    );

    saveMatches(updatedMatches);
    setMatches(updatedMatches);
    setEditingMatch(null);
    setScoreForm({
      homeScore: '',
      awayScore: '',
      penaltiesWinnerTeamId: '',
      penaltiesHomeScore: '',
      penaltiesAwayScore: '',
      goals: [],
      assists: [],
      cards: [],
      substitutions: [],
    });
  };

  const openScoreModal = (match: Match) => {
    setEditingMatch(match);
    setScoreForm({
      homeScore: match.homeScore?.toString() || '',
      awayScore: match.awayScore?.toString() || '',
      penaltiesWinnerTeamId: match.penaltiesWinnerTeamId ?? '',
      penaltiesHomeScore: match.penaltiesHomeScore?.toString() ?? '',
      penaltiesAwayScore: match.penaltiesAwayScore?.toString() ?? '',
      goals: match.goals ?? [],
      assists: match.assists ?? [],
      cards: match.cards ?? [],
      substitutions: match.substitutions ?? [],
    });
    const defaultTeamId = match.homeTeamId;
    const firstPlayer = getTeamPlayers(defaultTeamId)[0]?.id || '';
    setQuickGoalForm({
      teamId: defaultTeamId,
      playerId: firstPlayer,
      count: 1,
    });
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Equipo';
  };

  const getTeamPlayers = (teamId: string) => {
    return players.filter(p => p.teamId === teamId);
  };

  const getPlayerLabel = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return 'Jugador';
    const fullName = `${player.firstName} ${player.lastName}`.trim();
    return `${fullName} #${player.number}`;
  };

  const getTeamLogo = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.logoUrl;
  };

  const getScoreLabel = (match: Match, side: 'home' | 'away') => {
    const score = side === 'home' ? match.homeScore : match.awayScore;
    if (score === undefined) return '-';
    const penScore = side === 'home' ? match.penaltiesHomeScore : match.penaltiesAwayScore;
    const penWinnerId = match.penaltiesWinnerTeamId;
    const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId;
    if (penWinnerId && penScore !== undefined) {
      const winnerTag = penWinnerId === teamId ? ' G' : '';
      return `${score} (${penScore}${winnerTag})`;
    }
    return `${score}`;
  };

  const groupedGoalsByPlayer = () => {
    return scoreForm.goals.reduce<Record<string, { playerId: string; teamId: string; count: number; goalIds: string[] }>>((acc, goal) => {
      if (!acc[goal.playerId]) {
        acc[goal.playerId] = { playerId: goal.playerId, teamId: goal.teamId, count: 0, goalIds: [] };
      }
      acc[goal.playerId].count += 1;
      acc[goal.playerId].goalIds.push(goal.id);
      return acc;
    }, {});
  };

  const filteredMatches = divisionMatches.filter(match => {
    const homeName = getTeamName(match.homeTeamId).toLowerCase();
    const awayName = getTeamName(match.awayTeamId).toLowerCase();
    const dateValue = match.date ?? '';
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term
      || homeName.includes(term)
      || awayName.includes(term)
      || dateValue.includes(term);

    const status = getMatchStatus(match);
    const matchesStatus = statusFilter === 'all' || statusFilter === status;
    return matchesSearch && matchesStatus;
  });

  const groupedTeamsByZone = (() => {
    if (!selectedCompetitionData || selectedCompetitionData.tournamentType !== 'copa') {
      return [];
    }

    const map = new Map<string, Set<string>>();
    divisionMatches.forEach(match => {
      if (!match.zone) return;
      if (!map.has(match.zone)) {
        map.set(match.zone, new Set());
      }
      const set = map.get(match.zone);
      set?.add(match.homeTeamId);
      set?.add(match.awayTeamId);
    });

    if (map.size === 0 && divisionTeams.length > 0) {
      const count = Math.max(
        2,
        selectedCompetitionData.groupCount ?? selectedCompetitionData.zonesCount ?? 2
      );
      const sortedTeams = [...divisionTeams].sort((a, b) => a.name.localeCompare(b.name));
      return splitIntoZones(sortedTeams, count).map((zoneTeams, index) => ({
        zone: getGroupLabel(index),
        teams: zoneTeams,
      }));
    }

    const entries = Array.from(map.entries()).map(([zone, teamIds]) => {
      const teamsInZone = Array.from(teamIds)
        .map(id => teams.find(t => t.id === id))
        .filter(Boolean)
        .map(team => team as Team)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { zone, teams: teamsInZone };
    });

    return entries.sort((a, b) => a.zone.localeCompare(b.zone));
  })();

  const getGroupId = (zone: string) => zone.replace(/\s+/g, '-').toLowerCase();

  const getGroupStandings = (zone: string, teamIds: string[]) => {
    const groupTeams = teamIds
      .map(id => teams.find(t => t.id === id))
      .filter(Boolean)
      .map(team => team as Team);
    const groupMatches = divisionMatches.filter(match => match.zone === zone);
    return calculateStandings(groupTeams, groupMatches, {
      pointsWin: selectedCompetitionData?.pointsWin,
      pointsDraw: selectedCompetitionData?.pointsDraw,
      pointsLoss: selectedCompetitionData?.pointsLoss,
      tiebreakers: selectedCompetitionData?.tiebreakers,
    });
  };

  const downloadGroupTable = async (zone: string) => {
    const targetId = `group-table-${getGroupId(zone)}`;
    const element = document.getElementById(targetId);
    if (!element) return;

    try {
      const source = element.cloneNode(true) as HTMLElement;
      source.style.backgroundImage =
        "linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('/Assets/fondo-torneo.png')";
      source.style.backgroundSize = 'contain';
      source.style.backgroundPosition = 'center';
      source.style.backgroundRepeat = 'no-repeat';
      source.style.position = 'absolute';
      source.style.left = '-10000px';
      source.style.top = '0';
      document.body.appendChild(source);

      const { scrollWidth, scrollHeight } = source;
      source.style.width = `${scrollWidth}px`;
      source.style.height = `${scrollHeight}px`;
      const canvas = await html2canvas(source, {
        backgroundColor: '#0f1115',
        scale: 2,
        logging: false,
        width: scrollWidth,
        height: scrollHeight,
        windowWidth: scrollWidth,
        windowHeight: scrollHeight,
      });
      document.body.removeChild(source);
      const link = document.createElement('a');
      const divisionName = divisions.find(d => d.id === selectedDivision)?.name || 'division';
      const competitionName = selectedCompetitionData?.name || 'copa';
      const fileName = `${divisionName}-${competitionName}-${zone}`.toLowerCase().replace(/\s+/g, '-');
      link.download = `tabla-${fileName}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (error) {
      console.error('Error al generar la imagen:', error);
      alert('Error al descargar la imagen');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Fixture</h2>
          <p className="text-muted-foreground">Genera y gestiona los partidos del torneo</p>
        </div>
      </div>

      {divisions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
          <Calendar className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No hay divisiones</h3>
          <p className="text-muted-foreground">Primero debes crear divisiones y equipos</p>
        </div>
      ) : (
        <>
          {/* Selector de división y acciones */}
          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start md:items-center">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  División
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="w-full md:max-w-xs px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {divisions.map(division => (
                    <option key={division.id} value={division.id}>
                      {division.name} ({teams.filter(t => t.divisionId === division.id).length} equipos)
                    </option>
                  ))}
                </select>
                <label className="block text-sm font-medium text-muted-foreground mt-4 mb-2">
                  Torneo
                </label>
                <select
                  value={selectedCompetition}
                  onChange={(e) => setSelectedCompetition(e.target.value)}
                  className="w-full md:max-w-xs px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {divisionCompetitions.length === 0 && (
                    <option value="">Sin torneos</option>
                  )}
                  {divisionCompetitions.map(competition => (
                    <option key={competition.id} value={competition.id}>
                      {competition.name} · {competition.tournamentType === 'torneo' ? 'Liga' : 'Copa'}
                    </option>
                  ))}
                </select>
                {selectedCompetitionData && (
                  <div className="mt-2 inline-flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span
                      className={`inline-block rounded-full px-2 py-1 font-medium ${
                        selectedCompetitionData.tournamentType === 'torneo'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {selectedCompetitionData.tournamentType === 'torneo' ? 'Liga' : 'Copa'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto md:justify-end">
                <button
                  onClick={generateRandomFixture}
                  disabled={divisionTeams.length < 2 || !selectedCompetitionData}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  <Shuffle className="w-5 h-5" />
                  Generar Aleatorio
                </button>
                <button
                  onClick={() => openMatchModal()}
                  disabled={divisionTeams.length < 2 || !selectedCompetitionData}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                  Crear Partido
                </button>
                {divisionMatches.length > 0 && (
                  <button
                    onClick={() => assignDatesToMatches(divisionMatches)}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-foreground hover:bg-accent transition-colors"
                  >
                    <Calendar className="w-5 h-5" />
                    Asignar Fechas
                  </button>
                )}
                {divisionMatches.length > 0 && (
                  <button
                    onClick={deleteFixture}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Eliminar Fixture
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Buscar equipo o fecha
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ej: River, Boca, 2026-02-21"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Estado del partido
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">Todos</option>
                  <option value="completed">Terminados</option>
                  <option value="pending">Pendientes</option>
                  <option value="suspended">Suspendidos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuración de fechas */}
          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Partidos por día
                </label>
                <input
                  type="number"
                  min="1"
                  value={scheduleConfig.matchesPerDay}
                  onChange={(e) => setScheduleConfig({
                    ...scheduleConfig,
                    matchesPerDay: Number(e.target.value),
                  })}
                  className="w-full md:w-48 px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Días de juego
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'friday', label: 'Viernes' },
                    { key: 'saturday', label: 'Sábado' },
                    { key: 'sunday', label: 'Domingo' },
                  ].map(day => (
                    <label key={day.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.days[day.key as keyof typeof scheduleConfig.days]}
                        onChange={(e) => setScheduleConfig({
                          ...scheduleConfig,
                          days: {
                            ...scheduleConfig.days,
                            [day.key]: e.target.checked,
                          },
                        })}
                        className="w-4 h-4 rounded border-border bg-input-background text-primary focus:ring-primary/40"
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Se usan las fechas de inicio/fin definidas en la división.
                </p>
              </div>
            </div>
          </div>

          {selectedCompetitionData?.tournamentType === 'copa' && groupedTeamsByZone.length > 0 && (
            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Grupos</h3>
                  <p className="text-sm text-muted-foreground">
                    Distribución de equipos por grupo
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedTeamsByZone.map(group => (
                  <div
                    key={group.zone}
                    className="rounded-xl border border-border/60 bg-card/60 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-foreground">
                        {group.zone}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedGroupId(prev => (prev === group.zone ? null : group.zone))}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {expandedGroupId === group.zone ? 'Ocultar tabla' : 'Ver tabla'}
                        </button>
                        <button
                          onClick={() => downloadGroupTable(group.zone)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {group.teams.map(team => (
                        <div key={team.id} className="flex items-center gap-2">
                          {team.logoUrl ? (
                            <img
                              src={team.logoUrl}
                              alt=""
                              className="w-6 h-6 object-contain"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-accent/60" />
                          )}
                          <span className="font-medium text-foreground">{team.name}</span>
                        </div>
                      ))}
                    </div>
                    {expandedGroupId === group.zone && (
                      <div className="mt-4 border-t border-border/60 pt-4">
                        <div id={`group-table-${getGroupId(group.zone)}`} className="space-y-3">
                          <div className="text-xs text-muted-foreground">
                            Posiciones {group.zone}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-accent/40">
                                <tr>
                                  <th className="text-left px-2 py-2">Pos</th>
                                  <th className="text-left px-2 py-2">Equipo</th>
                                  <th className="text-center px-2 py-2">PJ</th>
                                  <th className="text-center px-2 py-2">PG</th>
                                  <th className="text-center px-2 py-2">PE</th>
                                  <th className="text-center px-2 py-2">PP</th>
                                  <th className="text-center px-2 py-2">GF</th>
                                  <th className="text-center px-2 py-2">GC</th>
                                  <th className="text-center px-2 py-2">DIF</th>
                                  <th className="text-center px-2 py-2">PTS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {getGroupStandings(group.zone, group.teams.map(team => team.id)).map((standing, index) => {
                                  const team = teams.find(t => t.id === standing.teamId);
                                  return (
                                    <tr key={standing.teamId}>
                                      <td className="px-2 py-2">{index + 1}</td>
                                      <td className="px-2 py-2">{team?.name ?? 'Equipo'}</td>
                                      <td className="px-2 py-2 text-center">{standing.played}</td>
                                      <td className="px-2 py-2 text-center">{standing.won}</td>
                                      <td className="px-2 py-2 text-center">{standing.drawn}</td>
                                      <td className="px-2 py-2 text-center">{standing.lost}</td>
                                      <td className="px-2 py-2 text-center">{standing.goalsFor}</td>
                                      <td className="px-2 py-2 text-center">{standing.goalsAgainst}</td>
                                      <td className="px-2 py-2 text-center">{standing.goalDifference}</td>
                                      <td className="px-2 py-2 text-center font-semibold text-primary">
                                        {standing.points}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {finalWinner && (
            <div className="rounded-xl border border-border bg-card/80 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Campeón</p>
                  <h3 className="text-2xl font-semibold text-foreground">{finalWinner.teamName}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Fixture por fechas */}
          {filteredMatches.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
              <Calendar className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay fixture generado</h3>
              <p className="text-muted-foreground mb-6">
                {divisionTeams.length < 2
                  ? 'Necesitas al menos 2 equipos para generar un fixture'
                  : 'Genera el fixture automáticamente o crea partidos manualmente'}
              </p>
              {divisionTeams.length >= 2 && (
                <button
                  onClick={generateRandomFixture}
                  className="rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Generar Fixture Aleatorio
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {matchdays.map(matchday => {
                const matchdayMatches = filteredMatches.filter(m => m.matchday === matchday);
                const playedMatches = matchdayMatches.filter(m => m.homeScore !== undefined).length;

                if (matchdayMatches.length === 0) return null;

                return (
                  <div key={matchday} className="rounded-xl border border-border bg-card/80 overflow-hidden shadow-sm">
                    <div className="bg-accent/60 px-6 py-4 border-b border-border flex items-center justify-between">
                      <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {getMatchdayTitle(matchdayMatches, matchday)}
                      </h3>
                        <p className="text-sm text-muted-foreground">
                          {playedMatches} de {matchdayMatches.length} partidos jugados
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-border/60">
                      {matchdayMatches.map(match => {
                        const homeTeam = teams.find(t => t.id === match.homeTeamId);
                        const awayTeam = teams.find(t => t.id === match.awayTeamId);
                        const matchStatus = getMatchStatus(match);
                        const hasResult = matchStatus === 'completed';

                        return (
                          <div
                            key={match.id}
                            className={`p-4 hover:bg-accent/40 transition-colors ${
                              hasResult ? 'bg-emerald-500/10' : ''
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="hidden md:flex md:items-center md:justify-start md:w-44 gap-2">
                                {match.zone && (
                                  <span className="text-xs font-semibold uppercase bg-accent/60 text-muted-foreground px-2 py-1 rounded-full">
                                    {match.zone}
                                  </span>
                                )}
                                <span className="text-xs font-semibold uppercase bg-accent/60 text-muted-foreground px-2 py-1 rounded-full">
                                  {formatDateLabel(match.date)}
                                </span>
                              </div>
                              {/* Equipo Local */}
                              <div className="flex items-center gap-3 flex-1 justify-center md:justify-end">
                                <span className="font-medium text-foreground text-right">
                                  {getTeamName(match.homeTeamId)}
                                </span>
                                {homeTeam?.logoUrl && (
                                  <img
                                    src={homeTeam.logoUrl}
                                    alt=""
                                    className="w-8 h-8 object-contain"
                                  />
                                )}
                              </div>

                              {/* Resultado */}
                              <div className="flex w-full flex-col items-center gap-2 md:w-auto md:flex-row md:items-center md:justify-center md:gap-3">
                                {matchStatus === 'suspended' ? (
                                  <span className="text-xs font-semibold uppercase bg-destructive/20 text-destructive px-3 py-2 rounded-lg">
                                    Suspendido
                                  </span>
                                ) : hasResult ? (
                                  <div className="flex items-center justify-center gap-2 md:gap-3">
                                    {match.zone && (
                                      <span className="md:hidden text-xs font-semibold uppercase bg-accent/60 text-muted-foreground px-2 py-1 rounded-full">
                                        {match.zone}
                                      </span>
                                    )}
                                    <div
                                      onClick={() => openScoreModal(match)}
                                      className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg cursor-pointer hover:border-primary/60"
                                    >
                                      <span className="text-2xl font-semibold text-foreground">
                                        {getScoreLabel(match, 'home')}
                                      </span>
                                      <span className="text-muted-foreground">-</span>
                                      <span className="text-2xl font-semibold text-foreground">
                                        {getScoreLabel(match, 'away')}
                                      </span>
                                    </div>
                                    <span className="md:hidden text-xs font-semibold uppercase bg-accent/60 text-muted-foreground px-2 py-1 rounded-full">
                                      {formatDateLabel(match.date)}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2 md:gap-3">
                                    {match.zone && (
                                      <span className="md:hidden text-xs font-semibold uppercase bg-accent/60 text-muted-foreground px-2 py-1 rounded-full">
                                        {match.zone}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => openScoreModal(match)}
                                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                                    >
                                      <Plus className="w-4 h-4" />
                                      Cargar
                                    </button>
                                    <span className="md:hidden text-xs font-semibold uppercase bg-accent/60 text-muted-foreground px-2 py-1 rounded-full">
                                      {formatDateLabel(match.date)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Equipo Visitante */}
                              <div className="flex items-center gap-3 flex-1 justify-center md:justify-start">
                                {awayTeam?.logoUrl && (
                                  <img
                                    src={awayTeam.logoUrl}
                                    alt=""
                                    className="w-8 h-8 object-contain"
                                  />
                                )}
                                <span className="font-medium text-foreground">
                                  {getTeamName(match.awayTeamId)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-end gap-3">
                              <button
                                onClick={() => {
                                  const nextStatus: Match['status'] = match.status === 'suspended' ? 'pending' : 'suspended';
                                  const updatedMatches = matches.map(m =>
                                    m.id === match.id ? { ...m, status: nextStatus } : m
                                  );
                                  saveMatches(updatedMatches);
                                  setMatches(updatedMatches);
                                }}
                                className="flex items-center gap-2 text-xs text-amber-300 hover:text-amber-200"
                              >
                                {match.status === 'suspended' ? 'Quitar suspensión' : 'Suspender partido'}
                              </button>
                              <button
                                onClick={() => openMatchModal(match)}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-3 h-3" />
                                Editar partido
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal de Resultado */}
      {editingMatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <h3 className="text-xl font-semibold text-foreground px-6 pt-6">Cargar Resultado</h3>

            <div className="space-y-4 overflow-y-auto px-6 pb-6 mt-4">
              {/* Equipo Local */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {getTeamName(editingMatch.homeTeamId)}
                </label>
                <input
                  type="number"
                  min="0"
                  value={scoreForm.homeScore}
                  onChange={(e) => setScoreForm({ ...scoreForm, homeScore: e.target.value })}
                  placeholder="Goles"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-center text-2xl font-semibold"
                />
              </div>

              {/* Equipo Visitante */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {getTeamName(editingMatch.awayTeamId)}
                </label>
                <input
                  type="number"
                  min="0"
                  value={scoreForm.awayScore}
                  onChange={(e) => setScoreForm({ ...scoreForm, awayScore: e.target.value })}
                  placeholder="Goles"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-center text-2xl font-semibold"
                />
              </div>

              {editingMatch.fixtureType !== 'regular'
                && !editingMatch.isFirstLeg
                && Number(scoreForm.homeScore) === Number(scoreForm.awayScore)
                && scoreForm.homeScore !== ''
                && scoreForm.awayScore !== '' && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Penales</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Ganador
                        </label>
                        <select
                          value={scoreForm.penaltiesWinnerTeamId}
                          onChange={(e) => setScoreForm({ ...scoreForm, penaltiesWinnerTeamId: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          <option value="">Seleccionar</option>
                          <option value={editingMatch.homeTeamId}>{getTeamName(editingMatch.homeTeamId)}</option>
                          <option value={editingMatch.awayTeamId}>{getTeamName(editingMatch.awayTeamId)}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Penales {getTeamName(editingMatch.homeTeamId)}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={scoreForm.penaltiesHomeScore}
                          onChange={(e) => setScoreForm({ ...scoreForm, penaltiesHomeScore: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Penales {getTeamName(editingMatch.awayTeamId)}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={scoreForm.penaltiesAwayScore}
                          onChange={(e) => setScoreForm({ ...scoreForm, penaltiesAwayScore: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Se definen por 5 tiros por equipo.
                    </p>
                  </div>
                )}

              <details className="border-t pt-4" open>
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Goles y asistencias</h4>
                    <p className="text-xs text-muted-foreground">
                      {scoreForm.goals.length} goles cargados · {scoreForm.goals.filter(goal => goal.assistPlayerId).length} asistencias
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Usá “Agregar” en la carga rápida.</span>
                </summary>

                <div className="space-y-3 mt-4">
                  <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Carga de goles por jugador</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Seleccioná equipo y jugador, definí cantidad y se cargarán los goles automáticamente.
                    </p>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Equipo</label>
                      <select
                        value={quickGoalForm.teamId}
                        onChange={(e) => {
                          const teamId = e.target.value;
                          const firstPlayer = getTeamPlayers(teamId)[0]?.id || '';
                          setQuickGoalForm({
                            ...quickGoalForm,
                            teamId,
                            playerId: firstPlayer,
                          });
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value={editingMatch.homeTeamId}>{getTeamName(editingMatch.homeTeamId)}</option>
                        <option value={editingMatch.awayTeamId}>{getTeamName(editingMatch.awayTeamId)}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Jugador</label>
                      <select
                        value={quickGoalForm.playerId}
                        onChange={(e) => setQuickGoalForm({ ...quickGoalForm, playerId: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {getTeamPlayers(quickGoalForm.teamId).map(player => (
                          <option key={player.id} value={player.id}>
                            {getPlayerLabel(player.id)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Cantidad</label>
                      <select
                        value={quickGoalForm.count}
                        onChange={(e) => setQuickGoalForm({
                          ...quickGoalForm,
                          count: Number(e.target.value),
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(value => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (!quickGoalForm.teamId || !quickGoalForm.playerId) {
                            alert('Seleccioná equipo y jugador.');
                            return;
                          }
                          const count = Math.max(1, Number(quickGoalForm.count) || 1);
                          const newGoals: GoalEvent[] = Array.from({ length: count }, (_, index) => ({
                            id: generateId(),
                            teamId: quickGoalForm.teamId,
                            playerId: quickGoalForm.playerId,
                            type: 'goal',
                            assistPlayerId: undefined,
                            isPenalty: false,
                            minute: undefined,
                          }));

                          setScoreForm({
                            ...scoreForm,
                            goals: [...scoreForm.goals, ...newGoals],
                          });
                        }}
                        className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar
                      </button>
                    </div>
                  </div>
                  </div>

                  {scoreForm.goals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin goles cargados.</p>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                      <p className="text-xs font-semibold text-foreground mb-2">Tabla de goles</p>
                    {(() => {
                      const buildRows = (teamId: string) => {
                        const goalsByPlayer = scoreForm.goals.reduce<Record<string, { playerId: string; playerName: string; total: number; own: number }>>((acc, goal) => {
                          if (goal.teamId !== teamId) return acc;
                          const playerLabel = getPlayerLabel(goal.playerId);
                          const existing = acc[goal.playerId] ?? { playerId: goal.playerId, playerName: playerLabel, total: 0, own: 0 };
                          existing.total += 1;
                          if (goal.type === 'ownGoal') existing.own += 1;
                          acc[goal.playerId] = existing;
                          return acc;
                        }, {});
                        return Object.values(goalsByPlayer);
                      };

                      const homeRows = buildRows(editingMatch.homeTeamId);
                      const awayRows = buildRows(editingMatch.awayTeamId);
                      const hasAny = homeRows.length > 0 || awayRows.length > 0;
                      if (!hasAny) {
                        return <p className="text-xs text-muted-foreground">Sin goles cargados.</p>;
                      }
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border/50 bg-card/60 p-2">
                            <p className="text-xs font-semibold text-foreground mb-2">{getTeamName(editingMatch.homeTeamId)}</p>
                            {homeRows.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Sin goles.</p>
                            ) : (
                              <div className="space-y-1">
                                {homeRows.map(row => (
                                  <div key={row.playerId} className="flex justify-between text-xs text-muted-foreground">
                                    <button
                                      onClick={() => {
                                        setGoalDetailPlayerId(row.playerId);
                                        setIsGoalDetailOpen(true);
                                      }}
                                      className="text-left text-emerald-300 hover:text-emerald-200"
                                    >
                                      {row.playerName}
                                    </button>
                                    <span className="font-semibold text-foreground">
                                      {row.total}
                                      {row.own > 0 ? ` (${row.own} en contra)` : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="rounded-lg border border-border/50 bg-card/60 p-2">
                            <p className="text-xs font-semibold text-foreground mb-2">{getTeamName(editingMatch.awayTeamId)}</p>
                            {awayRows.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Sin goles.</p>
                            ) : (
                              <div className="space-y-1">
                                {awayRows.map(row => (
                                  <div key={row.playerId} className="flex justify-between text-xs text-muted-foreground">
                                    <button
                                      onClick={() => {
                                        setGoalDetailPlayerId(row.playerId);
                                        setIsGoalDetailOpen(true);
                                      }}
                                      className="text-left text-amber-300 hover:text-amber-200"
                                    >
                                      {row.playerName}
                                    </button>
                                    <span className="font-semibold text-foreground">
                                      {row.total}
                                      {row.own > 0 ? ` (${row.own} en contra)` : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                      <p className="text-xs text-muted-foreground mt-3">
                        Para completar goles y asistencia, apretá el jugador que hizo gol.
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                      <p className="text-xs font-semibold text-foreground mb-2">Tabla de asistencias</p>
                    {(() => {
                      const assistsByPlayer = scoreForm.goals.reduce<Record<string, { playerId: string; playerName: string; total: number }>>((acc, goal) => {
                        if (!goal.assistPlayerId) return acc;
                        const playerLabel = getPlayerLabel(goal.assistPlayerId);
                        const existing = acc[goal.assistPlayerId] ?? { playerId: goal.assistPlayerId, playerName: playerLabel, total: 0 };
                        existing.total += 1;
                        acc[goal.assistPlayerId] = existing;
                        return acc;
                      }, {});
                      const rows = Object.values(assistsByPlayer);
                      if (rows.length === 0) {
                        return <p className="text-xs text-muted-foreground">Sin asistencias cargadas.</p>;
                      }
                      return (
                        <div className="space-y-1">
                          {rows.map(row => (
                            <div key={row.playerId} className="flex justify-between text-xs text-muted-foreground">
                              <span>{row.playerName}</span>
                              <span className="font-semibold text-foreground">{row.total}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    </div>
                  </div>
                </div>
              </details>

              <details className="border-t pt-4">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Tarjetas</h4>
                    <p className="text-xs text-muted-foreground">Seleccioná el equipo para cargar tarjetas.</p>
                  </div>
                </summary>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[editingMatch.homeTeamId, editingMatch.awayTeamId].map(teamId => {
                    const teamCards = scoreForm.cards.filter(card => card.teamId === teamId);
                    return (
                      <button
                        key={teamId}
                        onClick={() => {
                          setCardTeamId(teamId);
                          setIsCardModalOpen(true);
                        }}
                        className="rounded-lg border border-border/60 bg-card/60 p-4 text-left hover:bg-accent/40 transition-colors"
                      >
                        <p className="text-sm font-semibold text-foreground">{getTeamName(teamId)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {teamCards.length} tarjetas cargadas
                        </p>
                      </button>
                    );
                  })}
                </div>
              </details>

              <details className="border-t pt-4">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Cambios</h4>
                    <p className="text-xs text-muted-foreground">{scoreForm.substitutions.length} cambios cargados</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const defaultTeamId = editingMatch.homeTeamId;
                      const playersForTeam = getTeamPlayers(defaultTeamId);
                      setScoreForm({
                        ...scoreForm,
                        substitutions: [
                          ...scoreForm.substitutions,
                          {
                            id: generateId(),
                            teamId: defaultTeamId,
                            playerOutId: playersForTeam[0]?.id || '',
                            playerInId: playersForTeam[1]?.id || playersForTeam[0]?.id || '',
                          },
                        ],
                      });
                    }}
                    className="flex items-center gap-2 text-xs text-primary hover:text-primary/80"
                  >
                    <Plus className="w-3 h-3" />
                    Agregar cambio
                  </button>
                </summary>

                <div className="space-y-3 mt-4">
                  {scoreForm.substitutions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin cambios cargados.</p>
                  ) : (
                    <div className="space-y-3">
                      {scoreForm.substitutions.map(sub => (
                        <div key={sub.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Equipo</label>
                            <select
                              value={sub.teamId}
                              onChange={(e) => {
                                const teamId = e.target.value;
                                const playersForTeam = getTeamPlayers(teamId);
                                setScoreForm({
                                  ...scoreForm,
                                  substitutions: scoreForm.substitutions.map(item =>
                                    item.id === sub.id
                                      ? {
                                          ...item,
                                          teamId,
                                          playerOutId: playersForTeam[0]?.id || '',
                                          playerInId: playersForTeam[1]?.id || playersForTeam[0]?.id || '',
                                        }
                                      : item
                                  ),
                                });
                              }}
                              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                              <option value={editingMatch.homeTeamId}>{getTeamName(editingMatch.homeTeamId)}</option>
                              <option value={editingMatch.awayTeamId}>{getTeamName(editingMatch.awayTeamId)}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Sale</label>
                            <select
                              value={sub.playerOutId}
                              onChange={(e) => setScoreForm({
                                ...scoreForm,
                                substitutions: scoreForm.substitutions.map(item =>
                                  item.id === sub.id ? { ...item, playerOutId: e.target.value } : item
                                ),
                              })}
                              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                              {getTeamPlayers(sub.teamId).map(player => (
                                <option key={player.id} value={player.id}>
                                  {getPlayerLabel(player.id)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Entra</label>
                            <select
                              value={sub.playerInId}
                              onChange={(e) => setScoreForm({
                                ...scoreForm,
                                substitutions: scoreForm.substitutions.map(item =>
                                  item.id === sub.id ? { ...item, playerInId: e.target.value } : item
                                ),
                              })}
                              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                              {getTeamPlayers(sub.teamId).map(player => (
                                <option key={player.id} value={player.id}>
                                  {getPlayerLabel(player.id)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex justify-end md:col-span-2">
                            <button
                              onClick={() => setScoreForm({
                                ...scoreForm,
                                substitutions: scoreForm.substitutions.filter(item => item.id !== sub.id),
                              })}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => {
                  setEditingMatch(null);
                  setScoreForm({
                    homeScore: '',
                    awayScore: '',
                    penaltiesWinnerTeamId: '',
                    penaltiesHomeScore: '',
                    penaltiesAwayScore: '',
                    goals: [],
                    assists: [],
                    cards: [],
                    substitutions: [],
                  });
                  setQuickGoalForm({ teamId: '', playerId: '', count: 1 });
                }}
                className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveScore}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {isGoalDetailOpen && goalDetailPlayerId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Detalle de goles</h3>
                <p className="text-sm text-muted-foreground">{getPlayerLabel(goalDetailPlayerId)}</p>
              </div>
              <button
                onClick={() => {
                  setIsGoalDetailOpen(false);
                  setGoalDetailPlayerId(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>

            <div className="px-6 pb-6 mt-4 overflow-y-auto space-y-3">
              {scoreForm.goals.filter(goal => goal.playerId === goalDetailPlayerId).map((goal, index) => (
                <div key={goal.id} className="rounded-lg border border-border/60 bg-card/60 p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Gol #{index + 1}</label>
                    <select
                      value={goal.type}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        goals: scoreForm.goals.map(item =>
                          item.id === goal.id ? { ...item, type: e.target.value as GoalEvent['type'] } : item
                        ),
                      })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="goal">Gol</option>
                      <option value="ownGoal">Gol en contra</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Asistencia</label>
                    <select
                      value={goal.assistPlayerId ?? ''}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        goals: scoreForm.goals.map(item =>
                          item.id === goal.id ? { ...item, assistPlayerId: e.target.value || undefined } : item
                        ),
                      })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Sin asistencia</option>
                      {getTeamPlayers(goal.teamId).map(player => (
                        <option key={player.id} value={player.id}>
                          {getPlayerLabel(player.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Minuto</label>
                    <input
                      type="number"
                      min="0"
                      value={goal.minute ?? ''}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        goals: scoreForm.goals.map(item =>
                          item.id === goal.id
                            ? { ...item, minute: e.target.value === '' ? undefined : Number(e.target.value) }
                            : item
                        ),
                      })}
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(goal.isPenalty)}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        goals: scoreForm.goals.map(item =>
                          item.id === goal.id ? { ...item, isPenalty: e.target.checked } : item
                        ),
                      })}
                      className="w-4 h-4 rounded border-border bg-input-background text-primary focus:ring-primary/40"
                    />
                    <span className="text-xs text-muted-foreground">Penal</span>
                  </div>
                </div>
              ))}
              {scoreForm.goals.filter(goal => goal.playerId === goalDetailPlayerId).length === 0 && (
                <p className="text-xs text-muted-foreground">Sin goles para este jugador.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isCardModalOpen && cardTeamId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Tarjetas por jugador</h3>
                <p className="text-sm text-muted-foreground">{getTeamName(cardTeamId)}</p>
              </div>
              <button
                onClick={() => {
                  setIsCardModalOpen(false);
                  setCardTeamId(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>

            <div className="px-6 pb-6 mt-4 overflow-y-auto space-y-3">
              {getTeamPlayers(cardTeamId).map(player => {
                const existing = scoreForm.cards.find(card => card.teamId === cardTeamId && card.playerId === player.id);
                return (
                  <div key={player.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end rounded-lg border border-border/60 bg-card/60 p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{getPlayerLabel(player.id)}</p>
                      <p className="text-xs text-muted-foreground">Seleccioná el tipo de tarjeta</p>
                    </div>
                    <div>
                      <select
                        value={existing?.type ?? 'none'}
                        onChange={(e) => {
                          const nextType = e.target.value as CardEvent['type'] | 'none';
                          setScoreForm({
                            ...scoreForm,
                            cards: nextType === 'none'
                              ? scoreForm.cards.filter(card => !(card.teamId === cardTeamId && card.playerId === player.id))
                              : [
                                  ...scoreForm.cards.filter(card => !(card.teamId === cardTeamId && card.playerId === player.id)),
                                  {
                                    id: existing?.id ?? generateId(),
                                    teamId: cardTeamId,
                                    playerId: player.id,
                                    type: nextType,
                                  },
                                ],
                          });
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="none">Sin tarjeta</option>
                        <option value="yellow">Amarilla</option>
                        <option value="doubleYellow">Doble amarilla</option>
                        <option value="red">Roja</option>
                      </select>
                      {existing?.type === 'doubleYellow' && (
                        <p className="text-[10px] text-muted-foreground mt-1">Cuenta como roja.</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {getTeamPlayers(cardTeamId).length === 0 && (
                <p className="text-xs text-muted-foreground">No hay jugadores en este equipo.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Partido */}
      {isMatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {editingFixtureMatch ? 'Editar Partido' : 'Nuevo Partido'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Equipo Local
                </label>
                <select
                  value={matchForm.homeTeamId}
                  onChange={(e) => setMatchForm({ ...matchForm, homeTeamId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {divisionTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Equipo Visitante
                </label>
                <select
                  value={matchForm.awayTeamId}
                  onChange={(e) => setMatchForm({ ...matchForm, awayTeamId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {divisionTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Fecha (número)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={matchForm.matchday}
                    onChange={(e) => setMatchForm({ ...matchForm, matchday: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Fecha del partido
                  </label>
                  <input
                    type="date"
                    value={matchForm.date}
                    onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeMatchModal}
                className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveManualMatch}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
