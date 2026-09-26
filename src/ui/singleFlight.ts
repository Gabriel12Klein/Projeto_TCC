export async function runSingleFlight(
  lock: { current: boolean },
  action: () => Promise<void>,
) {
  if (lock.current) return false;
  lock.current = true;
  try {
    await action();
    return true;
  } finally {
    lock.current = false;
  }
}
