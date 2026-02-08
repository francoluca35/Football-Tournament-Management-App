import { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Settings2, ShieldCheck, Save, Play } from 'lucide-react';
import { calculateStandings } from '../utils';
import {
  getDivisions,
  getTeams,
  getMatches,
  saveTeams,
  getTournamentSettings,
  saveTournamentSettings,
  getMovementsLog,
  saveMovementsLog,
  getCompetitions,
} from '../storage';
import type { Division, Match, Team, TournamentSettings, Competition } from '../types';

type MovementDetail = {
  upper: Division;
  lower: Division;
  promoted: Team[];
  relegated: Team[];
};

export function Configuraciones() {
  const [settings, setSettings] = useState<TournamentSettings>(getTournamentSettings());
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [movementLog, setMovementLog] = useState<Record<string, string>>(getMovementsLog());

  useEffect(() => {
    setDivisions(getDivisions());
    setCompetitions(getCompetitions());
    setTeams(getTeams());
    setMatches(getMatches());
    setMovementLog(getMovementsLog());
    setSettings(getTournamentSettings());
  }, []);

  const orderedDivisions = useMemo(() => {
    if (settings.applyToCups) {
      return divisions.filter(division =>
        competitions.some(competition => competition.divisionId === division.id)
      );
    }
    return divisions.filter(division =>
      competitions.some(competition =>
        competition.divisionId === division.id && competition.tournamentType === 'torneo'
      )
    );
  }, [divisions, competitions, settings.applyToCups]);

  const normalizeSettings = (next: TournamentSettings) => ({
    promotionsPerDivision: Math.max(0, Math.floor(next.promotionsPerDivision)),
    relegationsPerDivision: Math.max(0, Math.floor(next.relegationsPerDivision)),
    applyToCups: Boolean(next.applyToCups),
  });

  const getPrimaryCompetition = (divisionId: string) => {
    const divisionCompetitions = competitions.filter(c => c.divisionId === divisionId);
    if (settings.applyToCups) {
      return divisionCompetitions[0];
    }
    return divisionCompetitions.find(c => c.tournamentType === 'torneo');
  };

  const isDivisionFinished = (competition: Competition | undefined, competitionMatches: Match[]) => {
    if (competition?.endDate) {
      const endDate = new Date(`${competition.endDate}T23:59:59`);
      if (!Number.isNaN(endDate.getTime()) && new Date() > endDate) {
        return true;
      }
    }
    if (competitionMatches.length === 0) return false;
    return competitionMatches.every(match =>
      match.status === 'completed' ||
      (match.homeScore !== undefined && match.awayScore !== undefined)
    );
  };

  const getDivisionFinishKey = (competition: Competition | undefined, competitionMatches: Match[]) => {
    if (!isDivisionFinished(competition, competitionMatches)) return '';
    if (competition?.endDate) return competition.endDate;
    return `matches-complete-${competitionMatches.length}`;
  };

  const handleSaveSettings = () => {
    const normalized = normalizeSettings(settings);
    setSettings(normalized);
    saveTournamentSettings(normalized);
    alert('Configuraciones guardadas.');
  };

  const handleApplyMovements = () => {
    const normalized = normalizeSettings(settings);
    if (normalized.promotionsPerDivision === 0 && normalized.relegationsPerDivision === 0) {
      alert('Definí al menos un ascenso o descenso.');
      return;
    }
    if (orderedDivisions.length < 2) {
      alert('Necesitas al menos 2 divisiones para aplicar ascensos/descensos.');
      return;
    }

    if (!confirm('Esto moverá equipos entre divisiones. ¿Deseas continuar?')) {
      return;
    }

    const matchesByDivision = new Map<string, Match[]>();
    divisions.forEach(division => {
      const competition = getPrimaryCompetition(division.id);
      const divisionMatches = matches.filter(match =>
        match.divisionId === division.id &&
        (competition?.id
          ? (match.competitionId ? match.competitionId === competition.id : true)
          : match.competitionId === undefined)
      );
      matchesByDivision.set(division.id, divisionMatches);
    });

    const moves: Record<string, string> = {};
    const details: MovementDetail[] = [];
    const nextLog = { ...movementLog };

    for (let i = 0; i < orderedDivisions.length - 1; i += 1) {
      const upper = orderedDivisions[i];
      const lower = orderedDivisions[i + 1];
      const upperCompetition = getPrimaryCompetition(upper.id);
      const lowerCompetition = getPrimaryCompetition(lower.id);
      const upperMatches = matchesByDivision.get(upper.id) ?? [];
      const lowerMatches = matchesByDivision.get(lower.id) ?? [];

      if (!isDivisionFinished(upperCompetition, upperMatches) || !isDivisionFinished(lowerCompetition, lowerMatches)) {
        continue;
      }

      const upperFinishKey = getDivisionFinishKey(upperCompetition, upperMatches);
      const lowerFinishKey = getDivisionFinishKey(lowerCompetition, lowerMatches);
      if (
        (upperFinishKey && movementLog[upper.id] === upperFinishKey) ||
        (lowerFinishKey && movementLog[lower.id] === lowerFinishKey)
      ) {
        continue;
      }

      const upperTeams = teams.filter(team => team.divisionId === upper.id);
      const lowerTeams = teams.filter(team => team.divisionId === lower.id);
      if (upperTeams.length === 0 || lowerTeams.length === 0) {
        continue;
      }

      const upperStandings = calculateStandings(upperTeams, upperMatches, {
        pointsWin: upperCompetition?.pointsWin,
        pointsDraw: upperCompetition?.pointsDraw,
        pointsLoss: upperCompetition?.pointsLoss,
        tiebreakers: upperCompetition?.tiebreakers,
      });
      const lowerStandings = calculateStandings(lowerTeams, lowerMatches, {
        pointsWin: lowerCompetition?.pointsWin,
        pointsDraw: lowerCompetition?.pointsDraw,
        pointsLoss: lowerCompetition?.pointsLoss,
        tiebreakers: lowerCompetition?.tiebreakers,
      });

      const relegationsCount = Math.min(normalized.relegationsPerDivision, upperStandings.length);
      const promotionsCount = Math.min(normalized.promotionsPerDivision, lowerStandings.length);

      const relegatedIds = relegationsCount > 0
        ? upperStandings.slice(-relegationsCount).map(standing => standing.teamId)
        : [];
      const promotedIds = promotionsCount > 0
        ? lowerStandings.slice(0, promotionsCount).map(standing => standing.teamId)
        : [];

      if (relegatedIds.length === 0 && promotedIds.length === 0) {
        continue;
      }

      const relegatedTeams = upperTeams.filter(team => relegatedIds.includes(team.id));
      const promotedTeams = lowerTeams.filter(team => promotedIds.includes(team.id));

      relegatedIds.forEach(teamId => {
        moves[teamId] = lower.id;
      });
      promotedIds.forEach(teamId => {
        moves[teamId] = upper.id;
      });

      if (upperFinishKey) nextLog[upper.id] = upperFinishKey;
      if (lowerFinishKey) nextLog[lower.id] = lowerFinishKey;

      details.push({
        upper,
        lower,
        promoted: promotedTeams,
        relegated: relegatedTeams,
      });
    }

    const movedTeams = Object.keys(moves);
    if (movedTeams.length === 0) {
      alert('No se encontraron divisiones finalizadas para aplicar movimientos.');
      return;
    }

    const updatedTeams = teams.map(team =>
      moves[team.id]
        ? { ...team, divisionId: moves[team.id] }
        : team
    );

    saveTeams(updatedTeams);
    setTeams(updatedTeams);
    saveMovementsLog(nextLog);
    setMovementLog(nextLog);

    const summary = details
      .map(detail =>
        `✅ ${detail.upper.name} / ${detail.lower.name}: ` +
        `Ascensos ${detail.promoted.length} - Descensos ${detail.relegated.length}`
      )
      .join('\n');
    alert(`Movimientos aplicados.\n${summary || ''}`.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Configuraciones</h2>
          <p className="text-muted-foreground">Ajustes generales de ascensos y descensos</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-accent/60 p-2">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Reglas de movimiento</h3>
            <p className="text-sm text-muted-foreground">
              Se toma el orden de las divisiones para definir la liga superior e inferior.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
              Ascensos por división
            </label>
            <input
              type="number"
              min={0}
              value={settings.promotionsPerDivision}
              onChange={(e) => setSettings({ ...settings, promotionsPerDivision: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-rose-400" />
              Descensos por división
            </label>
            <input
              type="number"
              min={0}
              value={settings.relegationsPerDivision}
              onChange={(e) => setSettings({ ...settings, relegationsPerDivision: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Aplicar en copas</label>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, applyToCups: !settings.applyToCups })}
                className={`h-6 w-12 rounded-full border border-border transition ${
                  settings.applyToCups ? 'bg-primary/70' : 'bg-muted'
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-background transition ${
                    settings.applyToCups ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Si está activo, también se aplicará para divisiones configuradas como copa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            Guardar configuraciones
          </button>
          <button
            onClick={handleApplyMovements}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-foreground hover:bg-accent/60 transition-colors"
          >
            <Play className="w-4 h-4" />
            Aplicar ascensos/descensos
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-accent/60 p-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Orden de ligas</h3>
            <p className="text-sm text-muted-foreground">
              La primera división de la lista es la liga superior.
            </p>
          </div>
        </div>

        {orderedDivisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay divisiones disponibles.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {orderedDivisions.map((division, index) => (
              <div
                key={division.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-3 py-2"
              >
                <span className="text-muted-foreground">#{index + 1}</span>
                <span className="font-semibold text-foreground">{division.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
