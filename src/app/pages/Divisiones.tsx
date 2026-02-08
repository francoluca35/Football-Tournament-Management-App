import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Trophy } from 'lucide-react';
import { getDivisions, saveDivisions, getTeams } from '../storage';
import type { Division, TournamentType, Tiebreaker } from '../types';
import { generateId } from '../utils';

type DivisionFormData = {
  name: string;
  tournamentType: TournamentType;
  startDate: string;
  endDate: string;
  regularPhaseMatches: number;
  twoLeggedKnockout: boolean;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: Tiebreaker[];
  maxTeams: number | '';
  zonesEnabled: boolean;
  zonesCount: number;
  roundRobinHomeAway: boolean;
};

export function Divisiones() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [formData, setFormData] = useState<DivisionFormData>({
    name: '',
    tournamentType: 'torneo' as TournamentType,
    startDate: '',
    endDate: '',
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
              startDate: formData.startDate || undefined,
              endDate: formData.endDate || undefined,
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
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
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
        startDate: division.startDate ?? '',
        endDate: division.endDate ?? '',
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
        startDate: '',
        endDate: '',
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
          <h2 className="text-2xl font-semibold text-foreground">Divisiones</h2>
          <p className="text-muted-foreground">Gestiona las categorías del torneo</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva División
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card/80 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-2">Configurable</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ajustes definidos en la card 01 — Visión & reglas del torneo.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between border border-border/60 rounded-lg px-3 py-2">
            <span>Tipo de torneo</span>
            <span className="font-semibold text-foreground">Liga / Copa</span>
          </div>
          <div className="flex items-center justify-between border border-border/60 rounded-lg px-3 py-2">
            <span>Formato por zonas</span>
            <span className="font-semibold text-foreground">Opcional</span>
          </div>
          <div className="flex items-center justify-between border border-border/60 rounded-lg px-3 py-2">
            <span>Ida y vuelta</span>
            <span className="font-semibold text-foreground">Fase regular</span>
          </div>
          <div className="flex items-center justify-between border border-border/60 rounded-lg px-3 py-2">
            <span>Reglas de puntos</span>
            <span className="font-semibold text-foreground">Victoria / Empate / Derrota</span>
          </div>
          <div className="flex items-center justify-between border border-border/60 rounded-lg px-3 py-2">
            <span>Criterios de desempate</span>
            <span className="font-semibold text-foreground">Orden configurable</span>
          </div>
          <div className="flex items-center justify-between border border-border/60 rounded-lg px-3 py-2">
            <span>Límite de equipos</span>
            <span className="font-semibold text-foreground">Opcional</span>
          </div>
        </div>
      </div>

      {/* Lista de divisiones */}
      {divisions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/80 p-12 text-center shadow-sm">
          <Trophy className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No hay divisiones</h3>
          <p className="text-muted-foreground mb-6">Comienza creando tu primera división</p>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Crear División
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {divisions.map(division => (
            <div key={division.id} className="rounded-xl border border-border bg-card/80 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-primary/30 bg-primary/15 p-2">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{division.name}</h3>
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                      division.tournamentType === 'torneo'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {division.tournamentType === 'torneo' ? 'Liga' : 'Copa'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(division)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/70 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(division.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Equipos:</span>
                  <span className="font-semibold text-foreground">{getTeamCount(division.id)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inicio:</span>
                  <span className="font-semibold text-foreground">
                    {division.startDate || 'Sin fecha'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Finalizado:</span>
                  <span className="font-semibold text-foreground">
                    {division.endDate || 'Sin fecha'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Disponibles:</span>
                  <span className="font-semibold text-foreground">
                    {division.maxTeams
                      ? Math.max(division.maxTeams - getTeamCount(division.id), 0)
                      : 'Sin límite'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Límite:</span>
                  <span className="font-semibold text-foreground">
                    {division.maxTeams ? `${division.maxTeams} equipos` : 'Sin límite'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Zonas:</span>
                  <span className="font-semibold text-foreground">
                    {division.zonesEnabled ? `${division.zonesCount ?? 2} zonas` : 'Sin zonas'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ida y vuelta:</span>
                  <span className="font-semibold text-foreground">
                    {division.roundRobinHomeAway ? 'Sí' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Puntos:</span>
                  <span className="font-semibold text-foreground">
                    {division.pointsWin ?? 3}/{division.pointsDraw ?? 1}/{division.pointsLoss ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Desempate:</span>
                  <span className="font-semibold text-foreground">
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
                      <span className="font-semibold text-foreground">{division.regularPhaseMatches} fechas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Eliminatorias:</span>
                      <span className="font-semibold text-foreground">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <h3 className="text-xl font-semibold text-foreground mb-4 px-6 pt-6">
              {editingDivision ? 'Editar División' : 'Nueva División'}
            </h3>

            <div className="space-y-4 overflow-y-auto px-6 pb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Primera División"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Tipo de Competición
                </label>
                <select
                  value={formData.tournamentType}
                  onChange={(e) => setFormData({ ...formData, tournamentType: e.target.value as TournamentType })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="torneo">Liga</option>
                  <option value="copa">Copa (Fase + Eliminatorias)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Fecha de finalizado
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {formData.tournamentType === 'copa' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Fechas de Fase Regular
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.regularPhaseMatches}
                      onChange={(e) => setFormData({ ...formData, regularPhaseMatches: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="twoLegged"
                      checked={formData.twoLeggedKnockout}
                      onChange={(e) => setFormData({ ...formData, twoLeggedKnockout: e.target.checked })}
                      className="w-4 h-4 rounded border-border bg-input-background text-primary focus:ring-primary/40"
                    />
                    <label htmlFor="twoLegged" className="text-sm text-muted-foreground">
                      Eliminatorias ida y vuelta
                    </label>
                  </div>
                </>
              )}

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Reglas de puntos</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Victoria
                    </label>
                    <input
                      type="number"
                      value={formData.pointsWin}
                      onChange={(e) => setFormData({ ...formData, pointsWin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Empate
                    </label>
                    <input
                      type="number"
                      value={formData.pointsDraw}
                      onChange={(e) => setFormData({ ...formData, pointsDraw: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Derrota
                    </label>
                    <input
                      type="number"
                      value={formData.pointsLoss}
                      onChange={(e) => setFormData({ ...formData, pointsLoss: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Criterios de desempate</h4>
                <div className="grid grid-cols-1 gap-3">
                  {formData.tiebreakers.map((value, index) => (
                    <div key={`${value}-${index}`}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {index + 1}º criterio
                      </label>
                      <select
                        value={value}
                        onChange={(e) => {
                          const next = [...formData.tiebreakers];
                          next[index] = e.target.value as Tiebreaker;
                          setFormData({ ...formData, tiebreakers: next });
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                <label className="block text-sm font-medium text-muted-foreground mb-1">
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
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Formato de zonas</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="zonesEnabled"
                      checked={formData.zonesEnabled}
                      onChange={(e) => setFormData({ ...formData, zonesEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-border bg-input-background text-primary focus:ring-primary/40"
                    />
                    <label htmlFor="zonesEnabled" className="text-sm text-muted-foreground">
                      Dividir en zonas
                    </label>
                  </div>
                  {formData.zonesEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Cantidad de zonas
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={formData.zonesCount}
                        onChange={(e) => setFormData({ ...formData, zonesCount: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={formData.roundRobinHomeAway}
                    onChange={(e) => setFormData({ ...formData, roundRobinHomeAway: e.target.checked })}
                    className="w-4 h-4 rounded border-border bg-input-background text-primary focus:ring-primary/40"
                  />
                  Ida y vuelta en fase regular
                </label>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
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
