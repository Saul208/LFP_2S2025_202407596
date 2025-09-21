
const fs = require("fs");
const path = require("path");
const { lex } = require("../src/lexer_core.js");
const { rowsTokensHTML, rowsErroresHTML } = require("../src/utils.js");

const inFile = process.argv[2] || path.join(__dirname, "..", "entradas", "ejemplo.txt");
const outDir = path.join(__dirname, "..", "salidas");
const tplDir = path.join(__dirname, "..", "plantillas");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function read(p) { return fs.readFileSync(p, "utf8"); }
function write(p, s) { fs.writeFileSync(p, s, "utf8"); }

try {
  const text = read(inFile);
  const { tokens, errors } = lex(text);

  const tokensTpl = read(path.join(tplDir, "tokens_template.html"));
  const erroresTpl = read(path.join(tplDir, "errores_template.html"));

  const tokensHTML = tokensTpl.replace("{{TABLE_ROWS}}", rowsTokensHTML(tokens));
  const erroresHTML = erroresTpl.replace("{{TABLE_ROWS}}", rowsErroresHTML(errors));

  write(path.join(outDir, "tokens.html"), tokensHTML);
  write(path.join(outDir, "errores.html"), erroresHTML);

  console.log(`OK. Tokens: ${tokens.length} | Errores: ${errors.length}`);
  console.log(`→ ${path.join(outDir, "tokens.html")}`);
  console.log(`→ ${path.join(outDir, "errores.html")}`);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
