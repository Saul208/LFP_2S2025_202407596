// Carga dual (navegador / Node)
const __IS_BROWSER_PAR__ = (typeof window !== 'undefined');
const SynErr = __IS_BROWSER_PAR__ ? window.SyntaxError : require('./models/SyntaxError');


/**
 * Parser manual con AST (4.2–4.5):
 *  - Clase pública con main de firma exacta
 *  - Declaraciones múltiples (comas), ';' obligatorio
 *  - for(init decl; cond; ++/--) y while
 *  - System.out.println(expr);
 *  - Precedencia de expresiones
 *  - Errores: mensajes exactos, tipo no soportado, variable no declarada
 */
class Parser {
  #tokens; #position; #currentToken; #errors; #symbols;

  constructor(tokens) {
    this.#tokens = tokens;
    this.#position = 0;
    this.#currentToken = null;
    this.#errors = [];
    this.#symbols = new Map();
  }

  parse() {
    const program = this.#PROGRAM();
    if (!this.#match('EOF')) {
      this.#errors.push(new SyntaxError(
        this.#currentToken ? this.#currentToken.value : 'EOF',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        'Se esperaba fin de archivo'
      ));
    }
    return { success: this.#errors.length === 0, errors: this.#errors, ast: program, symbols: this.#symbols };
  }

  #node(kind, props = {}) { return { kind, ...props }; }

  // ===================================================
  // PROGRAMA ::= 'public' 'class' ID '{' MAIN '}'
  // ===================================================
  #PROGRAM() {
    // 'public'
    if (!(this.#match('KEYWORD') && this.#look_ahead().value === 'public')) {
      this.#errors.push(new SyntaxError(
        this.#currentToken ? this.#currentToken.value : 'EOF',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        `Se esperaba 'public'`
      ));
    } else { this.#advance(); }

    // 'class'
    if (!(this.#match('KEYWORD') && this.#look_ahead().value === 'class')) {
      this.#errors.push(new SyntaxError(
        this.#currentToken ? this.#currentToken.value : 'EOF',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        `Se esperaba 'class'`
      ));
    } else { this.#advance(); }

    const classTok = this.#consume('IDENTIFIER');
    const className = classTok ? classTok.value : 'Clase?';

    this.#consume('LBRACE');
    const main = this.#MAIN();
    if (!this.#match('RBRACE')) {
      this.#errors.push(new SyntaxError(
        this.#currentToken ? this.#currentToken.value : 'EOF',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        `Se esperaba '}'`
      ));
    } else { this.#consume('RBRACE'); }

    return this.#node('Program', { classDecl: { name: className, main } });
  }

  // MAIN ::= public static void main(String[] args) BLOQUE
  #MAIN() {
    let ok = true;
    ok = ok && (this.#match('KEYWORD') && this.#look_ahead().value === 'public' && (this.#advance() || true));
    ok = ok && (this.#match('KEYWORD') && this.#look_ahead().value === 'static' && (this.#advance() || true));
    ok = ok && (this.#match('KEYWORD') && this.#look_ahead().value === 'void'   && (this.#advance() || true));
    ok = ok && (this.#match('KEYWORD') && this.#look_ahead().value === 'main'   && (this.#advance() || true));
    ok = ok && this.#consumeIf('LPAREN');
    ok = ok && (this.#match('KEYWORD') && this.#look_ahead().value === 'String' && (this.#advance() || true));
    ok = ok && this.#consumeIf('LBRACKET') && this.#consumeIf('RBRACKET');
    ok = ok && (this.#match('KEYWORD') && this.#look_ahead().value === 'args'   && (this.#advance() || true));
    ok = ok && this.#consumeIf('RPAREN');

    const block = this.#BLOCK();

    if (!ok) {
      this.#errors.push(new SyntaxError(
        this.#currentToken ? this.#currentToken.value : 'EOF',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        `Se esperaba 'public static void main(String[] args)'`
      ));
    }
    return this.#node('MainMethod', { block });
  }

  // BLOQUE ::= '{' SENTENCIAS '}'
  #BLOCK() {
    this.#consume('LBRACE');
    const statements = this.#SENTENCIAS();
    if (!this.#match('RBRACE')) {
      this.#errors.push(new SyntaxError(
        this.#currentToken ? this.#currentToken.value : 'EOF',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        `Se esperaba '}'`
      ));
    } else { this.#consume('RBRACE'); }
    return this.#node('Block', { statements });
  }

  // SENTENCIAS ::= { SENTENCIA }
  #SENTENCIAS() {
    const out = [];
    while (!this.#match('RBRACE') && !this.#match('EOF')) {
      const s = this.#SENTENCIA();
      if (s) out.push(s);
    }
    return out;
  }

  // SENTENCIA ::= DECLARACION | ASIGNACION | IF | FOR | WHILE | PRINT | ';'
  #SENTENCIA() {
    if (this.#match('KEYWORD')) {
      const k = this.#look_ahead().value;

      // Tipos válidos
      if (['int','double','char','String','boolean'].includes(k)) {
        return this.#DECLARACION();
      }
      if (k === 'if')    return this.#IF();
      if (k === 'for')   return this.#FOR();
      if (k === 'while') return this.#WHILE();
      if (k === 'System') { const p = this.#PRINT(); this.#consumeOrSemicolon(); return p; }

      // Cualquier otra palabra reservada usada como tipo: "float x;"
      this.#errors.push(new SyntaxError(
        k,
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        'Tipo de dato no soportado'
      ));
      // saltar hasta ';'
      while (!this.#match('SEMICOLON') && !this.#match('RBRACE') && !this.#match('EOF')) this.#advance();
      this.#consumeOrSemicolon();
      return this.#node('Empty', {});
    }

    if (this.#match('IDENTIFIER')) {
      const s = this.#ASIGNACION();
      this.#consumeOrSemicolon();
      return s;
    }

    if (this.#match('SEMICOLON')) { this.#consume('SEMICOLON'); return this.#node('Empty', {}); }

    this.#errors.push(new SyntaxError(
      this.#currentToken ? this.#currentToken.value : 'EOF',
      this.#currentToken ? this.#currentToken.line  : 0,
      this.#currentToken ? this.#currentToken.column: 0,
      `Sentencia inesperada: '${this.#currentToken ? this.#currentToken.value : 'EOF'}'`
    ));
    this.#advance();
    return null;
  }

  // DECLARACION ::= TIPO VAR_DECL (',' VAR_DECL)* ';'
  // VAR_DECL ::= ID ('=' EXPRESION)?
  #DECLARACION() {
    const typeTok = this.#consume('KEYWORD');
    const type = (typeTok && typeTok.value) || 'tipo?';

    const decls = [];
    const first = this.#VAR_DECL(type);
    if (first) decls.push(first);

    while (this.#match('COMMA')) {
      this.#consume('COMMA');
      const n = this.#VAR_DECL(type);
      if (n) decls.push(n);
    }

    if (!this.#match('SEMICOLON')) {
      const last = decls.length ? decls[decls.length - 1].idTok : typeTok;
      const line = last ? last.line : 0;
      const col  = (last ? last.column : 0) + (last && last.value ? last.value.length : 0);
      this.#errors.push(new SyntaxError(';', line, col, `Se esperaba ';'`));
    } else { this.#consume('SEMICOLON'); }

    for (const d of decls) this.#symbols.set(d.name, type);
    return this.#node('Declaration', { type, declarators: decls });
  }

  #VAR_DECL(type) {
    const idTok = this.#consume('IDENTIFIER');
    const name  = idTok ? idTok.value : 'id?';
    let init = null;
    if (this.#match('ASSIGN')) { this.#consume('ASSIGN'); init = this.#EXPRESION(); }
    return { name, init, idTok, type };
  }

  // ASIGNACION ::= ID '=' EXPRESION | ID '++' | ID '--'
  #ASIGNACION() {
    const idTok = this.#consume('IDENTIFIER');
    const name  = idTok ? idTok.value : 'id?';

    if (!this.#symbols.has(name)) {
      this.#errors.push(new SyntaxError(name, idTok ? idTok.line : 0, idTok ? idTok.column : 0, 'Variable no declarada'));
    }

    if (this.#match('ASSIGN'))    { this.#consume('ASSIGN'); const expr = this.#EXPRESION(); return this.#node('Assign', { name, expr }); }
    if (this.#match('INCREMENT')) { this.#consume('INCREMENT'); return this.#node('IncDec', { name, op: '++' }); }
    if (this.#match('DECREMENT')) { this.#consume('DECREMENT'); return this.#node('IncDec', { name, op: '--' }); }

    this.#errors.push(new SyntaxError(
      this.#currentToken ? this.#currentToken.value : 'EOF',
      this.#currentToken ? this.#currentToken.line  : 0,
      this.#currentToken ? this.#currentToken.column: 0,
      "Se esperaba '=', '++' o '--'"
    ));
    return null;
  }

  // PRINT ::= 'System' '.' 'out' '.' 'println' '(' EXPRESION ')' ';'
  #PRINT() {
    this.#consumeKeyword('System'); this.#consume('DOT');
    this.#consumeKeyword('out');    this.#consume('DOT');
    this.#consumeKeyword('println'); this.#consume('LPAREN');
    const expr = this.#EXPRESION(); // obligatorio
    this.#consume('RPAREN');
    return this.#node('Print', { expr });
  }

  // IF ::= 'if' '(' EXP ')' BLOQUE ('else' BLOQUE)?
  #IF() {
    this.#consumeKeyword('if'); this.#consume('LPAREN');
    const cond = this.#EXPRESION(); this.#consume('RPAREN');
    const thenB = this.#BLOCK();
    let elseB = null;
    if (this.#match('KEYWORD') && this.#look_ahead().value === 'else') { this.#advance(); elseB = this.#BLOCK(); }
    return this.#node('If', { cond, thenBlock: thenB, elseBlock: elseB });
  }

  // FOR ::= 'for' '(' FOR_INIT ';' EXPRESION ';' FOR_UPDATE ')' BLOQUE
  #FOR() {
    this.#consumeKeyword('for'); this.#consume('LPAREN');
    const init = this.#FOR_INIT(); this.#consumeOrSemicolon();
    const cond = this.#EXPRESION(); this.#consumeOrSemicolon();
    const update = this.#FOR_UPDATE(); this.#consume('RPAREN');
    const body = this.#BLOCK();
    return this.#node('For', { init, cond, update, body });
  }

  // FOR_INIT ::= TIPO ID '=' EXPRESION
  #FOR_INIT() {
    if (!(this.#match('KEYWORD') && ['int','double','char','String','boolean'].includes(this.#look_ahead().value))) {
      this.#errors.push(new SyntaxError(
        this.#currentToken ? this.#currentToken.value : 'EOF',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        `Se esperaba tipo en inicialización de for`
      ));
      return this.#node('Empty', {});
    }
    const typeTok = this.#consume('KEYWORD');
    const idTok   = this.#consume('IDENTIFIER');
    const name    = idTok ? idTok.value : 'id?';
    this.#consume('ASSIGN');
    const expr = this.#EXPRESION();
    this.#symbols.set(name, typeTok ? typeTok.value : 'unknown');
    return this.#node('Declaration', { type: typeTok ? typeTok.value : 'unknown', declarators: [{ name, init: expr, idTok, type: typeTok ? typeTok.value : 'unknown' }] });
  }

  // FOR_UPDATE ::= ID ('++' | '--')
  #FOR_UPDATE() {
    const idTok = this.#consume('IDENTIFIER');
    const name  = idTok ? idTok.value : 'id?';
    if (!this.#symbols.has(name)) {
      this.#errors.push(new SyntaxError(name, idTok ? idTok.line : 0, idTok ? idTok.column : 0, 'Variable no declarada'));
    }
    if (this.#match('INCREMENT')) { this.#consume('INCREMENT'); return this.#node('IncDec', { name, op: '++' }); }
    if (this.#match('DECREMENT')) { this.#consume('DECREMENT'); return this.#node('IncDec', { name, op: '--' }); }
    this.#errors.push(new SyntaxError(
      this.#currentToken ? this.#currentToken.value : 'EOF',
      this.#currentToken ? this.#currentToken.line  : 0,
      this.#currentToken ? this.#currentToken.column: 0,
      `Se esperaba '++' o '--'`
    ));
    return this.#node('Empty', {});
  }

  // WHILE ::= 'while' '(' EXP ')' BLOQUE
  #WHILE() {
    this.#consumeKeyword('while'); this.#consume('LPAREN');
    const cond = this.#EXPRESION(); this.#consume('RPAREN');
    const body = this.#BLOCK();
    return this.#node('While', { cond, body });
  }

  // ================= expresiones =================
  #EXPRESION() {
    let left = this.#TERMINO();
    while (this.#match('EQUAL','NOT_EQUAL','GREATER','LESS','GREATER_EQUAL','LESS_EQUAL')) {
      const opTok = this.#consume('EQUAL','NOT_EQUAL','GREATER','LESS','GREATER_EQUAL','LESS_EQUAL');
      const right = this.#TERMINO();
      left = this.#node('Binary', { op: opTok ? opTok.type : 'EQUAL', left, right });
    }
    return left;
  }

  #TERMINO() {
    let left = this.#FACTOR();
    while (this.#match('PLUS','MINUS')) {
      const opTok = this.#consume('PLUS','MINUS');
      const right = this.#FACTOR();
      left = this.#node('Binary', { op: opTok ? opTok.type : 'PLUS', left, right });
    }
    return left;
  }

  #FACTOR() {
    let left = this.#PRIMARIO();
    while (this.#match('MULTIPLY','DIVIDE')) {
      const opTok = this.#consume('MULTIPLY','DIVIDE');
      const right = this.#PRIMARIO();
      left = this.#node('Binary', { op: opTok ? opTok.type : 'MULTIPLY', left, right });
    }
    return left;
  }

  #PRIMARIO() {
    if (this.#match('INTEGER')) { const t = this.#consume('INTEGER'); return this.#node('Literal', { litType: 'int',    value: Number(t.value) }); }
    if (this.#match('DECIMAL')) { const t = this.#consume('DECIMAL'); return this.#node('Literal', { litType: 'double', value: Number(t.value) }); }
    if (this.#match('STRING'))  { const t = this.#consume('STRING');  return this.#node('Literal', { litType: 'String', value: t.value }); }
    if (this.#match('CHAR'))    { const t = this.#consume('CHAR');    return this.#node('Literal', { litType: 'char',   value: t.value }); }

    if (this.#match('KEYWORD') && (this.#look_ahead().value === 'true' || this.#look_ahead().value === 'false')) {
      const val = this.#look_ahead().value === 'true';
      this.#advance();
      return this.#node('Literal', { litType: 'boolean', value: val });
    }

    if (this.#match('IDENTIFIER')) {
      const idTok = this.#consume('IDENTIFIER');
      const name = idTok.value;
      if (!this.#symbols.has(name)) {
        this.#errors.push(new SyntaxError(name, idTok.line || 0, idTok.column || 0, 'Variable no declarada'));
      }
      return this.#node('Identifier', { name });
    }

    if (this.#match('LPAREN')) {
      this.#consume('LPAREN');
      const e = this.#EXPRESION();
      this.#consume('RPAREN');
      return e;
    }

    this.#errors.push(new SyntaxError(
      this.#currentToken ? this.#currentToken.value : 'EOF',
      this.#currentToken ? this.#currentToken.line  : 0,
      this.#currentToken ? this.#currentToken.column: 0,
      `Token inesperado en expresión: ${this.#currentToken ? this.#currentToken.value : 'EOF'}`
    ));
    this.#advance();
    return this.#node('Literal', { litType: 'int', value: 0 });
  }

  // ================= utilidades =================
  #consume(...types) {
    if (this.#match(...types)) { const tok = this.#currentToken; this.#advance(); return tok; }
    this.#errors.push(new SyntaxError(
      this.#currentToken ? this.#currentToken.value : 'EOF',
      this.#currentToken ? this.#currentToken.line  : 0,
      this.#currentToken ? this.#currentToken.column: 0,
      types.length === 1 ? `Se esperaba '${types[0]}'` : `Se esperaba ${types.join(' o ')}`
    ));
    this.#advance();
    return null;
  }

  #consumeOrSemicolon() {
    if (!this.#match('SEMICOLON')) {
      this.#errors.push(new SyntaxError(';',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        `Se esperaba ';'`
      ));
    } else { this.#consume('SEMICOLON'); }
  }

  #consumeIf(type) { if (this.#match(type)) { this.#advance(); return true; } return false; }

  #consumeKeyword(word) {
    if (!(this.#match('KEYWORD') && this.#look_ahead().value === word)) {
      this.#errors.push(new SyntaxError(
        this.#currentToken ? this.#currentToken.value : 'EOF',
        this.#currentToken ? this.#currentToken.line  : 0,
        this.#currentToken ? this.#currentToken.column: 0,
        `Se esperaba '${word}'`
      ));
    } else { this.#advance(); }
  }

  #match(...types) {
    const t = this.#look_ahead();
    if (!t) return false;
    for (const tp of types) {
      if (tp === 'KEYWORD') {
        if (t.type && typeof t.type === 'string' && t.type.startsWith('KW_')) return true;
      } else if (t.type === tp) return true;
    }
    return false;
  }

  #look_ahead() {
    if (this.#position < this.#tokens.length) {
      this.#currentToken = this.#tokens[this.#position];
      return this.#currentToken;
    }
    this.#currentToken = { type: 'EOF', value: 'EOF', line: 0, column: 0 };
    return this.#currentToken;
  }

  #advance() {
    this.#position++;
    if (this.#position < this.#tokens.length) {
      this.#currentToken = this.#tokens[this.#position];
    } else {
      this.#currentToken = { type: 'EOF', value: 'EOF', line: 0, column: 0 };
    }
  }
}

// Exponer en ambos entornos
if (typeof window !== 'undefined') window.Parser = Parser;
if (typeof module !== 'undefined') module.exports = Parser;
