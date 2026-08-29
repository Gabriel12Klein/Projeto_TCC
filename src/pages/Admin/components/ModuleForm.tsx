import { useEffect, useMemo, useState } from 'react';
import FormField from './FormField';
import saveIcon from '../../../assets/admin/common/save.png';
import clearIcon from '../../../assets/admin/common/clear.png';
import cancelIcon from '../../../assets/admin/common/cancel.png';
import linkIcon from '../../../assets/admin/vinicola/link.png';
import blockchainIcon from '../../../assets/admin/lote/blockchain.png';
import qrIcon from '../../../assets/admin/lote/qrcode.png';
import dividerLarge from '../../../assets/admin/common/divider-large.png';

const secondaryButton = 'min-w-[clamp(140px,13vw,165px)] min-h-12 h-[clamp(48px,5vh,54px)] rounded-[7px] px-[clamp(16px,1.5vw,24px)] flex items-center justify-center gap-[10px] text-[clamp(13px,1vw,15px)] cursor-pointer border-[1.5px] border-[#b8aaa5] bg-white text-[#4a3d3b] transition-[transform,box-shadow,background-color,border-color,color] duration-150 hover:bg-[#fff8f6] hover:border-[#8f2940] hover:text-[#75172a] hover:shadow-[0_5px_13px_rgba(91,12,27,.10)] hover:-translate-y-px active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2';

function normalizedText(value) {
  return String(value ?? '').trim();
}

function isValidField(field, value, form) {
  const text = normalizedText(value);

  if (!field.required && !text) return true;
  if (field.required && !text) return false;

  if (field.type === 'select') return Boolean(text);

  const rule = field.validation;
  if (!rule) return !field.required || Boolean(text);

  if (rule === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text);
  }

  if (rule === 'cnpj') {
    return text.replace(/\D/g, '').length === 14;
  }

  if (rule === 'ethereum') {
    return /^0x[a-fA-F0-9]{40}$/.test(text);
  }

  if (rule === 'year') {
    return /^\d{4}$/.test(text) && Number(text) >= 1900 && Number(text) <= 2100;
  }

  if (rule === 'positiveNumber') {
    if (!/^\d+(?:[.,]\d+)?$/.test(text)) return false;
    return Number(text.replace(',', '.')) > 0;
  }

  if (rule === 'alcohol') {
    if (!/^\d{1,2}(?:[.,]\d{1,2})?$|^100(?:[.,]0{1,2})?$/.test(text)) return false;
    const number = Number(text.replace(',', '.'));
    return number > 0 && number <= 100;
  }

  if (rule === 'date') {
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00`));
  }

  if (rule === 'registrationDate') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00`))) return false;
    const productionDate = normalizedText(form.productionDate);
    if (!productionDate) return false;
    return text >= productionDate;
  }

  if (typeof rule === 'object' && rule.minLength) {
    return text.length >= rule.minLength;
  }

  return Boolean(text);
}

export default function ModuleForm({ config, initialData, onSave, onCancel, onMessage }) {
  const [form,setForm] = useState({});
  useEffect(()=>setForm(initialData || {}),[initialData,config.key]);
  const showMessage = (text='') => onMessage?.(text);
  const change=(name,value)=>{ setForm(prev=>({...prev,[name]:value})); showMessage(''); };

  const fieldValidity = useMemo(() => Object.fromEntries(
    config.fields.map(field => [field.name, isValidField(field, form[field.name], form)])
  ), [config.fields, form]);

  function firstInvalidRequired(limit = config.fields.length) {
    return config.fields.slice(0, limit).find(field => field.required && !fieldValidity[field.name]);
  }

  function focusField(field) {
    requestAnimationFrame(() => document.getElementById(`field-${field.name}`)?.focus());
  }

  function handleFieldFocus(field, fieldIndex) {
    const blockedBy = firstInvalidRequired(fieldIndex);
    if (!blockedBy) return true;
    showMessage(`Preencha corretamente o campo “${blockedBy.label}” antes de continuar.`);
    focusField(blockedBy);
    return false;
  }

  async function submit(e){
    e.preventDefault();
    showMessage('');
    const invalid = firstInvalidRequired();
    if (invalid) {
      showMessage(`Preencha corretamente o campo “${invalid.label}” antes de salvar.`);
      focusField(invalid);
      return;
    }
    try{await onSave(form); setForm({}); showMessage('Cadastro salvo localmente.');}catch(err){showMessage(err.message)}
  }

  return <form className="min-h-full flex flex-col" onSubmit={submit} noValidate>
    <div className="flex items-center gap-[clamp(12px,1vw,16px)] min-w-0">
      <span className="w-[clamp(58px,4.8vw,68px)] h-[clamp(58px,4.8vw,68px)] border border-[#e5c99d] rounded-full grid place-items-center shrink-0"><img className="w-[70%] h-[70%] object-contain" src={config.icon} alt="" /></span>
      <div><h2 className="mt-0 mb-[5px] font-playfair text-[#6a1424] text-[clamp(21px,1.7vw,25px)] font-semibold">{config.formTitle}</h2><p className="m-0 text-[#746e6b] text-[clamp(12px,0.95vw,14px)] leading-[1.35]">{config.formSubtitle}</p></div>
    </div>

    <div className="w-full my-3 mb-[18px] flex items-center justify-center pointer-events-none"><img className="block w-[106%] max-w-none h-auto max-h-9 object-contain object-center select-none" src={dividerLarge} alt="" aria-hidden="true" /></div>

    <div className="grid grid-cols-2 gap-y-[clamp(14px,1.25vw,18px)] gap-x-[clamp(22px,2.5vw,38px)] max-[1450px]:gap-y-[14px] max-[1450px]:gap-x-6">
      {config.fields.map((f, fieldIndex)=>{
        const wrapper = f.full
          ? `min-w-0 col-span-2 ${f.action ? 'grid grid-cols-[minmax(0,1fr)_auto] gap-[14px] items-end' : ''}`
          : 'min-w-0';
        const unlocked = !firstInvalidRequired(fieldIndex);
        return <div key={f.name} className={wrapper}>
          <div className={f.action ? 'col-start-1 col-end-2' : ''}><FormField field={f} value={form[f.name]} onChange={change} valid={fieldValidity[f.name]} unlocked={unlocked} onRequestFocus={()=>handleFieldFocus(f, fieldIndex)}/></div>
          {f.action && <button type="button" disabled={f.disabled} className={`col-start-2 col-end-3 row-start-1 self-end mb-6 h-[clamp(44px,4.6vh,48px)] px-[clamp(15px,1.4vw,22px)] border-[1.5px] rounded-[6px] font-bold flex items-center gap-[9px] whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color] duration-150 ${f.disabled ? 'border-[#cfc7c4] bg-[#f4f1ef] text-[#9e9692] opacity-60 cursor-not-allowed' : 'border-[#8e1e35] bg-white text-[#7a1a2d] hover:bg-[#fff8f6] hover:border-[#8f2940] hover:text-[#75172a] hover:shadow-[0_5px_13px_rgba(91,12,27,.10)] hover:-translate-y-px active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2'}`}><img className="w-[22px] h-[22px] object-contain" src={linkIcon} alt="" />{f.action}</button>}
        </div>;
      })}
    </div>

    {config.blockchainInfo && <div className="grid grid-cols-2 mt-[clamp(15px,1.5vw,20px)] border border-[#e4bd84] rounded-[10px] bg-[#fffaf4] py-[clamp(14px,1.3vw,18px)] px-[clamp(16px,1.5vw,20px)] gap-[clamp(18px,2vw,25px)]">
      <div className="flex gap-[14px] items-start"><img className="w-[42px] h-[42px] object-contain" src={blockchainIcon} alt=""/><p className="m-0 flex flex-col gap-[5px]"><b className="text-[13px]">Blockchain</b><span className="text-[11.5px] leading-[1.35] text-[#5f5651]">Ao registrar na blockchain, as informações do lote serão armazenadas futuramente de forma imutável.</span></p></div>
      <div className="flex gap-[14px] items-start border-l border-[#d9b680] pl-[clamp(18px,1.8vw,25px)]"><img className="w-[42px] h-[42px] object-contain" src={qrIcon} alt=""/><p className="m-0 flex flex-col gap-[5px]"><b className="text-[13px]">QR Code</b><span className="text-[11.5px] leading-[1.35] text-[#5f5651]">Gere um QR Code exclusivo para este lote e facilite a consulta das informações.</span></p></div>
    </div>}

    <div className="flex flex-wrap gap-[clamp(10px,1vw,14px)] mt-[clamp(18px,2vw,26px)] pt-[clamp(15px,1.5vw,20px)] border-t border-[#ece6e1] max-[1450px]:mt-[18px] max-[1450px]:pt-[15px]">
      <button className="min-w-[clamp(200px,18vw,230px)] min-h-12 h-[clamp(48px,5vh,54px)] rounded-[7px] px-[clamp(16px,1.5vw,24px)] flex items-center justify-center gap-[10px] text-[clamp(13px,1vw,15px)] cursor-pointer border-0 bg-[linear-gradient(100deg,#8f0826,#5d0c1c)] text-white transition-[transform,box-shadow,filter] duration-150 hover:brightness-[1.08] hover:shadow-[0_7px_16px_rgba(105,10,31,.22)] hover:-translate-y-px active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2" type="submit"><img className="w-[25px] h-[25px] object-contain" src={saveIcon} alt=""/>{initialData?.id?'Salvar alterações':'Salvar cadastro'}</button>
      {config.blockchainInfo && <button type="button" className={secondaryButton} onClick={()=>showMessage('Blockchain ainda não foi implementada nesta versão local.')}><img className="w-[25px] h-[25px] object-contain" src={linkIcon} alt=""/>Registrar na blockchain</button>}
      {config.blockchainInfo && <button type="button" className={secondaryButton} onClick={()=>showMessage('Geração de QR Code será conectada em uma etapa posterior.')}><img className="w-[25px] h-[25px] object-contain" src={qrIcon} alt=""/>Gerar QR Code</button>}
      {config.blockchainInfo && <span className="basis-full h-0" />}
      <button type="button" className={secondaryButton} onClick={()=>setForm({})}><img className="w-[25px] h-[25px] object-contain" src={clearIcon} alt=""/>Limpar</button>
      <button type="button" className={secondaryButton} onClick={onCancel}><img className="w-[25px] h-[25px] object-contain" src={cancelIcon} alt=""/>Cancelar</button>
    </div>
  </form>;
}
