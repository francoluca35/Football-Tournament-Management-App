import { useState, useEffect, useRef } from 'react';
import { Table2, Download, Trophy } from 'lucide-react';
import { getDivisions, getTeams, getMatches } from '../storage';
import { calculateStandings } from '../utils';
import html2canvas from 'html2canvas';

export function Tabla() {
  const [divisions, setDivisions] = useState(getDivisions());
  const [teams, setTeams] = useState(getTeams());
  const [matches, setMatches] = useState(getMatches());
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDivisions(getDivisions());
    setTeams(getTeams());
    setMatches(getMatches());
    if (getDivisions().length > 0 && !selectedDivision) {
      setSelectedDivision(getDivisions()[0].id);
    }
  }, []);

  const divisionTeams = teams.filter(t => t.divisionId === selectedDivision);
  const divisionMatches = matches.filter(m => m.divisionId === selectedDivision);
  const selectedDivisionData = divisions.find(d => d.id === selectedDivision);
  const standings = calculateStandings(divisionTeams, divisionMatches, {
    pointsWin: selectedDivisionData?.pointsWin,
    pointsDraw: selectedDivisionData?.pointsDraw,
    pointsLoss: selectedDivisionData?.pointsLoss,
    tiebreakers: selectedDivisionData?.tiebreakers,
  });

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
      link.download = `tabla-${divisionName.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (error) {
      console.error('Error al generar la imagen:', error);
      alert('Error al descargar la tabla');
    }
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
      link.download = `fecha-${matchday}-${divisionName.toLowerCase().replace(/\s+/g, '-')}.jpg`;
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
              </div>
              {standings.length > 0 && (
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
          {standings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
              <Table2 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay equipos</h3>
              <p className="text-muted-foreground">Agrega equipos a esta división para ver la tabla</p>
            </div>
          ) : (
            <div ref={tableRef} className="rounded-xl border border-border bg-card/80 overflow-hidden p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-semibold text-foreground">
                  {divisions.find(d => d.id === selectedDivision)?.name}
                </h3>
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
