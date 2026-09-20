import { prisma } from '../src/lib/prisma.js';

// Read-only audit; no personal data or credentials in the report.
try {
  const inventory = await prisma.inventoryItem.findMany({ include: { movements: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] } } });
  const balanceErrors = inventory.filter((item) => {
    const balance = item.movements.reduce((total, movement) => movement.type === 'AJUSTE'
      ? movement.quantityBottles
      : total + (movement.type === 'CONSUMO' ? -movement.quantityBottles : movement.quantityBottles), 0);
    return balance !== item.quantityBottles;
  }).map(({ id }) => id);
  const foreignKeys = await prisma.$queryRaw<Array<{ total: bigint; invalid: bigint }>>`
    SELECT count(*) AS total, count(*) FILTER (WHERE NOT convalidated) AS invalid
    FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace
  `;
  const brokenLinks = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) FROM lote b JOIN safra s ON s.id = b."vintageId"
    WHERE b."wineId" IS DISTINCT FROM s."wineId"
  `;
  console.log(JSON.stringify({
    counts: {
      wineries: await prisma.winery.count(), wines: await prisma.wine.count(),
      vintages: await prisma.vintage.count(), batches: await prisma.batch.count(),
      grapes: await prisma.grape.count(), wineTypes: await prisma.wineType.count(),
      users: await prisma.user.count(), orders: await prisma.customerOrder.count(),
      orderItems: await prisma.customerOrderItem.count(), inventory: inventory.length,
      movements: await prisma.inventoryMovement.count(),
      bottles: inventory.reduce((total, item) => total + item.quantityBottles, 0),
    },
    foreignKeys: Number(foreignKeys[0].total),
    unvalidatedForeignKeys: Number(foreignKeys[0].invalid),
    incompatibleBatchVintages: Number(brokenLinks[0].count),
    winesWithoutGrapes: await prisma.wine.count({ where: { grapeLinks: { none: {} } } }),
    vintagesWithoutGrapes: await prisma.vintage.count({ where: { grapeLinks: { none: {} } } }),
    stockBalanceErrors: balanceErrors,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
