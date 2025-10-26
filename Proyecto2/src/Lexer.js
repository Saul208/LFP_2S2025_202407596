// Carga dual (navegador / Node)
// Carga dual (navegador / Node)
const __IS_BROWSER_LEX__ = (typeof window !== 'undefined');

const TokenCls  = __IS_BROWSER_LEX__ ? window.Token        : require("./models/Token.js");
const LexErrCls = __IS_BROWSER_LEX__ ? window.LexicalError : require("./models/LexicalError.js");
const Char      = __IS_BROWSER_LEX__ ? window.Character    : require("./utils/Character.js");


/**
 * Analizador Léxico basado en AFD sin regex
 */
class Lexer {
    #input; #pos_char; #buffer; #char_line; #char_col; #next_char;
    #keywords; #tokens; #errors;

    constructor(input) {
        this.#input = input;
        this.#pos_char = 0;
        this.#buffer = '';
        this.#char_line = 1;
        this.#char_col = 1;
        this.#next_char = '';
        this.#tokens = [];
        this.#errors = [];

        this.#keywords = {
            'public': 'KW_public',
            'class': 'KW_class',
            'static': 'KW_static',
            'void': 'KW_void',
            'main': 'KW_main',
            'String': 'KW_String',
            'args': 'KW_args',
            'int': 'KW_int',
            'double': 'KW_double',
            'char': 'KW_char',
            'boolean': 'KW_boolean',
            'true': 'KW_true',
            'false': 'KW_false',
            'if': 'KW_if',
            'else': 'KW_else',
            'for': 'KW_for',
            'while': 'KW_while',
            'System': 'KW_System',
            'out': 'KW_out',
            'println': 'KW_println'
        };
    }

    #initBuffer(currentChar) { this.#buffer = currentChar; this.#char_col++; this.#pos_char++; }
    #addCharToBuffer(currentChar) { this.#buffer += currentChar; this.#char_col++; this.#pos_char++; }

    // Aceptación con valor opcional (para literales sin comillas)
    #createToken(type, valueOverride = null) {
        const value = valueOverride !== null ? valueOverride : this.#buffer;
        return new TokenCls(type, value, this.#char_line, this.#char_col - this.#buffer.length);
    }

    #addError(description) {
        this.#errors.push(new LexErrCls(
            this.#next_char,
            this.#char_line,
            this.#char_col,
            description
        ));
    }

    analyze() {
        let token;
        while ((token = this.nextToken()).type !== 'EOF') {
            this.#tokens.push(token);
        }
        return { tokens: this.#tokens, errors: this.#errors, success: this.#errors.length === 0 };
    }

    nextToken = () => this.#S0();

    #S0() {
        while (this.#pos_char < this.#input.length) {
            this.#next_char = this.#input[this.#pos_char];

            // Identificadores / Palabras reservadas
            if (Char.isIdStart(this.#next_char)) {
                this.#initBuffer(this.#next_char);
                return this.#S1();
            }

            // Números
            if (Char.isDigit(this.#next_char)) {
                this.#initBuffer(this.#next_char);
                const token = this.#S4();
                if (token) return token;
            }

            // Cadenas
            if (this.#next_char === '"') {
                this.#initBuffer(this.#next_char);
                return this.#S7();
            }

            // Caracter
            if (this.#next_char === "'") {
                this.#initBuffer(this.#next_char);
                return this.#S9();
            }

            // Operadores / Símbolos
            if (this.#next_char === '+') { this.#initBuffer(this.#next_char); return this.#S12(); }
            if (this.#next_char === '-') { this.#initBuffer(this.#next_char); return this.#S14(); }
            if (this.#next_char === '*') { this.#initBuffer(this.#next_char); return this.#S16(); }
            if (this.#next_char === '/') {
                this.#initBuffer(this.#next_char);
                const result = this.#S17();
                if (result) return result;
                continue; // comentario no retorna token
            }
            if (this.#next_char === '=') { this.#initBuffer(this.#next_char); return this.#S21(); }
            if (this.#next_char === '!') { this.#initBuffer(this.#next_char); return this.#S23(); }
            if (this.#next_char === '>') { this.#initBuffer(this.#next_char); return this.#S25(); }
            if (this.#next_char === '<') { this.#initBuffer(this.#next_char); return this.#S27(); }
            if (this.#next_char === '{') { this.#initBuffer(this.#next_char); return this.#S29(); }
            if (this.#next_char === '}') { this.#initBuffer(this.#next_char); return this.#S30(); }
            if (this.#next_char === '(') { this.#initBuffer(this.#next_char); return this.#S31(); }
            if (this.#next_char === ')') { this.#initBuffer(this.#next_char); return this.#S32(); }
            if (this.#next_char === '[') { this.#initBuffer(this.#next_char); return this.#S33(); }
            if (this.#next_char === ']') { this.#initBuffer(this.#next_char); return this.#S34(); }
            if (this.#next_char === ';') { this.#initBuffer(this.#next_char); return this.#S35(); }
            if (this.#next_char === ',') { this.#initBuffer(this.#next_char); return this.#S36(); }
            if (this.#next_char === '.') { this.#initBuffer(this.#next_char); return this.#S37(); }

            // Ignorados y control de posición
            if (this.#next_char === '' || this.#next_char === ' ') { this.#char_col++; }
            else if (this.#next_char === '\t') { this.#char_col += 4; }
            else if (this.#next_char === '\n') { this.#char_col = 1; this.#char_line++; }
            else if (this.#next_char === '\r') { this.#char_col++; }
            else { this.#addError('Carácter no reconocido'); this.#char_col++; }

            this.#pos_char++;
        }
        return new TokenCls('EOF', 'EOF', this.#char_line, this.#char_col);
    }

    // IDENT / KEYWORD
    #S1() {
        while (Char.isIdPart((this.#next_char = this.#input[this.#pos_char]))) {
            this.#addCharToBuffer(this.#next_char);
        }
        const type = this.#keywords[this.#buffer] || 'IDENTIFIER';
        return this.#createToken(type);
    }

    // Entero / Decimal
    #S4() {
        while (Char.isDigit((this.#next_char = this.#input[this.#pos_char]))) {
            this.#addCharToBuffer(this.#next_char);
        }
        if (this.#next_char === '.') {
            this.#addCharToBuffer(this.#next_char);
            return this.#S5();
        }
        return this.#createToken('INTEGER');
    }
    #S5() {
        if (!Char.isDigit((this.#next_char = this.#input[this.#pos_char]))) {
            this.#addError('Número decimal inválido');
            return null;
        }
        return this.#S6();
    }
    #S6() {
        while (Char.isDigit((this.#next_char = this.#input[this.#pos_char]))) {
            this.#addCharToBuffer(this.#next_char);
        }
        if (this.#next_char === '.') {
            this.#addError('Número decimal inválido');
            return null;
        }
        return this.#createToken('DECIMAL');
    }

    // STRING
    #S7() {
        while ((this.#next_char = this.#input[this.#pos_char]) !== '"' && this.#next_char !== '\n') {
            this.#addCharToBuffer(this.#next_char);
        }
        if (this.#next_char === '"') {
            this.#addCharToBuffer(this.#next_char);
            return this.#S8();
        }
        this.#addError('Cadena sin cerrar');
        return null;
    }
    #S8() {
        const value = this.#buffer.substring(1, this.#buffer.length - 1);
        return this.#createToken('STRING', value);
    }

    // CHAR
    #S9() {
        this.#next_char = this.#input[this.#pos_char];
        if (this.#next_char === '\n' || this.#next_char === '\0') {
            this.#addError('Carácter no cerrado');
            return null;
        }
        this.#addCharToBuffer(this.#next_char);
        return this.#S10();
    }
    #S10() {
        this.#next_char = this.#input[this.#pos_char];
        if (this.#next_char === "'") {
            this.#addCharToBuffer(this.#next_char);
            return this.#S11();
        }
        this.#addError('Carácter mal formado');
        while (this.#next_char !== "'" && this.#next_char !== '\n') {
            this.#addCharToBuffer(this.#next_char);
            this.#next_char = this.#input[this.#pos_char];
        }
        return null;
    }
    #S11() {
        const value = this.#buffer.substring(1, this.#buffer.length - 1);
        return this.#createToken('CHAR', value);
    }

    // + ++
    #S12() { this.#next_char = this.#input[this.#pos_char]; if (this.#next_char === '+') { this.#addCharToBuffer(this.#next_char); return this.#S13(); } return this.#createToken('PLUS'); }
    #S13() { return this.#createToken('INCREMENT'); }

    // - --
    #S14() { this.#next_char = this.#input[this.#pos_char]; if (this.#next_char === '-') { this.#addCharToBuffer(this.#next_char); return this.#S15(); } return this.#createToken('MINUS'); }
    #S15() { return this.#createToken('DECREMENT'); }

    // *
    #S16() { return this.#createToken('MULTIPLY'); }

    // / // /* */
    #S17() {
        this.#next_char = this.#input[this.#pos_char];
        if (this.#next_char === '/') { this.#addCharToBuffer(this.#next_char); this.#S18(); return null; }
        if (this.#next_char === '*') { this.#addCharToBuffer(this.#next_char); this.#S19(); return null; }
        return this.#createToken('DIVIDE');
    }
    #S18() {
        while ((this.#next_char = this.#input[this.#pos_char]) !== '\n') {
            this.#char_col++; this.#pos_char++;
            if (this.#pos_char >= this.#input.length) break;
        }
    }
    #S19() {
        const startLine = this.#char_line;
        const startCol = this.#char_col - 2;
        while (this.#pos_char < this.#input.length) {
            this.#next_char = this.#input[this.#pos_char];
            if (this.#next_char === '*') {
                this.#char_col++; this.#pos_char++;
                if (this.#pos_char < this.#input.length && this.#input[this.#pos_char] === '/') {
                    this.#char_col++; this.#pos_char++;
                    return;
                }
                continue;
            }
            if (this.#next_char === '\n') { this.#char_line++; this.#char_col = 1; this.#pos_char++; continue; }
            if (this.#next_char === '\r') { this.#pos_char++; continue; }
            this.#char_col++; this.#pos_char++;
        }
        this.#errors.push(new LexErrCls('/*', startLine, startCol, 'Comentario de bloque no cerrado'));
        return;
    }

    // =, ==
    #S21() { this.#next_char = this.#input[this.#pos_char]; if (this.#next_char === '=') { this.#addCharToBuffer(this.#next_char); return this.#S22(); } return this.#createToken('ASSIGN'); }
    #S22() { return this.#createToken('EQUAL'); }

    // !, !=
    #S23() { this.#next_char = this.#input[this.#pos_char]; if (this.#next_char === '=') { this.#addCharToBuffer(this.#next_char); return this.#S24(); } this.#addError('Carácter no reconocido'); return null; }
    #S24() { return this.#createToken('NOT_EQUAL'); }

    // >, >=
    #S25() { this.#next_char = this.#input[this.#pos_char]; if (this.#next_char === '=') { this.#addCharToBuffer(this.#next_char); return this.#S26(); } return this.#createToken('GREATER'); }
    #S26() { return this.#createToken('GREATER_EQUAL'); }

    // <, <=
    #S27() { this.#next_char = this.#input[this.#pos_char]; if (this.#next_char === '=') { this.#addCharToBuffer(this.#next_char); return this.#S28(); } return this.#createToken('LESS'); }
    #S28() { return this.#createToken('LESS_EQUAL'); }

    #S29() { return this.#createToken('LBRACE'); }
    #S30() { return this.#createToken('RBRACE'); }
    #S31() { return this.#createToken('LPAREN'); }
    #S32() { return this.#createToken('RPAREN'); }
    #S33() { return this.#createToken('LBRACKET'); }
    #S34() { return this.#createToken('RBRACKET'); }
    #S35() { return this.#createToken('SEMICOLON'); }
    #S36() { return this.#createToken('COMMA'); }
    #S37() { return this.#createToken('DOT'); }
}

// Exponer en ambos entornos
if (typeof window !== 'undefined') window.Lexer = Lexer;
if (typeof module !== 'undefined') module.exports = Lexer;
