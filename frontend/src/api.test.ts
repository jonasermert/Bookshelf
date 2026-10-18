import { describe, expect, it, vi } from 'vitest';
import { api } from './api';
const response = (data: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), { status });
describe('HTTP-Anbindung', () => {
  it('holt einen CSRF-Token und sendet Login-Daten als Formular mit Sitzungscookie', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ token: 'token-1', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(response(null, 204));
    vi.stubGlobal('fetch', fetch);
    await api.login('jonas', 'secret&value');
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/csrf', expect.objectContaining({ credentials: 'same-origin' }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/login', expect.objectContaining({
      method: 'POST', credentials: 'same-origin',
      body: 'username=jonas&password=secret%26value',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-TOKEN': 'token-1' },
    }));
  });
  it('codiert ISBN-Pfade und erneuert den Token für jeden Schreibzugriff', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ token: 'first', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(response(null, 204))
      .mockResolvedValueOnce(response({ token: 'second', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(response(null, 204));
    vi.stubGlobal('fetch', fetch);
    await api.remove('978 1234567');
    await api.logout();
    expect(fetch).toHaveBeenNthCalledWith(2, '/book/978%201234567', expect.objectContaining({ method: 'DELETE' }));
    expect(fetch).toHaveBeenNthCalledWith(4, '/api/logout', expect.objectContaining({
      headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'second' }),
    }));
  });
  it('gibt serverseitige Feldfehler und Verbindungsfehler verständlich zurück', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ token: 'token', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(response({ message: 'Ungültig', fields: { isbn: 'ISBN prüfen' } }, 400)));
    await expect(api.create({ title: 'Buch', author: 'Autor', isbn: '1234567890', description: '' }))
      .rejects.toMatchObject({ message: 'Ungültig', status: 400, fields: { isbn: 'ISBN prüfen' } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(api.session()).rejects.toThrow('Keine Verbindung');
  });
});
