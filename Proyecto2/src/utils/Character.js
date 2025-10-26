class Character {
    static isAlpha(char) {
        return ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z'));
    }

    static isDigit(char) {
        return (char >= '0' && char <= '9');
    }

    static isAlphanumeric(char) {
        return (this.isAlpha(char) || this.isDigit(char));
    }

    static isWhitespace(char) {
        return char === ' ' || char === '\t' || char === '\n' || char === '\r';
    }

    // --- NUEVO: para identificadores estilo Java ---
    static isIdStart(ch) {
        return this.isAlpha(ch) || ch === '_';
    }
    static isIdPart(ch) {
        return this.isAlpha(ch) || this.isDigit(ch) || ch === '_';
    }
}



if (typeof window !== 'undefined') window.Character = Character;
if (typeof module !== 'undefined') module.exports = Character;
