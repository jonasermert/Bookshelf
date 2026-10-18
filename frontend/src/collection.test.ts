import { describe, expect, it } from 'vitest';
import { selectBooks } from './collection';
const books = [
  { id: 1, title: 'Design Patterns', author: 'Erich Gamma', isbn: '978-0201633610', description: 'Entwurfsmuster' },
  { id: 2, title: 'Clean Code', author: 'Robert Martin', isbn: '978-3826655487', description: null },
];
describe('Bücherregal', () => {
  it('findet Titel, Autor, ISBN und Beschreibung ohne Beachtung der Großschreibung', () => {
    for (const query of ['  DESIGN ', 'GAMMA', '0201633610', 'entwurfsmuster']) {
      expect(selectBooks(books, query, 'title').map(book => book.id)).toEqual([1]);
    }
    expect(selectBooks(books, 'unbekannt', 'title')).toEqual([]);
  });
  it('sortiert nach Titel, Autor und zuletzt hinzugefügt ohne die Originaldaten zu verändern', () => {
    expect(selectBooks(books, '', 'title').map(book => book.id)).toEqual([2, 1]);
    expect(selectBooks(books, '', 'author').map(book => book.id)).toEqual([1, 2]);
    expect(selectBooks(books, '', 'recent').map(book => book.id)).toEqual([2, 1]);
    expect(books.map(book => book.id)).toEqual([1, 2]);
  });
});
