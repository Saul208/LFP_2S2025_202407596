import { store } from '../store/dataStore.js';

export function histogramByStars() {
  const h = {1:0,2:0,3:0,4:0,5:0};
  for (const c of store.calls) {
    if (c.stars >= 1 && c.stars <= 5) h[c.stars]++;
    else if (c.stars === 0) { /* ignore 0-star into histogram 1..5 */ }
  }
  return h;
}

export function percentByClassification() {
  let good=0, med=0, bad=0;
  for (const c of store.calls) {
    if (c.stars >= 4) good++;
    else if (c.stars >= 2) med++;
    else bad++;
  }
  const total = store.getTotalCalls() || 1;
  return {
    Buena: (good*100)/total,
    Media: (med*100)/total,
    Mala:  (bad*100)/total
  };
}
