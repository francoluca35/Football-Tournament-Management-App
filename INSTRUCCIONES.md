# 🏆 Sistema de Gestión de Torneos de Fútbol

## Funcionalidades Implementadas

### ✅ Gestión de Divisiones
- Crear, editar y eliminar divisiones (Primera, Reserva, etc.)
- Configurar tipo de competición:
  - **Torneo (Liga)**: Todos contra todos
  - **Copa**: Fase regular + eliminatorias (octavos, cuartos, semis, final)
- Para copa: configurar cantidad de fechas y si las eliminatorias son ida y vuelta

### ✅ Gestión de Equipos
- Agregar, editar y eliminar equipos
- Asignar equipos a divisiones
- **Subir escudo/logo de cada equipo** (se guarda en base64)
- Filtrar equipos por división
- Contador de jugadores por equipo

### ✅ Gestión de Jugadores
- Agregar, editar y eliminar jugadores
- Datos: nombre, número, posición (Arquero, Defensor, Mediocampista, Delantero)
- Filtrar por división y por equipo
- Vista de tabla con toda la información

### ✅ Generación de Fixture
- **Fixture aleatorio**: Genera automáticamente un calendario round-robin
- Fixture manual: Opción de crear partidos personalizados (próxima mejora)
- Visualización por fechas
- Cargar resultados de cada partido
- Editar resultados ya cargados

### ✅ Tabla de Posiciones
- Actualización automática al cargar resultados
- Estadísticas completas: PJ, PG, PE, PP, GF, GC, DIF, PTS
- Ordenamiento por puntos, diferencia de gol y goles a favor
- **Descarga de tabla como JPG** (html2canvas)
- **Descarga de resultados por fecha como JPG**

### ✅ Características Adicionales
- Persistencia con localStorage (temporal, listo para migrar a Supabase)
- Interfaz responsive con Tailwind CSS
- Navegación con React Router
- TypeScript para seguridad de tipos
- Iconos con Lucide React

## Estructura del Proyecto

```
/src/app/
├── App.tsx                 # Entrada principal con RouterProvider
├── routes.ts              # Configuración de rutas
├── types.ts               # Tipos TypeScript
├── storage.ts             # Funciones de localStorage
├── utils.ts               # Utilidades (fixture, standings, etc.)
├── components/
│   └── Layout.tsx         # Layout con navegación
└── pages/
    ├── Home.tsx           # Dashboard principal
    ├── Divisiones.tsx     # CRUD de divisiones
    ├── Equipos.tsx        # CRUD de equipos
    ├── Jugadores.tsx      # CRUD de jugadores
    ├── Fixture.tsx        # Generación y gestión de partidos
    └── Tabla.tsx          # Tabla de posiciones + descarga JPG
```

## Migración a Supabase (Para el usuario)

Los datos actualmente se guardan en `localStorage`. Para migrar a Supabase:

1. Reemplazar las funciones en `storage.ts` con llamadas a la API de Supabase
2. Crear tablas en Supabase:
   - `divisions` (id, name, tournamentType, regularPhaseMatches, twoLeggedKnockout)
   - `teams` (id, name, divisionId, logoUrl)
   - `players` (id, teamId, name, number, position)
   - `matches` (id, divisionId, matchday, homeTeamId, awayTeamId, homeScore, awayScore, fixtureType)
3. Para los logos, usar Supabase Storage y guardar las URLs públicas

## Próximas Mejoras Sugeridas

- [ ] Fixture manual (seleccionar equipos manualmente)
- [ ] Fase de eliminatorias para copa
- [ ] Estadísticas de jugadores (goles, asistencias, tarjetas)
- [ ] Historial de partidos por equipo
- [ ] Exportar/importar datos
- [ ] Gráficos de rendimiento
- [ ] Modo oscuro
- [ ] Autenticación de usuarios
