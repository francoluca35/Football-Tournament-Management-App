import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Upload, UserCircle } from 'lucide-react';
import { getTeams, getPlayers, savePlayers, getDivisions } from '../storage';
import type { Player, PlayerPosition } from '../types';
import { generateId, fileToBase64 } from '../utils';

export function Jugadores() {
  const [divisions, setDivisions] = useState(getDivisions());
  const [teams, setTeams] = useState(getTeams());
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [modalDivisionId, setModalDivisionId] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    teamId: '',
    number: 1,
    position: 'Mediocampista' as PlayerPosition,
    photoUrl: '',
  });

  useEffect(() => {
    setPlayers(getPlayers());
    setTeams(getTeams());
    setDivisions(getDivisions());
  }, []);

  const filteredTeams = selectedDivision === 'all'
    ? teams
    : teams.filter(t => t.divisionId === selectedDivision);

  const filteredPlayers = players.filter(p => {
    if (selectedTeam !== 'all') return p.teamId === selectedTeam;
    if (selectedDivision !== 'all') {
      const team = teams.find(t => t.id === p.teamId);
      return team?.divisionId === selectedDivision;
    }
    return true;
  });

  const handleSave = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.teamId) {
      alert('El nombre, apellido y el equipo son requeridos');
      return;
    }

    let updatedPlayers: Player[];

    if (editingPlayer) {
      updatedPlayers = players.map(p =>
        p.id === editingPlayer.id
          ? {
              ...editingPlayer,
              firstName: formData.firstName,
              lastName: formData.lastName,
              teamId: formData.teamId,
              number: formData.number,
              position: formData.position,
              photoUrl: formData.photoUrl || undefined,
            }
          : p
      );
    } else {
      const newPlayer: Player = {
        id: generateId(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        teamId: formData.teamId,
        number: formData.number,
        position: formData.position,
        photoUrl: formData.photoUrl || undefined,
      };
      updatedPlayers = [...players, newPlayer];
    }

    savePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este jugador?')) {
      return;
    }
    const updatedPlayers = players.filter(p => p.id !== id);
    savePlayers(updatedPlayers);
    setPlayers(updatedPlayers);
  };

  const openModal = (player?: Player) => {
    if (player) {
      const teamDivisionId = teams.find(t => t.id === player.teamId)?.divisionId || '';
      setEditingPlayer(player);
      setModalDivisionId(teamDivisionId);
      setFormData({
        firstName: player.firstName,
        lastName: player.lastName,
        teamId: player.teamId,
        number: player.number,
        position: player.position,
        photoUrl: player.photoUrl || '',
      });
    } else {
      setEditingPlayer(null);
      const defaultDivisionId = selectedDivision !== 'all'
        ? selectedDivision
        : teams[0]?.divisionId || '';
      const defaultTeamId = teams.find(t => t.divisionId === defaultDivisionId)?.id || '';
      setModalDivisionId(defaultDivisionId);
      setFormData({
        firstName: '',
        lastName: '',
        teamId: defaultTeamId,
        number: 1,
        position: 'Mediocampista',
        photoUrl: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Sin equipo';
  };

  const getTeamLogo = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.logoUrl;
  };

  const getPlayerFullName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`.trim();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFormData({ ...formData, photoUrl: base64 });
      } catch (error) {
        alert('Error al cargar la imagen');
      }
    }
  };

  const modalTeams = modalDivisionId
    ? teams.filter(t => t.divisionId === modalDivisionId)
    : teams;

  const positionColors: Record<PlayerPosition, string> = {
    'Arquero': 'bg-amber-500/15 text-amber-300',
    'Defensor': 'bg-sky-500/15 text-sky-300',
    'Mediocampista': 'bg-emerald-500/15 text-emerald-300',
    'Delantero': 'bg-rose-500/15 text-rose-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Jugadores</h2>
          <p className="text-muted-foreground">Gestiona el plantel de cada equipo</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={teams.length === 0}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Nuevo Jugador
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
          <UserCircle className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No hay equipos</h3>
          <p className="text-muted-foreground">Primero debes crear equipos antes de agregar jugadores</p>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Filtrar por división
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value);
                    setSelectedTeam('all');
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">Todas las divisiones</option>
                  {divisions.map(division => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Filtrar por equipo
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">Todos los equipos</option>
                  {filteredTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lista de jugadores */}
          {filteredPlayers.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
              <UserCircle className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No hay jugadores</h3>
              <p className="text-muted-foreground mb-6">Comienza agregando tu primer jugador</p>
              <button
                onClick={() => openModal()}
                className="rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Agregar Jugador
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-accent/60 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Número
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Jugador
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Equipo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Posición
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPlayers.map(player => {
                      const teamLogo = getTeamLogo(player.teamId);
                      return (
                        <tr key={player.id} className="hover:bg-accent/40">
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-accent/70 rounded-full">
                              <span className="font-semibold text-foreground">{player.number}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {player.photoUrl ? (
                                <img
                                  src={player.photoUrl}
                                  alt={getPlayerFullName(player)}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <UserCircle className="w-8 h-8 text-muted-foreground" />
                              )}
                              <span className="font-medium text-foreground">{getPlayerFullName(player)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {teamLogo ? (
                                <img src={teamLogo} alt="" className="w-6 h-6 object-contain" />
                              ) : null}
                              <span className="text-muted-foreground">{getTeamName(player.teamId)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${positionColors[player.position]}`}>
                              {player.position}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => openModal(player)}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(player.id)}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  División
                </label>
                <select
                  value={modalDivisionId}
                  onChange={(e) => {
                    const nextDivisionId = e.target.value;
                    const nextTeams = teams.filter(team => team.divisionId === nextDivisionId);
                    setModalDivisionId(nextDivisionId);
                    setFormData({
                      ...formData,
                      teamId: nextTeams[0]?.id || '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {divisions.map(division => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Equipo
                </label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {modalTeams.length === 0 ? (
                    <option value="">Sin equipos</option>
                  ) : modalTeams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Posición
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as PlayerPosition })}
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
                  {formData.photoUrl && (
                    <img
                      src={formData.photoUrl}
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
                      onChange={handlePhotoUpload}
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
