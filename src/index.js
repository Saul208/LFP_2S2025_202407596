import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

import { loadCsv } from './io/csvLoader.js';
import { exportHistorial, exportOperadores, exportClientes, exportRendimiento } from './io/htmlExporter.js';
import { ensureDir } from './utils/filesystem.js';
import { store } from './store/dataStore.js';
import { percentByClassification, histogramByStars } from './services/statistics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

async function main() {
  await ensureDir(REPORTS_DIR);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('Simulador de CallCenter — Consola (JavaScript)');
  console.log('---------------------------------------------');

  let running = true;
  while (running) {
    console.log('\nMenú Principal:');
    console.log('1) Cargar Registros de Llamadas');
    console.log('2) Exportar Historial de Llamadas (HTML)');
    console.log('3) Exportar Listado de Operadores (HTML)');
    console.log('4) Exportar Listado de Clientes (HTML)');
    console.log('5) Exportar Rendimiento de Operadores (HTML)');
    console.log('6) Mostrar Porcentaje de Clasificación de Llamadas');
    console.log('7) Mostrar Cantidad de Llamadas por Calificación');
    console.log('8) Salir');

    const option = await question(rl, 'Elige una opción [1-8]: ');
    try {
      switch (option.trim()) {
        case '1': {
          const p = await question(rl, 'Ruta del archivo CSV (ej. ./data/sample_input.csv): ');
          const abs = path.resolve(p || './data/sample_input.csv');
          console.log(`Cargando: ${abs}`);
          await loadCsv(abs);
          console.log(`OK: ${store.getTotalCalls()} llamadas en memoria.`);
          break;
        }
        case '2': {
          const out = path.join(REPORTS_DIR, 'historial_de_llamadas.html');
          await exportHistorial(out);
          console.log('Exportado:', out);
          break;
        }
        case '3': {
          const out = path.join(REPORTS_DIR, 'listado_operadores.html');
          await exportOperadores(out);
          console.log('Exportado:', out);
          break;
        }
        case '4': {
          const out = path.join(REPORTS_DIR, 'listado_clientes.html');
          await exportClientes(out);
          console.log('Exportado:', out);
          break;
        }
        case '5': {
          const out = path.join(REPORTS_DIR, 'rendimiento_operadores.html');
          await exportRendimiento(out);
          console.log('Exportado:', out);
          break;
        }
        case '6': {
          const pcts = percentByClassification();
          console.log('Porcentaje de llamadas por clasificación:');
          console.log(`  Buena (4–5): ${pcts.Buena.toFixed(2)}%`);
          console.log(`  Media  (2–3): ${pcts.Media.toFixed(2)}%`);
          console.log(`  Mala   (0–1): ${pcts.Mala.toFixed(2)}%`);
          break;
        }
        case '7': {
          const hist = histogramByStars();
          console.log('Cantidad de llamadas por calificación:');
          for (let s = 1; s <= 5; s++) {
            console.log(`  ${s} estrella(s): ${hist[s]}`);
          }
          break;
        }
        case '8': {
          running = false;
          break;
        }
        default:
          console.log('Opción inválida.');
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  }

  rl.close();
  console.log('¡Hasta luego!');
}

function question(rl, prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

main().catch(e => {
  console.error('Fallo inesperado:', e);
  process.exit(1);
});
