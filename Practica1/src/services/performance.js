import { store } from '../store/dataStore.js';

export function operatorPerformance() {
  const totals = new Map(); // operatorId -> count
  for (const c of store.calls) {
    totals.set(c.operatorId, (totals.get(c.operatorId) || 0) + 1);
  }
  const totalCalls = store.getTotalCalls() || 1;
  const result = [];
  for (const op of store.getOperatorsArray()) {
    const count = totals.get(op.id) || 0;
    result.push({
      id: op.id,
      name: op.name,
      calls: count,
      attentionPercent: (count * 100) / totalCalls
    });
  }
  return result.sort((a,b) => Number(b.attentionPercent) - Number(a.attentionPercent));
}
