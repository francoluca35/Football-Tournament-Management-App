'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';

const AUTH_KEY = 'psp_auth';
const USER_KEY = 'psp_user';
const DEMO_USER = 'admin';
const DEMO_PASS = 'admin';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem(AUTH_KEY) === '1') {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Completa usuario y contraseña.');
      return;
    }

    if (username.trim() !== DEMO_USER || password !== DEMO_PASS) {
      setError('Credenciales incorrectas.');
      return;
    }

    localStorage.setItem(AUTH_KEY, '1');
    localStorage.setItem(USER_KEY, username.trim());
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-20 w-20 flex items-center justify-center overflow-hidden">
            <img src="/Assets/logo.png" alt="Pulse Sport +" className="h-20 w-20 object-contain" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Ingresar</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Usuario</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-input-background px-3 py-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Contraseña</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-input-background px-3 py-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition"
          >
            Entrar
          </button>
        </form>

        <div className="mt-4 text-xs text-muted-foreground">
          Demo: usuario <span className="text-foreground">admin</span> / contraseña{' '}
          <span className="text-foreground">admin</span>
        </div>
      </div>
    </div>
  );
}
