import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api, ApiError } from './api';

vi.mock('./api', async importOriginal => ({
  ...await importOriginal<typeof import('./api')>(),
  api: { session: vi.fn(), login: vi.fn(), logout: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
const book = { id: 1, title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-3826655487', description: 'Lesbarer Code' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.session).mockResolvedValue({ authenticated: true, username: 'dbUser' });
  vi.mocked(api.list).mockResolvedValue([book]);
  vi.mocked(api.login).mockResolvedValue(undefined);
  vi.mocked(api.logout).mockResolvedValue(undefined);
});

describe('Buchverwaltung', () => {
  it('sucht Bücher und setzt die Suche zurück', async () => {
    const user = userEvent.setup(); render(<App />);
    expect(await screen.findByRole('heading', { name: 'Clean Code' })).toBeVisible();
    await user.type(screen.getByRole('searchbox'), 'unbekannt');
    expect(screen.getByText('Keine passenden Bücher')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Suche zurücksetzen' }));
    expect(screen.getByRole('heading', { name: 'Clean Code' })).toBeVisible();
  });

  it('meldet sich mit einem bestehenden Konto an und wieder ab', async () => {
    vi.mocked(api.session).mockResolvedValueOnce({ authenticated: false, username: '' })
      .mockResolvedValue({ authenticated: true, username: 'dbUser' });
    const user = userEvent.setup(); render(<App />);
    await user.type(await screen.findByLabelText('Benutzername'), 'dbUser');
    await user.type(screen.getByLabelText('Passwort'), 'workshops');
    await user.click(screen.getByRole('button', { name: 'Bibliothek öffnen' }));
    expect(await screen.findByRole('heading', { name: 'Clean Code' })).toBeVisible();
    expect(api.login).toHaveBeenCalledWith('dbUser', 'workshops');
    await user.click(screen.getByRole('button', { name: 'Abmelden' }));
    expect(await screen.findByLabelText('Benutzername')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Clean Code' })).not.toBeInTheDocument();
  });

  it('zeigt fehlgeschlagene Anmeldungen', async () => {
    vi.mocked(api.session).mockResolvedValue({ authenticated: false, username: '' });
    vi.mocked(api.login).mockRejectedValue(new ApiError('Zugangsdaten prüfen', 401));
    const user = userEvent.setup(); render(<App />);
    await user.type(await screen.findByLabelText('Benutzername'), 'dbUser');
    await user.type(screen.getByLabelText('Passwort'), 'falsch');
    await user.click(screen.getByRole('button', { name: 'Bibliothek öffnen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Zugangsdaten prüfen');
  });

  it('legt ein Buch an', async () => {
    vi.mocked(api.list).mockResolvedValue([]);
    vi.mocked(api.create).mockResolvedValue(book);
    const user = userEvent.setup(); render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Erstes Buch hinzufügen' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Titel/), book.title);
    await user.type(within(dialog).getByLabelText(/Autor/), book.author);
    await user.type(within(dialog).getByLabelText(/ISBN/), book.isbn);
    await user.click(within(dialog).getByRole('button', { name: 'Buch speichern' }));
    expect(await screen.findByRole('heading', { name: 'Clean Code' })).toBeVisible();
    expect(api.create).toHaveBeenCalledWith({ title: book.title, author: book.author, isbn: book.isbn, description: '' });
  });

  it('behält Bearbeitungen bei Feldfehlern und speichert nach Korrektur', async () => {
    vi.mocked(api.update).mockRejectedValueOnce(new ApiError('Eingaben prüfen', 400, { title: 'Titel prüfen' }))
      .mockResolvedValue({ ...book, title: 'Clean Code 2' });
    const user = userEvent.setup(); render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Clean Code bearbeiten' }));
    const title = screen.getByLabelText(/Titel/); await user.clear(title); await user.type(title, 'Clean Code 2');
    await user.click(screen.getByRole('button', { name: 'Buch speichern' }));
    expect(await screen.findByText('Titel prüfen')).toBeVisible();
    expect(title).toHaveValue('Clean Code 2');
    await user.click(screen.getByRole('button', { name: 'Buch speichern' }));
    expect(await screen.findByRole('heading', { name: 'Clean Code 2' })).toBeVisible();
    expect(api.update).toHaveBeenCalledWith(book.isbn, expect.objectContaining({ title: 'Clean Code 2' }));
  });

  it('löscht erst nach Bestätigung und erhält das Buch bei Serverfehlern', async () => {
    vi.mocked(api.remove).mockRejectedValueOnce(new ApiError('Serverfehler', 500)).mockResolvedValue(undefined);
    const user = userEvent.setup(); render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Clean Code löschen' }));
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Clean Code löschen' }));
    await user.click(screen.getByRole('button', { name: 'Endgültig löschen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Serverfehler');
    await user.click(screen.getByRole('button', { name: 'Endgültig löschen' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Clean Code' })).not.toBeInTheDocument());
  });

  it('kehrt bei einer abgelaufenen Sitzung zur Anmeldung zurück', async () => {
    vi.mocked(api.list).mockRejectedValue(new ApiError('Sitzung abgelaufen', 401));
    render(<App />);
    expect(await screen.findByLabelText('Benutzername')).toBeVisible();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('kann die Verbindung nach einem Startfehler erneut prüfen', async () => {
    vi.mocked(api.session).mockRejectedValueOnce(new ApiError('Offline'));
    const user = userEvent.setup(); render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(await screen.findByRole('heading', { name: 'Clean Code' })).toBeVisible();
  });
});
