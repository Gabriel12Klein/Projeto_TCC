import { useEffect, useId, useRef, useState } from 'react';
import './BottlePhotoPicker.css';

export default function BottlePhotoPicker({ value, onChange, required = true }: {
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!value) { setPreview(''); return; }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function select(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Escolha uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A foto deve ter no máximo 5 MB.');
      return;
    }
    setError('');
    onChange(file);
  }

  return (
    <div className="bottle-photo-picker">
      <p id={`${id}-label`} className="bottle-photo-picker__label">Foto da garrafa {required ? <span>*</span> : <span>(opcional)</span>}</p>
      <div
        className={`bottle-photo-picker__panel${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }}
      >
        <div className="bottle-photo-picker__preview">
          {preview ? <img src={preview} alt="Prévia da foto da garrafa" /> : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M8 5l1.5-2h5L16 5h3a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h3z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>
        <div className="bottle-photo-picker__content">
          <strong>{value ? 'Foto selecionada' : 'Dê uma identidade ao seu rótulo'}</strong>
          <p>{value ? value.name : 'Escolha uma foto ou arraste a imagem até aqui.'}</p>
          <div className="bottle-photo-picker__actions">
            <button type="button" onClick={() => inputRef.current?.click()}>{value ? 'Trocar foto' : 'Adicionar foto'}</button>
            {value && <button type="button" className="bottle-photo-picker__remove" onClick={() => { onChange(null); setError(''); }}>Remover</button>}
          </div>
          <small id={`${id}-help`}>JPG, PNG ou WebP · até 5 MB</small>
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`}
          onChange={(event) => { select(event.target.files?.[0]); event.target.value = ''; }}
        />
      </div>
      {error && <p className="bottle-photo-picker__error" role="alert">{error}</p>}
    </div>
  );
}
