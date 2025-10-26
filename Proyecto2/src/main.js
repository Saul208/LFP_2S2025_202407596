const fs = require("fs");
const Lexer = require("./Lexer.js");
const Parser = require("./Parser.js");
const Translator = require("./Translator.js");

// permite pasar ruta por CLI: node src/main.js src/Entrada1.java
const file = process.argv[2] || "src/In.java";
const input = fs.readFileSync(file, "utf-8");

// 1) Léxico
const lex = new Lexer(input).analyze();
console.log("=== TOKENS ==="); lex.tokens.forEach(t=>console.log(t.toString()));
if(lex.errors.length){ console.log("\n=== ERRORES LÉXICOS ==="); lex.errors.forEach(e=>console.error(e.toString())); }

// 2) Sintaxis
const parse = new Parser(lex.tokens).parse();
if(parse.errors.length){ console.log("\n=== ERRORES SINTÁCTICOS ==="); parse.errors.forEach(e=>console.error(e.toString())); }

if(lex.errors.length===0 && parse.success){
  const py = new Translator(parse.ast, parse.symbols).translate();
  fs.writeFileSync("out.py", py, "utf-8");
  console.log("\nTraducción exitosa. Archivo: out.py");
} else {
  console.log("\nNo se generó Python por errores en el análisis.");
}
