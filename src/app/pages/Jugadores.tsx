import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCircle } from 'lucide-react';
import { getTeams, getPlayers, savePlayers, getDivisions } from '../storage';
import type { Player, PlayerPosition } from '../types';
import { generateId } from '../utils';

export function Jugadores() {
  const [divisions, setDivisions] = useState(getDivisions());
  const [teams, setTeams] = useState(getTeams());
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    teamId: '',
    number: 1,
    position: 'Mediocampista' as PlayerPosition,
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
    if (!formData.name.trim() || !formData.teamId) {
      alert('El nombre y el equipo son requeridos');
      return;
    }

    let updatedPlayers: Player[];

    if (editingPlayer) {
      updatedPlayers = players.map(p =>
        p.id === editingPlayer.id
          ? {
              ...editingPlayer,
              name: formData.name,
              teamId: formData.teamId,
              number: formData.number,
              position: formData.position,
            }
          : p
      );
    } else {
      const newPlayer: Player = {
        id: generateId(),
        name: formData.name,
        teamId: formData.teamId,
        number: formData.number,
        position: formData.position,
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
      setEditingPlayer(player);
      setFormData({
        name: player.name,
        teamId: player.teamId,
        number: player.number,
        position: player.position,
      });
    } else {
      setEditingPlayer(null);
      setFormData({
        name: '',
        teamId: filteredTeams[0]?.id || teams[0]?.id || '',
        number: 1,
        position: 'Mediocampista',
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

  const positionColors: Record<PlayerPosition, string> = {
    'Arquero': 'bg-yellow-100 text-yellow-800',
    'Defensor': 'bg-blue-100 text-blue-800',
    'Mediocampista': 'bg-green-100 text-green-800',
    'Delantero': 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Jugadores</h2>
          <p className="text-gray-600">Gestiona el plantel de cada equipo</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={teams.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Nuevo Jugador
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay equipos</h3>
          <p className="text-gray-600">Primero debes crear equipos antes de agregar jugadores</p>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por división
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value);
                    setSelectedTeam('all');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por equipo
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay jugadores</h3>
              <p className="text-gray-600 mb-6">Comienza agregando tu primer jugador</p>
              <button
                onClick={() => openModal()}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Agregar Jugador
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Número
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Jugador
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Equipo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Posición
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPlayers.map(player => {
                      const teamLogo = getTeamLogo(player.teamId);
                      return (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                              <span className="font-bold text-gray-700">{player.number}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <UserCircle className="w-8 h-8 text-gray-400" />
                              <span className="font-medium text-gray-900">{player.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {teamLogo ? (
                                <img src={teamLogo} alt="" className="w-6 h-6 object-contain" />
                              ) : null}
                              <span className="text-gray-700">{getTeamName(player.teamId)}</span>
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
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(player.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Jugador
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Lionel Messi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipo
                </label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posición
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as PlayerPosition })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Arquero">Arquero</option>
                    <option value="Defensor">Defensor</option>
                    <option value="Mediocampista">Mediocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
