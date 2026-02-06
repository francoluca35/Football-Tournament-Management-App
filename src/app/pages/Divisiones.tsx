import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Trophy } from 'lucide-react';
import { getDivisions, saveDivisions, getTeams } from '../storage';
import type { Division, TournamentType, Tiebreaker } from '../types';
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
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tiebreakers: ['points', 'goalDifference', 'goalsFor'] as Tiebreaker[],
    maxTeams: '',
    zonesEnabled: false,
    zonesCount: 2,
    roundRobinHomeAway: false,
  });

  const tiebreakerOptions: { value: Tiebreaker; label: string }[] = [
    { value: 'points', label: 'Puntos' },
    { value: 'goalDifference', label: 'Diferencia de gol' },
    { value: 'goalsFor', label: 'Goles a favor' },
    { value: 'goalsAgainst', label: 'Goles en contra' },
  ];

  const normalizeTiebreakers = (tiebreakers: Tiebreaker[]) => {
    const unique = Array.from(new Set(tiebreakers));
    const fallback = tiebreakerOptions.map(option => option.value);
    return [...unique, ...fallback].slice(0, 3);
  };

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
              pointsWin: formData.pointsWin,
              pointsDraw: formData.pointsDraw,
              pointsLoss: formData.pointsLoss,
              tiebreakers: normalizeTiebreakers(formData.tiebreakers),
              maxTeams: formData.maxTeams === '' ? undefined : Number(formData.maxTeams),
              zonesEnabled: formData.zonesEnabled,
              zonesCount: formData.zonesEnabled ? formData.zonesCount : undefined,
              roundRobinHomeAway: formData.roundRobinHomeAway,
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
        pointsWin: formData.pointsWin,
        pointsDraw: formData.pointsDraw,
        pointsLoss: formData.pointsLoss,
        tiebreakers: normalizeTiebreakers(formData.tiebreakers),
        maxTeams: formData.maxTeams === '' ? undefined : Number(formData.maxTeams),
        zonesEnabled: formData.zonesEnabled,
        zonesCount: formData.zonesEnabled ? formData.zonesCount : undefined,
        roundRobinHomeAway: formData.roundRobinHomeAway,
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
        pointsWin: division.pointsWin ?? 3,
        pointsDraw: division.pointsDraw ?? 1,
        pointsLoss: division.pointsLoss ?? 0,
        tiebreakers: normalizeTiebreakers(
          division.tiebreakers && division.tiebreakers.length > 0
            ? division.tiebreakers
            : ['points', 'goalDifference', 'goalsFor']
        ),
        maxTeams: division.maxTeams ?? '',
        zonesEnabled: division.zonesEnabled ?? false,
        zonesCount: division.zonesCount ?? 2,
        roundRobinHomeAway: division.roundRobinHomeAway ?? false,
      });
    } else {
      setEditingDivision(null);
      setFormData({
        name: '',
        tournamentType: 'torneo',
        regularPhaseMatches: 6,
        twoLeggedKnockout: false,
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        tiebreakers: ['points', 'goalDifference', 'goalsFor'],
        maxTeams: '',
        zonesEnabled: false,
        zonesCount: 2,
        roundRobinHomeAway: false,
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

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Configurable</h3>
        <p className="text-sm text-gray-600 mb-4">
          Ajustes definidos en la card 01 — Visión & reglas del torneo.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Tipo de torneo</span>
            <span className="font-semibold text-gray-900">Liga / Copa</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Formato por zonas</span>
            <span className="font-semibold text-gray-900">Opcional</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Ida y vuelta</span>
            <span className="font-semibold text-gray-900">Fase regular</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Reglas de puntos</span>
            <span className="font-semibold text-gray-900">Victoria / Empate / Derrota</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Criterios de desempate</span>
            <span className="font-semibold text-gray-900">Orden configurable</span>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span>Límite de equipos</span>
            <span className="font-semibold text-gray-900">Opcional</span>
          </div>
        </div>
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
                <div className="flex justify-between">
                  <span>Límite:</span>
                  <span className="font-semibold text-gray-900">
                    {division.maxTeams ? `${division.maxTeams} equipos` : 'Sin límite'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Zonas:</span>
                  <span className="font-semibold text-gray-900">
                    {division.zonesEnabled ? `${division.zonesCount ?? 2} zonas` : 'Sin zonas'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ida y vuelta:</span>
                  <span className="font-semibold text-gray-900">
                    {division.roundRobinHomeAway ? 'Sí' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Puntos:</span>
                  <span className="font-semibold text-gray-900">
                    {division.pointsWin ?? 3}/{division.pointsDraw ?? 1}/{division.pointsLoss ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Desempate:</span>
                  <span className="font-semibold text-gray-900">
                    {(division.tiebreakers && division.tiebreakers.length > 0
                      ? division.tiebreakers
                      : ['points', 'goalDifference', 'goalsFor']
                    )
                      .map((item) => tiebreakerOptions.find(option => option.value === item)?.label ?? item)
                      .join(' → ')}
                  </span>
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-4 px-6 pt-6">
              {editingDivision ? 'Editar División' : 'Nueva División'}
            </h3>

            <div className="space-y-4 overflow-y-auto px-6 pb-6">
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

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Reglas de puntos</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Victoria
                    </label>
                    <input
                      type="number"
                      value={formData.pointsWin}
                      onChange={(e) => setFormData({ ...formData, pointsWin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Empate
                    </label>
                    <input
                      type="number"
                      value={formData.pointsDraw}
                      onChange={(e) => setFormData({ ...formData, pointsDraw: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Derrota
                    </label>
                    <input
                      type="number"
                      value={formData.pointsLoss}
                      onChange={(e) => setFormData({ ...formData, pointsLoss: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Criterios de desempate</h4>
                <div className="grid grid-cols-1 gap-3">
                  {formData.tiebreakers.map((value, index) => (
                    <div key={`${value}-${index}`}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {index + 1}º criterio
                      </label>
                      <select
                        value={value}
                        onChange={(e) => {
                          const next = [...formData.tiebreakers];
                          next[index] = e.target.value as Tiebreaker;
                          setFormData({ ...formData, tiebreakers: next });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {tiebreakerOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Límite de equipos (opcional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxTeams}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, maxTeams: value === '' ? '' : Number(value) });
                  }}
                  placeholder="Ej: 12"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Formato de zonas</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="zonesEnabled"
                      checked={formData.zonesEnabled}
                      onChange={(e) => setFormData({ ...formData, zonesEnabled: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <label htmlFor="zonesEnabled" className="text-sm text-gray-700">
                      Dividir en zonas
                    </label>
                  </div>
                  {formData.zonesEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cantidad de zonas
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={formData.zonesCount}
                        onChange={(e) => setFormData({ ...formData, zonesCount: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.roundRobinHomeAway}
                    onChange={(e) => setFormData({ ...formData, roundRobinHomeAway: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  Ida y vuelta en fase regular
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
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
