function formatCnpj(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function normalizeFieldValue(field, value) {
  if (field.mask === 'cnpj') return formatCnpj(value);
  return value;
}

export default function FormField({ field, value, onChange, valid = false, unlocked = true, onRequestFocus }) {
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
    ? <select className={`${controlClass} h-[43px]`} id={id} value={value ?? ''} onChange={e=>onChange(field.name,e.target.value)} required={field.required} disabled={field.disabled} {...focusProps}><option value="">Selecione</option>{field.options?.map(o=><option key={o}>{o}</option>)}</select>
    : field.type === 'textarea'
      ? <textarea className={`${controlClass} h-[calc(100%-16px)] resize-none`} id={id} value={value ?? ''} maxLength={field.maxLength} placeholder={field.placeholder} onChange={handleChange} required={field.required} disabled={field.disabled} {...focusProps}/>
      : field.type === 'file'
        ? <input className={controlClass} id={id} type="file" accept="image/png,image/jpeg" onChange={e=>onChange(field.name,e.target.files?.[0]?.name ?? '')} disabled={field.disabled} {...focusProps}/>
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
            {...focusProps}
          />;

  const inputShellClass = field.type === 'textarea'
    ? 'h-[clamp(98px,11vh,116px)] items-start pt-3'
    : field.type === 'file'
      ? 'h-[clamp(76px,8vh,84px)] border-dashed'
      : 'min-h-[clamp(46px,4.8vh,51px)] items-center';

  return <label className="block min-w-0">
    <span className="block text-[clamp(12px,0.95vw,14px)] font-semibold mb-[7px] text-[#302627]">{field.label}{field.required && <b className="text-[#af1530] ml-[3px]">*</b>}</span>
    <div className={`border-[1.6px] rounded-[7px] flex px-[clamp(11px,1vw,14px)] gap-[10px] ${field.disabled ? 'border-[#ddd8d5] bg-[#f4f1ef] opacity-60 cursor-not-allowed' : 'border-[#d6d0cc] bg-white focus-within:border-[#9d4b5b] focus-within:shadow-[0_0_0_3px_rgba(125,29,45,.08)]'} ${inputShellClass}`}>
      {field.icon && <img className="w-6 h-6 object-contain opacity-[.78] shrink-0" src={field.icon} alt="" />}
      {content}
      {field.suffix && <em className="not-italic min-w-[42px] text-center text-[#5d5552] text-[13px]">{field.suffix}</em>}
      {field.required && field.type !== 'select' && valid && <span className="w-[22px] h-[22px] rounded-full bg-[#e7f3e2] text-[#2d772d] grid place-items-center shrink-0 text-[15px] font-bold leading-none" aria-label="Campo preenchido corretamente" title="Campo preenchido corretamente">✓</span>}
    </div>
    {field.note && <small className="block text-[#857d79] text-[11.5px] mt-1.5 leading-[1.35]">{field.note}</small>}
  </label>;
}
