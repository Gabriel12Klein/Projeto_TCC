import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../api/api';
import ModuleForm from '../../components/ModuleForm';

export default function LoteCadastrar({ config, onOpenWine, ...props }: any) {
  const { data: grapes = [] } = useQuery({
    queryKey: ['grapes', 'active'],
    queryFn: () => api.list('uvas'),
  });
  const { data: vintages = [] } = useQuery({
    queryKey: ['vintages', 'all'],
    queryFn: () => api.list('safras'),
  });
  const { data: wines = [] } = useQuery({
    queryKey: ['wines', 'all'],
    queryFn: () => api.list('vinhos'),
  });
  const wineGrapeMap = useMemo(
    () => Object.fromEntries(wines.map((item) => [String(item.id), Array.isArray(item.grapeIds) ? item.grapeIds.map(String) : []])),
    [wines],
  );
  const formConfig = useMemo(() => ({
    ...config,
    wineGrapeMap,
    vintageGrapeMap: Object.fromEntries(vintages.map((item) => [String(item.id), item.grapeIds ?? []])),
    fields: config.fields.map((field) => {
      if (field.name === 'grapeIds') {
        return {
          ...field,
          disabled: true,
          options: grapes.map((item) => ({ value: String(item.id), label: String(item.name) })),
          note: 'Preenchida automaticamente com as uvas registradas na safra selecionada.',
        };
      }
      if (field.name === 'wineId') return { ...field, options: wines.map((item) => ({ value: String(item.id), label: `${String(item.name)} — ${String(item.type)}` })) };
      if (field.name === 'vintageId') return { ...field, options: vintages.map((item) => ({ value: String(item.id), wineId: String(item.wineId), label: `${String(item.identifier)} — ${String(item.year)}` })) };
      return field;
    }),
  }), [config, grapes, vintages, wineGrapeMap, wines]);

  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-[#e4bd84] bg-[#fffaf4] px-4 py-3 text-[13px] text-[#5f5651]" role="note">
      <span>O lote precisa estar vinculado a um vinho cadastrado.</span>
      <button
        type="button"
        onClick={onOpenWine}
        className="min-h-9 rounded-[6px] border-[1.5px] border-[#8e1e35] bg-white px-3.5 font-semibold text-[#7a1a2d] transition-colors hover:bg-[#fff1ed] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2"
      >
        + Cadastrar novo vinho
      </button>
    </div>
    <ModuleForm {...props} config={formConfig} />
  </>;
}
