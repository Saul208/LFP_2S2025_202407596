/**
 * Simple CSV parser supporting separators: comma, semicolon, or tab.
 * Supports quoted fields with double quotes.
 * No external libraries — per practice constraints.
 */
export function detectDelimiter(headerLine) {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const c = (headerLine.match(new RegExp(escapeRegExp(d), 'g')) || []).length;
    if (c > bestCount) { best = d; bestCount = c; }
  }
  return best;
}

export function parseCSV(text) {
  // Trim BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map(h => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i], delimiter);
    // Pad/trim to headers length
    if (parts.length < headers.length) {
      while (parts.length < headers.length) parts.push('');
    } else if (parts.length > headers.length) {
      parts.length = headers.length;
    }
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = parts[j]?.trim() ?? '';
    }
    rows.push(obj);
  }
  return { headers, rows };
}

// Split respecting quotes
function splitCSVLine(line, delimiter) {
  const parts = [];
  let buf = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // handle escaped quotes "" -> "
      if (inQuotes && line[i + 1] === '"') {
        buf += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      parts.push(buf); buf = '';
    } else {
      buf += ch;
    }
  }
  parts.push(buf);
  return parts;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
