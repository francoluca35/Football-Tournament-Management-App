import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Trophy } from 'lucide-react';
import { getDivisions, saveDivisions, getTeams } from '../storage';
import type { Division, TournamentType } from '../types';
import { generateId } from '../utils';

export function Divisiones() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tournamentType: 'torneo' as TournamentType,
    regularPhaseMatches: 6,
    twoLeggedKnockout: false,
  });

  useEffect(() => {
    setDivisions(getDivisions());
  }, []);

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('El nombre de la división es requerido');
      return;
    }

    let updatedDivisions: Division[];

    if (editingDivision) {
      updatedDivisions = divisions.map(d =>
        d.id === editingDivision.id
          ? {
              ...editingDivision,
              name: formData.name,
              tournamentType: formData.tournamentType,
              regularPhaseMatches: formData.tournamentType === 'copa' ? formData.regularPhaseMatches : undefined,
              twoLeggedKnockout: formData.tournamentType === 'copa' ? formData.twoLeggedKnockout : undefined,
            }
          : d
      );
    } else {
      const newDivision: Division = {
        id: generateId(),
        name: formData.name,
        tournamentType: formData.tournamentType,
        regularPhaseMatches: formData.tournamentType === 'copa' ? formData.regularPhaseMatches : undefined,
        twoLeggedKnockout: formData.tournamentType === 'copa' ? formData.twoLeggedKnockout : undefined,
      };
      updatedDivisions = [...divisions, newDivision];
    }

    saveDivisions(updatedDivisions);
    setDivisions(updatedDivisions);
    closeModal();
  };

  const handleDelete = (id: string) => {
    const teams = getTeams();
    const hasTeams = teams.some(t => t.divisionId === id);
    
    if (hasTeams) {
      if (!confirm('Esta división tiene equipos asignados. ¿Estás seguro de eliminarla?')) {
        return;
      }
    }

    const updatedDivisions = divisions.filter(d => d.id !== id);
    saveDivisions(updatedDivisions);
    setDivisions(updatedDivisions);
  };

  const openModal = (division?: Division) => {
    if (division) {
      setEditingDivision(division);
      setFormData({
        name: division.name,
        tournamentType: division.tournamentType,
        regularPhaseMatches: division.regularPhaseMatches || 6,
        twoLeggedKnockout: division.twoLeggedKnockout || false,
      });
    } else {
      setEditingDivision(null);
      setFormData({
        name: '',
        tournamentType: 'torneo',
        regularPhaseMatches: 6,
        twoLeggedKnockout: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDivision(null);
  };

  const getTeamCount = (divisionId: string) => {
    const teams = getTeams();
    return teams.filter(t => t.divisionId === divisionId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Divisiones</h2>
          <p className="text-gray-600">Gestiona las categorías del torneo</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva División
        </button>
      </div>

      {/* Lista de divisiones */}
      {divisions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay divisiones</h3>
          <p className="text-gray-600 mb-6">Comienza creando tu primera división</p>
          <button
            onClick={() => openModal()}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Crear División
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {divisions.map(division => (
            <div key={division.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Trophy className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{division.name}</h3>
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                      division.tournamentType === 'torneo'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {division.tournamentType === 'torneo' ? 'Torneo' : 'Copa'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(division)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(division.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Equipos:</span>
                  <span className="font-semibold text-gray-900">{getTeamCount(division.id)}</span>
                </div>
                {division.tournamentType === 'copa' && (
                  <>
                    <div className="flex justify-between">
                      <span>Fase Regular:</span>
                      <span className="font-semibold text-gray-900">{division.regularPhaseMatches} fechas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Eliminatorias:</span>
                      <span className="font-semibold text-gray-900">
                        {division.twoLeggedKnockout ? 'Ida y Vuelta' : 'Partido Único'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingDivision ? 'Editar División' : 'Nueva División'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Primera División"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Competición
                </label>
                <select
                  value={formData.tournamentType}
                  onChange={(e) => setFormData({ ...formData, tournamentType: e.target.value as TournamentType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="torneo">Torneo (Liga)</option>
                  <option value="copa">Copa (Fase + Eliminatorias)</option>
                </select>
              </div>

              {formData.tournamentType === 'copa' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fechas de Fase Regular
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.regularPhaseMatches}
                      onChange={(e) => setFormData({ ...formData, regularPhaseMatches: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="twoLegged"
                      checked={formData.twoLeggedKnockout}
                      onChange={(e) => setFormData({ ...formData, twoLeggedKnockout: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <label htmlFor="twoLegged" className="text-sm text-gray-700">
                      Eliminatorias ida y vuelta
                    </label>
                  </div>
                </>
              )}
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
