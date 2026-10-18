import { useState, type FormEvent } from 'react';
import { api } from '../api';
import Icon from './Icon';

export default function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await api.login(String(data.get('username')), String(data.get('password')));
      await onLogin();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Anmeldung fehlgeschlagen.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto grid min-h-[85vh] max-w-5xl items-center gap-12 px-6 py-14 md:grid-cols-2">
    <div><p className="eyebrow">DEIN PERSÖNLICHES BÜCHERREGAL</p><h1 className="mt-5 font-serif text-5xl leading-tight text-stone-900 sm:text-6xl">Ein guter Platz<br />für gute Bücher.</h1>
      <p className="mt-6 max-w-sm text-base leading-8 text-stone-500">Behalte den Überblick über deine Sammlung und finde die nächste Geschichte in deinem eigenen Regal.</p>
      <div className="mt-8 flex items-center gap-3 text-sm text-emerald-800"><Icon name="book" />Deine Sammlung. Deine Geschichten.</div>
    </div>
    <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10" aria-labelledby="login-title">
      <h2 id="login-title" className="text-2xl font-semibold">Willkommen zurück</h2><p className="mt-2 mb-8 text-sm text-stone-500">Melde dich an, um deine Bibliothek zu öffnen.</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-5">
          <div><label className="label" htmlFor="username">Benutzername</label><input className="input" id="username" name="username" required autoComplete="username" autoFocus /></div>
          <div><label className="label" htmlFor="password">Passwort</label><input className="input" id="password" name="password" type="password" required autoComplete="current-password" /></div>
        </fieldset>
        {error && <p role="alert" className="alert mt-5">{error}</p>}
        <button className="button-primary mt-7 w-full" disabled={busy}>{busy ? 'Wird angemeldet …' : 'Bibliothek öffnen'}<Icon name="arrow" /></button>
      </form>
    </section>
  </main>;
}
