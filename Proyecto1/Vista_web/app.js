
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
    } catch (e) {
      console.error(e);
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

  // Analizar Torneo (léxico)
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
    els.dotOut.value = ""; 
  });

  // Stubs 
  els.btnReports.addEventListener("click", () => alert("Generar Reportes: se implementará luego."));
  els.btnBracket.addEventListener("click", () => alert("Mostrar Bracket (DOT): se implementará luego."));
  els.btnSaveDot.addEventListener("click", () => alert("Descargar bracket.dot: se implementará luego."));

  console.log("[UI] app.js listo. Usando TourneyLexer de src/lexer_core.js");
});
