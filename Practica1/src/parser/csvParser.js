// src/parser/csvParser.js
// Convierte tokens en { headers, rows }.
// Lee celdas completas acumulando todo hasta COMMA/NEWLINE.
// Para estrellas "x;0;0;0;0" genera "x0000".

export function csvParser(tokens) {
  let i = 0;
  const next = () => tokens[i] || { tipo: 'EOF', valor: '' };

  const headers = [];
  const rows = [];
  let currentRow = [];

  // 1) Encabezados (hasta NEWLINE)
  while (next().tipo !== 'EOF') {
    if (next().tipo === 'NEWLINE') { i++; break; }
    const cell = readCell();
    headers.push(cell);
    if (next().tipo === 'COMMA') i++; // separador
  }

  // 2) Filas
  while (next().tipo !== 'EOF') {
    if (next().tipo === 'NEWLINE') {
      i++;
      if (currentRow.length) rows.push(rowToObj(headers, currentRow));
      currentRow = [];
      continue;
    }
    const cell = readCell();
    currentRow.push(cell);
    if (next().tipo === 'COMMA') i++;
  }
  if (currentRow.length) rows.push(rowToObj(headers, currentRow)); // última fila

  return { headers, rows };

  function readCell() {
    // Acumula todo hasta COMMA / NEWLINE / EOF
    let buf = '';
    let sawStarZero = false;

    while (true) {
      const t = next();
      if (t.tipo === 'COMMA' || t.tipo === 'NEWLINE' || t.tipo === 'EOF') break;

      // Compactar estrellas con ';' en una cadena "x0000"
      if (t.tipo === 'STAR') { buf += 'x'; sawStarZero = true; i++; continue; }
      if (t.tipo === 'ZERO') { buf += '0'; sawStarZero = true; i++; continue; }
      if (t.tipo === 'SEMICOLON') { 
        // En celdas de estrellas lo ignoramos; en otras celdas lo preservamos
        // pero como no sabemos el contexto, si ya vimos STAR/ZERO lo omitimos.
        i++; 
        if (!sawStarZero) buf += ';';
        continue; 
      }

      // Texto general (números, ident, strings, espacios, chars)
      if (t.tipo === 'STRING' || t.tipo === 'NUMBER' || t.tipo === 'IDENT' || t.tipo === 'SPACE' || t.tipo === 'CHAR') {
        buf += t.valor;
        i++;
        continue;
      }

      // Cualquier otro token, lo consumimos como literal
      buf += String(t.valor ?? '');
      i++;
    }

    return buf.trim();
  }

  function rowToObj(hs, arr) {
    const obj = {};
    for (let k = 0; k < hs.length; k++) {
      obj[String(hs[k]).trim()] = (arr[k] ?? '').toString().trim();
    }
    return obj;
  }
}
