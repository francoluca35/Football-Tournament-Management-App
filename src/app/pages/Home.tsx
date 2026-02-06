import Link from 'next/link';
import { Trophy, Users, UserCircle, Calendar, Table2, Plus } from 'lucide-react';
import { getDivisions, getTeams, getPlayers, getMatches } from '../storage';

export function Home() {
  const divisions = getDivisions();
  const teams = getTeams();
  const players = getPlayers();
  const matches = getMatches();
  
  const playedMatches = matches.filter(m => m.homeScore !== undefined).length;

  const cards = [
    { title: 'Divisiones', count: divisions.length, icon: Trophy, link: '/divisiones' },
    { title: 'Equipos', count: teams.length, icon: Users, link: '/equipos' },
    { title: 'Jugadores', count: players.length, icon: UserCircle, link: '/jugadores' },
    { title: 'Partidos', count: `${playedMatches}/${matches.length}`, icon: Calendar, link: '/fixture' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-foreground mb-2">Bienvenido al Sistema de Gestión</h2>
        <p className="text-muted-foreground">Administra tu torneo de fútbol local de manera profesional</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.link}
              className="rounded-xl border border-border bg-card/80 p-6 shadow-sm transition hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg border border-primary/30 bg-primary/15 p-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="text-muted-foreground text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-semibold text-foreground">{card.count}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card/80 p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-foreground mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/divisiones"
            className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border/70 p-4 text-foreground transition hover:border-primary hover:bg-accent/60"
          >
            <Plus className="w-5 h-5 text-primary" />
            <span className="font-medium">Nueva División</span>
          </Link>
          <Link
            href="/equipos"
            className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border/70 p-4 text-foreground transition hover:border-primary hover:bg-accent/60"
          >
            <Plus className="w-5 h-5 text-primary" />
            <span className="font-medium">Nuevo Equipo</span>
          </Link>
          <Link
            href="/fixture"
            className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border/70 p-4 text-foreground transition hover:border-primary hover:bg-accent/60"
          >
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-medium">Generar Fixture</span>
          </Link>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-border bg-accent/40 p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">¿Cómo empezar?</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">1.</span>
            <span>Crea divisiones (Primera, Reserva, etc.) y configura si es torneo o copa</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">2.</span>
            <span>Agrega equipos a cada división con sus escudos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">3.</span>
            <span>Carga los jugadores de cada equipo con nombre, número y posición</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">4.</span>
            <span>Genera el fixture (aleatorio o manual) para cada división</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">5.</span>
            <span>Carga los resultados y consulta la tabla de posiciones actualizada</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
