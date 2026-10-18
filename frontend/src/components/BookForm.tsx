import { useState, type FormEvent } from 'react';
import { ApiError } from '../api';
import type { Book, BookInput } from '../types';

export default function BookForm({ book, onSave, onCancel, onBusy }: {
  book?: Book; onSave: (input: BookInput) => Promise<void>; onCancel: () => void; onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); onBusy(true); setError(''); setFields({});
    try {
      await onSave({ title: String(data.get('title')).trim(), author: String(data.get('author')).trim(),
        isbn: String(data.get('isbn')).trim(), description: String(data.get('description')).trim() });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Speichern fehlgeschlagen.');
      if (cause instanceof ApiError) setFields(cause.fields);
    } finally { setBusy(false); onBusy(false); }
  }
  return <form onSubmit={submit}>
    <fieldset disabled={busy} className="space-y-5">
      {([
        ['title', 'Titel', 'z. B. Clean Code', 255],
        ['author', 'Autor', 'z. B. Robert C. Martin', 255],
        ['isbn', 'ISBN', 'z. B. 978-3826655487', 32],
      ] as const).map(([key, label, placeholder, max]) => <div key={key}>
        <label htmlFor={key} className="label">{label} <span className="text-emerald-700">*</span></label>
        <input id={key} name={key} className="input" required maxLength={max} minLength={key === 'isbn' ? 10 : undefined}
          pattern={key === 'isbn' ? '[0-9Xx \\-]{10,32}' : undefined}
          placeholder={placeholder} defaultValue={book?.[key] ?? ''} autoFocus={key === 'title'}
          aria-invalid={!!fields[key]} aria-describedby={fields[key] ? key + '-error' : undefined} />
        {fields[key] && <p className="field-error" id={key + '-error'}>{fields[key]}</p>}
      </div>)}
      <div>
        <label htmlFor="description" className="label">Beschreibung <span className="font-normal text-stone-500">· optional</span></label>
        <textarea id="description" name="description" className="input min-h-32 resize-y" maxLength={1000}
          placeholder="Worum geht es in diesem Buch?" defaultValue={book?.description ?? ''}
          aria-invalid={!!fields.description} aria-describedby={fields.description ? 'description-error' : undefined} />
        {fields.description && <p className="field-error" id="description-error">{fields.description}</p>}
      </div>
    </fieldset>
    {error && <p className="alert mt-5" role="alert">{error}</p>}
    <div className="mt-7 flex flex-wrap justify-end gap-3">
      <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>Abbrechen</button>
      <button type="submit" className="button-primary" disabled={busy}>{busy ? 'Wird gespeichert …' : 'Buch speichern'}</button>
    </div>
  </form>;
}
