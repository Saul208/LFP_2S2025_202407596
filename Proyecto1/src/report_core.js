// Reportes desde TOKENS (sin parser)
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TourneyReports = factory();
})(typeof self !== "undefined" ? self : this, function () {

  const PHASE_RANK = { "CUARTOS": 1, "SEMIFINAL": 2, "FINAL": 3 };

  const norm = (s) => String(s || "").trim();
  const unq  = (s) => /^"(.*)"$/.test(s) ? s.slice(1, -1) : s;
  const isScore = (s) => /^\d+\s*-\s*\d+$/.test(s);
  const scoreFrom = (cad) => {
    const s = unq(cad);
    if (!isScore(s)) return null;
    const [a,b] = s.split("-").map(x=>+x.trim());
    return { a, b, raw:s };
  };

  // util: avanzar hasta encontrar el siguiente token de tipo T
  function nextIndexOfType(tokens, start, type) {
    for (let k=start; k<tokens.length; k++) if (tokens[k].type===type) return k;
    return -1;
  }

  function analyzeTokens(tokens){
    const model = {
      torneo: { nombre:null, sede:null },
      teams: new Map(),
      players: new Map(),
      matches: [],
      ages: []
    };

    const ensureTeam = (name) => {
      name = norm(name); if(!name) return null;
      if(!model.teams.has(name)) model.teams.set(name, { played:0, won:0, lost:0, gf:0, ga:0, diff:0, phaseRank:0 });
      return model.teams.get(name);
    };
    const ensurePlayer = (name, team) => {
      name = norm(name); if(!name) return null;
      if(!model.players.has(name)) model.players.set(name, { team: team || "-", goals:0, minutes:[], age:null });
      const p = model.players.get(name);
      if(team && p.team === "-") p.team = team;
      return p;
    };

    let currentTeam = null;
    let currentPhase = null;

    // --- 1) info general, roster y edades ---
    for (let i=0;i<tokens.length;i++){
      const t = tokens[i];
      const up = norm(t.lexeme).toUpperCase();

      if (t.type==="Atributo" && up==="NOMBRE") {
        const j = nextIndexOfType(tokens, i+1, "Cadena");
        if (j!==-1) model.torneo.nombre = unq(tokens[j].lexeme);
      }

      if (t.type==="Atributo" && (up==="SEDE"||up==="PAIS")) {
        const j = nextIndexOfType(tokens, i+1, "Cadena");
        if (j!==-1) model.torneo.sede = unq(tokens[j].lexeme);
      }

      // equipo: "Nombre" [...]
      if ((t.type==="Palabra Reservada"||t.type==="Atributo"||t.type==="Identificador") && up==="EQUIPO"){
        const j = nextIndexOfType(tokens, i+1, "Cadena");
        if (j!==-1){ currentTeam = unq(tokens[j].lexeme); ensureTeam(currentTeam); }
      }

      // jugador: "Nombre" [...]
      if ((t.type==="Palabra Reservada"||t.type==="Atributo"||t.type==="Identificador") && up==="JUGADOR"){
        const j = nextIndexOfType(tokens, i+1, "Cadena");
        if (j!==-1) ensurePlayer(unq(tokens[j].lexeme), currentTeam);
      }

      // edad: N (la asigno al último jugador visto hacia atrás)
      if (t.type==="Atributo" && up==="EDAD"){
        const nIdx = nextIndexOfType(tokens, i+1, "Número");
        if (nIdx!==-1){
          for (let j=i; j>=0; j--){
            const tj = tokens[j];
            if ((tj.type==="Palabra Reservada"||tj.type==="Atributo"||tj.type==="Identificador") &&
                 norm(tj.lexeme).toUpperCase()==="JUGADOR"){
              const nmIdx = nextIndexOfType(tokens, j+1, "Cadena");
              if (nmIdx!==-1){
                const nm = unq(tokens[nmIdx].lexeme);
                const p = ensurePlayer(nm, currentTeam);
                if (p){ p.age = +tokens[nIdx].lexeme; model.ages.push(+tokens[nIdx].lexeme); }
              }
              break;
            }
          }
        }
      }
    }

    // --- 2) fases y partidos ---
    const setPhase = (team, phase) => {
      const t = ensureTeam(team); if(!t) return;
      const r = PHASE_RANK[phase] ?? 0; if (r > t.phaseRank) t.phaseRank = r;
    };
    const applyScore = (aName,bName,sc) => {
      const A = ensureTeam(aName), B = ensureTeam(bName);
      if(!A || !B) return;
      A.played++; B.played++;
      A.gf += sc.a; A.ga += sc.b; A.diff = A.gf - A.ga;
      B.gf += sc.b; B.ga += sc.a; B.diff = B.gf - B.ga;
      if(sc.a > sc.b){ A.won++; B.lost++; } else if(sc.b > sc.a){ B.won++; A.lost++; }
    };

    for (let i=0;i<tokens.length;i++){
      const t = tokens[i];
      const up = norm(t.lexeme).toUpperCase();

      // fases escritas como claves con ":" (identificador/atributo)
      if ((t.type==="Palabra Reservada"||t.type==="Identificador"||t.type==="Atributo") &&
           (up==="CUARTOS"||up==="SEMIFINAL"||up==="FINAL")){
        currentPhase = up;
      }

      // partido: "A" vs "B" [ ... ]
      if ((t.type==="Palabra Reservada"||t.type==="Atributo"||t.type==="Identificador") && up==="PARTIDO"){
        // buscar los DOS strings de equipos antes del bloque [ o {
        let a = null, b = null;
        let k = i+1, firstOpen = -1;
        while (k < tokens.length){
          const tk = tokens[k];
          if (tk.lexeme==="[" || tk.lexeme==="{"){ firstOpen = k; break; }
          if (tk.type==="Cadena"){
            if (!a) a = unq(tk.lexeme);
            else { b = unq(tk.lexeme); }
          }
          k++;
        }
        if (!a || !b) continue;

        // localizar bloque de detalles y recorrerlo
        let score = null, scoreRaw = "Pendiente";
        const goals = [];

        if (firstOpen !== -1){
          const open = tokens[firstOpen].lexeme;
          const close = open==="["?"]":"}";
          let depth=1; k = firstOpen+1;
          while (k<tokens.length && depth>0){
            const x = tokens[k];
            if (x.lexeme===open) depth++;
            else if (x.lexeme===close) depth--;

            const up2 = norm(x.lexeme).toUpperCase();

            // resultado: "x-y"
            if (x.type==="Atributo" && up2==="RESULTADO"){
              const nx = nextIndexOfType(tokens, k+1, "Cadena");
              if (nx!==-1){
                const s = scoreFrom(tokens[nx].lexeme);
                score = s; scoreRaw = s ? s.raw : unq(tokens[nx].lexeme);
              }
            }

            // goleador: "Nombre" [minuto: N]
            if ((x.type==="Palabra Reservada"||x.type==="Atributo"||x.type==="Identificador") && up2==="GOLEADOR"){
              const nmIdx = nextIndexOfType(tokens, k+1, "Cadena");
              if (nmIdx!==-1){
                const pname = unq(tokens[nmIdx].lexeme);
                goals.push({ name:pname, minute:null });

                // sub-bloque [ ... ] del goleador (opcional)
                if (tokens[nmIdx+1]?.lexeme === "["){
                  let kk = nmIdx+2, d2 = 1;
                  while (kk<tokens.length && d2>0){
                    const y = tokens[kk];
                    if (y.lexeme==="[") d2++;
                    else if (y.lexeme==="]") d2--;
                    if (y.type==="Atributo" && norm(y.lexeme).toUpperCase()==="MINUTO"){
                      const n2 = tokens[kk+1];
                      if (n2 && (n2.type==="Número" || n2.type==="Cadena")){
                        const m = n2.type==="Número" ? +n2.lexeme : +unq(n2.lexeme);
                        goals[goals.length-1].minute = m;
                      }
                    }
                    kk++;
                  }
                }
              }
            }

            k++;
          }
        }

        // actualizar modelo
        const phase = currentPhase || "CUARTOS";
        setPhase(a, phase); setPhase(b, phase);
        if (score) applyScore(a,b,score);
        for (const g of goals){
          const p = ensurePlayer(g.name); if (p){ p.goals++; if (g.minute!=null) p.minutes.push(`${g.minute}'`); }
        }
        const winner = score ? (score.a>score.b ? a : score.b>score.a ? b : "-") : "-";
        model.matches.push({ phase, teamA:a, teamB:b, scoreRaw, winner });
      }
    }

    // fase alcanzada a texto
    for (const t of model.teams.values()){
      t.phase = t.phaseRank===3 ? "Final" : t.phaseRank===2 ? "Semifinal" :
               t.phaseRank===1 ? "Cuartos" : "-";
    }

    // información general
    const programados = model.matches.length;
    const completados = model.matches.filter(m => isScore(m.scoreRaw)).length;
    const totalGoles  = Array.from(model.teams.values()).reduce((s,t)=>s+t.gf,0);
    const promGoles   = completados? +(totalGoles/completados).toFixed(2) : 0;
    const edadProm    = model.ages.length ? +(model.ages.reduce((a,b)=>a+b,0)/model.ages.length).toFixed(2) : "-";
    const faseRank    = model.matches.reduce((mx,m)=>Math.max(mx, PHASE_RANK[m.phase]??0), 0);
    const faseActual  = faseRank===3?"Final":faseRank===2?"Semifinal":faseRank===1?"Cuartos":"-";

    model.info = {
      nombre: model.torneo.nombre || "-",
      sede: model.torneo.sede || "-",
      equiposParticipantes: model.teams.size,
      totalProgramados: programados,
      completados,
      totalGoles,
      promedioGoles: promGoles,
      edadPromedio: edadProm==="-"?"-":`${edadProm} años`,
      faseActual
    };

    return model;
  }

  // filas para plantillas
  function bracketRows(model){
    return model.matches.map(m => ({
      fase: m.phase==="CUARTOS"?"Cuartos de Final":
            m.phase==="SEMIFINAL"?"Semifinal":
            m.phase==="FINAL"?"Final":m.phase,
      partido: `${m.teamA} vs ${m.teamB}`,
      resultado: m.scoreRaw,
      ganador: m.winner || "-"
    }));
  }
  function statsRows(model){
    const arr = Array.from(model.teams.entries()).map(([name,t])=>({
      equipo:name,
      jugados:t.played, ganados:t.won, perdidos:t.lost,
      gf:t.gf, gc:t.ga, diff:(t.gf-t.ga)>=0?`+${t.gf-t.ga}`:`${t.gf-t.ga}`,
      fase:t.phase
    }));
    arr.sort((a,b)=> (b.ganados-a.ganados) || (parseInt(b.diff)-parseInt(a.diff)) || (b.gf-a.gf) || a.equipo.localeCompare(b.equipo));
    return arr;
  }
  function scorersRows(model){
    const list = Array.from(model.players.entries()).map(([name,p])=>({
      jugador:name, equipo:p.team||"-", goles:p.goals||0, minutos:p.minutes?.join(", ")||""
    })).filter(x=>x.goles>0);
    list.sort((a,b)=> b.goles-a.goles || a.jugador.localeCompare(b.jugador));
    let pos=0, prev=null, count=0;
    for (const r of list){ count++; if(prev===null || r.goles<prev){ pos=count; prev=r.goles; } r.pos=pos; }
    return list;
  }
  function infoRows(model){
    return [
      {k:"Nombre del Torneo", v:model.info.nombre},
      {k:"Sede", v:model.info.sede},
      {k:"Equipos Participantes", v:model.info.equiposParticipantes},
      {k:"Total de Partidos Programados", v:model.info.totalProgramados},
      {k:"Partidos Completados", v:model.info.completados},
      {k:"Total de Goles", v:model.info.totalGoles},
      {k:"Promedio de Goles por Partido", v:model.info.promedioGoles},
      {k:"Edad Promedio de Jugadores", v:model.info.edadPromedio},
      {k:"Fase Actual", v:model.info.faseActual}
    ];
  }

  return { analyzeTokens, bracketRows, statsRows, scorersRows, infoRows };
});
