
class Token {
  constructor(type, lexeme, row, col) {
    this.type = type;
    this.lexeme = lexeme;
    this.row = row;
    this.col = col;
  }
}
if (typeof module !== "undefined") module.exports = Token;
