import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Upload, Shield, UserCircle } from 'lucide-react';
import { getDivisions, getTeams, saveTeams, getPlayers, savePlayers, getMatches } from '../storage';
import type { Team, Player, PlayerPosition, Match } from '../types';
import { generateId, fileToBase64 } from '../utils';

export function Equipos() {
  const [divisions, setDivisions] = useState(getDivisions());
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isTeamDetailOpen, setIsTeamDetailOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showRoster, setShowRoster] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    firstName: '',
    lastName: '',
    number: 1,
    position: 'Mediocampista' as PlayerPosition,
    photoUrl: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    divisionId: '',
    logoUrl: '',
  });

  useEffect(() => {
    setTeams(getTeams());
    setDivisions(getDivisions());
    setPlayers(getPlayers());
    setMatches(getMatches());
  }, []);

  const filteredTeams = selectedDivision === 'all'
    ? teams
    : teams.filter(t => t.divisionId === selectedDivision);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.divisionId) {
      alert('El nombre y la división son requeridos');
      return;
    }

    const targetDivision = divisions.find(d => d.id === formData.divisionId);
    const divisionTeamCount = teams.filter(t =>
      t.divisionId === formData.divisionId && t.id !== editingTeam?.id
    ).length;

    if (targetDivision?.maxTeams && divisionTeamCount >= targetDivision.maxTeams) {
      alert(`La división "${targetDivision.name}" ya alcanzó el límite de equipos.`);
      return;
    }

    let updatedTeams: Team[];

    if (editingTeam) {
      updatedTeams = teams.map(t =>
        t.id === editingTeam.id
          ? { ...editingTeam, name: formData.name, divisionId: formData.divisionId, logoUrl: formData.logoUrl }
          : t
      );
    } else {
      const newTeam: Team = {
        id: generateId(),
        name: formData.name,
        divisionId: formData.divisionId,
        logoUrl: formData.logoUrl || undefined,
      };
      updatedTeams = [...teams, newTeam];
    }

    saveTeams(updatedTeams);
    setTeams(updatedTeams);
    closeModal();
  };

  const handleDelete = (id: string) => {
    const players = getPlayers();
    const hasPlayers = players.some(p => p.teamId === id);
    
    if (hasPlayers) {
      if (!confirm('Este equipo tiene jugadores asignados. ¿Estás seguro de eliminarlo?')) {
        return;
      }
    }

    const updatedTeams = teams.filter(t => t.id !== id);
    saveTeams(updatedTeams);
    setTeams(updatedTeams);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFormData({ ...formData, logoUrl: base64 });
      } catch (error) {
        alert('Error al cargar la imagen');
      }
    }
  };

  const openModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        divisionId: team.divisionId,
        logoUrl: team.logoUrl || '',
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: '',
        divisionId: divisions[0]?.id || '',
        logoUrl: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
  };

  const getDivisionName = (divisionId: string) => {
    return divisions.find(d => d.id === divisionId)?.name || 'Sin división';
  };

  const getPlayerCount = (teamId: string) => {
    return players.filter(p => p.teamId === teamId).length;
  };

  const getTeamPlayers = (teamId: string) => {
    return players.filter(player => player.teamId === teamId);
  };

  const isTournamentFinished = (divisionId: string) => {
    const division = divisions.find(d => d.id === divisionId);
    if (!division?.endDate) return false;
    const endDate = new Date(`${division.endDate}T23:59:59`);
    if (Number.isNaN(endDate.getTime())) return false;
    return new Date() > endDate;
  };

  const getPlayerStatsByTeam = (teamId: string) => {
    if (isTournamentFinished(selectedTeam?.divisionId || '')) {
      return {};
    }

    const teamMatches = matches.filter(match =>
      match.divisionId === (selectedTeam?.divisionId || '') &&
      (match.status ?? 'pending') === 'completed'
    );

    return teamMatches.reduce<Record<string, { goals: number; assists: number; yellows: number; reds: number }>>(
      (acc, match) => {
        (match.goals ?? []).forEach(goal => {
          if (!acc[goal.playerId]) {
            acc[goal.playerId] = { goals: 0, assists: 0, yellows: 0, reds: 0 };
          }
          if (goal.type === 'goal') {
            acc[goal.playerId].goals += 1;
          }
          if (goal.assistPlayerId) {
            if (!acc[goal.assistPlayerId]) {
              acc[goal.assistPlayerId] = { goals: 0, assists: 0, yellows: 0, reds: 0 };
            }
            acc[goal.assistPlayerId].assists += 1;
          }
        });

        (match.cards ?? []).forEach(card => {
          if (!acc[card.playerId]) {
            acc[card.playerId] = { goals: 0, assists: 0, yellows: 0, reds: 0 };
          }
          if (card.type === 'yellow') {
            acc[card.playerId].yellows += 1;
          } else if (card.type === 'doubleYellow' || card.type === 'red') {
            acc[card.playerId].reds += 1;
          }
        });

        return acc;
      },
      {}
    );
  };

  const openTeamDetail = (team: Team) => {
    setSelectedTeam(team);
    setShowRoster(false);
    setIsTeamDetailOpen(true);
  };

  const closeTeamDetail = () => {
    setIsTeamDetailOpen(false);
    setSelectedTeam(null);
    setShowRoster(false);
  };

  const openPlayerModal = (player?: Player) => {
    if (!selectedTeam) return;
    if (player) {
      setEditingPlayer(player);
      setPlayerFormData({
        firstName: player.firstName,
        lastName: player.lastName,
        number: player.number,
        position: player.position,
        photoUrl: player.photoUrl || '',
      });
    } else {
      setEditingPlayer(null);
      setPlayerFormData({
        firstName: '',
        lastName: '',
        number: 1,
        position: 'Mediocampista',
        photoUrl: '',
      });
    }
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
    setEditingPlayer(null);
  };

  const handleSavePlayer = () => {
    if (!selectedTeam) return;
    if (!playerFormData.firstName.trim() || !playerFormData.lastName.trim()) {
      alert('El nombre y apellido del jugador son requeridos');
      return;
    }

    const teamPlayers = getTeamPlayers(selectedTeam.id);
    if (!editingPlayer && teamPlayers.length >= 32) {
      alert('El equipo ya alcanzó el máximo de 32 jugadores.');
      return;
    }

    let updatedPlayers: Player[];
    if (editingPlayer) {
      updatedPlayers = players.map(player =>
        player.id === editingPlayer.id
          ? {
              ...editingPlayer,
              firstName: playerFormData.firstName,
              lastName: playerFormData.lastName,
              number: playerFormData.number,
              position: playerFormData.position,
              photoUrl: playerFormData.photoUrl || undefined,
            }
          : player
      );
    } else {
      const newPlayer: Player = {
        id: generateId(),
        teamId: selectedTeam.id,
        firstName: playerFormData.firstName,
        lastName: playerFormData.lastName,
        number: playerFormData.number,
        position: playerFormData.position,
        photoUrl: playerFormData.photoUrl || undefined,
      };
      updatedPlayers = [...players, newPlayer];
    }

    savePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
    closePlayerModal();
  };

  const handleDeletePlayer = (playerId: string) => {
    if (!confirm('¿Estás seguro de eliminar este jugador?')) {
      return;
    }
    const updatedPlayers = players.filter(player => player.id !== playerId);
    savePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
  };

  const handlePlayerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setPlayerFormData({ ...playerFormData, photoUrl: base64 });
      } catch (error) {
        alert('Error al cargar la imagen');
      }
    }
  };

  const positionColors: Record<PlayerPosition, string> = {
    'Arquero': 'bg-amber-500/15 text-amber-300',
    'Defensor': 'bg-sky-500/15 text-sky-300',
    'Mediocampista': 'bg-emerald-500/15 text-emerald-300',
    'Delantero': 'bg-rose-500/15 text-rose-300',
  };

  const getPlayerFullName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`.trim();
  };

  const getPlayerShortName = (player: Player) => {
    const initial = player.firstName.trim().charAt(0);
    if (!initial) return player.lastName.trim();
    return `${initial}. ${player.lastName}`.trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Equipos</h2>
          <p className="text-muted-foreground">Gestiona los equipos de cada división</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={divisions.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Nuevo Equipo
        </button>
      </div>

      {divisions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
          <Shield className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No hay divisiones</h3>
          <p className="text-muted-foreground">Primero debes crear divisiones antes de agregar equipos</p>
        </div>
      ) : (
        <>
          {/* Filtro por división */}
          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Filtrar por división
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">Todas las divisiones</option>
              {divisions.map(division => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de equipos */}
          {filteredTeams.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
              <Users className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay equipos</h3>
              <p className="text-muted-foreground mb-6">Comienza agregando tu primer equipo</p>
              <button
                onClick={() => openModal()}
                className="rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Agregar Equipo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map(team => (
                <div
                  key={team.id}
                  onClick={() => openTeamDetail(team)}
                  className="rounded-xl border border-border bg-card/80 p-6 shadow-sm cursor-pointer hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-16 h-16 object-contain rounded-lg bg-accent/60"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-accent/60 rounded-lg flex items-center justify-center">
                        <Shield className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{team.name}</h3>
                      <span className="text-sm text-muted-foreground">{getDivisionName(team.divisionId)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{getPlayerCount(team.id)}</span> jugadores
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(team);
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(team.id);
                        }}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isTeamDetailOpen && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6">
              <div className="flex items-center gap-4">
                {selectedTeam.logoUrl ? (
                  <img
                    src={selectedTeam.logoUrl}
                    alt={selectedTeam.name}
                    className="w-14 h-14 object-contain rounded-lg bg-accent/60"
                  />
                ) : (
                  <div className="w-14 h-14 bg-accent/60 rounded-lg flex items-center justify-center">
                    <Shield className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{selectedTeam.name}</h3>
                  <p className="text-sm text-muted-foreground">{getDivisionName(selectedTeam.divisionId)}</p>
                </div>
              </div>
              <button
                onClick={closeTeamDetail}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>

            <div className="px-6 pb-6 mt-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                  <p className="text-xs text-muted-foreground">Jugadores cargados</p>
                  <p className="text-lg font-semibold text-foreground">
                    {getTeamPlayers(selectedTeam.id).length}/32
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                  <p className="text-xs text-muted-foreground">División</p>
                  <p className="text-sm font-semibold text-foreground">
                    {getDivisionName(selectedTeam.divisionId)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                  <p className="text-xs text-muted-foreground">Plantilla</p>
                  <button
                    onClick={() => setShowRoster(prev => !prev)}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {showRoster ? 'Ocultar plantilla' : 'Ver plantilla'}
                  </button>
                </div>
              </div>

              {showRoster && (
                <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-foreground">Plantilla</h4>
                      <p className="text-sm text-muted-foreground">
                        Máximo 32 jugadores por equipo
                      </p>
                    </div>
                    <button
                      onClick={() => openPlayerModal()}
                      disabled={getTeamPlayers(selectedTeam.id).length >= 32}
                      className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Jugador
                    </button>
                  </div>

                  {getTeamPlayers(selectedTeam.id).length === 0 ? (
                    <div className="rounded-lg border border-border/60 bg-card/70 p-6 text-center">
                      <UserCircle className="w-10 h-10 text-muted-foreground/70 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sin jugadores cargados.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {isTournamentFinished(selectedTeam.divisionId) && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Torneo finalizado: estadísticas reiniciadas.
                        </p>
                      )}
                      <table className="w-full">
                        <thead className="bg-accent/60 border-b border-border">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Número</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Jugador</th>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Posición</th>
                            <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Goles</th>
                            <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Asistencias</th>
                            <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Amarillas</th>
                            <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Rojas</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {(() => {
                            const statsByPlayer = getPlayerStatsByTeam(selectedTeam.id);
                            return getTeamPlayers(selectedTeam.id).map(player => {
                              const stats = statsByPlayer[player.id] ?? {
                                goals: 0,
                                assists: 0,
                                yellows: 0,
                                reds: 0,
                              };
                              return (
                            <tr key={player.id} className="hover:bg-accent/40">
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center w-9 h-9 bg-accent/70 rounded-full">
                                  <span className="font-semibold text-foreground">{player.number}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {player.photoUrl ? (
                                    <img
                                      src={player.photoUrl}
                                      alt={getPlayerFullName(player)}
                                      className="w-7 h-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <UserCircle className="w-6 h-6 text-muted-foreground" />
                                  )}
                                  <span className="font-medium text-foreground">{getPlayerShortName(player)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${positionColors[player.position]}`}>
                                  {player.position}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-foreground">{stats.goals}</td>
                              <td className="px-4 py-3 text-center text-sm text-foreground">{stats.assists}</td>
                              <td className="px-4 py-3 text-center text-sm text-foreground">{stats.yellows}</td>
                              <td className="px-4 py-3 text-center text-sm text-foreground">{stats.reds}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => openPlayerModal(player)}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlayer(player.id)}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPlayerModalOpen && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Equipo
                </label>
                <div className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground">
                  {selectedTeam.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={playerFormData.firstName}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, firstName: e.target.value })}
                  placeholder="Ej: Lionel"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  value={playerFormData.lastName}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, lastName: e.target.value })}
                  placeholder="Ej: Messi"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Número
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerFormData.number}
                    onChange={(e) => setPlayerFormData({
                      ...playerFormData,
                      number: parseInt(e.target.value) || 1,
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Posición
                  </label>
                  <select
                    value={playerFormData.position}
                    onChange={(e) => setPlayerFormData({
                      ...playerFormData,
                      position: e.target.value as PlayerPosition,
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="Arquero">Arquero</option>
                    <option value="Defensor">Defensor</option>
                    <option value="Mediocampista">Mediocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Foto del Jugador
                </label>
                <div className="flex items-center gap-4">
                  {playerFormData.photoUrl && (
                    <img
                      src={playerFormData.photoUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-full"
                    />
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors text-muted-foreground">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Subir Imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePlayerPhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closePlayerModal}
                className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlayer}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Nombre del Equipo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Boca Juniors"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  División
                </label>
                <select
                  value={formData.divisionId}
                  onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {divisions.map(division => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Escudo del Equipo
                </label>
                <div className="flex items-center gap-4">
                  {formData.logoUrl && (
                    <img
                      src={formData.logoUrl}
                      alt="Preview"
                      className="w-20 h-20 object-contain rounded-lg bg-accent/60"
                    />
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors text-muted-foreground">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Subir Imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
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
