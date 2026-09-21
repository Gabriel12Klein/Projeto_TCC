import QueryFeedback from '../../../../ui/QueryFeedback';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../api/api';
import ModuleForm from '../../components/ModuleForm';

const emptyOptions = [];

export default function VinhoCadastrar({ config, ...props }: any) {
  const classificationsQuery = useQuery({ queryKey: ['classifications'], queryFn: () => api.list('classificacoes') });
  const wineTypesQuery = useQuery({
    queryKey: ['wine-types', 'active'],
    queryFn: () => api.list('tipos-vinho'),
  });
  const grapesQuery = useQuery({
    queryKey: ['grapes', 'active'],
    queryFn: () => api.list('uvas'),
  });

  const classifications = classificationsQuery.data ?? emptyOptions;
  const wineTypes = wineTypesQuery.data ?? emptyOptions;
  const grapes = grapesQuery.data ?? emptyOptions;
  const formConfig = useMemo(() => ({
    ...config,
    fields: config.fields.map((field) => {
      if (field.name === 'classificationId') return {
        ...field,
        options: classifications.filter((item) => item.status === 'Ativo' || item.id === props.initialData?.classificationId)
          .map((item) => ({ value: String(item.id), label: String(item.name) })),
      };
      if (field.name === 'typeId') {
        return {
          ...field,
          options: wineTypes.map((item) => ({ value: String(item.id), label: String(item.name) })),
        };
      }
      if (field.name === 'grapeIds') {
        return {
          ...field,
          options: grapes.map((item) => ({ value: String(item.id), label: String(item.name) })),
        };
      }
      return field;
    }),
  }), [config, grapes, wineTypes, classifications, props.initialData?.classificationId]);

  const queries = [classificationsQuery, wineTypesQuery, grapesQuery];
  const failed = queries.find(query => query.isError);
  if (queries.some(query => query.isPending) || failed) return <QueryFeedback loading={queries.some(query => query.isPending)} error={failed?.error} fetching={queries.some(query => query.isFetching)} loadingText="Carregando opções do cadastro…" retry={() => { queries.forEach(query => void query.refetch()); }} />;
  return <ModuleForm {...props} config={formConfig} />;
}
