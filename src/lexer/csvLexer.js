// src/lexer/csvLexer.js
export function csvLexer(text) {
  const tokens = [];
  let pos = 0;

  while (pos < text.length) {
    const ch = text[pos];

    // Separadores de celda y fila
    if (ch === ',') { tokens.push({ tipo: 'COMMA', valor: ',' }); pos++; continue; }
    if (ch === ';') { tokens.push({ tipo: 'SEMICOLON', valor: ';' }); pos++; continue; }
    if (ch === '\n') { tokens.push({ tipo: 'NEWLINE', valor: '\n' }); pos++; continue; }

    // Estrellas (x / 0)
    if (ch === 'x' || ch === 'X') { tokens.push({ tipo: 'STAR', valor: 'x' }); pos++; continue; }
    if (ch === '0') { tokens.push({ tipo: 'ZERO', valor: '0' }); pos++; continue; }

    // Números (ids)
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (pos < text.length && /[0-9]/.test(text[pos])) num += text[pos++];
      tokens.push({ tipo: 'NUMBER', valor: num });
      continue;
    }

    // Identificadores (headers simples, palabras sin espacios)
    if (/[A-Za-z_]/.test(ch)) {
      let word = '';
      while (pos < text.length && /[A-Za-z0-9_]/.test(text[pos])) word += text[pos++];
      tokens.push({ tipo: 'IDENT', valor: word });
      continue;
    }

    // Cadenas entre comillas (para nombres con espacios)
    if (ch === '"') {
      pos++;
      let str = '';
      while (pos < text.length && text[pos] !== '"') {
        const c = text[pos];
        if (c === '\\' && pos + 1 < text.length) {
          const n = text[pos + 1];
          if (n === '"' || n === '\\') { str += n; pos += 2; continue; }
          if (n === 'n') { str += '\n'; pos += 2; continue; }
          if (n === 't') { str += '\t'; pos += 2; continue; }
        }
        str += c; pos++;
      }
      if (text[pos] === '"') pos++; // cierra
      tokens.push({ tipo: 'STRING', valor: str });
      continue;
    }

    // Espacios (¡ya no los ignoramos!)
    if (ch === ' ' || ch === '\t') { tokens.push({ tipo: 'SPACE', valor: ' ' }); pos++; continue; }

    // CR se ignora (normalizado por el loader)
    if (ch === '\r') { pos++; continue; }

    // Cualquier otro carácter (incluye acentos, etc.)
    tokens.push({ tipo: 'CHAR', valor: ch });
    pos++;
  }

  tokens.push({ tipo: 'EOF', valor: '' });
  return tokens;
}
