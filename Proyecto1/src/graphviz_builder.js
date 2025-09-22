// Generador de DOT y SVG
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TourneyGraph = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const PHASES = ["CUARTOS", "SEMIFINAL", "FINAL"];
  const PHASE_LABEL = {
    CUARTOS: "Cuartos de Final",
    SEMIFINAL: "Semifinal",
    FINAL: "Final"
  };

  // --------- Utilidades comunes ---------
  const esc = (s) => String(s ?? "").replaceAll('"','&quot;').replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const escDot = (s) => String(s ?? "").replaceAll('"','\\"');

  const matchId = (phase, idx) => `m_${phase.toLowerCase()}_${idx+1}`;

  const labelForMatch = (m) => {
    const res = m.scoreRaw || "Pendiente";
    return `${m.teamA}\\n${res}\\n${m.teamB}`;
  };

  // --------- DOT (para descargar) ---------
  function buildBracketDOT(model){
    const byPhase = {};
    for (const p of PHASES) byPhase[p] = [];
    for (const m of model.matches) if (byPhase[m.phase]) byPhase[m.phase].push(m);

    const lines = [];
    lines.push('digraph Bracket {');
    lines.push('  rankdir=LR;');
    lines.push('  graph [pad=0.4, nodesep=0.8, ranksep=1.1];');
    lines.push('  node  [shape=box, style="rounded,filled", fillcolor="white", fontname="Helvetica", fontsize=10];');
    lines.push('  edge  [color="#888", arrowsize=0.7];');

    const titulo = `${model.info?.nombre || ""}\\n${model.info?.sede || ""}`.trim();
    if (titulo) {
      lines.push('  labelloc="t";');
      lines.push(`  label="${escDot(titulo)}";`);
      lines.push('  fontsize=14;');
    }

    const colors = {
      CUARTOS: {stroke:"#cfd8ec", fill:"#eef3fb"},
      SEMIFINAL: {stroke:"#cfd8ec", fill:"#e6f3ff"},
      FINAL: {stroke:"#e5d36f", fill:"#fff8cc"}
    };

    for (const phase of PHASES) {
      const arr = byPhase[phase];
      if (!arr.length) continue;

      const c = colors[phase];
      lines.push(`  subgraph cluster_${phase.toLowerCase()} {`);
      lines.push(`    label="${PHASE_LABEL[phase]}";`);
      lines.push(`    color="${c.stroke}"; style="rounded,filled"; fillcolor="${c.fill}";`);

      arr.forEach((m, i) => {
        const id = matchId(phase, i);
        let fill = "white";
        if (/^\d+\s*-\s*\d+$/.test(m.scoreRaw || "")) fill = "#eaffea";
        else if (/pendiente/i.test(m.scoreRaw || "")) fill = "#fffde7";
        lines.push(`    ${id} [label="${escDot(labelForMatch(m))}", fillcolor="${fill}"];`);
      });

      lines.push('  }');
    }

    // conexiones
    for (let pi=0; pi<PHASES.length-1; pi++){
      const pA = PHASES[pi], pB = PHASES[pi+1];
      const A = byPhase[pA], B = byPhase[pB];
      if (!A.length || !B.length) continue;
      for (let i=0, j=0; i < A.length; i+=2, j++){
        const left  = matchId(pA, i);
        const right = (i+1 < A.length) ? matchId(pA, i+1) : null;
        const to    = matchId(pB, j);
        lines.push(`  ${left} -> ${to} [style=dashed];`);
        if (right) lines.push(`  ${right} -> ${to} [style=dashed];`);
      }
    }

    // campeón
    const finals = byPhase.FINAL;
    if (finals.length){
      const fId = matchId("FINAL", 0);
      const champ = (finals[0].winner && finals[0].winner !== "-") ? finals[0].winner : "TBD";
      lines.push(`  champion [label="Ganador\\n${escDot(champ)}", shape=box, style="rounded,filled,bold", fillcolor="#fff8cc"];`);
      lines.push(`  ${fId} -> champion [style=bold];`);
    }

    lines.push('}');
    return lines.join("\n");
  }

  // --------- SVG ---------
  function buildBracketSVG(model){
    // agrupar
    const byPhase = {};
    for (const p of PHASES) byPhase[p] = [];
    for (const m of model.matches) if (byPhase[m.phase]) byPhase[m.phase].push(m);

    const colOrder = PHASES.filter(p => byPhase[p].length > 0);
    if (colOrder.length === 0) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120"><text x="12" y="40" font-family="Helvetica" font-size="14">No hay partidos para mostrar.</text></svg>`;
    }

    // layout
    const nodeW = 200, nodeH = 70, colGap = 140, rowGap = 40;
    const marginX = 24, marginY = 24;
    const colCount = colOrder.length + 1; // +1 para campeón
    const maxRows = Math.max(...colOrder.map(p => byPhase[p].length));
    const svgW = marginX*2 + (nodeW * colCount) + (colGap * (colCount-1));
    const svgH = Math.max(200, marginY*2 + (maxRows * nodeH) + ((maxRows-1) * rowGap));

    // posiciones por fase
    const positions = {}; // id -> {x,y}
    const colX = (ci) => marginX + ci*(nodeW + colGap);

    colOrder.forEach((phase, ci) => {
      const arr = byPhase[phase];
      const total = arr.length;
      // centrar verticalmente esta columna
      const colHeight = total*nodeH + (total-1)*rowGap;
      const y0 = Math.max(marginY, (svgH - colHeight)/2);
      arr.forEach((m, i) => {
        const id = matchId(phase, i);
        positions[id] = { x: colX(ci), y: y0 + i*(nodeH + rowGap) };
      });
    });

    // posición campeón (si hay final)
    let champPos = null;
    if (byPhase.FINAL.length){
      const ci = colOrder.length; // última columna extra
      const idFinal = matchId("FINAL", 0);
      const fPos = positions[idFinal] || { x: colX(colOrder.length-1), y: marginY };
      champPos = { x: colX(ci), y: fPos.y };
    }

    // helpers svg
    const box = (x,y,w,h,fill="#fff",stroke="#000") =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ry="8" fill="${fill}" stroke="${stroke}" />`;

    const multiText = (x,y,lines) => {
      const lineH = 16;
      const content = lines.map((ln, idx) => `<tspan x="${x}" dy="${idx===0?0:lineH}">${esc(ln)}</tspan>`).join("");
      return `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="14">${content}</text>`;
    };

    const centerY = (y) => y + nodeH/2;
    const edge = (x1,y1,x2,y2) => {
      const mx = (x1 + x2)/2;
      return `<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="#000" stroke-width="1"/>`;
    };

    // pintar
    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`);

    // Título
    const title = `${model.info?.nombre || ""} ${model.info?.sede ? "– " + model.info.sede : ""}`.trim();
    if (title) {
      parts.push(`<text x="${svgW/2}" y="18" text-anchor="middle" font-family="Helvetica" font-size="16">${esc(title)}</text>`);
    }

    // Columnas: cajas + textos
    colOrder.forEach((phase) => {
      const arr = byPhase[phase];
      arr.forEach((m, i) => {
        const id = matchId(phase, i);
        const {x,y} = positions[id];

        // color de estado 
        let fill = "#fff";
        const sr = m.scoreRaw || "";
        if (/^\d+\s*-\s*\d+$/.test(sr)) fill = "#eaffea";
        else if (/pendiente/i.test(sr)) fill = "#fffde7";

        // caja
        parts.push(box(x,y,nodeW,nodeH,fill,"#000"));

        // título fase en pequeño
        parts.push(`<text x="${x+8}" y="${y+14}" font-family="Helvetica" font-size="11" fill="#000">${esc(PHASE_LABEL[phase])}</text>`);

        // contenido (3 líneas)
        const raw = labelForMatch(m); // "A\nR\nB"
        const lines = raw.split("\\n");
        parts.push(multiText(x+10, y+30, lines));
      });
    });

    // aristas entre columnas
    for (let pi=0; pi<PHASES.length-1; pi++){
      const pA = PHASES[pi], pB = PHASES[pi+1];
      const A = byPhase[pA], B = byPhase[pB];
      if (!A.length || !B.length) continue;

      for (let i=0, j=0; i < A.length; i+=2, j++){
        const idL = matchId(pA, i);
        const idR = (i+1 < A.length) ? matchId(pA, i+1) : null;
        const to  = matchId(pB, j);
        const pL  = positions[idL];
        const pT  = positions[to];
        if (pL && pT){
          parts.push(edge(pL.x + nodeW, centerY(pL.y), pT.x, centerY(pT.y)));
        }
        if (idR){
          const pR = positions[idR];
          if (pR && pT){
            parts.push(edge(pR.x + nodeW, centerY(pR.y), pT.x, centerY(pT.y)));
          }
        }
      }
    }

    // campeón
    if (champPos){
      const finals = byPhase.FINAL;
      const champName = (finals[0].winner && finals[0].winner !== "-") ? finals[0].winner : "TBD";
      parts.push(box(champPos.x, champPos.y, nodeW, nodeH, "#fff", "#000"));
      parts.push(`<text x="${champPos.x+8}" y="${champPos.y+14}" font-family="Helvetica" font-size="11">Ganador</text>`);
      parts.push(multiText(champPos.x+10, champPos.y+36, [champName]));

      const fId = matchId("FINAL", 0);
      const fp = positions[fId];
      if (fp){
        parts.push(edge(fp.x + nodeW, centerY(fp.y), champPos.x, centerY(champPos.y)));
      }
    }

    parts.push(`</svg>`);
    return parts.join("");
  }

  return { buildBracketDOT, buildBracketSVG };
});
