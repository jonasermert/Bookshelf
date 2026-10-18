import type { Book } from './types';

export type BookSort = 'title' | 'author' | 'recent';
export function selectBooks(books: Book[], query: string, sort: BookSort): Book[] {
  const needle = query.trim().toLocaleLowerCase('de');
  return books.filter(book => [book.title, book.author, book.isbn, book.description ?? ''].join(' ')
    .toLocaleLowerCase('de').includes(needle)).sort((a, b) => sort === 'recent' ? b.id - a.id :
    (sort === 'author' ? a.author.localeCompare(b.author, 'de') : a.title.localeCompare(b.title, 'de')) ||
    a.title.localeCompare(b.title, 'de') || a.id - b.id);
}
