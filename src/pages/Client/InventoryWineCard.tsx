import { useId, useState } from 'react';
import PrivateImage from './PrivateImage';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import type { InventoryItem } from '../../types';
import wineIcon from '../../assets/admin/sidebar/vinho.png';
import './InventoryWineCard.css';

export default function InventoryWineCard({ item, onMove, pending }: {
  item: InventoryItem;
  onMove: (type: 'ENTRADA' | 'CONSUMO') => void;
  pending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const slug = item.wine?.slug;
  const { data: wine, isLoading, isError, refetch } = useQuery({
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
          {isLoading && <p role="status">Carregando informações da vinícola...</p>}
          {isError && <div role="alert"><p>Os detalhes deste vinho estão indisponíveis no momento.</p><button type="button" onClick={() => void refetch()}>Tentar novamente</button></div>}
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
      </div>}
    </article>
  );
}
