import type { PageLimit } from '../types';

export const PAGE_LIMITS: PageLimit[] = [10, 20, 50, 100];

export function pageNumbers(page: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const visible = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...visible].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  return sorted.flatMap<number | string>((value, index) => {
    const previous = sorted[index - 1];
    return previous && value - previous > 1 ? [`ellipsis-${previous}`, value] : [value];
  });
}

export function pageRange(page: number, limit: number, total: number) {
  if (!total) return { from: 0, to: 0 };
  const from = (page - 1) * limit + 1;
  return { from, to: Math.min(page * limit, total) };
}

export function lastValidPage(page: number, totalPages: number) {
  return Math.min(page, Math.max(totalPages, 1));
}

export default function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  label,
}: {
  page: number;
  limit: PageLimit;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: PageLimit) => void;
  label: string;
}) {
  if (!total) return null;
  const range = pageRange(page, limit, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#eadfd3] px-6 py-5 text-sm text-[#715f59] md:px-8">
      <div className="flex flex-wrap items-center gap-4">
        <label className="font-semibold text-[#5b0c1b]">
          Itens por página
          <select
            className="ml-2 rounded-lg border border-[#d9cbbd] bg-white px-3 py-2"
            aria-label={`Itens por página em ${label}`}
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value) as PageLimit)}
          >
            {PAGE_LIMITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <span aria-live="polite">
          Exibindo {range.from}–{range.to} de {total} registros
        </span>
      </div>
      <nav className="flex flex-wrap items-center gap-2" aria-label={`Paginação de ${label}`}>
        <button
          className="rounded-lg border border-[#d9cbbd] px-3 py-2 font-semibold disabled:opacity-40"
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        {pageNumbers(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              className={`min-w-10 rounded-lg border px-3 py-2 font-semibold ${
                item === page ? 'border-[#7d1d2d] bg-[#7d1d2d] text-white' : 'border-[#d9cbbd] text-[#7d1d2d]'
              }`}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Página ${item}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item} aria-hidden="true">
              …
            </span>
          ),
        )}
        <button
          className="rounded-lg border border-[#d9cbbd] px-3 py-2 font-semibold disabled:opacity-40"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
        <span className="w-full text-right sm:w-auto" aria-live="polite">
          Página {page} de {totalPages}
        </span>
      </nav>
    </div>
  );
}
