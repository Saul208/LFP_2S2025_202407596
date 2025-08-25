import path from 'path';
import { writeFileSafe } from '../utils/filesystem.js';
import { nowIsoLocal, formatPercent } from '../utils/formatting.js';
import { store } from '../store/dataStore.js';
import { operatorPerformance } from '../services/performance.js';

const CSS = `
:root { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial; color-scheme: light dark; }
body { margin: 2rem; }
h1 { margin: 0 0 0.25rem 0; }
.subtitle { color: #666; margin-bottom: 1rem; font-size: 0.9rem; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #bbb; padding: 0.5rem; text-align: left; }
th { background: #eee; }
tfoot td { font-weight: bold; }
.small { font-size: 0.9rem; color: #666; }
`;

function page(title, tableHtml) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">Generado: ${escapeHtml(nowIsoLocal())}</div>
  ${tableHtml}
  <p class="small">Simulador de CallCenter (Consola, JavaScript)</p>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
  }[c]));
}

export async function exportHistorial(filePath) {
  const rows = store.calls.map(c => {
    const op = store.operators.get(c.operatorId);
    const cl = store.clients.get(c.clientId);
    return {
      opId: c.operatorId,
      opName: op?.name ?? '',
      clId: c.clientId,
      clName: cl?.name ?? '',
      stars: c.stars,
      classif: c.classification
    };
  });
  const table = htmlTable(['ID Operador','Operador','ID Cliente','Cliente','Estrellas','Clasificación'],
    rows.map(r => [r.opId, r.opName, r.clId, r.clName, String(r.stars), r.classif]));
  await writeFileSafe(filePath, page('Historial de Llamadas', table));
}

export async function exportOperadores(filePath) {
  const ops = store.getOperatorsArray();
  const table = htmlTable(['ID','Nombre'], ops.map(o => [o.id, o.name]));
  await writeFileSafe(filePath, page('Listado de Operadores', table));
}

export async function exportClientes(filePath) {
  const cls = store.getClientsArray();
  const table = htmlTable(['ID','Nombre'], cls.map(c => [c.id, c.name]));
  await writeFileSafe(filePath, page('Listado de Clientes', table));
}

export async function exportRendimiento(filePath) {
  const perf = operatorPerformance();
  const table = htmlTable(['ID Operador','Nombre','Llamadas','% Atención'],
    perf.map(p => [p.id, p.name, String(p.calls), formatPercent(p.attentionPercent)]));
  await writeFileSafe(filePath, page('Rendimiento de Operadores', table));
}

function htmlTable(headers, rows) {
  const thead = `<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  const tfoot = `<tfoot><tr><td colspan="${headers.length}">Total filas: ${rows.length}</td></tr></tfoot>`;
  return `<table>${thead}${tbody}${tfoot}</table>`;
}
