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
        backgroundColor: '#ffffff',
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
        backgroundColor: '#ffffff',
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
          <h2 className="text-2xl font-bold text-gray-900">Tabla de Posiciones</h2>
          <p className="text-gray-600">Consulta las estadísticas del torneo</p>
        </div>
      </div>

      {divisions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Table2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay divisiones</h3>
          <p className="text-gray-600">Primero debes crear divisiones y generar fixtures</p>
        </div>
      ) : (
        <>
          {/* Selector de división */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  División
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Descargar Tabla
                </button>
              )}
            </div>
          </div>

          {/* Tabla de posiciones */}
          {standings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Table2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay equipos</h3>
              <p className="text-gray-600">Agrega equipos a esta división para ver la tabla</p>
            </div>
          ) : (
            <div ref={tableRef} className="bg-white rounded-lg shadow-md overflow-hidden p-6">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h3 className="text-2xl font-bold text-gray-900">
                  {divisions.find(d => d.id === selectedDivision)?.name}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        Pos
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        Equipo
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        PJ
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        PG
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        PE
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        PP
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        GF
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        GC
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        DIF
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase">
                        PTS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {standings.map((standing, index) => {
                      const team = teams.find(t => t.id === standing.teamId);
                      const isLeader = index === 0 && standing.played > 0;
                      
                      return (
                        <tr
                          key={standing.teamId}
                          className={`hover:bg-gray-50 ${isLeader ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 w-6">{index + 1}</span>
                              {isLeader && <Trophy className="w-4 h-4 text-yellow-500" />}
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
                                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                              )}
                              <span className="font-medium text-gray-900">{team?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">{standing.played}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{standing.won}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{standing.drawn}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{standing.lost}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{standing.goalsFor}</td>
                          <td className="px-4 py-3 text-center text-gray-700">{standing.goalsAgainst}</td>
                          <td className={`px-4 py-3 text-center font-medium ${
                            standing.goalDifference > 0 ? 'text-green-600' : 
                            standing.goalDifference < 0 ? 'text-red-600' : 'text-gray-700'
                          }`}>
                            {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-lg text-green-600">{standing.points}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t text-sm text-gray-600">
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
              <h3 className="text-xl font-bold text-gray-900">Resultados por Fecha</h3>
              {matchdays.map(matchday => {
                const matchdayMatches = divisionMatches
                  .filter(m => m.matchday === matchday && m.homeScore !== undefined);

                if (matchdayMatches.length === 0) return null;

                return (
                  <div key={matchday} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900">Fecha {matchday}</h4>
                      <button
                        onClick={() => downloadMatchdayResults(matchday)}
                        className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </button>
                    </div>

                    <div id={`matchday-${matchday}`} className="p-6 bg-white">
                      <div className="flex items-center gap-3 mb-4">
                        <Trophy className="w-6 h-6 text-green-600" />
                        <h4 className="text-xl font-bold text-gray-900">
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
                              className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3 flex-1 justify-end">
                                <span className="font-medium text-gray-900 text-right">
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

                              <div className="flex items-center gap-2 bg-white border-2 border-gray-300 px-4 py-2 rounded-lg">
                                <span className="text-2xl font-bold text-gray-900">
                                  {match.homeScore}
                                </span>
                                <span className="text-gray-400 font-bold">-</span>
                                <span className="text-2xl font-bold text-gray-900">
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
                                <span className="font-medium text-gray-900">
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
