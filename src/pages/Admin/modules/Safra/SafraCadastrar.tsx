import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../api/api';
import ModuleForm from '../../components/ModuleForm';

export default function SafraCadastrar({ config, ...props }: any) {
  const { data: grapes = [] } = useQuery({
    queryKey: ['grapes', 'active'],
    queryFn: () => api.list('uvas'),
  });
  const { data: statuses = [] } = useQuery({
    queryKey: ['status-safra', 'active'],
    queryFn: () => api.list('status-safra'),
  });
  const formConfig = useMemo(() => ({
    ...config,
    fields: config.fields.map((field) => {
      if (field.name === 'grapeIds') return { ...field, options: grapes.map((item) => ({ value: String(item.id), label: String(item.name) })) };
      if (field.name === 'status') return { ...field, options: statuses.map((item) => String(item.name)) };
      return field;
    }),
  }), [config, grapes, statuses]);

  return <ModuleForm {...props} config={formConfig} />;
}
