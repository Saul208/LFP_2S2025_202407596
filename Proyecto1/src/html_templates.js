// Plantillas para reportes en HTML
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TourneyTemplates = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const baseCss = `
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:20px}
    h2{margin:.25rem 0 1rem}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #cdd3dd;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#e8eef7}
    tr:nth-child(even) td{background:#f7f9fc}
  `;

  function htmlDoc(title, inner) {
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${escape(title)}</title>
<style>${baseCss}</style></head>
<body><h2>${escape(title)}</h2>${inner}</body></html>`;
  }

  function escape(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

  function tableBracket(rows){
    const body = rows.map(r=>`
      <tr>
        <td>${escape(r.fase)}</td>
        <td>${escape(r.partido)}</td>
        <td>${escape(r.resultado)}</td>
        <td>${escape(r.ganador)}</td>
      </tr>`).join("");
    return htmlDoc("Reporte de Bracket de Eliminación", `
      <table>
        <thead><tr><th>Fase</th><th>Partido</th><th>Resultado</th><th>Ganador</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    `);
  }

  function tableStats(rows){
    const body = rows.map(r=>`
      <tr>
        <td>${escape(r.equipo)}</td>
        <td>${r.jugados}</td><td>${r.ganados}</td><td>${r.perdidos}</td>
        <td>${r.gf}</td><td>${r.gc}</td><td>${escape(r.diff)}</td>
        <td>${escape(r.fase)}</td>
      </tr>`).join("");
    return htmlDoc("Reporte de Estadísticas por Equipo", `
      <table>
        <thead>
          <tr>
            <th>Equipo</th><th>Partidos Jugados</th><th>Ganados</th><th>Perdidos</th>
            <th>Goles a Favor</th><th>Goles en Contra</th><th>Diferencia</th><th>Fase Alcanzada</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `);
  }

  function tableScorers(rows){
    const body = rows.map(r=>`
      <tr>
        <td>${r.pos}</td><td>${escape(r.jugador)}</td><td>${escape(r.equipo)}</td>
        <td>${r.goles}</td><td>${escape(r.minutos || "")}</td>
      </tr>`).join("");
    return htmlDoc("Reporte de Goleadores", `
      <table>
        <thead><tr><th>Posición</th><th>Jugador</th><th>Equipo</th><th>Goles</th><th>Minutos de Gol</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    `);
  }

  function tableInfo(rows){
    const body = rows.map(r=>`
      <tr><td>${escape(r.k)}</td><td>${escape(r.v)}</td></tr>
    `).join("");
    return htmlDoc("Reporte de Información General del Torneo", `
      <table>
        <thead><tr><th>Estadística</th><th>Valor</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    `);
  }

  return { tableBracket, tableStats, tableScorers, tableInfo };
});
