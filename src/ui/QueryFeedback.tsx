import { ApiError } from '../api/feedback';

type Props = {
  loading?: boolean;
  error?: Error | null;
  fetching?: boolean;
  empty?: boolean;
  loadingText?: string;
  emptyText?: string;
  retry: () => void;
  notFoundText?: string;
};
export default function QueryFeedback({
  loading,
  error,
  fetching,
  empty,
  loadingText = 'Carregando…',
  emptyText = 'Nenhum registro encontrado.',
  retry,
  notFoundText,
}: Props) {
  if (loading)
    return (
      <p role="status" className="py-6 text-[#715f59]">
        {loadingText}
      </p>
    );
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404 && notFoundText;
    return (
      <div className="my-4 rounded-xl border border-[#dfd0bd] bg-white p-5">
        <p role="alert">{notFound || error.message || 'Não foi possível carregar os dados.'}</p>
        {!notFound && (
          <button
            className="mt-3 rounded-lg border border-[#851329] px-4 py-2 text-[#851329] disabled:opacity-60"
            type="button"
            disabled={fetching}
            onClick={retry}
          >
            {fetching ? 'Tentando novamente…' : 'Tentar novamente'}
          </button>
        )}
      </div>
    );
  }
  if (empty)
    return (
      <p role="status" className="py-6 text-[#715f59]">
        {emptyText}
      </p>
    );
  return null;
}
