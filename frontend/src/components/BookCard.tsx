import type { Book } from '../types';
import Icon from './Icon';

const covers = ['bg-[#315e54]', 'bg-[#96684f]', 'bg-[#52677d]', 'bg-[#76617a]'];
export default function BookCard({ book, index, onEdit, onDelete }: {
  book: Book; index: number; onEdit: () => void; onDelete: () => void;
}) {
  return <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md">
    <div className={'book-cover relative mb-6 flex h-48 flex-col justify-between overflow-hidden rounded-lg p-5 text-white ' + covers[index % covers.length]}>
      <Icon name="book" className="h-6 w-6 text-white/60" />
      <div className="relative pl-2"><p className="mb-2 text-[10px] tracking-[0.2em] text-white/70">BOOKSHELF EDITION</p>
        <p className="line-clamp-2 font-serif text-2xl leading-tight">{book.title}</p>
        <p className="mt-3 truncate text-xs text-white/75">{book.author}</p>
      </div>
    </div>
    <p className="mb-2 text-[10px] font-medium tracking-widest text-stone-400">ISBN {book.isbn}</p>
    <h3 className="break-words text-lg font-semibold leading-snug text-stone-900">{book.title}</h3>
    <p className="mt-1 text-sm text-emerald-800">{book.author}</p>
    <p className="mt-4 mb-6 line-clamp-3 min-h-18 whitespace-pre-line break-words text-sm leading-6 text-stone-500">{book.description || 'Noch keine Beschreibung vorhanden.'}</p>
    <div className="mt-auto flex items-center justify-between border-t border-stone-100 pt-4">
      <button className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-emerald-800" aria-label={book.title + ' bearbeiten'} onClick={onEdit}><Icon name="edit" className="h-4 w-4" />Bearbeiten</button>
      <button className="icon-button hover:text-red-700" aria-label={book.title + ' löschen'} onClick={onDelete}><Icon name="trash" className="h-4 w-4" /></button>
    </div>
  </article>;
}
