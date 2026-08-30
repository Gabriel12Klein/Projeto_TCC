import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../api/api';
import ModuleForm from '../../components/ModuleForm';

export default function VinhoCadastrar({ config, ...props }: any) {
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
  }), [config, grapes, wineTypes]);

  return <ModuleForm {...props} config={formConfig} />;
}
