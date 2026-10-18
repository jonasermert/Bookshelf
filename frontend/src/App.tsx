import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { selectBooks, type BookSort } from './collection';
import type { Book, BookInput, Session } from './types';
import Icon from './components/Icon';
import Login from './components/Login';
import Modal from './components/Modal';
import BookForm from './components/BookForm';
import BookCard from './components/BookCard';

type Editor = { kind: 'create' } | { kind: 'edit' | 'delete'; book: Book };
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<BookSort>('title');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setSessionError('');
    api.session(controller.signal).then(value => { if (!controller.signal.aborted) setSession(value); })
      .catch(cause => { if (!controller.signal.aborted) setSessionError(cause.message); });
    return () => controller.abort();
  }, [attempt]);

  function expired(cause: unknown) {
    if (cause instanceof ApiError && cause.status === 401) {
      setSession({ authenticated: false, username: '' }); setBooks([]); setEditor(null); setNotice('');
      return true;
    }
    return false;
  }

  useEffect(() => {
    if (!session?.authenticated) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    api.list(controller.signal).then(value => { if (!controller.signal.aborted) setBooks(value); })
      .catch(cause => { if (!controller.signal.aborted && !expired(cause)) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, attempt]);

  async function login() {
    const next = await api.session();
    if (!next.authenticated) throw new Error('Die Anmeldung konnte nicht bestätigt werden.');
    setQuery(''); setSession(next);
  }
  async function logout() {
    setBusy(true); setNotice('');
    try {
      await api.logout(); setSession({ authenticated: false, username: '' }); setBooks([]); setEditor(null); setQuery('');
    } catch (cause) { if (!expired(cause)) setNotice(cause instanceof Error ? cause.message : 'Abmelden fehlgeschlagen.'); }
    finally { setBusy(false); }
  }
  function open(next: Editor) { setEditor(next); setDeleteError(''); setNotice(''); }
  async function save(input: BookInput) {
    try {
      const saved = editor?.kind === 'edit' ? await api.update(editor.book.isbn, input) : await api.create(input);
      setBooks(current => [...current.filter(book => book.id !== saved.id), saved]);
      setEditor(null); setNotice('„' + saved.title + '“ wurde gespeichert.');
    } catch (cause) { expired(cause); throw cause; }
  }
  async function remove() {
    if (!editor || editor.kind !== 'delete') return;
    setBusy(true); setDeleteError('');
    try {
      await api.remove(editor.book.isbn);
      setBooks(current => current.filter(book => book.id !== editor.book.id));
      setEditor(null); setNotice('„' + editor.book.title + '“ wurde gelöscht.');
    } catch (cause) { if (!expired(cause)) setDeleteError(cause instanceof Error ? cause.message : 'Löschen fehlgeschlagen.'); }
    finally { setBusy(false); }
  }
  const visible = selectBooks(books, query, sort);
  return <div className="min-h-screen bg-[#f7f6f2] text-stone-800">
    <a href="#content" className="skip-link">Zum Inhalt springen</a>
    <header className="border-b border-stone-200/80 bg-white/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-10">
        <a href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight"><span className="rounded-xl bg-emerald-900 p-2.5 text-white"><Icon name="book" /></span>bookshelf<span className="text-emerald-700">.</span></a>
        {session?.authenticated ? <div className="flex items-center gap-4"><span className="hidden text-sm text-stone-500 sm:block">{session.username}</span><button className="button-secondary" disabled={busy || !!editor} onClick={logout}>Abmelden</button></div>
          : <span className="text-xs text-stone-500">Ein Regal voller Möglichkeiten</span>}
      </div>
    </header>
    <div id="content">
      {sessionError ? <main className="mx-auto max-w-xl p-10"><div role="alert" className="empty-state"><h1 className="mb-3 text-xl font-semibold">Server nicht erreichbar</h1><p>{sessionError}</p><button className="button-secondary mx-auto mt-6" onClick={() => setAttempt(value => value + 1)}>Erneut versuchen</button></div></main>
      : !session ? <main role="status" className="p-20 text-center text-stone-500">Bibliothek wird geöffnet …</main>
      : !session.authenticated ? <Login onLogin={login} />
      : <main className="mx-auto max-w-7xl px-5 py-12 sm:px-10">
        <section className="flex flex-col justify-between gap-7 border-b border-stone-200 pb-10 md:flex-row md:items-end">
          <div><p className="eyebrow">GUTE BÜCHER BLEIBEN.</p><h1 className="mt-4 font-serif text-4xl text-stone-900 sm:text-5xl">Deine eigene kleine Bibliothek.</h1><p className="mt-5 text-sm leading-7 text-stone-500">Alles, was du gelesen hast. Alles, was dich noch erwartet.</p></div>
          <button className="button-primary shrink-0 self-start md:self-end" disabled={loading || !!error} onClick={() => open({ kind: 'create' })}><Icon name="plus" />Buch hinzufügen</button>
        </section>
        <section className="pt-9" aria-labelledby="collection-title" aria-busy={loading}>
          <div className="mb-6 flex items-center justify-between gap-4"><h2 id="collection-title" className="text-xl font-semibold">Mein Bücherregal <span className="ml-2 rounded-full bg-stone-200/70 px-2.5 py-1 text-xs font-normal text-stone-600">{books.length}</span></h2><span className="hidden text-xs text-stone-400 sm:block">GESCHICHTEN, DIE BLEIBEN</span></div>
          <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_200px]">
            <label className="relative"><span className="sr-only">Bücher durchsuchen</span><Icon name="search" className="absolute top-3.5 left-4 text-stone-400" /><input className="input pl-12" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Titel, Autor oder ISBN suchen …" /></label>
            <label><span className="sr-only">Sortierung</span><select className="input" value={sort} onChange={event => setSort(event.target.value as BookSort)}><option value="title">Titel: A–Z</option><option value="author">Autor: A–Z</option><option value="recent">Zuletzt hinzugefügt</option></select></label>
          </div>
          <p role="status" className={notice ? 'mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900' : 'sr-only'}>{notice}</p>
          {loading ? <div role="status" className="empty-state">Deine Bücher werden geladen …</div>
            : error ? <div role="alert" className="empty-state"><h3 className="mb-3 text-xl">Bibliothek nicht erreichbar</h3><p>{error}</p><button className="button-secondary mx-auto mt-6" onClick={() => setAttempt(value => value + 1)}>Erneut versuchen</button></div>
            : !books.length ? <div className="empty-state"><Icon name="book" className="mx-auto mb-5 h-10 w-10 text-emerald-800" /><h3 className="mb-3 font-serif text-3xl text-stone-900">Platz für deine erste Geschichte.</h3><p>Füge ein Buch hinzu und beginne deine Sammlung.</p><button className="button-primary mx-auto mt-6" onClick={() => open({ kind: 'create' })}>Erstes Buch hinzufügen</button></div>
            : !visible.length ? <div className="empty-state"><h3 className="mb-3 text-xl">Keine passenden Bücher</h3><p>Versuche einen anderen Titel, Autor oder eine ISBN.</p><button className="button-secondary mx-auto mt-6" onClick={() => setQuery('')}>Suche zurücksetzen</button></div>
            : <><p role="status" className="sr-only">{visible.length} Bücher angezeigt</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((book, index) => <BookCard key={book.id} book={book} index={index} onEdit={() => open({ kind: 'edit', book })} onDelete={() => open({ kind: 'delete', book })} />)}</div></>}
        </section>
        <footer className="mt-14 flex justify-between gap-4 border-t border-stone-200 pt-6 text-xs text-stone-400"><span>bookshelf.</span><span>Ein Buch ist erst der Anfang.</span></footer>
      </main>}
    </div>
    {editor && <Modal title={editor.kind === 'create' ? 'Neues Buch hinzufügen' : editor.kind === 'edit' ? 'Buch bearbeiten' : 'Buch löschen?'} busy={busy} onClose={() => setEditor(null)}>
      {editor.kind === 'delete' ? <><p className="break-words leading-7 text-stone-600">Möchtest du „{editor.book.title}“ dauerhaft aus deiner Bibliothek löschen?</p>{deleteError && <p role="alert" className="alert mt-5">{deleteError}</p>}<div className="mt-7 flex justify-end gap-3"><button className="button-secondary" disabled={busy} onClick={() => setEditor(null)} autoFocus>Abbrechen</button><button className="button-danger" disabled={busy} onClick={remove}>{busy ? 'Wird gelöscht …' : 'Endgültig löschen'}</button></div></>
        : <BookForm book={editor.kind === 'edit' ? editor.book : undefined} onSave={save} onCancel={() => setEditor(null)} onBusy={setBusy} />}
    </Modal>}
  </div>;
}
