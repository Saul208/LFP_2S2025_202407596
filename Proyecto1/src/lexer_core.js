// Núcleo del analizador léxico (UMD)
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TourneyLexer = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  // ==== Catálogos ====
  const RESERVED = new Set([
    "TORNEO", "EQUIPOS", "ELIMINACION",
    "EQUIPO", "JUGADOR", "GOLEADOR",
    "FASE", "PARTIDO", "VS",
    "CUARTOS", "SEMIFINAL", "FINAL",
    "LOCAL", "VISITANTE"
  ]);

  const ATTRIBUTES = new Set([
    "NOMBRE","EQUIPOS","JUGADORES","POSICION","NUMERO","EDAD",
    "PARTIDOS","PARTIDO","RESULTADO","GOLEADORES","MINUTO","PAIS","SEDE"
  ]); //  ← PARTIDO agregado aquí

  const SYMBOLS = {
    "{": "Llave Izquierda",
    "}": "Llave Derecha",
    "[": "Corchete Izquierdo",
    "]": "Corchete Derecho",
    "(": "Paréntesis Izquierdo",
    ")": "Paréntesis Derecho",
    ",": "Coma",
    ":": "Dos Puntos",
    ";": "Punto y Coma",
    "-": "Guion"
  };

  // ==== Helpers ====
  const isWS   = (ch) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
  const isDig  = (ch) => ch >= "0" && ch <= "9";
  const isLtr  = ch => (ch>='A'&&ch<='Z')||(ch>='a'&&ch<='z')||'ÁÉÍÓÚáéíóúÑñ_'.includes(ch);
  const isIdCh = ch => isLtr(ch) || (ch>='0'&&ch<='9');


  function lex(text) {
    const tokens = [];
    const errors = [];
    let i = 0, row = 1, col = 1;

    const peek = () => text[i];
    const advance = () => {
      const ch = text[i++];
      if (ch === "\n") { row++; col = 1; } else { col++; }
      return ch;
    };

    const emitT = (type, lexeme, r, c) => tokens.push({ type, lexeme, row: r, col: c });
    const emitE = (lexeme, r, c, desc) => errors.push({ lexeme, type: "Token inválido", desc, row: r, col: c });

    while (i < text.length) {
      let ch = peek();

      if (isWS(ch)) { advance(); continue; }

      if (SYMBOLS[ch]) {
        const r = row, c = col;
        emitT(SYMBOLS[ch], advance(), r, c);
        continue;
      }

      if (ch === '"') {
        const r = row, c = col;
        let buf = "";
        advance();
        let closed = false;
        while (i < text.length) {
          const k = advance();
          if (k === '"') { closed = true; break; }
          buf += k;
        }
        if (closed) emitT("Cadena", `"${buf}"`, r, c);
        else emitE(`"${buf}`, r, c, "Cadena sin cierre");
        continue;
      }

      if (isDig(ch)) {
        const r = row, c = col;
        let buf = "";
        buf += advance();
        while (isDig(peek())) buf += advance();
        emitT("Número", buf, r, c);
        continue;
      }

      if (isLtr(ch)) {
        const r = row, c = col;
        let buf = "";
        buf += advance();
        while (isIdCh(peek())) buf += advance();

        const up = buf.toUpperCase();
        if (ATTRIBUTES.has(up)) emitT("Atributo", buf, r, c);
        else if (RESERVED.has(up)) emitT("Palabra Reservada", buf, r, c);
        else emitT("Identificador", buf, r, c);
        continue;
      }

      const r = row, c = col;
      emitE(advance(), r, c, "Carácter no reconocido");
    }

    return { tokens, errors };
  }

  return { lex, RESERVED, ATTRIBUTES, SYMBOLS };
});
