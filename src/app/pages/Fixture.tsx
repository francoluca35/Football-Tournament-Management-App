import { useState, useEffect } from 'react';
import { Calendar, Shuffle, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { getDivisions, getTeams, getMatches, saveMatches } from '../storage';
import type { Match, Team } from '../types';
import { generateId, generateRoundRobinFixture, shuffle } from '../utils';

export function Fixture() {
  const [divisions, setDivisions] = useState(getDivisions());
  const [teams, setTeams] = useState(getTeams());
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [scoreForm, setScoreForm] = useState({ homeScore: '', awayScore: '' });

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
  
  const matchdays = [...new Set(divisionMatches.map(m => m.matchday))].sort((a, b) => a - b);

  const generateRandomFixture = () => {
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
    const useZones = Boolean(selectedDivisionData?.zonesEnabled && (selectedDivisionData.zonesCount ?? 0) > 1);
    const zoneCount = Math.max(2, selectedDivisionData?.zonesCount ?? 2);
    const doubleRoundRobin = Boolean(selectedDivisionData?.roundRobinHomeAway);

    const splitIntoZones = (teamsToSplit: Team[], count: number) => {
      const zones: Team[][] = Array.from({ length: count }, () => []);
      teamsToSplit.forEach((team, index) => {
        zones[index % count].push(team);
      });
      return zones;
    };

    const zoneMatches = useZones
      ? splitIntoZones(shuffledTeams, zoneCount).flatMap((zoneTeams, index) =>
          generateRoundRobinFixture(zoneTeams, selectedDivision, {
            doubleRoundRobin,
            zone: `Zona ${index + 1}`,
          })
        )
      : generateRoundRobinFixture(shuffledTeams, selectedDivision, { doubleRoundRobin });

    const newMatches = zoneMatches;
    
    const otherMatches = matches.filter(m => m.divisionId !== selectedDivision);
    const allMatches = [...otherMatches, ...newMatches];
    
    saveMatches(allMatches);
    setMatches(allMatches);
  };

  const deleteFixture = () => {
    if (!confirm('¿Estás seguro de eliminar todo el fixture de esta división?')) {
      return;
    }

    const otherMatches = matches.filter(m => m.divisionId !== selectedDivision);
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

    const updatedMatches = matches.map(m =>
      m.id === editingMatch.id
        ? { ...m, homeScore, awayScore }
        : m
    );

    saveMatches(updatedMatches);
    setMatches(updatedMatches);
    setEditingMatch(null);
    setScoreForm({ homeScore: '', awayScore: '' });
  };

  const openScoreModal = (match: Match) => {
    setEditingMatch(match);
    setScoreForm({
      homeScore: match.homeScore?.toString() || '',
      awayScore: match.awayScore?.toString() || '',
    });
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Equipo';
  };

  const getTeamLogo = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.logoUrl;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
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
                      {division.name} ({divisionTeams.filter(t => t.divisionId === division.id).length} equipos)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={generateRandomFixture}
                  disabled={divisionTeams.length < 2}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  <Shuffle className="w-5 h-5" />
                  Generar Aleatorio
                </button>
                {divisionMatches.length > 0 && (
                  <button
                    onClick={deleteFixture}
                    className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    Eliminar Fixture
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Fixture por fechas */}
          {divisionMatches.length === 0 ? (
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
                const matchdayMatches = divisionMatches.filter(m => m.matchday === matchday);
                const playedMatches = matchdayMatches.filter(m => m.homeScore !== undefined).length;

                return (
                  <div key={matchday} className="rounded-xl border border-border bg-card/80 overflow-hidden shadow-sm">
                    <div className="bg-accent/60 px-6 py-4 border-b border-border flex items-center justify-between">
                      <div>
                      <h3 className="text-lg font-semibold text-foreground">Fecha {matchday}</h3>
                        <p className="text-sm text-muted-foreground">
                          {playedMatches} de {matchdayMatches.length} partidos jugados
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-border/60">
                      {matchdayMatches.map(match => {
                        const homeTeam = teams.find(t => t.id === match.homeTeamId);
                        const awayTeam = teams.find(t => t.id === match.awayTeamId);
                        const hasResult = match.homeScore !== undefined;

                        return (
                          <div
                            key={match.id}
                            className={`p-4 hover:bg-accent/40 transition-colors ${
                              hasResult ? 'bg-emerald-500/10' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              {/* Equipo Local */}
                              <div className="flex items-center gap-3 flex-1 justify-end">
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
                              <div className="flex items-center gap-3">
                                {match.zone && (
                                  <span className="text-xs font-semibold uppercase bg-accent/60 text-muted-foreground px-2 py-1 rounded-full">
                                    {match.zone}
                                  </span>
                                )}
                                {hasResult ? (
                                  <div
                                    onClick={() => openScoreModal(match)}
                                    className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg cursor-pointer hover:border-primary/60"
                                  >
                                    <span className="text-2xl font-semibold text-foreground">
                                      {match.homeScore}
                                    </span>
                                    <span className="text-muted-foreground">-</span>
                                    <span className="text-2xl font-semibold text-foreground">
                                      {match.awayScore}
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openScoreModal(match)}
                                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Cargar
                                  </button>
                                )}
                              </div>

                              {/* Equipo Visitante */}
                              <div className="flex items-center gap-3 flex-1">
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
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">Cargar Resultado</h3>

            <div className="space-y-4">
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
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingMatch(null);
                  setScoreForm({ homeScore: '', awayScore: '' });
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
    </div>
  );
}
