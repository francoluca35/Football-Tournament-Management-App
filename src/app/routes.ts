import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Divisiones } from './pages/Divisiones';
import { Equipos } from './pages/Equipos';
import { Jugadores } from './pages/Jugadores';
import { Fixture } from './pages/Fixture';
import { Tabla } from './pages/Tabla';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'divisiones', Component: Divisiones },
      { path: 'equipos', Component: Equipos },
      { path: 'jugadores', Component: Jugadores },
      { path: 'fixture', Component: Fixture },
      { path: 'tabla', Component: Tabla },
    ],
  },
]);
