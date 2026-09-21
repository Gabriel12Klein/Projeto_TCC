export function confirmLeave(busy: boolean, dirty: boolean, confirm: (message: string) => boolean) {
  if (busy) return false;
  return !dirty || confirm('Existem alterações não salvas. Deseja descartá-las e sair deste cadastro?');
}
