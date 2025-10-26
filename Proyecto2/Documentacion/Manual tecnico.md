# Manual Técnico — Traductor **Java → Python**

> Documento detallado del proceso de desarrollo, análisis de resultados, pruebas,
> **tabla de tokens con su ER**, **AFD por método del árbol** (analizador léxico),
> **gramática tipo-2 (BNF)** del analizador sintáctico, descripción de implementación
> y **conclusiones**.

---

## 1) Visión general

El sistema recibe un archivo **.java**, realiza **análisis léxico** y **sintáctico** sobre un subconjunto de Java y, si no hay errores, **traduce a Python**.  
Componentes principales: `Lexer.js` (léxico), `Parser.js` (sintaxis/AST), `Translator.js` (emisión de Python), `ui/index.html` (interfaz).

---

## 2) Tabla de tokens (Expresión Regular + Acción)

> Nota: las **palabras reservadas** se reconocen primero como `IDENTIFIER` y luego se reclasifican a `KW_*` consultando una tabla.

| Token | Expresión regular (ER) | Ejemplos | Acción/Notas |
|---|---|---|---|
| `IDENTIFIER` | `[A-Za-z_][A-Za-z0-9_]*` | `x`, `_a1` | Si lexema ∈ reservadas ⇒ `KW_*` |
| `INTEGER` | `[0-9]+` | `0`, `42` | — |
| `DECIMAL` | `[0-9]+\.[0-9]+` | `3.14`, `10.0` | Rechaza `.` extra |
| `STRING` | `"[^"\n]*"` | `"hola"` | Sin salto de línea |
| `CHAR` | `'[^'\n]'` | `'a'` | Un solo carácter |
| `PLUS`/`INCREMENT` | `\+` / `\+\+` | `+` / `++` | — |
| `MINUS`/`DECREMENT` | `-` / `--` | `-` / `--` | — |
| `MULTIPLY` / `DIVIDE` | `\*` / `/` | `*` / `/` | `/` puede iniciar comentario |
| `ASSIGN` / `EQUAL` | `=` / `==` | `=`, `==` | — |
| `NOT_EQUAL` | `!=` | `!=` | — |
| `GREATER` / `LESS` / `GE` / `LE` | `>` `<` `>=` `<=` | `>` `<` `>=` `<=` | — |
| `LBRACE`/`RBRACE` | `{` `}` | `{` `}` | — |
| `LPAREN`/`RPAREN` | `\(` `\)` | `(` `)` | — |
| `LBRACKET`/`RBRACKET` | `\[` `\]` | `[` `]` | — |
| `SEMICOLON`/`COMMA`/`DOT` | `;` `,` `\.` | `;` `,` `.` | — |
| **WHITESPACE** *(ignorado)* | `[ \t\r\n]+` | — | Avanza posición |
| **Comentario línea** | `//[^\n]*` | `// ...` | Ignorar hasta fin de línea |
| **Comentario bloque** | `/\*[^*]*\*+([^/*][^*]*\*+)*/` | `/* ... */` | Error si no cierra |

**Reservadas** → `KW_*`: `public, class, static, void, main, String, args, int, double, char, boolean, true, false, if, else, for, while, System, out, println`.

---

## 3) AFD del léxico (método del árbol)

De las ER se construye el **árbol de sintaxis** y se calculan `nullable/firstpos/lastpos/followpos` para obtener el **DFA**.

### 3.1 Árbol y DFA del `IDENTIFIER`
- **Árbol de la ER** (ilustrativo):  
  ![Árbol IDENTIFIER](<imagenes manual tecnico/imagen1.jpg>)
- **DFA resultante**:  
  ![DFA IDENTIFIER](<imagenes manual tecnico/imagen2.jpg>)

**Tabla `nullable/firstpos/lastpos` (esquema)**

| Nodo | Expresión/Operación | `nullable` | `firstpos` | `lastpos` |
|---|---|---|---|---|
| n1 | `L` | `false` | {1} | {1} |
| n2 | `L \| D \| _` | `false` | {2,3,4} | {2,3,4} |
| n3 | `n2*` | `true` | {2,3,4} | {2,3,4} |
| n4 | `n1 · n3` | `false` | {1} | {2,3,4} |

**Tabla `followpos` (extracto)**

| Pos | Símbolo | `followpos` |
|---|---|---|
| 1 | `L` | {2,3,4} |
| 2 | `L` | {2,3,4} |
| 3 | `D` | {2,3,4} |
| 4 | `_` | {2,3,4} |

### 3.2 DFAs por familia (didáctico)

- **Números (INTEGER/DECIMAL)** → ![DFA Números](<imagenes manual tecnico/imagen3.jpg>)  
- **Cadenas/Char (STRING/CHAR)** → ![DFA STRING/CHAR](<imagenes manual tecnico/imagen4.jpg>)  
- **Operadores/Separadores** → ![DFA Operadores](<imagenes manual tecnico/imagen5.jpg>)

**Ejemplo de tabla de transiciones — `DECIMAL`**

| Estado | Entrada | Siguiente |
|---|---|---|
| q0 | 0–9 | q1 |
| q1 | 0–9 | q1 |
| q1 | `.` | q2 |
| q2 | 0–9 | q3 |
| q3 | 0–9 | q3 |
| **Acepta** | — | **q3** |

> Estos DFA se implementan en `Lexer.js` mediante estados `#S0…#S37`.

---

## 4) Correspondencia AFD ↔ implementación (`Lexer.js`)

```js
// Tabla de reservadas (extracto)
this.#keywords = {
  public:'KW_public', class:'KW_class', static:'KW_static', void:'KW_void',
  main:'KW_main', String:'KW_String', args:'KW_args',
  int:'KW_int', double:'KW_double', char:'KW_char', boolean:'KW_boolean',
  true:'KW_true', false:'KW_false',
  if:'KW_if', else:'KW_else', for:'KW_for', while:'KW_while',
  System:'KW_System', out:'KW_out', println:'KW_println'
};

// Despacho principal (#S0) — equivalentes a transiciones del DFA
#S0() {
  this.#next_char = this.#input[this.#pos_char];

  if (Character.isIdStart(this.#next_char)) { this.#initBuffer(this.#next_char); return this.#S1(); }
  if (Character.isDigit(this.#next_char))    { this.#initBuffer(this.#next_char); const t = this.#S4(); if (t) return t; }
  if (this.#next_char === '"')               { this.#initBuffer(this.#next_char); return this.#S7(); }
  if (this.#next_char === "'")               { this.#initBuffer(this.#next_char); return this.#S9(); }

  // Operadores/separadores (+ - * / = ! > < { } ( ) [ ] ; , .)
  // ... estados #S12..#S37

  // Espacios/comentarios/errores
  // ...
}

// Números: INTEGER o DECIMAL válidos
#S4(){ while (Character.isDigit(this.#peek())) this.#add(); if (this.#peek()==='.') { this.#add(); return this.#S5(); } return this.#createToken('INTEGER'); }
#S5(){ if (!Character.isDigit(this.#peek())) { this.#addError('Número decimal inválido'); return null; } return this.#S6(); }
#S6(){ while (Character.isDigit(this.#peek())) this.#add(); if (this.#peek()==='.') { this.#addError('Número decimal inválido'); return null; } return this.#createToken('DECIMAL'); }

// Comentarios
#S17(){
  this.#next_char = this.#input[this.#pos_char];
  if (this.#next_char === '/') { this.#S18(); return null; }   // // línea
  if (this.#next_char === '*') { this.#S19(); return null; }   // /* bloque */
  return this.#createToken('DIVIDE');
}
```
---
## 5) Gramática tipo-2 (BNF) del parser

```js
<programa> ::= "public" "class" IDENTIFIER LBRACE <main> RBRACE

<main> ::= "public" "static" "void" "main"
           LPAREN "String" LBRACKET RBRACKET "args" RPAREN
           <bloque>

<bloque> ::= LBRACE <sentencias> RBRACE
<sentencias> ::= <sentencia> <sentencias> | ε

<sentencia> ::= <declaracion> SEMICOLON
              | <asignacion>  SEMICOLON
              | <print>       SEMICOLON
              | <if> | <for> | <while> | SEMICOLON

<declaracion> ::= <tipo> <var_decl> <decl_tail>
<decl_tail>   ::= COMMA <var_decl> <decl_tail> | ε
<var_decl>    ::= IDENTIFIER <var_init_opt>
<var_init_opt> ::= ASSIGN <expresion> | ε
<tipo> ::= "int" | "double" | "char" | "String" | "boolean"

<asignacion> ::= IDENTIFIER (ASSIGN <expresion> | INCREMENT | DECREMENT)
<print> ::= "System" DOT "out" DOT "println" LPAREN <expresion> RPAREN

<if> ::= "if" LPAREN <expresion> RPAREN <bloque> <else_opt>
<else_opt> ::= "else" <bloque> | ε

<for> ::= "for" LPAREN <for_init> SEMICOLON <expresion> SEMICOLON <for_update> RPAREN <bloque>
<for_init> ::= <tipo> IDENTIFIER ASSIGN <expresion>
<for_update> ::= IDENTIFIER (INCREMENT | DECREMENT)

<while> ::= "while" LPAREN <expresion> RPAREN <bloque>

<expresion> ::= <termino> <exp_tail>
<exp_tail> ::= (EQUAL | NOT_EQUAL | GREATER | LESS | GREATER_EQUAL | LESS_EQUAL) <termino> <exp_tail> | ε

<termino> ::= <factor> <term_tail>
<term_tail> ::= (PLUS | MINUS) <factor> <term_tail> | ε

<factor> ::= <primario> <fact_tail>
<fact_tail> ::= (MULTIPLY | DIVIDE) <primario> <fact_tail> | ε

<primario> ::= INTEGER | DECIMAL | STRING | CHAR
             | "true" | "false" | IDENTIFIER
             | LPAREN <expresion> RPAREN
```

**Manejo de errores (extracto Parser.js)**

```js
#consume(...types){
  if (this.#match(...types)) { const tok = this.#currentToken; this.#advance(); return tok; }
  this.#errors.push(new SyntaxError(
    this.#currentToken ? this.#currentToken.value : 'EOF',
    this.#currentToken ? this.#currentToken.line  : 0,
    this.#currentToken ? this.#currentToken.column: 0,
    types.length===1 ? `Se esperaba '${types[0]}'` : `Se esperaba ${types.join(' o ')}`
  ));
  this.#advance();
  return null;
}
```
---
## 6) Generación de Python (reglas clave)
```js
// Declaraciones con valor por defecto + asignación si hay init
case 'Declaration':
  for (const d of st.declarators) {
    this._emit(`# Declaracion: ${st.type}`);
    this._emit(`${d.name} = ${this._defaultValue(st.type)}`);
    if (d.init) this._emit(`${d.name} = ${this._exprToPy(d.init).code}`);
  }
  break;

// print: convierte a str si no es String
case 'Print': {
  const r = this._exprToPy(st.expr);
  this._emit(r.type === 'String' ? `print(${r.code})` : `print(str(${r.code}))`);
  break;
}

// for → while
case 'For':
  if (st.init) this._translateStmt(st.init);
  this._emit(`# Ciclo for traducido a while`);
  this._emit(`while ${this._exprToPy(st.cond).code}:`);
  this.indent++; this._translateBlock(st.body);
  if (st.update) this._translateStmt(st.update);
  this.indent--; break;
```
---
## 7) Pruebas y resultados

### 7.1 Caso positivo (fragmento)

**Entrada Java**

```js
public class In {
  public static void main(String[] args) {
    int n = 3; String s = "ok";
    for (int i = 0; i < n; i++) { System.out.println(i); }
  }
}
```

**Salida Python esperada**
```js
# Declaracion: int
n = 0
n = 3
# Declaracion: String
s = ""
s = "ok"
# Ciclo for traducido a while
i = 0
while i < n:
    print(i)
    i += 1

```

**7.2 Casos negativos**

- **Léxico:** comillas sin cierre (`"hola`) ⇒ *Cadena sin cerrar*.
- **Sintaxis:** falta de punto y coma (`int x = 3`) ⇒ *Se esperaba ';'*.
- **Uso de variable no declarada:** `y = 1;` sin `int y;` previo ⇒ *Variable no declarada*.
- **Número decimal inválido:** `3.` o `10..2` ⇒ *Número decimal inválido*.
- **Comentario de bloque sin cerrar:** `/* ...` ⇒ *Comentario de bloque no cerrado*.

---

## 8) Conclusiones

- El **AFD por método del árbol** respalda formalmente el diseño del `Lexer.js` y explica por qué cada estado/ transición existe.
- La **BNF** documenta el subconjunto de Java aceptado y facilita futuras extensiones (más tipos, `for-each`, etc.).
- La traducción a Python conserva la semántica básica (impresión, condicionales, bucles); el `for` se mapea a `while`.
- La arquitectura modular (Lexer/Parser/Translator/UI) facilita pruebas, mantenimiento y escalabilidad.
- Los reportes de errores son claros (posición, token) y permiten depuración rápida.

---

## 9) Estructura del proyecto (referencia)

```text
Proyecto/
├─ src/
│  ├─ main.js
│  ├─ Lexer.js
│  ├─ Parser.js
│  ├─ Translator.js
│  ├─ models/
│  │  ├─ Token.js
│  │  ├─ LexicalError.js
│  │  └─ SyntaxError.js
│  └─ utils/
│     └─ Character.js
└─ ui/
   └─ index.html
```
