import ModuleForm from '../../components/ModuleForm';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../api/api';

export default function SafraCadastrar({ config, ...props }: any) {
  const { data: wines = [] } = useQuery({ queryKey: ['wines', 'all'], queryFn: () => api.list('vinhos') });
  const { data: grapes = [] } = useQuery({ queryKey: ['grapes', 'active'], queryFn: () => api.list('uvas') });
  const wineGrapeMap = useMemo(() => Object.fromEntries(wines.map((wine) => [
    String(wine.id), Array.isArray(wine.grapeIds) ? wine.grapeIds.map(String) : [],
  ])), [wines]);
  const formConfig = useMemo(() => ({
    ...config,
    wineGrapeMap,
    fields: config.fields.map((field) => field.name === 'wineId'
      ? { ...field, options: wines.map((wine) => ({ value: String(wine.id), label: String(wine.name) })) }
      : field.name === 'grapeIds'
        ? { ...field, disabled: true, note: 'Na criação, são copiadas do vinho. Na edição, a composição histórica desta safra é preservada.', options: grapes.map((grape) => ({ value: String(grape.id), label: String(grape.name) })) }
        : field),
  }), [config, wines, grapes, wineGrapeMap]);
  return <ModuleForm {...props} config={formConfig} />;
}
