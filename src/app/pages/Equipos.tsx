import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Upload, Shield } from 'lucide-react';
import { getDivisions, getTeams, saveTeams, getPlayers } from '../storage';
import type { Team } from '../types';
import { generateId, fileToBase64 } from '../utils';

export function Equipos() {
  const [divisions, setDivisions] = useState(getDivisions());
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    divisionId: '',
    logoUrl: '',
  });

  useEffect(() => {
    setTeams(getTeams());
    setDivisions(getDivisions());
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
    const players = getPlayers();
    return players.filter(p => p.teamId === teamId).length;
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
                <div key={team.id} className="rounded-xl border border-border bg-card/80 p-6 shadow-sm">
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
                        onClick={() => openModal(team)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(team.id)}
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
