import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/api';
import { moduleConfigs } from '../Admin/moduleConfigs';
import ModuleForm from '../Admin/components/ModuleForm';
import type { EntityRecord } from '../../types';

export default function ClientWinePage({ mode }: { mode: 'create' | 'records' }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EntityRecord | null>(null);
  const [deletedWine, setDeletedWine] = useState<EntityRecord | null>(null);
  const [message, setMessage] = useState('');
  const {
    data: wines = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['client-wines'],
    queryFn: () => api.list('vinhos'),
    enabled: mode === 'records',
  });
  const { data: wineTypes = [] } = useQuery({
    queryKey: ['wine-types', 'active'],
    queryFn: () => api.list('tipos-vinho'),
  });
  const { data: grapes = [] } = useQuery({
    queryKey: ['grapes', 'active'],
    queryFn: () => api.list('uvas'),
  });
  const config = useMemo(() => ({
    ...moduleConfigs.vinhos,
    fields: moduleConfigs.vinhos.fields.map((field) => {
      if (field.name === 'typeId') {
        return { ...field, options: wineTypes.map((item) => ({ value: String(item.id), label: String(item.name) })) };
      }
      if (field.name === 'grapeIds') {
        return { ...field, options: grapes.map((item) => ({ value: String(item.id), label: String(item.name) })) };
      }
      return field;
    }),
  }), [grapes, wineTypes]);

  async function save(payload: Record<string, unknown>) {
    const saved = editing?.id
      ? await api.update('vinhos', editing.id, payload)
      : await api.create('vinhos', payload);
    setEditing(null);
    await queryClient.invalidateQueries({ queryKey: ['client-wines'] });
    setMessage(editing?.id ? 'Vinho atualizado com sucesso.' : 'Vinho cadastrado com sucesso.');
    return saved;
  }

  async function remove(wine: EntityRecord) {
    if (!window.confirm(`Excluir o vinho “${String(wine.name)}”?`)) return;
    try {
      await api.remove('vinhos', wine.id);
      await queryClient.invalidateQueries({ queryKey: ['client-wines'] });
      setDeletedWine(wine);
      setMessage('Vinho excluído com sucesso.');
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : 'Não foi possível excluir o vinho.');
    }
  }

  async function undoDelete() {
    if (!deletedWine) return;
    try {
      await api.create('vinhos', {
        name: deletedWine.name,
        type: deletedWine.type,
        grapes: deletedWine.grapes,
        volume: deletedWine.volume,
        alcohol: deletedWine.alcohol,
        description: deletedWine.description,
        status: deletedWine.status,
      });
      setDeletedWine(null);
      await queryClient.invalidateQueries({ queryKey: ['client-wines'] });
      setMessage('Exclusão desfeita.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível desfazer a exclusão.');
    }
  }

  if (mode === 'create' || editing)
    return (
      <main className="min-h-screen bg-[rgba(255,255,255,.55)] p-5 md:p-10">
        <div className="mx-auto max-w-6xl">
          <ModuleForm
            config={config}
            initialData={editing}
            onSave={save}
            onCancel={() => window.location.assign('/catalogo/registros')}
            onMessage={setMessage}
            onSaved={() => window.location.assign('/catalogo/registros')}
            confirmOnCancel={false}
          />
          {message ? (
            <p className="mt-5 text-sm text-[#7d1d2d]" aria-live="polite">
              {message}
            </p>
          ) : null}
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-[rgba(255,255,255,.55)] p-5 md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#9a6a2d]">Vinho</p>
        <h1 className="mt-2 font-playfair text-4xl font-semibold text-[#5b0c1b]">Registros de vinhos</h1>
        <p className="mt-3 text-[#715f59]">Consulte, edite ou exclua os vinhos cadastrados.</p>
        {deletedWine ? (
          <div
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfc27d] bg-[#fff8e9] px-4 py-3 text-sm text-[#6a4b1c]"
            role="status"
          >
            <span>“{String(deletedWine.name)}” foi excluído.</span>
            <button className="font-bold underline underline-offset-2" onClick={undoDelete}>
              Desfazer
            </button>
          </div>
        ) : null}
        <div className="mt-8 overflow-x-auto rounded-3xl border border-[#dfd0bd] bg-white shadow-sm">
          {isLoading ? (
            <p className="p-6">Carregando registros...</p>
          ) : error ? (
            <p className="p-6 text-red-700">Não foi possível carregar os registros.</p>
          ) : wines.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-playfair text-2xl text-[#5b0c1b]">Nenhum vinho cadastrado</p>
              <p className="mt-2 text-[#715f59]">Comece cadastrando o primeiro rótulo no menu ao lado.</p>
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#fffaf4] text-[#5b0c1b]">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Uvas</th>
                  <th className="p-4">Volume</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {wines.map((wine) => (
                  <tr className="border-t border-[#eee3d5]" key={wine.id}>
                    <td className="p-4 font-semibold">{String(wine.name)}</td>
                    <td className="p-4">{String(wine.type)}</td>
                    <td className="p-4">{String(wine.grapes)}</td>
                    <td className="p-4">{String(wine.volume)} ml</td>
                    <td className="p-4">{String(wine.status)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border border-[#9a6a2d] px-3 py-2 text-[#6a1424] hover:bg-[#fff5e8]"
                          onClick={() => setEditing(wine)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-lg border border-[#b44b51] px-3 py-2 text-[#9c2630] hover:bg-[#fff0f0]"
                          onClick={() => remove(wine)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
