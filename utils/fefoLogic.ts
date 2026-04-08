import type { IBatch } from '@/types';

export function sortBatchesFEFO(batches: IBatch[]): IBatch[] {
  return [...batches]
    .filter((b) => b.status === 'active' && b.remainingQty > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
}

export interface FEFOAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  allocated: number;
  available: number;
}

export function allocateFEFO(batches: IBatch[], requiredQty: number): FEFOAllocation[] {
  const sorted = sortBatchesFEFO(batches);
  const allocations: FEFOAllocation[] = [];
  let remaining = requiredQty;

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(batch.remainingQty, remaining);
    allocations.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      allocated: take,
      available: batch.remainingQty,
    });
    remaining -= take;
  }

  return allocations;
}

export function getTotalStock(batches: IBatch[]): number {
  return batches
    .filter((b) => b.status === 'active')
    .reduce((sum, b) => sum + b.remainingQty, 0);
}

export function getExpiringBatches(batches: IBatch[], daysThreshold = 30): IBatch[] {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);
  return batches.filter(
    (b) =>
      b.status === 'active' &&
      b.remainingQty > 0 &&
      new Date(b.expiryDate) <= threshold
  );
}

export function getExpiredBatches(batches: IBatch[]): IBatch[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return batches.filter(
    (b) => b.status === 'active' && new Date(b.expiryDate) < today
  );
}
