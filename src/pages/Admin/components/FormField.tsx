function formatCnpj(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatBatchCode(value = '') {
  const raw = String(value).toUpperCase();
  const digits = raw.replace(/\D/g, '').slice(0, 5);
  if (!digits && raw.startsWith('L')) return 'L';
  return digits ? `L${digits}` : '';
}

function formatVintageIdentifier(value = '') {
  const raw = String(value).toUpperCase();
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits && raw.startsWith('S')) return 'SF';
  if (digits.length <= 2) return digits ? `SF${digits}` : '';
  return `SF${digits.slice(0, 2)}-T${digits.slice(2)}`;
}

function normalizeFieldValue(field, value) {
  if (field.mask === 'cnpj') return formatCnpj(value);
  if (field.mask === 'batch-code') return formatBatchCode(value);
  if (field.mask === 'vintage-identifier') return formatVintageIdentifier(value);
  return value;
}

function optionValue(option) {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel(option) {
  return typeof option === 'string' ? option : option.label;
}

export default function FormField({ field, value, existingImage = '', onChange, valid = false, invalid = false, error = '', unlocked = true, onRequestFocus }) {
  const id = `field-${field.name}`;

  const handleChange = (event) => {
    onChange(field.name, normalizeFieldValue(field, event.target.value));
  };

  const focusProps = {
    tabIndex: unlocked ? 0 : -1,
    onFocus: (event) => {
      if (unlocked) return;
      event.target.blur();
      onRequestFocus?.();
    }
  };

  const controlClass = 'w-full min-w-0 border-0 outline-0 bg-transparent font-[inherit] text-[clamp(12px,0.95vw,14px)] text-[#332a2a] placeholder:text-[#aaa4a2]';

  const content = field.type === 'select'
    ? <select className={`${controlClass} h-[43px]`} id={id} value={value ?? ''} onChange={e=>onChange(field.name,e.target.value)} required={field.required} disabled={field.disabled} aria-invalid={invalid} aria-describedby={[invalid && `${id}-error`, field.note && `${id}-help`].filter(Boolean).join(' ') || undefined} {...focusProps}><option value="">Selecione</option>{field.options?.map(o=><option key={optionValue(o)} value={optionValue(o)}>{optionLabel(o)}</option>)}</select>
    : field.type === 'textarea'
      ? <textarea className={`${controlClass} h-[calc(100%-16px)] resize-none`} id={id} value={value ?? ''} maxLength={field.maxLength} placeholder={field.placeholder} onChange={handleChange} required={field.required} disabled={field.disabled} aria-invalid={invalid} {...focusProps}/>
      : field.type === 'multi-select'
        ? <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <select className={`${controlClass} min-w-[180px] flex-1`} id={id} value="" onChange={event => {
              const selected = event.target.value;
              if (selected && !(Array.isArray(value) && value.includes(selected))) {
                onChange(field.name, [...(Array.isArray(value) ? value : []), selected]);
              }
            }} disabled={field.disabled} aria-invalid={invalid} {...focusProps}>
              <option value="">Selecione uma ou mais uvas</option>
              {field.options?.filter(option => !(Array.isArray(value) && value.includes(optionValue(option)))).map(option => <option key={optionValue(option)} value={optionValue(option)}>{optionLabel(option)}</option>)}
            </select>
            {Array.isArray(value) && value.map(selectedValue => {
              const selectedOption = field.options?.find(option => optionValue(option) === selectedValue);
              return <button type="button" key={selectedValue} disabled={field.disabled} className={`rounded-full border border-[#c9a66e] bg-[#fff4df] px-2.5 py-1 text-xs text-[#6a1424] ${field.disabled ? 'cursor-default opacity-80' : ''}`} onClick={event => { event.preventDefault(); event.stopPropagation(); onChange(field.name, value.filter(item => item !== selectedValue)); }} aria-label={`Remover ${selectedOption ? optionLabel(selectedOption) : selectedValue}`}>
                {selectedOption ? optionLabel(selectedOption) : 'Uva indisponível'}{!field.disabled && ' ×'}
              </button>;
            })}
          </div>
      : field.type === 'file'
        ? <>
            <input className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" id={id} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>onChange(field.name,e.target.files?.[0] ?? null)} disabled={field.disabled} aria-invalid={invalid} />
            <span className="flex min-w-0 max-w-full items-center justify-center gap-3">
              {existingImage && !value?.name && <img className="h-12 w-10 shrink-0 rounded-lg border border-[#e5d5c1] bg-white object-contain p-1" src={existingImage} alt="Imagem atual do vinho" />}
              {!existingImage || value?.name ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4e6d0] text-2xl text-[#8d5f2b]" aria-hidden="true">↑</span> : null}
              <span className="min-w-0">
                <b className="block text-sm font-semibold text-[#6a1424]">{value?.name ? 'Nova imagem selecionada' : existingImage ? 'Imagem atual' : 'Escolher imagem'}</b>
                <small className="block truncate text-xs text-[#857d79]">{value?.name ?? (existingImage ? 'Clique para substituir · PNG, JPG ou WebP' : 'PNG, JPG ou WebP · até 5 MB')}</small>
              </span>
            </span>
          </>
        : <input
            className={controlClass}
            id={id}
            type={field.type || 'text'}
            value={value ?? ''}
            placeholder={field.placeholder}
            onChange={handleChange}
            required={field.required}
            maxLength={field.maxLength}
            inputMode={field.inputMode}
            autoComplete={field.autoComplete}
            disabled={field.disabled}
            aria-invalid={invalid}
            {...focusProps}
          />;

  const inputShellClass = field.type === 'textarea'
    ? 'h-[clamp(98px,11vh,116px)] items-start pt-3'
    : field.type === 'multi-select'
      ? 'h-auto min-h-[clamp(46px,4.8vh,51px)] items-center py-2'
    : field.type === 'file'
      ? 'relative h-[clamp(76px,8vh,84px)] items-center justify-center border-dashed bg-[#fffdf9] transition-colors hover:border-[#9d4b5b] hover:bg-[#fff9f0]'
      : 'min-h-[clamp(46px,4.8vh,51px)] items-center';

  return <label htmlFor={id} className="block min-w-0">
    <span className="block text-[clamp(12px,0.95vw,14px)] font-semibold mb-[7px] text-[#302627]">{field.label}{field.required && <b className="text-[#af1530] ml-[3px]" aria-label="obrigatório">*</b>}</span>
    <div className={`border-[1.6px] rounded-[7px] flex px-[clamp(11px,1vw,14px)] gap-[10px] ${field.disabled ? 'border-[#ddd8d5] bg-[#f4f1ef] opacity-60 cursor-not-allowed' : invalid ? 'border-[#c9343d] bg-[#fff7f7] shadow-[0_0_0_3px_rgba(201,52,61,.12)] focus-within:border-[#a91f2c]' : 'border-[#d6d0cc] bg-white focus-within:border-[#9d4b5b] focus-within:shadow-[0_0_0_3px_rgba(125,29,45,.08)]'} ${inputShellClass}`}>
      {field.icon && <img className="w-6 h-6 object-contain opacity-[.78] shrink-0" src={field.icon} alt="" />}
      {content}
      {field.suffix && <em className="not-italic min-w-[42px] text-center text-[#5d5552] text-[13px]">{field.suffix}</em>}
      {field.required && field.type !== 'select' && valid && <span className="w-[22px] h-[22px] rounded-full bg-[#e7f3e2] text-[#2d772d] grid place-items-center shrink-0 text-[15px] font-bold leading-none" aria-label="Campo preenchido corretamente" title="Campo preenchido corretamente">✓</span>}
    </div>
    {invalid && error && <small id={`${id}-error`} className="mt-1.5 block text-[11.5px] leading-[1.35] text-[#b4232d]" role="alert">{error}</small>}
    {field.note && <small id={`${id}-help`} className="block text-[#857d79] text-[11.5px] mt-1.5 leading-[1.35]">{field.note}</small>}
  </label>;
}
