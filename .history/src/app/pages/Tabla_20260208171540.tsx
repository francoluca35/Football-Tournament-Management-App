import { useState, useEffect, useRef } from 'react';
import { Table2, Download, Trophy } from 'lucide-react';
import { getDivisions, getTeams, getMatches, getCompetitions } from '../storage';
import { calculateStandings } from '../utils';
import html2canvas from 'html2canvas';
import type { Competition } from '../types';
import { CupBracket } from '../components/CupBracket';

export function Tabla() {
  const [divisions, setDivisions] = useState(getDivisions());
  const [competitions, setCompetitions] = useState<Competition[]>(getCompetitions());
  const [teams, setTeams] = useState(getTeams());
  const [matches, setMatches] = useState(getMatches());
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDivisions(getDivisions());
    setCompetitions(getCompetitions());
    setTeams(getTeams());
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

  const divisionTeams = teams.filter(t => t.divisionId === selectedDivision);
  const divisionCompetitions = competitions.filter(c => c.divisionId === selectedDivision);
  const selectedCompetitionData = competitions.find(c => c.id === selectedCompetition);
  const divisionMatches = matches.filter(m =>
    m.divisionId === selectedDivision &&
    (m.competitionId
      ? m.competitionId === selectedCompetition
      : divisionCompetitions.length <= 1)
  );
  const standings = selectedCompetitionData?.tournamentType === 'torneo'
    ? calculateStandings(divisionTeams, divisionMatches, {
        pointsWin: selectedCompetitionData?.pointsWin,
        pointsDraw: selectedCompetitionData?.pointsDraw,
        pointsLoss: selectedCompetitionData?.pointsLoss,
        tiebreakers: selectedCompetitionData?.tiebreakers,
      })
    : [];

  const splitIntoGroups = (teamsToSplit: typeof divisionTeams, count: number) => {
    const groups: typeof divisionTeams[] = Array.from({ length: count }, () => []);
    teamsToSplit.forEach((team, index) => {
      groups[index % count].push(team);
    });
    return groups;
  };

  const groupEntries = (() => {
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
      const count = Math.max(2, selectedCompetitionData.groupCount ?? selectedCompetitionData.zonesCount ?? 2);
      const sortedTeams = [...divisionTeams].sort((a, b) => a.name.localeCompare(b.name));
      return splitIntoGroups(sortedTeams, count).map((teamsInGroup, index) => ({
        zone: `Grupo ${String.fromCharCode(65 + index)}`,
        teamIds: teamsInGroup.map(team => team.id),
      }));
    }

    return Array.from(map.entries())
      .map(([zone, teamIds]) => ({ zone, teamIds: Array.from(teamIds) }))
      .sort((a, b) => a.zone.localeCompare(b.zone));
  })();

  const groupStandingsByZone = groupEntries.map(group => {
    const groupTeams = group.teamIds
      .map(id => teams.find(t => t.id === id))
      .filter(Boolean)
      .map(team => team as typeof divisionTeams[number]);
    const groupMatches = divisionMatches.filter(match => match.zone === group.zone);
    const standings = calculateStandings(groupTeams, groupMatches, {
      pointsWin: selectedCompetitionData?.pointsWin,
      pointsDraw: selectedCompetitionData?.pointsDraw,
      pointsLoss: selectedCompetitionData?.pointsLoss,
      tiebreakers: selectedCompetitionData?.tiebreakers,
    });
    const allPlayed = groupMatches.length > 0
      && groupMatches.every(match => match.homeScore !== undefined && match.awayScore !== undefined);

    return { zone: group.zone, standings, allPlayed };
  });

  const isGroupStageComplete = selectedCompetitionData?.tournamentType === 'copa'
    ? groupStandingsByZone.length > 0 && groupStandingsByZone.every(group => group.allPlayed)
    : false;

  const buildBracketRounds = () => {
    type BracketTeam = { label: string; teamId: string | null };
    type BracketMatch = {
      id: string;
      home: BracketTeam;
      away: BracketTeam;
      homeScore?: number;
      awayScore?: number;
    };
    type Round = { title: string; matches: BracketMatch[] };
    const getTeamLabel = (teamId: string) => teams.find(team => team.id === teamId)?.name ?? 'Equipo';
    const fixtureTitleMap: Record<string, Round['title']> = {
      'round-of-64': '32avos',
      'round-of-32': '16vos',
      'round-of-16': 'Octavos',
      'quarter-final': 'Cuartos',
      'semi-final': 'Semifinal',
      'final': 'Final',
    };

    const actualRounds = Object.entries(fixtureTitleMap).reduce<Record<string, BracketMatch[]>>(
      (acc, [fixtureType, title]) => {
        const matchesForRound = divisionMatches
          .filter(match => match.fixtureType === fixtureType)
          .sort((a, b) => (a.matchday ?? 0) - (b.matchday ?? 0) || a.id.localeCompare(b.id))
          .map(match => ({
            id: match.id,
            home: { label: getTeamLabel(match.homeTeamId), teamId: match.homeTeamId },
            away: { label: getTeamLabel(match.awayTeamId), teamId: match.awayTeamId },
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          }));
        if (matchesForRound.length > 0) {
          acc[title] = matchesForRound;
        }
        return acc;
      },
      {}
    );

    const qualifiers: BracketTeam[] = groupStandingsByZone.flatMap(group => {
      const first = group.standings[0];
      const second = group.standings[1];
      return [
        first ? { label: `1ro ${group.zone}`, teamId: first.teamId } : { label: `1ro ${group.zone}`, teamId: null },
        second ? { label: `2do ${group.zone}`, teamId: second.teamId } : { label: `2do ${group.zone}`, teamId: null },
      ];
    });

    const ordered = qualifiers.slice().sort((a, b) => a.label.localeCompare(b.label));
    const initial: BracketMatch[] = [];
    let matchIndex = 1;
    for (let i = 0; i < ordered.length; i += 4) {
      const one = ordered[i];
      const two = ordered[i + 1];
      const three = ordered[i + 2];
      const four = ordered[i + 3];
      if (one && four) {
        initial.push({ id: `R1M${matchIndex}`, home: one, away: four });
        matchIndex += 1;
      }
      if (two && three) {
        initial.push({ id: `R1M${matchIndex}`, home: two, away: three });
        matchIndex += 1;
      }
    }

    const rounds: Round[] = [];
    let current = initial;
    let roundNumber = 1;
    const roundTitleFor = (count: number) => {
      if (count >= 32) return '32avos';
      if (count === 16) return '16vos';
      if (count === 8) return 'Octavos';
      if (count === 4) return 'Cuartos';
      if (count === 2) return 'Semifinal';
      return 'Final';
    };

    while (current.length > 0) {
      const title = roundTitleFor(current.length);
      rounds.push({ title, matches: actualRounds[title] ?? current });

      if (current.length === 1) break;

      const next: BracketMatch[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1];
        const nextIndex = Math.floor(i / 2) + 1;
        next.push({
          id: `R${roundNumber + 1}M${nextIndex}`,
          home: { label: left ? `Ganador ${left.id}` : `Ganador ${roundNumber}-${i + 1}`, teamId: null },
          away: { label: right ? `Ganador ${right.id}` : `Ganador ${roundNumber}-${i + 2}`, teamId: null },
        });
      }
      current = next;
      roundNumber += 1;
    }

    return rounds;
  };

  const bracketRounds = isGroupStageComplete ? buildBracketRounds() : [];

  const finalWinner = (() => {
    if (!selectedCompetitionData || selectedCompetitionData.tournamentType !== 'copa') {
      return null;
    }
    const finalMatch = divisionMatches.find(match => match.fixtureType === 'final');
    if (!finalMatch || finalMatch.homeScore === undefined || finalMatch.awayScore === undefined) {
      return null;
    }
    if (finalMatch.homeScore === finalMatch.awayScore) return null;
    const winnerId = finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeTeamId : finalMatch.awayTeamId;
    const winnerName = teams.find(t => t.id === winnerId)?.name ?? 'Campeón';
    return { teamId: winnerId, teamName: winnerName };
  })();

  const downloadAsImage = async () => {
    if (!tableRef.current) return;

    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#0f1115',
        scale: 2,
        logging: false,
      });

      const link = document.createElement('a');
      const divisionName = divisions.find(d => d.id === selectedDivision)?.name || 'tabla';
      const competitionName = competitions.find(c => c.id === selectedCompetition)?.name || '';
      const fileName = competitionName
        ? `${divisionName}-${competitionName}`.toLowerCase().replace(/\s+/g, '-')
        : divisionName.toLowerCase().replace(/\s+/g, '-');
      link.download = `tabla-${fileName}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (error) {
      console.error('Error al generar la imagen:', error);
      alert('Error al descargar la tabla');
    }
  };

  const downloadBracketImage = async (elementId: string, fileSuffix: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const isFullBracket = elementId === 'cup-bracket-full';
      const source = isFullBracket ? (element.cloneNode(true) as HTMLElement) : element;

      if (isFullBracket) {
        source.style.paddingTop = '506px';
        source.style.paddingBottom = '24px';
        source.style.boxSizing = 'border-box';
      }

      if (isFullBracket) {
        source.style.position = 'absolute';
        source.style.left = '-10000px';
        source.style.top = '100px';
        document.body.appendChild(source);
      }

      const { scrollWidth, scrollHeight } = source;
      const canvas = await html2canvas(source, {
        backgroundColor: '#0f1115',
        scale: 2,
        logging: false,
        width: scrollWidth,
        height: scrollHeight,
        windowWidth: scrollWidth,
        windowHeight: scrollHeight,
      });
      if (isFullBracket) {
        document.body.removeChild(source);
      }
      const link = document.createElement('a');
      const divisionName = divisions.find(d => d.id === selectedDivision)?.name || 'tabla';
      const competitionName = competitions.find(c => c.id === selectedCompetition)?.name || '';
      const fileName = competitionName
        ? `${divisionName}-${competitionName}`.toLowerCase().replace(/\s+/g, '-')
        : divisionName.toLowerCase().replace(/\s+/g, '-');
      link.download = `llaves-${fileSuffix}-${fileName}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (error) {
      console.error('Error al generar la imagen:', error);
      alert('Error al descargar la imagen');
    }
  };

  const splitRoundMatches = <T,>(matches: T[]) => {
    const half = Math.ceil(matches.length / 2);
    return {
      left: matches.slice(0, half),
      right: matches.slice(half),
    };
  };

  const downloadMatchdayResults = async (matchday: number) => {
    const matchdayElement = document.getElementById(`matchday-${matchday}`);
    if (!matchdayElement) return;

    try {
      const canvas = await html2canvas(matchdayElement, {
        backgroundColor: '#0f1115',
        scale: 2,
        logging: false,
      });

      const link = document.createElement('a');
      const divisionName = divisions.find(d => d.id === selectedDivision)?.name || 'fecha';
      const competitionName = competitions.find(c => c.id === selectedCompetition)?.name || '';
      const fileName = competitionName
        ? `${divisionName}-${competitionName}`.toLowerCase().replace(/\s+/g, '-')
        : divisionName.toLowerCase().replace(/\s+/g, '-');
      link.download = `fecha-${matchday}-${fileName}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (error) {
      console.error('Error al generar la imagen:', error);
      alert('Error al descargar los resultados');
    }
  };

  const matchdays = [...new Set(divisionMatches.map(m => m.matchday))].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Tabla de Posiciones</h2>
          <p className="text-muted-foreground">Consulta las estadísticas del torneo</p>
        </div>
      </div>

      {divisions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
          <Table2 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No hay divisiones</h3>
          <p className="text-muted-foreground">Primero debes crear divisiones y generar fixtures</p>
        </div>
      ) : (
        <>
          {/* Selector de división */}
          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  División
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="w-full md:w-64 px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {divisions.map(division => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
                <label className="block text-sm font-medium text-muted-foreground mt-4 mb-2">
                  Torneo
                </label>
                <select
                  value={selectedCompetition}
                  onChange={(e) => setSelectedCompetition(e.target.value)}
                  className="w-full md:w-64 px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              </div>
              {selectedCompetitionData?.tournamentType === 'torneo' && standings.length > 0 && (
                <button
                  onClick={downloadAsImage}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Descargar Tabla
                </button>
              )}
            </div>
          </div>

          {/* Tabla de posiciones */}
          {selectedCompetitionData?.tournamentType === 'torneo' && standings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
              <Table2 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay equipos</h3>
              <p className="text-muted-foreground">Agrega equipos a esta división para ver la tabla</p>
            </div>
          ) : selectedCompetitionData?.tournamentType === 'torneo' ? (
            <div ref={tableRef} className="rounded-xl border border-border bg-card/80 overflow-hidden p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-semibold text-foreground">
                  {divisions.find(d => d.id === selectedDivision)?.name}
                </h3>
              </div>
              {selectedCompetitionData && (
                <div className="mb-6 text-sm text-muted-foreground">
                  {selectedCompetitionData.name} · {selectedCompetitionData.tournamentType === 'torneo' ? 'Liga' : 'Copa'}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-accent/60 border-b-2 border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Pos
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Equipo
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        PJ
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        PG
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        PE
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        PP
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        GF
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        GC
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        DIF
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        PTS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {standings.map((standing, index) => {
                      const team = teams.find(t => t.id === standing.teamId);
                      const isLeader = index === 0 && standing.played > 0;
                      
                      return (
                        <tr
                          key={standing.teamId}
                          className={`hover:bg-accent/40 ${isLeader ? 'bg-primary/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground w-6">{index + 1}</span>
                              {isLeader && <Trophy className="w-4 h-4 text-primary" />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {team?.logoUrl ? (
                                <img
                                  src={team.logoUrl}
                                  alt=""
                                  className="w-8 h-8 object-contain"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-accent/70 rounded"></div>
                              )}
                              <span className="font-medium text-foreground">{team?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{standing.played}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{standing.won}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{standing.drawn}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{standing.lost}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{standing.goalsFor}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{standing.goalsAgainst}</td>
                          <td className={`px-4 py-3 text-center font-medium ${
                            standing.goalDifference > 0 ? 'text-emerald-400' : 
                            standing.goalDifference < 0 ? 'text-rose-400' : 'text-muted-foreground'
                          }`}>
                            {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-lg text-primary">{standing.points}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                <p><span className="font-semibold">PJ:</span> Partidos Jugados | 
                   <span className="font-semibold ml-2">PG:</span> Ganados | 
                   <span className="font-semibold ml-2">PE:</span> Empatados | 
                   <span className="font-semibold ml-2">PP:</span> Perdidos</p>
                <p><span className="font-semibold">GF:</span> Goles a Favor | 
                   <span className="font-semibold ml-2">GC:</span> Goles en Contra | 
                   <span className="font-semibold ml-2">DIF:</span> Diferencia de Gol | 
                   <span className="font-semibold ml-2">PTS:</span> Puntos</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupEntries.length === 0 ? (
                <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
                  <Table2 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No hay grupos</h3>
                  <p className="text-muted-foreground">Generá el fixture de la copa para ver las tablas</p>
                </div>
              ) : isGroupStageComplete ? (
                <div className="rounded-xl border border-border bg-card/80 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <Trophy className="w-6 h-6 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Llaves</h3>
                  </div>
                  {finalWinner && (
                    <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                      <p className="text-xs text-muted-foreground">Campeón</p>
                      <p className="text-lg font-semibold text-foreground">{finalWinner.teamName}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => downloadBracketImage('cup-bracket-full', 'completa')}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground hover:bg-accent transition-colors"
                    >
                      Descargar llave completa
                    </button>
                    {Array.from(new Set(bracketRounds.map(round => round.title))).map(title => (
                      <button
                        key={title}
                        onClick={() => downloadBracketImage(`cup-bracket-round-${title}`, title.toLowerCase())}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground hover:bg-accent transition-colors"
                      >
                        Descargar {title}
                      </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <div id="cup-bracket-full" className="p-6">
                      <CupBracket bracketRounds={bracketRounds} teams={teams} finalWinner={finalWinner} />
                    </div>
                  </div>
                  <div className="pointer-events-none opacity-0 absolute -left-[10000px] top-0">
                    {Array.from(new Set(bracketRounds.map(round => round.title))).map(title => {
                      const round = bracketRounds.find(item => item.title === title);
                      if (!round) return null;
                      const split = splitRoundMatches(round.matches);

                      return (
                        <div
                          key={title}
                          id={`cup-bracket-round-${title}`}
                          className="rounded-xl border border-border bg-card/80 p-6 shadow-sm min-w-[900px]"
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <Trophy className="w-6 h-6 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                            {[split.left, split.right].map((sideMatches, idx) => (
                              <div key={`${title}-${idx}`} className="space-y-6">
                                {sideMatches.map(match => (
                                  <div key={match.id} className="space-y-2">
                                    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 bg-card/60">
                                      <span className="text-sm font-medium text-foreground">
                                        {match.home.label}
                                      </span>
                                      {match.homeScore !== undefined && match.awayScore !== undefined && (
                                        <span className="text-sm font-semibold text-primary">
                                          {match.homeScore}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 bg-card/60">
                                      <span className="text-sm font-medium text-foreground">
                                        {match.away.label}
                                      </span>
                                      {match.homeScore !== undefined && match.awayScore !== undefined && (
                                        <span className="text-sm font-semibold text-primary">
                                          {match.awayScore}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                          {finalWinner && title === 'Final' && (
                            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                              <p className="text-xs text-muted-foreground">Campeón</p>
                              <p className="text-lg font-semibold text-foreground">{finalWinner.teamName}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                groupStandingsByZone.map(group => (
                  <div key={group.zone} className="rounded-xl border border-border bg-card/80 overflow-hidden p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <Trophy className="w-6 h-6 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">{group.zone}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-accent/60 border-b-2 border-border">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              Pos
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              Equipo
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              PJ
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              PG
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              PE
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              PP
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              GF
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              GC
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              DIF
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                              PTS
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {group.standings.map((standing, index) => {
                            const team = teams.find(t => t.id === standing.teamId);
                            const isLeader = index === 0 && standing.played > 0;
                            
                            return (
                              <tr
                                key={standing.teamId}
                                className={`hover:bg-accent/40 ${isLeader ? 'bg-primary/10' : ''}`}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground w-6">{index + 1}</span>
                                    {isLeader && <Trophy className="w-4 h-4 text-primary" />}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {team?.logoUrl ? (
                                      <img
                                        src={team.logoUrl}
                                        alt=""
                                        className="w-8 h-8 object-contain"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-accent/70 rounded"></div>
                                    )}
                                    <span className="font-medium text-foreground">{team?.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center text-muted-foreground">{standing.played}</td>
                                <td className="px-4 py-3 text-center text-muted-foreground">{standing.won}</td>
                                <td className="px-4 py-3 text-center text-muted-foreground">{standing.drawn}</td>
                                <td className="px-4 py-3 text-center text-muted-foreground">{standing.lost}</td>
                                <td className="px-4 py-3 text-center text-muted-foreground">{standing.goalsFor}</td>
                                <td className="px-4 py-3 text-center text-muted-foreground">{standing.goalsAgainst}</td>
                                <td className={`px-4 py-3 text-center font-medium ${
                                  standing.goalDifference > 0 ? 'text-emerald-400' : 
                                  standing.goalDifference < 0 ? 'text-rose-400' : 'text-muted-foreground'
                                }`}>
                                  {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="font-semibold text-lg text-primary">{standing.points}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Resultados por fecha */}
          {matchdays.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Resultados por Fecha</h3>
              {matchdays.map(matchday => {
                const matchdayMatches = divisionMatches
                  .filter(m => m.matchday === matchday && m.homeScore !== undefined);

                if (matchdayMatches.length === 0) return null;

                return (
                  <div key={matchday} className="rounded-xl border border-border bg-card/80 overflow-hidden shadow-sm">
                    <div className="bg-accent/60 px-6 py-4 border-b border-border flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-foreground">Fecha {matchday}</h4>
                      <button
                        onClick={() => downloadMatchdayResults(matchday)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </button>
                    </div>

                    <div id={`matchday-${matchday}`} className="p-6 bg-card">
                      <div className="flex items-center gap-3 mb-4">
                        <Trophy className="w-6 h-6 text-primary" />
                        <h4 className="text-xl font-semibold text-foreground">
                          Fecha {matchday} - {divisions.find(d => d.id === selectedDivision)?.name}
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {matchdayMatches.map(match => {
                          const homeTeam = teams.find(t => t.id === match.homeTeamId);
                          const awayTeam = teams.find(t => t.id === match.awayTeamId);

                          return (
                            <div
                              key={match.id}
                              className="flex items-center justify-between gap-4 p-4 bg-accent/60 rounded-lg"
                            >
                              <div className="flex items-center gap-3 flex-1 justify-end">
                                <span className="font-medium text-foreground text-right">
                                  {homeTeam?.name}
                                </span>
                                {homeTeam?.logoUrl && (
                                  <img
                                    src={homeTeam.logoUrl}
                                    alt=""
                                    className="w-8 h-8 object-contain"
                                  />
                                )}
                              </div>

                              <div className="flex items-center gap-2 bg-card border-2 border-border px-4 py-2 rounded-lg">
                                <span className="text-2xl font-semibold text-foreground">
                                  {match.homeScore}
                                </span>
                                <span className="text-muted-foreground font-semibold">-</span>
                                <span className="text-2xl font-semibold text-foreground">
                                  {match.awayScore}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 flex-1">
                                {awayTeam?.logoUrl && (
                                  <img
                                    src={awayTeam.logoUrl}
                                    alt=""
                                    className="w-8 h-8 object-contain"
                                  />
                                )}
                                <span className="font-medium text-foreground">
                                  {awayTeam?.name}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
