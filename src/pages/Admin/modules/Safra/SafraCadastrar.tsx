import QueryFeedback from '../../../../ui/QueryFeedback';
import ModuleForm from '../../components/ModuleForm';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../api/api';

const emptyOptions = [];

export default function SafraCadastrar({ config, ...props }: any) {
  const winesQuery = useQuery({ queryKey: ['wines', 'all'], queryFn: () => api.list('vinhos') });
  const grapesQuery = useQuery({ queryKey: ['grapes', 'active'], queryFn: () => api.list('uvas') });
  const wines = winesQuery.data ?? emptyOptions;
  const grapes = grapesQuery.data ?? emptyOptions;
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
  const queries = [winesQuery, grapesQuery];
  const failed = queries.find(query => query.isError);
  if (queries.some(query => query.isPending) || failed) return <QueryFeedback loading={queries.some(query => query.isPending)} error={failed?.error} fetching={queries.some(query => query.isFetching)} loadingText="Carregando opções do cadastro…" retry={() => { queries.forEach(query => void query.refetch()); }} />;
  return <ModuleForm {...props} config={formConfig} />;
}
