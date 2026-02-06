'use client';

import { type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Home, Menu, Moon, Power, Search, Sun, Table2, Trophy, UserCircle, Users, X } from 'lucide-react';

export function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [displayName, setDisplayName] = useState('Admin');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (pathname === '/login') {
      setIsReady(true);
      return;
    }

    const authValue = localStorage.getItem('psp_auth');
    const storedName = localStorage.getItem('psp_user');

    if (authValue === '1') {
      setIsAuthed(true);
      if (storedName) {
        setDisplayName(storedName);
      }
      setIsReady(true);
      return;
    }

    setIsAuthed(false);
    setIsReady(true);
    router.replace('/login');
  }, [pathname, router]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('psp_theme');
    const shouldUseDark = storedTheme ? storedTheme === 'dark' : true;
    setIsDark(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('psp_theme', next ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('psp_auth');
    localStorage.removeItem('psp_user');
    setIsAuthed(false);
    router.replace('/login');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/divisiones', icon: Trophy, label: 'Divisiones' },
    { path: '/equipos', icon: Users, label: 'Equipos' },
    { path: '/jugadores', icon: UserCircle, label: 'Jugadores' },
    { path: '/fixture', icon: Calendar, label: 'Fixture' },
    { path: '/tabla', icon: Table2, label: 'Tabla' },
  ];

  if (pathname === '/login') {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  if (!isReady || !isAuthed) {
    return <div className="min-h-screen bg-background text-foreground" />;
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full">
          <div className="px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12  flex items-center justify-center overflow-hidden">
                <img
                  src="/Assets/logo.png"
                  alt="Pulse Sport +"
                  className="h-32 w-32 object-contain"
                />
              </div>
              <div>
          
                <h1 className="text-lg font-semibold text-foreground">Panel de Liga</h1>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sidebar-accent text-foreground border border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-4 pb-6 mt-auto">
            <div className="rounded-xl border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground">
              Gestión profesional de torneos y copas en tiempo real.
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-accent"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex flex-col">
          
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar equipos, jugadores..."
                  className="w-56 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition"
                  aria-label="Cambiar tema"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                  {displayName}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition inline-flex items-center gap-2"
                >
                  <Power className="h-3.5 w-3.5" />
                  Salir
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
            <div className="max-w-7xl">{children}</div>
          </main>
        </div>
      </div>

      {sidebarOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
            <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden">
                <img
                  src="/Assets/logo.png"
                  alt="Pulse Sport +"
                  className="h-7 w-7 object-contain"
                />
              </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pulse Sport +</p>
                  <p className="text-base font-semibold text-foreground">Panel de Liga</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="px-4 space-y-1 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-sidebar-accent text-foreground border border-border'
                        : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 pb-6 mt-auto">
              <div className="rounded-xl border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground">
                Gestión profesional de torneos y copas en tiempo real.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
