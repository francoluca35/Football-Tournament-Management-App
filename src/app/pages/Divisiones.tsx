import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { getDivisions, saveDivisions, getTeams, getCompetitions, saveCompetitions } from '../storage';
import type { Division, TournamentType, Tiebreaker, Competition } from '../types';
import { generateId } from '../utils';

type CompetitionFormData = {
  name: string;
  startDate: string;
  endDate: string;
  twoLeggedKnockout: boolean;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: Tiebreaker[];
  maxTeams: number | '';
  zonesEnabled: boolean;
  zonesCount: number;
  groupCount: number;
  roundRobinHomeAway: boolean;
};

export function Divisiones() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isDivisionModalOpen, setIsDivisionModalOpen] = useState(false);
  const [isCompetitionModalOpen, setIsCompetitionModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [expandedDivisionId, setExpandedDivisionId] = useState<string | null>(null);
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TournamentType | null>(null);
  const [divisionName, setDivisionName] = useState('');
  const [competitionForm, setCompetitionForm] = useState<CompetitionFormData>({
    name: '',
    startDate: '',
    endDate: '',
    twoLeggedKnockout: true,
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tiebreakers: ['points', 'goalDifference', 'goalsFor'] as Tiebreaker[],
    maxTeams: '',
    zonesEnabled: false,
    zonesCount: 2,
    groupCount: 2,
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
    setCompetitions(getCompetitions());
  }, []);

  const handleSaveDivision = () => {
    if (!divisionName.trim()) {
      alert('El nombre de la división es requerido');
      return;
    }

    let updatedDivisions: Division[];

    if (editingDivision) {
      updatedDivisions = divisions.map(d =>
        d.id === editingDivision.id ? { ...editingDivision, name: divisionName } : d
      );
    } else {
      const newDivision: Division = {
        id: generateId(),
        name: divisionName.trim(),
      };
      updatedDivisions = [...divisions, newDivision];
    }

    saveDivisions(updatedDivisions);
    setDivisions(updatedDivisions);
    closeDivisionModal();
  };

  const handleSaveCompetition = () => {
    if (!activeDivisionId) {
      alert('Seleccioná una división');
      return;
    }
    if (!selectedType) {
      alert('Seleccioná si la competencia es torneo o copa');
      return;
    }
    if (!competitionForm.name.trim()) {
      alert(selectedType === 'torneo' ? 'El nombre del torneo es requerido' : 'El nombre de la copa es requerido');
      return;
    }
    if (selectedType === 'copa') {
      if (competitionForm.maxTeams === '' || Number(competitionForm.maxTeams) < 2) {
        alert('Ingresá la cantidad de equipos de la copa');
        return;
      }
      if (competitionForm.groupCount < 2) {
        alert('La fase de grupos debe tener al menos 2 grupos');
        return;
      }
      if (competitionForm.groupCount % 2 !== 0) {
        alert('La cantidad de grupos debe ser par');
        return;
      }
    }

    const maxTeams = competitionForm.maxTeams === '' ? undefined : Number(competitionForm.maxTeams);
    const payload: Competition = {
      id: editingCompetition?.id ?? generateId(),
      divisionId: activeDivisionId,
      name: competitionForm.name.trim(),
      tournamentType: selectedType,
      startDate: competitionForm.startDate || undefined,
      endDate: competitionForm.endDate || undefined,
      twoLeggedKnockout: selectedType === 'copa' ? competitionForm.twoLeggedKnockout : undefined,
      pointsWin: competitionForm.pointsWin,
      pointsDraw: competitionForm.pointsDraw,
      pointsLoss: competitionForm.pointsLoss,
      tiebreakers: normalizeTiebreakers(competitionForm.tiebreakers),
      maxTeams,
      zonesEnabled: selectedType === 'torneo' ? competitionForm.zonesEnabled : true,
      zonesCount: selectedType === 'torneo'
        ? (competitionForm.zonesEnabled ? competitionForm.zonesCount : undefined)
        : competitionForm.groupCount,
      groupCount: selectedType === 'copa' ? competitionForm.groupCount : undefined,
      roundRobinHomeAway: selectedType === 'torneo' ? competitionForm.roundRobinHomeAway : false,
    };

    const updatedCompetitions = editingCompetition
      ? competitions.map(c => (c.id === editingCompetition.id ? payload : c))
      : [...competitions, payload];
    saveCompetitions(updatedCompetitions);
    setCompetitions(updatedCompetitions);
    closeCompetitionModal();
  };

  const handleDelete = (id: string) => {
    const teams = getTeams();
    const hasTeams = teams.some(t => t.divisionId === id);
    const hasCompetitions = competitions.some(c => c.divisionId === id);
    
    if (hasTeams) {
      if (!confirm('Esta división tiene equipos asignados. ¿Estás seguro de eliminarla?')) {
        return;
      }
    }
    if (!hasTeams && hasCompetitions) {
      if (!confirm('Esta división tiene torneos creados. ¿Estás seguro de eliminarla?')) {
        return;
      }
    }

    const updatedDivisions = divisions.filter(d => d.id !== id);
    saveDivisions(updatedDivisions);
    setDivisions(updatedDivisions);

    if (hasCompetitions) {
      const updatedCompetitions = competitions.filter(c => c.divisionId !== id);
      saveCompetitions(updatedCompetitions);
      setCompetitions(updatedCompetitions);
    }
  };

  const handleTypeSelect = (type: TournamentType) => {
    setSelectedType(type);
    setCompetitionForm(prev => ({ ...prev }));
  };

  const openDivisionModal = (division?: Division) => {
    if (division) {
      setEditingDivision(division);
      setDivisionName(division.name);
    } else {
      setEditingDivision(null);
      setDivisionName('');
    }
    setIsDivisionModalOpen(true);
  };

  const closeDivisionModal = () => {
    setIsDivisionModalOpen(false);
    setEditingDivision(null);
    setDivisionName('');
  };

  const openCompetitionModal = (divisionId: string) => {
    setActiveDivisionId(divisionId);
    setEditingCompetition(null);
    setSelectedType(null);
    setCompetitionForm({
      name: '',
      startDate: '',
      endDate: '',
      twoLeggedKnockout: true,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      tiebreakers: ['points', 'goalDifference', 'goalsFor'],
      maxTeams: '',
      zonesEnabled: false,
      zonesCount: 2,
      groupCount: 2,
      roundRobinHomeAway: false,
    });
    setIsCompetitionModalOpen(true);
  };

  const openCompetitionEditModal = (competition: Competition) => {
    setActiveDivisionId(competition.divisionId);
    setEditingCompetition(competition);
    setSelectedType(competition.tournamentType);
    setCompetitionForm({
      name: competition.name,
      startDate: competition.startDate ?? '',
      endDate: competition.endDate ?? '',
      twoLeggedKnockout: competition.twoLeggedKnockout ?? true,
      pointsWin: competition.pointsWin ?? 3,
      pointsDraw: competition.pointsDraw ?? 1,
      pointsLoss: competition.pointsLoss ?? 0,
      tiebreakers: normalizeTiebreakers(
        competition.tiebreakers && competition.tiebreakers.length > 0
          ? competition.tiebreakers
          : ['points', 'goalDifference', 'goalsFor']
      ),
      maxTeams: competition.maxTeams ?? '',
      zonesEnabled: competition.zonesEnabled ?? false,
      zonesCount: competition.zonesCount ?? 2,
      groupCount: competition.groupCount ?? competition.zonesCount ?? 2,
      roundRobinHomeAway: competition.roundRobinHomeAway ?? false,
    });
    setIsCompetitionModalOpen(true);
  };

  const closeCompetitionModal = () => {
    setIsCompetitionModalOpen(false);
    setActiveDivisionId(null);
    setEditingCompetition(null);
    setSelectedType(null);
  };

  const getTeamCount = (divisionId: string) => {
    const teams = getTeams();
    return teams.filter(t => t.divisionId === divisionId).length;
  };

  const getDivisionCompetitions = (divisionId: string) => {
    return competitions.filter(c => c.divisionId === divisionId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Divisiones</h2>
          <p className="text-muted-foreground">Gestiona las categorías del torneo</p>
        </div>
        <button
          onClick={() => openDivisionModal()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva División
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card/80 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-2">Configurable</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Creá torneos dentro de cada división y configurá su formato.
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
            onClick={() => openDivisionModal()}
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
                <button
                  type="button"
                  onClick={() => setExpandedDivisionId(prev => (prev === division.id ? null : division.id))}
                  className="flex items-center gap-3 text-left"
                >
                  <div className="rounded-lg border border-primary/30 bg-primary/15 p-2">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{division.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {getDivisionCompetitions(division.id).length} torneos creados
                    </span>
                  </div>
                  {expandedDivisionId === division.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openDivisionModal(division)}
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
                  <span>Torneos:</span>
                  <span className="font-semibold text-foreground">{getDivisionCompetitions(division.id).length}</span>
                </div>
              </div>

              {expandedDivisionId === division.id && (
                <div className="mt-4 border-t border-border/60 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Torneos de la división</h4>
                    <button
                      onClick={() => openCompetitionModal(division.id)}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Crear torneo
                    </button>
                  </div>
                  {getDivisionCompetitions(division.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Todavía no hay torneos. Creá el primero para esta división.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getDivisionCompetitions(division.id).map((competition) => (
                        <div
                          key={competition.id}
                          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                        >
                          <div>
                            <div className="font-medium text-foreground">{competition.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {competition.tournamentType === 'torneo' ? 'Torneo largo' : 'Copa de liga'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                competition.tournamentType === 'torneo'
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-amber-500/15 text-amber-300'
                              }`}
                            >
                              {competition.tournamentType === 'torneo' ? 'Liga' : 'Copa'}
                            </span>
                            <button
                              onClick={() => openCompetitionEditModal(competition)}
                              className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent/70 rounded-md transition-colors"
                              aria-label="Editar torneo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal División */}
      {isDivisionModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
            <h3 className="text-xl font-semibold text-foreground mb-4 px-6 pt-6">
              {editingDivision ? 'Editar División' : 'Nueva División'}
            </h3>

            <div className="space-y-4 px-6 pb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={divisionName}
                  onChange={(e) => setDivisionName(e.target.value)}
                  placeholder="Ej: Primera División"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={closeDivisionModal}
                className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDivision}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Competición */}
      {isCompetitionModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <h3 className="text-xl font-semibold text-foreground mb-4 px-6 pt-6">
              {editingCompetition ? 'Editar Torneo' : 'Crear Torneo'}
            </h3>

            <div className="space-y-4 overflow-y-auto px-6 pb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Tipo de Competición
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeSelect('torneo')}
                    className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                      selectedType === 'torneo'
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    <div className="text-sm font-semibold">Torneo largo</div>
                    <div className="text-xs text-muted-foreground">Liga tradicional</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeSelect('copa')}
                    className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                      selectedType === 'copa'
                        ? 'border-amber-500/60 bg-amber-500/10 text-foreground'
                        : 'border-border hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    <div className="text-sm font-semibold">Copa de liga</div>
                    <div className="text-xs text-muted-foreground">Grupos + Eliminatorias</div>
                  </button>
                </div>
              </div>

              {selectedType === 'torneo' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Nombre del torneo
                    </label>
                    <input
                      type="text"
                      value={competitionForm.name}
                      onChange={(e) => setCompetitionForm({ ...competitionForm, name: e.target.value })}
                      placeholder="Ej: Torneo Apertura"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Fecha de inicio
                      </label>
                      <input
                        type="date"
                        value={competitionForm.startDate}
                        onChange={(e) => setCompetitionForm({ ...competitionForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Fecha de finalización
                      </label>
                      <input
                        type="date"
                        value={competitionForm.endDate}
                        onChange={(e) => setCompetitionForm({ ...competitionForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Reglas de puntos</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Victoria
                        </label>
                        <input
                          type="number"
                          value={competitionForm.pointsWin}
                          onChange={(e) => setCompetitionForm({ ...competitionForm, pointsWin: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Empate
                        </label>
                        <input
                          type="number"
                          value={competitionForm.pointsDraw}
                          onChange={(e) => setCompetitionForm({ ...competitionForm, pointsDraw: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Derrota
                        </label>
                        <input
                          type="number"
                          value={competitionForm.pointsLoss}
                          onChange={(e) => setCompetitionForm({ ...competitionForm, pointsLoss: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Criterios de desempate</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {competitionForm.tiebreakers.map((value, index) => (
                        <div key={`${value}-${index}`}>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            {index + 1}º criterio
                          </label>
                          <select
                            value={value}
                            onChange={(e) => {
                              const next = [...competitionForm.tiebreakers];
                              next[index] = e.target.value as Tiebreaker;
                              setCompetitionForm({ ...competitionForm, tiebreakers: next });
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
                      value={competitionForm.maxTeams}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCompetitionForm({ ...competitionForm, maxTeams: value === '' ? '' : Number(value) });
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
                          checked={competitionForm.zonesEnabled}
                          onChange={(e) => setCompetitionForm({ ...competitionForm, zonesEnabled: e.target.checked })}
                          className="w-4 h-4 rounded border-border bg-input-background text-primary focus:ring-primary/40"
                        />
                        <label htmlFor="zonesEnabled" className="text-sm text-muted-foreground">
                          Dividir en zonas
                        </label>
                      </div>
                      {competitionForm.zonesEnabled && (
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Cantidad de zonas
                          </label>
                          <input
                            type="number"
                            min="2"
                            value={competitionForm.zonesCount}
                            onChange={(e) => setCompetitionForm({ ...competitionForm, zonesCount: Number(e.target.value) })}
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
                        checked={competitionForm.roundRobinHomeAway}
                        onChange={(e) => setCompetitionForm({ ...competitionForm, roundRobinHomeAway: e.target.checked })}
                        className="w-4 h-4 rounded border-border bg-input-background text-primary focus:ring-primary/40"
                      />
                      Ida y vuelta en fase regular
                    </label>
                  </div>
                </>
              )}

              {selectedType === 'copa' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Nombre de la copa
                    </label>
                    <input
                      type="text"
                      value={competitionForm.name}
                      onChange={(e) => setCompetitionForm({ ...competitionForm, name: e.target.value })}
                      placeholder="Ej: Copa de Liga"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Fecha de inicio
                      </label>
                      <input
                        type="date"
                        value={competitionForm.startDate}
                        onChange={(e) => setCompetitionForm({ ...competitionForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Fecha de finalización
                      </label>
                      <input
                        type="date"
                        value={competitionForm.endDate}
                        onChange={(e) => setCompetitionForm({ ...competitionForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Cantidad de equipos
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={competitionForm.maxTeams}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCompetitionForm({ ...competitionForm, maxTeams: value === '' ? '' : Number(value) });
                      }}
                      placeholder="Ej: 16"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Fase de grupos (cantidad de grupos)
                    </label>
                    <input
                      type="number"
                      min="2"
                      step="2"
                      value={competitionForm.groupCount}
                      onChange={(e) => setCompetitionForm({ ...competitionForm, groupCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      La cantidad de grupos debe ser par.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="twoLegged"
                      checked={competitionForm.twoLeggedKnockout}
                      onChange={(e) => setCompetitionForm({ ...competitionForm, twoLeggedKnockout: e.target.checked })}
                      className="w-4 h-4 rounded border-border bg-input-background text-primary focus:ring-primary/40"
                    />
                    <label htmlFor="twoLegged" className="text-sm text-muted-foreground">
                      Eliminatoria ida y vuelta
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={closeCompetitionModal}
                className="flex-1 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCompetition}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {editingCompetition ? 'Guardar cambios' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
