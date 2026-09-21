import QueryFeedback from '../../../ui/QueryFeedback';
import { recordDetails, filterRecords } from './recordView';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/api';
import searchIcon from '../../../assets/admin/common/search.png';
import viewIcon from '../../../assets/admin/common/view.png';
import editIcon from '../../../assets/admin/common/edit.png';
import deleteIcon from '../../../assets/admin/common/delete.png';
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
  const [actionMessage,setActionMessage]=useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState(false);
  const deletingRef = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
  useEffect(() => { setQuery(''); setStatus(''); setSort(''); setPage(1); setActionMessage(''); setSelected(null); dialog.current?.close(); }, [config.key]);
  function closeDetails() { dialog.current?.close(); setSelected(null); detailTrigger.current?.focus(); }
  const pageSize=5;
  const { data: items = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-records', config.key, refreshKey],
    queryFn: () => api.list(config.key),
  });
  const filtered=useMemo(() => filterRecords(items, [...config.columns.map(([key]) => key), 'wineName', 'grapes'], query, status, sort), [items, query, status, sort, config.columns]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const currentPage = Math.min(page, pages);
  const visible=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);

  async function remove(event,item){
    event.preventDefault();
    event.stopPropagation();
    if (deletingRef.current) return;
    if(!confirm(`Excluir ${config.singular} “${item.name || item.code || item.identifier}”? Esta ação não pode ser desfeita. Registros com vínculos protegidos não poderão ser excluídos.`)) return;
    deletingRef.current = true; setDeleting(true); setActionError(false);
    setActionMessage('');
    try {
      await api.remove(config.key,item.id);
      await queryClient.invalidateQueries();
      setActionMessage('Registro excluído com sucesso.');
      const remaining = filtered.length - 1;
      const nextPages = Math.max(1, Math.ceil(remaining / pageSize));
      setPage(current => Math.min(current, nextPages));
    } catch (error) {
      setActionError(true);
      setActionMessage(error instanceof Error ? error.message : 'Não foi possível excluir o registro.');
    } finally { deletingRef.current = false; setDeleting(false); }
  }

  function display(col,value){
    if(col==='observations') return <span className="line-clamp-2 whitespace-normal break-words" title={value ? String(value) : undefined}>{value || '–'}</span>;
    if(col==='volume' && value) return `${value} ml`;
    if(col==='alcohol'&&value) return `${value}% vol`;
    if(col==='quantity'&&value) return `${value} L`;
    if(col==='wallet'||col==='blockchain') return value||'–';
    if(col==='qrCode') return value ? <a className="inline-flex rounded-md border border-[#dfd0bd] bg-white p-1 transition hover:border-[#8f2940] hover:shadow-sm" href={String(value)} target="_blank" rel="noreferrer" title="Abrir QR Code"><img className="h-12 w-12 object-contain" src={String(value)} alt="QR Code do lote" /></a> : '–';
    if(col==='status') {
      const key = normalizeStatus(value);
      return <span className={`inline-flex py-[5px] px-[10px] rounded-[7px] whitespace-nowrap ${statusClasses[key] || 'bg-[#eef0ef]'}`}>{value}</span>;
    }
    return value||'–';
  }

  const toolbarButton = 'h-[clamp(44px,4.7vh,48px)] min-w-[clamp(108px,9vw,130px)] border-[1.5px] border-[#bfb4af] rounded-[7px] bg-white flex items-center justify-center gap-[9px] text-[clamp(13px,1vw,15px)] cursor-pointer transition-[transform,box-shadow,background-color,border-color,color] duration-150 hover:bg-[#fff8f6] hover:border-[#8f2940] hover:text-[#75172a] hover:shadow-[0_5px_13px_rgba(91,12,27,.10)] hover:-translate-y-px active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2';
  const actionButton = 'w-8 h-8 border-[1.2px] border-[#a37677] rounded-[6px] bg-white p-[5px] cursor-pointer shrink-0 transition-[transform,box-shadow,background-color,border-color] duration-150 hover:bg-[#fff5f6] hover:border-[#8c2037] hover:shadow-[0_4px_10px_rgba(91,12,27,.13)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2';

  return <section className="min-h-full flex flex-col">
    <div className="flex flex-wrap justify-between items-center gap-5">
      <div className="flex items-center gap-[clamp(12px,1vw,16px)] min-w-0">
        <span className="w-[clamp(58px,4.8vw,68px)] h-[clamp(58px,4.8vw,68px)] border border-[#e5c99d] rounded-full grid place-items-center shrink-0"><img className="w-[70%] h-[70%] object-contain" src={config.icon} alt=""/></span>
        <div><h2 className="mt-0 mb-[5px] font-playfair text-[#6a1424] text-[clamp(21px,1.7vw,25px)] font-semibold">{config.recordsTitle}</h2><p className="m-0 text-[#746e6b] text-[clamp(12px,0.95vw,14px)] leading-[1.35]">{config.recordsSubtitle}</p></div>
      </div>
      <button type="button" className="h-[clamp(45px,4.8vh,50px)] px-[clamp(16px,1.5vw,23px)] border-0 rounded-[7px] bg-[linear-gradient(100deg,#940927,#630c1f)] text-white text-[clamp(13px,1vw,15px)] cursor-pointer whitespace-nowrap transition-[transform,box-shadow,filter] duration-150 hover:brightness-[1.08] hover:shadow-[0_7px_16px_rgba(105,10,31,.22)] hover:-translate-y-px active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2" onClick={onNew}>＋ Novo {config.singular}</button>
    </div>

    <div className="w-full my-3 mb-[18px] flex items-center justify-center pointer-events-none"><img className="block w-full h-auto max-h-9 object-contain object-center select-none" src={dividerLarge} alt="" aria-hidden="true" /></div>

    {actionMessage && <div className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${actionError ? 'border-[#e4a7a7] bg-[#fff3f3] text-[#8d2630]' : 'border-[#bbd3b3] bg-[#eef5eb] text-[#31502b]'}`} role={actionError ? 'alert' : 'status'}>
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f8dede] font-bold">{actionError ? '!' : '✓'}</span>
      <div className="min-w-0 flex-1"><strong className="block">{actionError ? 'Não foi possível concluir a exclusão' : 'Exclusão concluída'}</strong><span className="mt-1 block leading-5">{actionMessage}</span></div>
      <button type="button" className="shrink-0 font-bold text-[#8d2630]" aria-label="Fechar mensagem" onClick={()=>setActionMessage('')}>×</button>
    </div>}

    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm">Buscar registros
        <span className="mt-1 flex items-center gap-2 rounded-lg border border-[#d5cfca] bg-white px-3 py-2">
          <img className="h-5 w-5" src={searchIcon} alt="" />
          <input className="min-w-0 w-full bg-transparent" placeholder={config.searchPlaceholder} value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} />
        </span>
      </label>
      <label className="text-sm">Situação<select className="mt-1 block rounded-lg border border-[#d5cfca] bg-white p-2" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Todas</option>{[...new Set(items.map(item => String(item.status || '')))].filter(Boolean).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm">Ordenar<select className="mt-1 block rounded-lg border border-[#d5cfca] bg-white p-2" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="">Ordem padrão</option><option value={config.columns[0][0] + ':asc'}>{config.columns[0][1]}: crescente</option><option value={config.columns[0][0] + ':desc'}>{config.columns[0][1]}: decrescente</option></select></label>
      {(query || status || sort) && <button type="button" className={toolbarButton} onClick={() => { setQuery(''); setStatus(''); setSort(''); setPage(1); }}>Limpar filtros</button>}
    </div>
    <QueryFeedback loading={isLoading} error={error} fetching={isFetching} empty={!filtered.length} emptyText={items.length ? 'Nenhum registro corresponde aos filtros. Limpe os filtros para ver todos.' : 'Nenhum registro cadastrado. Use o botão Novo para começar.'} loadingText="Carregando registros…" retry={() => void refetch()} />
    {deleting && <p role="status">Excluindo registro…</p>}
    <div className="w-full max-w-full border border-[#e4ded9] rounded-[9px] overflow-auto bg-white [scrollbar-width:thin] [scrollbar-color:#998c87_#f1eeeb] [&::-webkit-scrollbar]:w-[9px] [&::-webkit-scrollbar]:h-[9px] [&::-webkit-scrollbar-thumb]:bg-[#998c87] [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-track]:bg-[#f1eeeb]">
      <table className="w-full border-collapse min-w-[980px] text-[clamp(11px,0.82vw,12.5px)]">
        <thead><tr>{config.columns.map(([,label])=><th className="h-11 text-left px-[clamp(8px,0.8vw,12px)] text-[#4a272d] font-bold bg-[#fffdfa] border-b border-[#e7e0dc] whitespace-nowrap" key={label}>{label}</th>)}<th className="h-11 text-left px-[clamp(8px,0.8vw,12px)] text-[#4a272d] font-bold bg-[#fffdfa] border-b border-[#e7e0dc] whitespace-nowrap">Ações</th></tr></thead>
        <tbody>{visible.map(item=><tr key={item.id} className="[&:last-child>td]:border-b-0">{config.columns.map(([col])=><td className="h-14 py-[7px] px-[clamp(8px,0.8vw,12px)] border-b border-[#ece6e2] text-[#453b38] max-w-[190px] align-middle" key={col}>{display(col,item[col])}</td>)}<td className="h-14 py-[7px] px-[clamp(8px,0.8vw,12px)] border-b border-[#ece6e2] text-[#453b38] align-middle"><div className="flex gap-1.5 whitespace-nowrap"><button type="button" className={actionButton} title="Visualizar" onClick={event=>{ detailTrigger.current = event.currentTarget; setSelected(item); }}><img className="w-full h-full object-contain transition-transform duration-150 group-hover:scale-[1.08]" src={viewIcon} alt="Visualizar"/></button><button type="button" className={actionButton} title="Editar" disabled={deleting} onClick={()=>onEdit(item)}><img className="w-full h-full object-contain" src={editIcon} alt="Editar"/></button><button type="button" className={`${actionButton} border-[#db6a6e] hover:bg-[#fff0f0] hover:border-[#c9343d]`} title="Excluir" disabled={deleting} onClick={(event)=>remove(event,item)}><img className="w-full h-full object-contain" src={deleteIcon} alt="Excluir"/></button></div></td></tr>)}</tbody>
      </table>
    </div>

    <div className="grid grid-cols-[minmax(180px,1fr)_auto_minmax(120px,1fr)] max-sm:grid-cols-1 items-center gap-[14px] mt-auto pt-4 text-[11.5px] text-[#655c58]">
      <span>Mostrando {filtered.length ? (currentPage-1)*pageSize+1 : 0}-{Math.min(currentPage*pageSize,filtered.length)} de {filtered.length} registros</span>
      <div className="flex gap-1.5 justify-center">
        <button type="button" className="w-9 h-9 border border-[#ddd4cf] bg-white rounded-[6px] disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-[#fff5f6] enabled:hover:text-[#7c1328] enabled:hover:border-[#9a4e5b] enabled:hover:-translate-y-px transition-[transform,background-color,border-color,color]" disabled={currentPage===1} aria-label="Página anterior" onClick={()=>setPage(currentPage-1)}>‹</button>
        {Array.from({length:Math.min(pages,5)},(_,i)=>Math.max(1, Math.min(currentPage - 2, pages - 4)) + i).map(p=><button type="button" className={`w-9 h-9 border rounded-[6px] transition-[transform,background-color,border-color,color] ${p===currentPage?'bg-[#851329] text-white border-[#851329]':'border-[#ddd4cf] bg-white hover:bg-[#fff5f6] hover:text-[#7c1328] hover:border-[#9a4e5b] hover:-translate-y-px'}`} key={p} aria-current={p === currentPage ? 'page' : undefined} aria-label={`Página ${p}`} onClick={()=>setPage(p)}>{p}</button>)}
        <button type="button" className="w-9 h-9 border border-[#ddd4cf] bg-white rounded-[6px] disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-[#fff5f6] enabled:hover:text-[#7c1328] enabled:hover:border-[#9a4e5b] enabled:hover:-translate-y-px transition-[transform,background-color,border-color,color]" disabled={currentPage===pages} aria-label="Próxima página" onClick={()=>setPage(currentPage+1)}>›</button>
      </div>
      <span className="text-right">5 por página</span>
    </div>
    <dialog ref={dialog} className="m-auto max-h-[85vh] w-[min(92vw,720px)] overflow-auto rounded-2xl border border-[#dfd0bd] bg-white p-6 text-[#453b38] backdrop:bg-black/40" aria-labelledby="record-detail-title" onCancel={closeDetails}>
      <header className="flex items-start justify-between gap-4"><h2 id="record-detail-title" className="font-playfair text-2xl text-[#6a1424]">Detalhes de {config.singular}</h2><button type="button" onClick={closeDetails} aria-label="Fechar detalhes" className="rounded border px-3 py-1">×</button></header>
      {selected && <dl className="mt-5 grid gap-4 sm:grid-cols-2">{recordDetails(config, selected).map(({key,label,value}) => <div key={key} className={value.length > 100 ? 'sm:col-span-2' : ''}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>}
      <button type="button" onClick={closeDetails} className="mt-6 rounded-lg border border-[#851329] px-4 py-2">Fechar</button>
    </dialog>
  </section>;
}
