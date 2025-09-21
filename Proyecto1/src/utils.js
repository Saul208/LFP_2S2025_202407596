
function escapeHtml(s) {
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
function rowsTokensHTML(tokens) {
  return tokens.map((t,i)=>`
<tr>
  <td>${i+1}</td>
  <td>${escapeHtml(t.lexeme)}</td>
  <td>${escapeHtml(t.type)}</td>
  <td>${t.row}</td>
  <td>${t.col}</td>
</tr>`).join("");
}
function rowsErroresHTML(errors) {
  return errors.map((e,i)=>`
<tr>
  <td>${i+1}</td>
  <td>${escapeHtml(e.lexeme)}</td>
  <td>Token inválido</td>
  <td>${escapeHtml(e.desc||"")}</td>
  <td>${e.row}</td>
  <td>${e.col}</td>
</tr>`).join("");
}
if (typeof module !== "undefined") module.exports = { escapeHtml, rowsTokensHTML, rowsErroresHTML };
