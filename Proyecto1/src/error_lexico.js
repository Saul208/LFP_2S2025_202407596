
class ErrorLexico {
  constructor(lexeme, row, col, desc = "Token inválido") {
    this.lexeme = lexeme;
    this.type = "Token inválido";
    this.desc = desc;
    this.row = row;
    this.col = col;
  }
}
if (typeof module !== "undefined") module.exports = ErrorLexico;
