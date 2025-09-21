// src/io/csvLoader.js
import { readTextFile } from '../utils/filesystem.js';
import { store } from '../store/dataStore.js';

import { csvLexer } from '../lexer/csvLexer.js';     // NUEVO
import { csvParser } from '../parser/csvParser.js';  // NUEVO

/**
 * Carga llamadas desde un archivo CSV usando:
 *  1) Analizador léxico (csvLexer) -> tokens
 *  2) Parser (csvParser) -> headers y rows
 *  3) Mapeo a entidades en memoria (store)
 */
export async function loadCsv(filePath) {
  let text = await readTextFile(filePath);

  // Normaliza BOM y saltos de línea
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1) LÉXICO
  const tokens = csvLexer(text);

  // 2) PARSER
  const { headers, rows } = csvParser(tokens);
  if (!headers.length) {
    throw new Error('El archivo CSV está vacío o no tiene encabezado.');
  }

  // 3) Cargar a memoria
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

    // estrellas: admite "xx000" o s1..s5 / estrella1..5
    let stars = 0;
    const estrellasField = get('estrellas');
    if (typeof estrellasField === 'string' && /^[xX0]{1,5}$/.test(estrellasField.trim())) {
      stars = [...estrellasField.trim()].reduce((acc, ch) => acc + (ch === 'x' || ch === 'X' ? 1 : 0), 0);
    } else {
      const starKeys = [];
      for (let i = 1; i <= 5; i++) {
        const k1 = Object.keys(row).find(k => k.trim().toLowerCase() === `s${i}`);
        const k2 = Object.keys(row).find(k => k.trim().toLowerCase() === `estrella${i}`);
        if (k1) starKeys.push(k1);
        else if (k2) starKeys.push(k2);
      }
      if (starKeys.length === 5) {
        stars = starKeys.reduce((acc, k) => acc + (/^[xX]$/.test(String(row[k]).trim()) ? 1 : 0), 0);
      } else {
        const possible = Object.values(row).find(v => typeof v === 'string' && /^[xX0]{5}$/.test(v.trim()));
        if (possible) {
          stars = [...possible.trim()].reduce((acc, ch) => acc + (/^[xX]$/.test(ch) ? 1 : 0), 0);
        }
      }
    }

    store.addCall(idOp, idCl, stars);
  }
}
