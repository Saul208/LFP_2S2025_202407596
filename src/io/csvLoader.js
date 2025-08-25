import path from 'path';
import { readTextFile } from '../utils/filesystem.js';
import { parseCSV } from '../utils/csv.js';
import { store } from '../store/dataStore.js';

/**
 * Loads calls from a CSV file into the in-memory store.
 * Accepted schema:
 *  - id_operador, nombre_operador, estrellas, id_cliente, nombre_cliente
 *       where 'estrellas' is 5-char string of 'x'/'0' (e.g., xx000).
 *  - or with 5 star columns: s1..s5 (or estrella1..5) with 'x'/'0' each.
 * Notes:
 *  - Multiple loads append data (no dedup).
 */
export async function loadCsv(filePath) {
  const text = await readTextFile(filePath);
  const { headers, rows } = parseCSV(text);
  if (headers.length === 0) {
    throw new Error('El archivo CSV está vacío o no tiene encabezado.');
  }

  for (const row of rows) {
    const get = (name) => {
      const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
      return key ? row[key] : undefined;
    };

    const idOp = get('id_operador');
    const nameOp = get('nombre_operador');
    const idCl = get('id_cliente');
    const nameCl = get('nombre_cliente');

    if (!idOp || !idCl) continue; // registro incompleto

    store.upsertOperator(idOp, nameOp || '');
    store.upsertClient(idCl, nameCl || '');

    // estrellas
    let stars = 0;
    const estrellasField = get('estrellas');
    if (typeof estrellasField === 'string' && /^[xX0]{1,5}$/.test(estrellasField.trim())) {
      stars = estrellasField.split('').reduce((acc, ch) => acc + (ch.toLowerCase() === 'x' ? 1 : 0), 0);
    } else {
      // buscar s1..s5 o estrella1..5
      const starKeys = [];
      for (let i = 1; i <= 5; i++) {
        const k1 = Object.keys(row).find(k => k.trim().toLowerCase() === `s${i}`);
        const k2 = Object.keys(row).find(k => k.trim().toLowerCase() === `estrella${i}`);
        if (k1) starKeys.push(k1);
        else if (k2) starKeys.push(k2);
      }
      if (starKeys.length === 5) {
        stars = starKeys.reduce((acc, k) => acc + (String(row[k]).trim().toLowerCase() === 'x' ? 1 : 0), 0);
      } else {
        // intento automático: columna con 5 chars x/0 embebidos
        const possible = Object.values(row).find(v => typeof v === 'string' && /^[xX0]{5}$/.test(v.trim()));
        if (possible) {
          stars = possible.trim().split('').reduce((acc, ch) => acc + (ch.toLowerCase() === 'x' ? 1 : 0), 0);
        }
      }
    }

    store.addCall(idOp, idCl, stars);
  }
}
