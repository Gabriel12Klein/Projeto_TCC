import ConfirmDialog from './ConfirmDialog';
import type { ComponentProps } from 'react';

export default function ConfirmDeleteDialog(props: ComponentProps<typeof ConfirmDialog>) {
  return <ConfirmDialog {...props} pendingLabel="Excluindo…" variant="destructive" />;
}
