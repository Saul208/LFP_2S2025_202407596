document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel) => document.querySelector(sel);

  const els = {
    fileInput: $("#fileInput"),
    loadedName: $("#loadedName"),
    inputText: $("#inputText"),
    tkCount: $("#tkCount"),
    erCount: $("#erCount"),
    tokensTBody: $("#tokensTable tbody"),
    errorsTBody: $("#errorsTable tbody"),
    dotOut: $("#dotOut"),
    dotView: $("#dotView"),
    btnAnalyze: $("#btnAnalyze"),
    btnReports: $("#btnReports"),
    btnBracket: $("#btnBracket"),
    btnSaveDot: $("#btnSaveDot"),
  };

  const escapeHtml = (s) =>
    String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

  function resetOutputs() {
    els.tkCount.textContent = "0 tokens";
    els.erCount.textContent = "0 errores";
    els.tokensTBody.innerHTML = "";
    els.errorsTBody.innerHTML = "";
    els.dotOut.value = "";
    els.dotView.innerHTML = "";
  }

  function loadTextToUI(name, text) {
    els.loadedName.textContent = `Cargado: ${name}`;
    els.inputText.value = text;
    resetOutputs();
  }

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      alert("Solo se permiten archivos .txt");
      return;
    }
    try {
      const text = await file.text();
      loadTextToUI(file.name, text);
    } catch {
      alert("No se pudo leer el archivo .txt");
    }
  }

  // Abrir archivo
  els.fileInput.addEventListener("change", (ev) => {
    const file = ev.target.files?.[0];
    handleFile(file);
    ev.target.value = "";
  });

  // Drag & Drop
  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
  ["dragenter","dragover","dragleave","drop"].forEach(evt =>
    els.inputText.addEventListener(evt, prevent)
  );
  els.inputText.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  });

  // Analizar (léxico)
  els.btnAnalyze.addEventListener("click", () => {
    const code = (els.inputText.value ?? "").toString();
    if (!code.trim()) {
      alert("Cargue o pegue un archivo .txt antes de analizar.");
      return;
    }
    const { tokens, errors } = window.TourneyLexer.lex(code);

    els.tokensTBody.innerHTML = tokens.map((t,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${escapeHtml(t.type)}</td>
        <td>${escapeHtml(t.lexeme)}</td>
        <td>${t.row}</td>
        <td>${t.col}</td>
      </tr>`).join("");

    els.errorsTBody.innerHTML = errors.map((e,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${escapeHtml(e.lexeme)}</td>
        <td>Token inválido</td>
        <td>${escapeHtml(e.desc || "")}</td>
        <td>${e.row}</td>
        <td>${e.col}</td>
      </tr>`).join("");

    els.tkCount.textContent = `${tokens.length} tokens`;
    els.erCount.textContent = `${errors.length} errores`;
  });

  // Reportes (4 HTML)
  function download(filename, content, type = "text/html;charset=utf-8") {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  els.btnReports.addEventListener("click", () => {
    const code = (els.inputText.value ?? "").toString();
    if (!code.trim()) {
      alert("Cargue o pegue un archivo .txt antes de generar reportes.");
      return;
    }

    const { tokens } = window.TourneyLexer.lex(code);
    const model = window.TourneyReports.analyzeTokens(tokens);

    const bracket = window.TourneyTemplates.tableBracket(
      window.TourneyReports.bracketRows(model)
    );
    const stats = window.TourneyTemplates.tableStats(
      window.TourneyReports.statsRows(model)
    );
    const scorers = window.TourneyTemplates.tableScorers(
      window.TourneyReports.scorersRows(model)
    );
    const info = window.TourneyTemplates.tableInfo(
      window.TourneyReports.infoRows(model)
    );

    download("reporte_bracket.html", bracket);
    download("reporte_estadisticas.html", stats);
    download("reporte_goleadores.html", scorers);
    download("reporte_informacion.html", info);
  });

  // Bracket: generar DOT + mostrar SVG propio
  els.btnBracket.addEventListener("click", () => {
    const code = (els.inputText.value ?? "").toString();
    if (!code.trim()) {
      alert("Cargue o pegue un archivo .txt antes de mostrar el bracket.");
      return;
    }
    const { tokens } = window.TourneyLexer.lex(code);
    const model = window.TourneyReports.analyzeTokens(tokens);

    // 1) DOT (para descargar)
    const dot = window.TourneyGraph.buildBracketDOT(model);
    els.dotOut.value = dot;

    // 2) SVG (siempre visible en la interfaz, sin dependencias)
    const svg = window.TourneyGraph.buildBracketSVG(model);
    els.dotView.innerHTML = svg;
  });

  // Guardar .dot
  els.btnSaveDot.addEventListener("click", () => {
    const dot = (els.dotOut.value ?? "").toString();
    if (!dot.trim()){
      alert("Primero genere el bracket (DOT).");
      return;
    }
    const blob = new Blob([dot], { type: "text/vnd.graphviz;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bracket.dot";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  });

  console.log("[UI] listo: Análisis, Reportes y Bracket (SVG sin dependencias + DOT descargable).");
});
