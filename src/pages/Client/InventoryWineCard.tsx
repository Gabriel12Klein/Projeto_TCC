import { useId, useState, type FormEvent } from 'react';
import PrivateImage from './PrivateImage';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import type { InventoryItem } from '../../types';
import wineIcon from '../../assets/admin/sidebar/vinho.png';
import './InventoryWineCard.css';
import QueryFeedback from '../../ui/QueryFeedback';
import { validateConsumption } from './formValidation';

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function InventoryWineCard({
  item,
  onConsume,
  pending,
}: {
  item: InventoryItem;
  onConsume: (input: { quantityBottles: number; occurredAt: string }) => Promise<boolean>;
  pending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const id = useId();
  const slug = item.wine?.slug;
  const {
    data: wine,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['catalog-wine', slug],
    queryFn: () => api.catalog.detail(slug!),
    enabled: expanded && Boolean(slug),
  });
  const image = item.photoPath || wine?.imagePath;
  const purchaseLocations = [
    ...new Set(
      [
        ...(item.orderItems ?? []).map(({ order }) => order.purchaseLocation?.trim()),
        ...(item.movements ?? []).map((movement) => movement.purchaseLocation?.trim()),
      ].filter(Boolean),
    ),
  ].join(', ');
  const origin =
    purchaseLocations ||
    item.wineryName ||
    wine?.winery?.name ||
    (slug ? 'Vinho do catálogo da vinícola' : 'Origem não informada');
  async function submitConsumption(event: FormEvent) {
    event.preventDefault();
    const issues = validateConsumption({
      qty: quantity,
      date,
      available: item.quantityBottles,
      today: today(),
    });
    setErrors(issues);
    if (Object.keys(issues).length) return;
    const saved = await onConsume({ quantityBottles: Number(quantity), occurredAt: `${date}T12:00:00.000Z` });
    if (saved) {
      setConsuming(false);
      setQuantity('1');
      setErrors({});
    }
  }
  return (
    <article className="client-inventory-card inventory-wine-card rounded-2xl">
      <div className="inventory-wine-card__header">
        <button
          type="button"
          className="inventory-wine-card__toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="inventory-wine-card__photo">
            <PrivateImage
              src={image || wineIcon}
              alt=""
              className={image ? '' : 'inventory-wine-card__fallback'}
            />
          </span>
          <span className="inventory-wine-card__summary">
            <span className="inventory-wine-card__name">{item.name}</span>
            <span className="inventory-wine-card__origin">{origin}</span>
            <strong>{item.quantityBottles} un.</strong>
            <span className="inventory-wine-card__hint">
              {expanded ? 'Ocultar detalhes ▴' : 'Ver detalhes do vinho ▾'}
            </span>
          </span>
        </button>
        <div className="inventory-wine-card__actions">
          <button
            type="button"
            className="inventory-wine-card__consume"
            aria-label={`Registrar consumo de ${item.name}`}
            disabled={pending || !item.quantityBottles}
            onClick={() => setConsuming(true)}
          >
            <span className="inventory-wine-card__action-icon" aria-hidden="true">
              −
            </span>
            <span>Registrar consumo</span>
          </button>
        </div>
      </div>
      {consuming && (
        <form className="inventory-wine-card__consumption" onSubmit={submitConsumption} noValidate>
          <label>
            Quantidade consumida
            <input
              type="number"
              min="1"
              max={item.quantityBottles}
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              aria-invalid={Boolean(errors.qty)}
              aria-describedby={errors.qty ? `${id}-quantity-error` : undefined}
            />
            {errors.qty && (
              <span id={`${id}-quantity-error`} role="alert">
                {errors.qty}
              </span>
            )}
          </label>
          <label>
            Data do consumo
            <input
              type="date"
              max={today()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? `${id}-date-error` : undefined}
            />
            {errors.date && (
              <span id={`${id}-date-error`} role="alert">
                {errors.date}
              </span>
            )}
          </label>
          <div className="inventory-wine-card__consumption-actions">
            <button type="submit" disabled={pending}>
              {pending ? 'Registrando…' : 'Confirmar consumo'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setConsuming(false);
                setErrors({});
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {expanded && (
        <div id={id} className="inventory-wine-card__details">
          <h3>Detalhes do vinho</h3>
          {slug ? (
            <>
              <QueryFeedback
                loading={isLoading}
                error={error}
                fetching={isFetching}
                notFoundText="Este vinho não está disponível no catálogo público. Seu registro na adega foi mantido."
                loadingText="Carregando informações da vinícola…"
                retry={() => void refetch()}
              />
              {wine && (
                <>
                  <dl className="inventory-wine-card__fields">
                    {[
                      ['Tipo', wine.type],
                      ['Uvas', wine.grapes],
                      ['Volume', `${wine.volumeMl} ml`],
                      ['Teor alcoólico', `${wine.alcoholPercentage}% vol`],
                      ['Vinícola', wine.winery?.name],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || 'Não informado'}</dd>
                      </div>
                    ))}
                  </dl>
                  {[
                    ['Descrição', wine.description],
                    ['Características', wine.characteristics],
                    ['Aromas', wine.aromas],
                    ['Notas de degustação', wine.tastingNotes],
                    ['Harmonização', wine.pairing],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div className="inventory-wine-card__text" key={label}>
                        <h4>{label}</h4>
                        <p>{value}</p>
                      </div>
                    ))}
                  <div className="inventory-wine-card__text">
                    <h4>Safras publicadas pela vinícola</h4>
                    <p className="inventory-wine-card__note">
                      Informações do catálogo; não identificam necessariamente a safra das suas garrafas.
                    </p>
                    {wine.vintages.length ? (
                      <ul>
                        {wine.vintages.map((vintage) => (
                          <li key={vintage.id}>
                            Safra {vintage.year} · {vintage.identifier} · {vintage.status}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Nenhuma safra publicada.</p>
                    )}
                  </div>
                  <Link to={`/catalogo/vinhos/${encodeURIComponent(slug)}`}>
                    Ver ficha completa e procedência →
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <p>
                {item.orderItems?.length
                  ? 'Rótulo adicionado por um pedido.'
                  : 'Rótulo legado preservado do estoque anterior.'}
              </p>
              <dl className="inventory-wine-card__fields">
                <div>
                  <dt>Nome</dt>
                  <dd>{item.name}</dd>
                </div>
                <div>
                  <dt>{purchaseLocations ? 'Local da compra' : 'Origem'}</dt>
                  <dd>{origin}</dd>
                </div>
                <div>
                  <dt>Quantidade disponível</dt>
                  <dd>{item.quantityBottles} garrafa(s)</dd>
                </div>
              </dl>
            </>
          )}
          <section className="inventory-wine-card__text">
            <h4>Movimentações registradas</h4>
            {item.movements?.length ? (
              <ul className="space-y-2">
                {item.movements.map((movement) => (
                  <li key={movement.id} className="border-b border-[#e8dccc] pb-2 text-sm">
                    <strong>
                      {{ ENTRADA: 'Entrada', CONSUMO: 'Consumo', AJUSTE: 'Ajuste' }[movement.type]}
                    </strong>
                    : {movement.quantityBottles} garrafa(s) ·{' '}
                    {new Date(movement.occurredAt).toLocaleString('pt-BR')}
                    {movement.purchaseLocation && (
                      <span className="block">Local: {movement.purchaseLocation}</span>
                    )}
                    {movement.reason && (
                      <span className="block">
                        {movement.orderId &&
                        movement.reason === `Compra registrada no pedido ${movement.orderId}`
                          ? 'Compra registrada em Meus pedidos.'
                          : movement.reason}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma movimentação disponível para este rótulo.</p>
            )}
          </section>
        </div>
      )}
    </article>
  );
}
