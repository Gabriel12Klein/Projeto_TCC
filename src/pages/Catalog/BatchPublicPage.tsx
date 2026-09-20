import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/api';

function formatDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR') : 'Aguardando registro';
}

export default function BatchPublicPage() {
  const { code = '' } = useParams();
  const {
    data: batch,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-batch', code],
    queryFn: () => api.catalog.batch(code),
    enabled: Boolean(code),
  });

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f2eb] text-[#5b0c1b]">
        Carregando informações do lote...
      </main>
    );
  if (error || !batch) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl bg-[#f7f2eb] px-5 py-16 text-center text-[#5b0c1b]">
        <p className="font-playfair text-3xl">Lote não encontrado</p>
        <p className="mt-3 text-[#715f59]">O QR Code pode estar inválido ou o lote não está cadastrado.</p>
        <Link className="mt-6 inline-block font-semibold text-[#851329]" to="/">
          Voltar para a página inicial
        </Link>
      </main>
    );
  }

  const wineImage = batch.wine?.imagePath;
  return (
    <main className="min-h-screen bg-[#f7f2eb] px-5 py-10 text-[#321b1c]">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm font-semibold text-[#851329]" to="/">
          ← VINUM
        </Link>
        <header className="mt-8 rounded-3xl bg-[#5b0c1b] p-8 text-white shadow-xl md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e2bd76]">Consulta pública</p>
          <h1 className="mt-3 font-playfair text-4xl font-semibold md:text-5xl">Informações do lote</h1>
          <p className="mt-3 text-white/75">
            Dados registrados pela vinícola para conferência da origem e produção.
          </p>
        </header>

        {batch.wine && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-[#dfd0bd] bg-white shadow-sm md:flex">
            <div className="grid min-h-64 w-full place-items-center bg-[radial-gradient(circle,#f2dfc1,#dbc19a)] p-6 md:w-2/5">
              {wineImage ? (
                <img
                  className="h-56 w-auto max-w-full object-contain mix-blend-multiply"
                  src={wineImage}
                  alt={batch.wine.name}
                />
              ) : (
                <span className="font-playfair text-8xl text-[#851329]/35">V</span>
              )}
            </div>
            <div className="flex-1 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Vinho produzido</p>
              <h2 className="mt-2 font-playfair text-3xl text-[#5b0c1b]">{batch.wine.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#715f59]">{batch.wine.description}</p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#5b0c1b]">Tipo</dt>
                  <dd className="mt-1 text-[#715f59]">{batch.wine.type}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#5b0c1b]">Uvas do vinho</dt>
                  <dd className="mt-1 text-[#715f59]">{batch.wine.grapes.join(', ') || 'Não informado'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#5b0c1b]">Volume</dt>
                  <dd className="mt-1 text-[#715f59]">{batch.wine.volumeMl} ml</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#5b0c1b]">Teor alcoólico</dt>
                  <dd className="mt-1 text-[#715f59]">{batch.wine.alcoholPercentage}% vol</dd>
                </div>
                {batch.wine.winery && (
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-[#5b0c1b]">Vinícola</dt>
                    <dd className="mt-1 text-[#715f59]">
                      {batch.wine.winery.name} · {batch.wine.winery.city}/{batch.wine.winery.state}
                    </dd>
                  </div>
                )}
              </dl>
              {(batch.wine.characteristics ||
                batch.wine.aromas ||
                batch.wine.tastingNotes ||
                batch.wine.pairing) && (
                <div className="mt-6 border-t border-[#eee3d5] pt-5">
                  <h3 className="font-playfair text-2xl text-[#5b0c1b]">Descrição do vinho</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                      ['Características', batch.wine.characteristics],
                      ['Aromas', batch.wine.aromas],
                      ['Notas de degustação', batch.wine.tastingNotes],
                      ['Harmonização', batch.wine.pairing],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt className="font-semibold text-[#5b0c1b]">{label}</dt>
                          <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-[#715f59]">
                            {value}
                          </dd>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-[#dfd0bd] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Lote</p>
            <h2 className="mt-2 font-playfair text-3xl text-[#5b0c1b]">{batch.code}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-[#5b0c1b]">Quantidade produzida</dt>
                <dd className="mt-1 text-[#715f59]">{batch.quantityLiters} litros</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5b0c1b]">Data de produção</dt>
                <dd className="mt-1 text-[#715f59]">{formatDate(batch.productionDate)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5b0c1b]">Data de registro</dt>
                <dd className="mt-1 text-[#715f59]">{formatDate(batch.registrationDate)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5b0c1b]">Status</dt>
                <dd className="mt-1 text-[#715f59]">{batch.status}</dd>
              </div>
              {batch.blockchainRef && (
                <div>
                  <dt className="font-semibold text-[#5b0c1b]">Registro blockchain</dt>
                  <dd className="mt-1 break-all text-[#715f59]">{batch.blockchainRef}</dd>
                </div>
              )}
            </dl>
          </article>

          <article className="rounded-2xl border border-[#dfd0bd] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">Safra relacionada</p>
            <h2 className="mt-2 font-playfair text-3xl text-[#5b0c1b]">{batch.vintage.identifier}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-[#5b0c1b]">Ano</dt>
                <dd className="mt-1 text-[#715f59]">{batch.vintage.year}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5b0c1b]">Fornecedor / origem</dt>
                <dd className="mt-1 text-[#715f59]">{batch.vintage.supplier || 'Não informado'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5b0c1b]">Status da safra</dt>
                <dd className="mt-1 text-[#715f59]">{batch.vintage.status}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#5b0c1b]">Uvas da safra</dt>
                <dd className="mt-1 text-[#715f59]">{batch.vintage.grapes.join(', ') || 'Não informado'}</dd>
              </div>
              {batch.vintage.observations && (
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-[#5b0c1b]">Observações</dt>
                  <dd className="mt-1 leading-6 text-[#715f59]">{batch.vintage.observations}</dd>
                </div>
              )}
            </dl>
          </article>
        </section>

        <section className="mt-5 rounded-2xl border border-[#dfd0bd] bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a6a2d]">
            Uvas utilizadas no lote
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {batch.grapes.length ? (
              batch.grapes.map((grape) => (
                <span key={grape} className="rounded-full bg-[#fff4df] px-4 py-2 text-sm text-[#6a1424]">
                  {grape}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#715f59]">Nenhuma uva informada.</span>
            )}
          </div>
        </section>
        <p className="mt-6 text-center text-xs text-[#857d79]">
          Consulta somente para leitura · VINUM — Da origem à taça
        </p>
      </div>
    </main>
  );
}
