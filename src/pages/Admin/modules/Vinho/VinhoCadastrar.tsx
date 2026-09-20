import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../api/api';
import ModuleForm from '../../components/ModuleForm';

export default function VinhoCadastrar({ config, ...props }: any) {
  const { data: classifications = [] } = useQuery({ queryKey: ['classifications'], queryFn: () => api.list('classificacoes') });
  const { data: wineTypes = [] } = useQuery({
    queryKey: ['wine-types', 'active'],
    queryFn: () => api.list('tipos-vinho'),
  });
  const { data: grapes = [] } = useQuery({
    queryKey: ['grapes', 'active'],
    queryFn: () => api.list('uvas'),
  });

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

  return <ModuleForm {...props} config={formConfig} />;
}
