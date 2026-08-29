import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/api';
import searchIcon from '../../../assets/admin/common/search.png';
import filterIcon from '../../../assets/admin/common/filter.png';
import sortIcon from '../../../assets/admin/common/sort.png';
import viewIcon from '../../../assets/admin/common/view.png';
import editIcon from '../../../assets/admin/common/edit.png';
import deleteIcon from '../../../assets/admin/common/delete.png';
import qrIcon from '../../../assets/admin/lote/qrcode.png';
import dividerLarge from '../../../assets/admin/common/divider-large.png';

const statusClasses = {
  ativa: 'bg-[#e7f3e2] text-[#2d772d]',
  ativo: 'bg-[#e7f3e2] text-[#2d772d]',
  finalizada: 'bg-[#e7f3e2] text-[#2d772d]',
  publicado: 'bg-[#e7f3e2] text-[#2d772d]',
  inativa: 'bg-[#f6e5e5] text-[#a0333b]',
  inativo: 'bg-[#f6e5e5] text-[#a0333b]',
  registrado: 'bg-[#e5efff] text-[#2a64ac]',
  pendente: 'bg-[#fff0d8] text-[#ad6800]',
  encerrada: 'bg-[#fff0d8] text-[#ad6800]',
  'em-producao': 'bg-[#fff0d8] text-[#ad6800]',
};

const normalizeStatus = (value='') => String(value).toLowerCase().replaceAll(' ','-').normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export default function ModuleRecords({ config, refreshKey, onEdit, onNew }) {
  const queryClient = useQueryClient();
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(1);
  const pageSize=5;
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['admin-records', config.key, refreshKey],
    queryFn: () => api.list(config.key),
  });
  const filtered=useMemo(()=>items.filter(item=>JSON.stringify(item).toLowerCase().includes(query.toLowerCase())),[items,query]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const visible=filtered.slice((page-1)*pageSize,page*pageSize);

  async function remove(event,item){
    event.preventDefault();
    event.stopPropagation();
    if(!confirm(`Excluir ${config.singular}?`)) return;
    try {
      await api.remove(config.key,item.id);
      await queryClient.invalidateQueries({ queryKey: ['admin-records', config.key] });
      const remaining = filtered.length - 1;
      const nextPages = Math.max(1, Math.ceil(remaining / pageSize));
      setPage(current => Math.min(current, nextPages));
    } catch (error) {
      alert(error.message || 'Não foi possível excluir o registro.');
    }
  }

  function display(col,value){
    if(col==='volume' && value) return `${value} ml`;
    if(col==='alcohol'&&value) return `${value}% vol`;
    if(col==='quantity'&&value) return `${value}`;
    if(col==='wallet'||col==='blockchain') return value||'–';
    if(col==='qrCode') return value?<span><img className="w-[27px] h-[27px] object-contain" src={qrIcon} alt="QR Code"/></span>:'–';
    if(col==='status') {
      const key = normalizeStatus(value);
      return <span className={`inline-flex py-[5px] px-[10px] rounded-[7px] whitespace-nowrap ${statusClasses[key] || 'bg-[#eef0ef]'}`}>{value}</span>;
    }
    return value||'–';
  }

  const toolbarButton = 'h-[clamp(44px,4.7vh,48px)] min-w-[clamp(108px,9vw,130px)] border-[1.5px] border-[#bfb4af] rounded-[7px] bg-white flex items-center justify-center gap-[9px] text-[clamp(13px,1vw,15px)] cursor-pointer transition-[transform,box-shadow,background-color,border-color,color] duration-150 hover:bg-[#fff8f6] hover:border-[#8f2940] hover:text-[#75172a] hover:shadow-[0_5px_13px_rgba(91,12,27,.10)] hover:-translate-y-px active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2';
  const actionButton = 'w-8 h-8 border-[1.2px] border-[#a37677] rounded-[6px] bg-white p-[5px] cursor-pointer shrink-0 transition-[transform,box-shadow,background-color,border-color] duration-150 hover:bg-[#fff5f6] hover:border-[#8c2037] hover:shadow-[0_4px_10px_rgba(91,12,27,.13)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2';

  return <section className="min-h-full flex flex-col">
    <div className="flex justify-between items-center gap-5">
      <div className="flex items-center gap-[clamp(12px,1vw,16px)] min-w-0">
        <span className="w-[clamp(58px,4.8vw,68px)] h-[clamp(58px,4.8vw,68px)] border border-[#e5c99d] rounded-full grid place-items-center shrink-0"><img className="w-[70%] h-[70%] object-contain" src={config.icon} alt=""/></span>
        <div><h2 className="mt-0 mb-[5px] font-playfair text-[#6a1424] text-[clamp(21px,1.7vw,25px)] font-semibold">{config.recordsTitle}</h2><p className="m-0 text-[#746e6b] text-[clamp(12px,0.95vw,14px)] leading-[1.35]">{config.recordsSubtitle}</p></div>
      </div>
      <button type="button" className="h-[clamp(45px,4.8vh,50px)] px-[clamp(16px,1.5vw,23px)] border-0 rounded-[7px] bg-[linear-gradient(100deg,#940927,#630c1f)] text-white text-[clamp(13px,1vw,15px)] cursor-pointer whitespace-nowrap transition-[transform,box-shadow,filter] duration-150 hover:brightness-[1.08] hover:shadow-[0_7px_16px_rgba(105,10,31,.22)] hover:-translate-y-px active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2" onClick={onNew}>＋ Novo {config.singular}</button>
    </div>

    <div className="w-full my-3 mb-[18px] flex items-center justify-center pointer-events-none"><img className="block w-full h-auto max-h-9 object-contain object-center select-none" src={dividerLarge} alt="" aria-hidden="true" /></div>

    <div className="flex justify-between items-center gap-[clamp(12px,1.5vw,20px)] mb-[18px] max-[1450px]:mb-[14px]">
      <label className="w-[min(38%,360px)] min-w-[270px] h-[clamp(44px,4.7vh,48px)] border-[1.5px] border-[#d5cfca] rounded-[7px] flex items-center px-[14px] gap-[11px] bg-white">
        <img className="w-[23px] h-[23px]" src={searchIcon} alt=""/>
        <input className="border-0 outline-0 w-full min-w-0 text-[13px] bg-transparent" placeholder={config.searchPlaceholder} value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/>
      </label>
      <div className="flex gap-[10px] flex-wrap justify-end">
        <button type="button" className={toolbarButton}><img className="w-[22px] h-[22px]" src={filterIcon} alt=""/>Filtrar</button>
        <button type="button" className={toolbarButton}><img className="w-[22px] h-[22px]" src={sortIcon} alt=""/>Ordenar⌄</button>
      </div>
    </div>

    <div className="w-full max-w-full border border-[#e4ded9] rounded-[9px] overflow-auto bg-white [scrollbar-width:thin] [scrollbar-color:#998c87_#f1eeeb] [&::-webkit-scrollbar]:w-[9px] [&::-webkit-scrollbar]:h-[9px] [&::-webkit-scrollbar-thumb]:bg-[#998c87] [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-track]:bg-[#f1eeeb]">
      {isLoading && <p className="m-4 text-sm text-[#655c58]">Carregando registros...</p>}
      {error && <p className="m-4 text-sm text-red-700">Não foi possível carregar os registros.</p>}
      <table className="w-full border-collapse min-w-[980px] text-[clamp(11px,0.82vw,12.5px)]">
        <thead><tr>{config.columns.map(([,label])=><th className="h-11 text-left px-[clamp(8px,0.8vw,12px)] text-[#4a272d] font-bold bg-[#fffdfa] border-b border-[#e7e0dc] whitespace-nowrap" key={label}>{label}</th>)}<th className="h-11 text-left px-[clamp(8px,0.8vw,12px)] text-[#4a272d] font-bold bg-[#fffdfa] border-b border-[#e7e0dc] whitespace-nowrap">Ações</th></tr></thead>
        <tbody>{visible.map(item=><tr key={item.id} className="[&:last-child>td]:border-b-0">{config.columns.map(([col])=><td className="h-14 py-[7px] px-[clamp(8px,0.8vw,12px)] border-b border-[#ece6e2] text-[#453b38] max-w-[190px] align-middle" key={col}>{display(col,item[col])}</td>)}<td className="h-14 py-[7px] px-[clamp(8px,0.8vw,12px)] border-b border-[#ece6e2] text-[#453b38] align-middle"><div className="flex gap-1.5 whitespace-nowrap"><button type="button" className={actionButton} title="Visualizar" onClick={()=>alert(JSON.stringify(item,null,2))}><img className="w-full h-full object-contain transition-transform duration-150 group-hover:scale-[1.08]" src={viewIcon} alt="Visualizar"/></button><button type="button" className={actionButton} title="Editar" onClick={()=>onEdit(item)}><img className="w-full h-full object-contain" src={editIcon} alt="Editar"/></button><button type="button" className={`${actionButton} border-[#db6a6e] hover:bg-[#fff0f0] hover:border-[#c9343d]`} title="Excluir" onClick={(event)=>remove(event,item)}><img className="w-full h-full object-contain" src={deleteIcon} alt="Excluir"/></button></div></td></tr>)}</tbody>
      </table>
    </div>

    <div className="grid grid-cols-[minmax(180px,1fr)_auto_minmax(120px,1fr)] items-center gap-[14px] mt-auto pt-4 text-[11.5px] text-[#655c58]">
      <span>Mostrando {filtered.length ? (page-1)*pageSize+1 : 0}-{Math.min(page*pageSize,filtered.length)} de {filtered.length} registros</span>
      <div className="flex gap-1.5 justify-center">
        <button type="button" className="w-9 h-9 border border-[#ddd4cf] bg-white rounded-[6px] disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-[#fff5f6] enabled:hover:text-[#7c1328] enabled:hover:border-[#9a4e5b] enabled:hover:-translate-y-px transition-[transform,background-color,border-color,color]" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
        {Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(p=><button type="button" className={`w-9 h-9 border rounded-[6px] transition-[transform,background-color,border-color,color] ${p===page?'bg-[#851329] text-white border-[#851329]':'border-[#ddd4cf] bg-white hover:bg-[#fff5f6] hover:text-[#7c1328] hover:border-[#9a4e5b] hover:-translate-y-px'}`} key={p} onClick={()=>setPage(p)}>{p}</button>)}
        <button type="button" className="w-9 h-9 border border-[#ddd4cf] bg-white rounded-[6px] disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-[#fff5f6] enabled:hover:text-[#7c1328] enabled:hover:border-[#9a4e5b] enabled:hover:-translate-y-px transition-[transform,background-color,border-color,color]" disabled={page===pages} onClick={()=>setPage(p=>p+1)}>›</button>
      </div>
      <span className="text-right">5 por página</span>
    </div>
  </section>;
}
