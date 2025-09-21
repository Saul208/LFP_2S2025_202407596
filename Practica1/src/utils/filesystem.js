import fs from 'fs/promises';
import path from 'path';

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeFileSafe(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function readTextFile(filePath) {
  return fs.readFile(filePath, 'utf-8');
}
