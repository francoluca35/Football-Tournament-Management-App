import { Link } from 'react-router';
import { Trophy, Users, UserCircle, Calendar, Table2, Plus } from 'lucide-react';
import { getDivisions, getTeams, getPlayers, getMatches } from '../storage';

export function Home() {
  const divisions = getDivisions();
  const teams = getTeams();
  const players = getPlayers();
  const matches = getMatches();
  
  const playedMatches = matches.filter(m => m.homeScore !== undefined).length;

  const cards = [
    { title: 'Divisiones', count: divisions.length, icon: Trophy, link: '/divisiones', color: 'bg-blue-500' },
    { title: 'Equipos', count: teams.length, icon: Users, link: '/equipos', color: 'bg-green-500' },
    { title: 'Jugadores', count: players.length, icon: UserCircle, link: '/jugadores', color: 'bg-purple-500' },
    { title: 'Partidos', count: `${playedMatches}/${matches.length}`, icon: Calendar, link: '/fixture', color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido al Sistema de Gestión</h2>
        <p className="text-gray-600">Administra tu torneo de fútbol local de manera profesional</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{card.count}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/divisiones"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <Plus className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-700">Nueva División</span>
          </Link>
          <Link
            to="/equipos"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <Plus className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-700">Nuevo Equipo</span>
          </Link>
          <Link
            to="/fixture"
            className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <Calendar className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-700">Generar Fixture</span>
          </Link>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">¿Cómo empezar?</h3>
        <ol className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Crea divisiones (Primera, Reserva, etc.) y configura si es torneo o copa</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Agrega equipos a cada división con sus escudos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Carga los jugadores de cada equipo con nombre, número y posición</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Genera el fixture (aleatorio o manual) para cada división</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">5.</span>
            <span>Carga los resultados y consulta la tabla de posiciones actualizada</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
