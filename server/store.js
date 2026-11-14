import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.DATA_DIR || path.join(root, 'data');
export const DATA_FILE = path.join(DATA_DIR, 'data.json');

const empty = () => ({ participants: [] });

export function read() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(data.participants) ? data : empty();
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Nepavyko perskaityti duomenų:', err);
    return empty();
  }
}

// Rašoma į laikiną failą ir pervadinama, kad nutrūkęs rašymas nesugadintų duomenų.
export function write(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
