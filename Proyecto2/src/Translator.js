/**
 * Traductor Java -> Python (subconjunto 4.1–4.5)
 * - Tipos: int, double, char, String, boolean
 * - println, if/else, for (a while), while
 * - Concatenación con String: usa str(...) cuando sea necesario
 * - Indentación: 4 espacios
 * - Comentarios de declaración como en el ejemplo del enunciado
 */

class Translator {
  constructor(ast, symbols) {
    this.ast = ast || {};
    this.symbols = symbols || new Map();
    this.lines = [];
    this.indent = 0;
  }

  translate() {
    this.lines = [];
    this._emit(`# Traducido de Java a Python`);
    const cls = this.ast && this.ast.classDecl;
    if (cls && cls.name) this._emit(`# Clase: ${cls.name}`);

    const block = cls && cls.main && cls.main.block ? cls.main.block : null;
    this._translateBlock(block);

    return this.lines.join('\n') + '\n';
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  _emit(text) {
    const pad = ' '.repeat(this.indent * 4);
    this.lines.push(pad + text);
  }

  _pyBool(v) {
    return v ? 'True' : 'False';
  }

  _defaultValue(javaType) {
    switch (javaType) {
      case 'int': return '0';
      case 'double': return '0.0';
      case 'char': return `' '`;
      case 'String': return `""`;
      case 'boolean': return 'False';
      default: return 'None';
    }
  }

  // --------------------------------------------------
  // Bloques y sentencias
  // --------------------------------------------------
  _translateBlock(block) {
    if (!block || !Array.isArray(block.statements)) return;
    for (const st of block.statements) {
      this._translateStmt(st);
    }
  }

  _translateStmt(st) {
    if (!st) return;

    switch (st.kind) {
      case 'Declaration': {
        for (const d of st.declarators) {
          // comentario y valor por defecto
          this._emit(`# Declaracion: ${st.type}`);
          this._emit(`${d.name} = ${this._defaultValue(st.type)}`);
          // inicialización explícita si existe
          if (d.init) {
            const res = this._exprToPy(d.init);
            this._emit(`${d.name} = ${res.code}`);
          }
        }
        break;
      }

      case 'Assign': {
        const res = this._exprToPy(st.expr);
        this._emit(`${st.name} = ${res.code}`);
        break;
      }

      case 'IncDec': {
        const op = st.op === '++' ? '+=' : '-=';
        this._emit(`${st.name} ${op} 1`);
        break;
      }

      case 'Print': {
        const res = this._exprToPy(st.expr);
        // Siempre imprimimos; si no es String, envolvemos con str(...)
        if (res.type === 'String') this._emit(`print(${res.code})`);
        else this._emit(`print(str(${res.code}))`);
        break;
      }

      case 'If': {
        const cond = this._exprToPy(st.cond).code;
        this._emit(`if ${cond}:`);
        this.indent++;
        this._translateBlock(st.thenBlock);
        this.indent--;
        if (st.elseBlock) {
          this._emit(`else:`);
          this.indent++;
          this._translateBlock(st.elseBlock);
          this.indent--;
        }
        break;
      }

      case 'While': {
        const cond = this._exprToPy(st.cond).code;
        this._emit(`while ${cond}:`);
        this.indent++;
        this._translateBlock(st.body);
        this.indent--;
        break;
      }

      case 'For': {
        // init antes
        if (st.init) this._translateStmt(st.init);

        // while con condición
        this._emit(`# Ciclo for traducido a while`);
        const cond = this._exprToPy(st.cond).code;
        this._emit(`while ${cond}:`);
        this.indent++;
        this._translateBlock(st.body);
        if (st.update) this._translateStmt(st.update); // ++ / -- (o asignación si llega)
        this.indent--;
        break;
      }

      case 'Empty': {
        // no-op
        break;
      }

      default:
        this._emit(`# [No soportado]: ${st.kind}`);
    }
  }

  // --------------------------------------------------
  // Expresiones
  // --------------------------------------------------
  _exprToPy(node) {
    if (!node) return { code: 'None', type: 'None' };

    if (node.kind === 'Literal') {
      switch (node.litType) {
        case 'int': return { code: String(node.value), type: 'int' };
        case 'double': return { code: String(node.value), type: 'double' };
        case 'char': return { code: `'${node.value}'`, type: 'char' };
        case 'String': return { code: JSON.stringify(String(node.value)), type: 'String' };
        case 'boolean': return { code: this._pyBool(!!node.value), type: 'boolean' };
        default: return { code: 'None', type: 'None' };
      }
    }

    if (node.kind === 'Identifier') {
      const t = this.symbols instanceof Map ? (this.symbols.get(node.name) || 'unknown') : 'unknown';
      return { code: node.name, type: t };
    }

    if (node.kind === 'Binary') {
      const L = this._exprToPy(node.left);
      const R = this._exprToPy(node.right);

      const opMap = {
        'PLUS': '+',
        'MINUS': '-',
        'MULTIPLY': '*',
        'DIVIDE': '/',
        'EQUAL': '==',
        'NOT_EQUAL': '!=',
        'GREATER': '>',
        'LESS': '<',
        'GREATER_EQUAL': '>=',
        'LESS_EQUAL': '<='
      };

      // concatenación con String en '+'
      if (node.op === 'PLUS' && (L.type === 'String' || R.type === 'String')) {
        const l = (L.type === 'String') ? L.code : `str(${L.code})`;
        const r = (R.type === 'String') ? R.code : `str(${R.code})`;
        return { code: `${l} + ${r}`, type: 'String' };
      }

      const code = `${L.code} ${opMap[node.op]} ${R.code}`;
      let type = 'int';
      if (node.op === 'DIVIDE' || L.type === 'double' || R.type === 'double') type = 'double';
      if (['EQUAL','NOT_EQUAL','GREATER','LESS','GREATER_EQUAL','LESS_EQUAL'].includes(node.op)) type = 'boolean';
      return { code, type };
    }

    return { code: 'None', type: 'None' };
  }
}


if (typeof window !== 'undefined') window.Translator = Translator;
if (typeof module !== 'undefined') module.exports = Translator;
