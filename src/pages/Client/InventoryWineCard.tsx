import { useId, useState } from 'react';
import PrivateImage from './PrivateImage';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import type { InventoryItem } from '../../types';
import wineIcon from '../../assets/admin/sidebar/vinho.png';
import './InventoryWineCard.css';
import QueryFeedback from '../../ui/QueryFeedback';

export default function InventoryWineCard({ item, onMove, pending }: {
  item: InventoryItem;
  onMove: (type: 'ENTRADA' | 'CONSUMO') => void;
  pending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const slug = item.wine?.slug;
  const { data: wine, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['catalog-wine', slug],
    queryFn: () => api.catalog.detail(slug!),
    enabled: expanded && Boolean(slug),
  });
  const image = item.photoPath || wine?.imagePath;
  const purchaseLocations = [...new Set([
    ...(item.orderItems ?? []).map(({ order }) => order.purchaseLocation?.trim()),
    ...(item.movements ?? []).map((movement) => movement.purchaseLocation?.trim()),
  ].filter(Boolean))].join(', ');
  const origin = purchaseLocations || item.wineryName || wine?.winery?.name || (slug ? 'Vinho do catálogo da vinícola' : 'Origem não informada');
  return (
    <article className="client-inventory-card inventory-wine-card rounded-2xl">
      <div className="inventory-wine-card__header">
        <button type="button" className="inventory-wine-card__toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
          <span className="inventory-wine-card__photo">
            <PrivateImage src={image || wineIcon} alt="" className={image ? '' : 'inventory-wine-card__fallback'} />
          </span>
          <span className="inventory-wine-card__summary">
            <span className="inventory-wine-card__name">{item.name}</span>
            <span className="inventory-wine-card__origin">{origin}</span>
            <strong>{item.quantityBottles} un.</strong>
            <span className="inventory-wine-card__hint">{expanded ? 'Ocultar detalhes ▴' : 'Ver detalhes do vinho ▾'}</span>
          </span>
        </button>
        <div className="inventory-wine-card__actions">
          <button type="button" className="inventory-wine-card__add" aria-label={`Adicionar uma garrafa de ${item.name}`} disabled={pending} onClick={() => onMove('ENTRADA')}>
            <span className="inventory-wine-card__action-icon" aria-hidden="true">+</span>
            <span>Adicionar <small>1 garrafa</small></span>
          </button>
          <button type="button" className="inventory-wine-card__consume" aria-label={`Registrar consumo de uma garrafa de ${item.name}`} disabled={pending || !item.quantityBottles} onClick={() => onMove('CONSUMO')}>
            <span className="inventory-wine-card__action-icon" aria-hidden="true">−</span>
            <span>Consumir <small>1 garrafa</small></span>
          </button>
        </div>
      </div>
      {expanded && <div id={id} className="inventory-wine-card__details">
        <h3>Detalhes do vinho</h3>
        {slug ? <>
          <QueryFeedback loading={isLoading} error={error} fetching={isFetching} notFoundText="Este vinho não está disponível no catálogo público. Seu registro na adega foi mantido." loadingText="Carregando informações da vinícola…" retry={() => void refetch()} />
          {wine && <>
            <dl className="inventory-wine-card__fields">
              {[
                ['Tipo', wine.type], ['Uvas', wine.grapes],
                ['Volume', `${wine.volumeMl} ml`], ['Teor alcoólico', `${wine.alcoholPercentage}% vol`],
                ['Vinícola', wine.winery?.name],
              ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Não informado'}</dd></div>)}
            </dl>
            {[
              ['Descrição', wine.description], ['Características', wine.characteristics],
              ['Aromas', wine.aromas], ['Notas de degustação', wine.tastingNotes], ['Harmonização', wine.pairing],
            ].filter(([, value]) => value).map(([label, value]) => <div className="inventory-wine-card__text" key={label}><h4>{label}</h4><p>{value}</p></div>)}
            <div className="inventory-wine-card__text"><h4>Safras publicadas pela vinícola</h4>
              <p className="inventory-wine-card__note">Informações do catálogo; não identificam necessariamente a safra das suas garrafas.</p>
              {wine.vintages.length ? <ul>{wine.vintages.map(vintage => <li key={vintage.id}>Safra {vintage.year} · {vintage.identifier} · {vintage.status}</li>)}</ul> : <p>Nenhuma safra publicada.</p>}
            </div>
            <Link to={`/catalogo/vinhos/${encodeURIComponent(slug)}`}>Ver ficha completa e procedência →</Link>
          </>}
        </> : <>
          <p>{item.orderItems?.length ? 'Rótulo adicionado por um pedido.' : 'Rótulo adicionado diretamente ao seu estoque.'}</p>
          <dl className="inventory-wine-card__fields">
            <div><dt>Nome</dt><dd>{item.name}</dd></div>
            <div><dt>{purchaseLocations ? 'Local da compra' : 'Origem'}</dt><dd>{origin}</dd></div>
            <div><dt>Quantidade disponível</dt><dd>{item.quantityBottles} garrafa(s)</dd></div>
          </dl>
        </>}
        <section className="inventory-wine-card__text">
          <h4>Movimentações registradas</h4>
          {item.movements?.length ? <ul className="space-y-2">{item.movements.map(movement => <li key={movement.id} className="border-b border-[#e8dccc] pb-2 text-sm">
            <strong>{{ ENTRADA: 'Entrada', CONSUMO: 'Consumo', AJUSTE: 'Ajuste' }[movement.type]}</strong>: {movement.quantityBottles} garrafa(s) · {new Date(movement.occurredAt).toLocaleString('pt-BR')}
            {movement.purchaseLocation && <span className="block">Local: {movement.purchaseLocation}</span>}
            {movement.reason && <span className="block">{movement.reason}</span>}
          </li>)}</ul> : <p>Nenhuma movimentação disponível para este rótulo.</p>}
        </section>
      </div>}
    </article>
  );
}
