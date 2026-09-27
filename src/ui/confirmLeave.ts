export function needsLeaveConfirmation(busy: boolean, dirty: boolean) {
  return !busy && dirty;
}
