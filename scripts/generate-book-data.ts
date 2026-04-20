/**
 * Generates books.generated.ts from Goodreadsbooks2.csv
 * Run with: npx tsx scripts/generate-book-data.ts
 *
 * Cleanup pipeline:
 *  1. Fix encoding (latin-1 mojibake → proper UTF-8)
 *  2. Strip wrapping quotes from titles
 *  3. Remove non-English titles
 *  4. Remove omnibus/collection editions when individual titles exist
 *  5. Remove exact duplicates (normalized title + author)
 *  6. Remove near-duplicates (>80% similar title, same author)
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawBook {
  name: string;
  author: string;
  rating: number;
  imageUrl: string;
}

// ── Parse CSV (latin-1 encoded, simple 4-column format) ──
function parseCSV(filePath: string): RawBook[] {
  const raw = fs.readFileSync(filePath, { encoding: 'latin1' });
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  const books: RawBook[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lastComma = line.lastIndexOf(',');
    if (lastComma < 0) continue;
    const imageUrl = line.substring(lastComma + 1).trim();
    const rest1 = line.substring(0, lastComma);

    const secondLastComma = rest1.lastIndexOf(',');
    if (secondLastComma < 0) continue;
    const ratingStr = rest1.substring(secondLastComma + 1).trim();
    const rest2 = rest1.substring(0, secondLastComma);

    const thirdLastComma = rest2.lastIndexOf(',');
    if (thirdLastComma < 0) continue;
    const author = rest2.substring(thirdLastComma + 1).trim();
    const name = rest2.substring(0, thirdLastComma).trim();

    const rating = parseFloat(ratingStr) || 0;
    if (!name || !author) continue;

    let img = imageUrl;
    if (img) {
      img = img.replace(/_SX50_/g, '_SX318_')
               .replace(/_SY75_/g, '_SY475_')
               .replace(/_SX98_/g, '_SX318_');
    }

    books.push({ name, author, rating, imageUrl: img });
  }
  return books;
}

// ── Fix mojibake encoding (latin-1 misread of UTF-8 bytes) ──
function fixEncoding(s: string): string {
  try {
    const buf = Buffer.from(s, 'latin1');
    return buf.toString('utf8');
  } catch {
    return s;
  }
}

// ── Normalize title for comparison ──
function normalize(title: string): string {
  let t = title.toLowerCase().trim();
  t = t.replace(/\s*\(.*?\)\s*/g, ' ');      // Remove parenthesized content
  t = t.replace(/[^\w\s]/g, '');              // Remove punctuation
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// ── Simple string similarity (Dice coefficient — fast) ──
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bi = a.substring(i, i + 2);
    bigrams.set(bi, (bigrams.get(bi) || 0) + 1);
  }
  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bi = b.substring(i, i + 2);
    const count = bigrams.get(bi) || 0;
    if (count > 0) {
      bigrams.set(bi, count - 1);
      matches++;
    }
  }
  return (2 * matches) / (a.length - 1 + b.length - 1);
}

// ── Deterministic hash for author → color index ──
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ── Stellar color palette ──
const COLORS = [
  '#ffcc6f', '#9bb0ff', '#ff9833', '#aabfff', '#ffd2a1',
  '#fff4ea', '#ffaa88', '#c4d4ff', '#ffe0b0', '#88ccff',
  '#ffbb99', '#ddeeff', '#ff8866', '#aaddcc', '#eebb77',
  '#bbaaff', '#ffdd99', '#99ddbb', '#ffccaa', '#ffffff',
];

// ── Non-English detection patterns ──
const NON_ENGLISH_RE = new RegExp([
  '\\bde la\\b', '\\bdel\\b', '\\blos\\b', '\\blas\\b', '\\buna\\b',
  '\\bel fin\\b', '\\bmuerte\\b', '\\btres\\b', '\\bcuerpos\\b',
  '\\bcrónicas\\b', '\\btrilogía\\b', '\\bedición\\b',
  '\\bdie\\b', '\\bder\\b', '\\bdas\\b', '\\bund\\b', '\\bvon\\b', '\\bein\\b',
  '\\ble monde\\b', '\\bla vie\\b', '\\bune\\b',
  '\\bdella\\b', '\\bnella\\b', '\\bsulla\\b',
].join('|'), 'i');

// ── Omnibus/collection detection ──
const OMNIBUS_RE = new RegExp([
  '#\\d+\\s*[-–—]\\s*\\d+',
  'books?\\s+\\d+\\s*[-–—]\\s*\\d+',
  '\\bcomplete\\b.*\\b(collection|series|trilogy|saga)\\b',
  '\\bbox\\s*set\\b',
  '\\bomnibus\\b',
  '\\bthe\\s+(complete|entire|whole)\\b.*\\b(series|trilogy|saga)\\b',
].join('|'), 'i');

// ══════════════════════════════════════
// MAIN
// ══════════════════════════════════════
function generate() {
  const csvPath = path.resolve(__dirname, '..', 'Goodreadsbooks2.csv');
  let books = parseCSV(csvPath);
  console.log(`Parsed ${books.length} books from CSV`);

  // ── Step 1: Fix encoding ──
  for (const b of books) {
    b.name = fixEncoding(b.name);
    b.author = fixEncoding(b.author);
  }

  // ── Step 2: Strip wrapping quotes ──
  for (const b of books) {
    let n = b.name.trim();
    if (n.startsWith('"') && n.endsWith('"')) n = n.slice(1, -1).trim();
    if (n.startsWith("'") && n.endsWith("'") && n.length > 2) n = n.slice(1, -1).trim();
    b.name = n;
  }

  // ── Step 3: Remove non-English titles ──
  const beforeLang = books.length;
  books = books.filter(b => !NON_ENGLISH_RE.test(b.name));
  console.log(`Removed ${beforeLang - books.length} non-English titles → ${books.length}`);

  // ── Step 4: Remove omnibus editions when individual titles exist ──
  const byAuthor = new Map<string, RawBook[]>();
  for (const b of books) {
    const key = b.author.toLowerCase();
    if (!byAuthor.has(key)) byAuthor.set(key, []);
    byAuthor.get(key)!.push(b);
  }

  const afterOmnibus: RawBook[] = [];
  let omnibusRemoved = 0;
  for (const [, authorBooks] of byAuthor) {
    const omnibuses = authorBooks.filter(b => OMNIBUS_RE.test(b.name));
    const individuals = authorBooks.filter(b => !OMNIBUS_RE.test(b.name));
    if (omnibuses.length > 0 && individuals.length > 0) {
      afterOmnibus.push(...individuals);
      omnibusRemoved += omnibuses.length;
    } else {
      afterOmnibus.push(...authorBooks);
    }
  }
  books = afterOmnibus;
  console.log(`Removed ${omnibusRemoved} omnibus editions → ${books.length}`);

  // ── Step 5: Remove exact duplicates ──
  const seen = new Map<string, RawBook>();
  const afterExact: RawBook[] = [];
  for (const b of books) {
    const key = normalize(b.name) + '|||' + b.author.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, b);
      afterExact.push(b);
    }
  }
  console.log(`Removed ${books.length - afterExact.length} exact duplicates → ${afterExact.length}`);
  books = afterExact;

  // ── Step 6: Remove near-duplicates (>80% similar title, same author) ──
  const byAuthor2 = new Map<string, RawBook[]>();
  for (const b of books) {
    const key = b.author.toLowerCase();
    if (!byAuthor2.has(key)) byAuthor2.set(key, []);
    byAuthor2.get(key)!.push(b);
  }

  const final: RawBook[] = [];
  let nearDupes = 0;
  for (const [, authorBooks] of byAuthor2) {
    const kept: RawBook[] = [];
    for (const b of authorBooks) {
      let isDupe = false;
      const normB = normalize(b.name);
      for (const k of kept) {
        if (similarity(normB, normalize(k.name)) > 0.80) {
          isDupe = true;
          nearDupes++;
          break;
        }
      }
      if (!isDupe) kept.push(b);
    }
    final.push(...kept);
  }
  console.log(`Removed ${nearDupes} near-duplicates → ${final.length}`);
  books = final;

  console.log(`\nFinal: ${books.length} clean books`);

  // ══════════════════════════════════════
  // LAYOUT & OUTPUT (same as before)
  // ══════════════════════════════════════

  // Group by author for connections + layout
  const authorBooksMap = new Map<string, number[]>();
  books.forEach((b, i) => {
    const key = b.author;
    if (!authorBooksMap.has(key)) authorBooksMap.set(key, []);
    authorBooksMap.get(key)!.push(i);
  });
  console.log(`${authorBooksMap.size} unique authors`);

  // Fibonacci spiral galaxy layout
  const authorList = Array.from(authorBooksMap.keys());
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const authorCenters = new Map<string, [number, number, number]>();

  let seed = 42;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < authorList.length; i++) {
    const author = authorList[i];
    const t = i / authorList.length;
    const armRadius = 3 + t * 18;
    const theta = goldenAngle * i * 2.5;
    const cx = Math.cos(theta) * armRadius + (rand() - 0.5) * 4.5;
    const cy = Math.sin(theta) * armRadius + (rand() - 0.5) * 4.5;
    const cz = (rand() - 0.5) * 10;
    authorCenters.set(author, [cx, cy, cz]);
  }

  interface BookEntry {
    id: string;
    title: string;
    author: string;
    rating: number;
    imageUrl: string;
    position: [number, number, number];
    color: string;
    size: number;
    connections: string[];
  }

  const entries: BookEntry[] = [];

  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const center = authorCenters.get(b.author)!;
    const jx = (rand() - 0.5) * 5.5;
    const jy = (rand() - 0.5) * 5.5;
    const jz = (rand() - 0.5) * 4;

    const position: [number, number, number] = [
      Math.round((center[0] + jx) * 100) / 100,
      Math.round((center[1] + jy) * 100) / 100,
      Math.round((center[2] + jz) * 100) / 100,
    ];

    const colorIdx = hashString(b.author) % COLORS.length;
    const size = Math.round((0.5 + (b.rating / 5) * 0.7) * 100) / 100;

    entries.push({
      id: String(i),
      title: b.name,
      author: b.author,
      rating: b.rating,
      imageUrl: b.imageUrl,
      position,
      color: COLORS[colorIdx],
      size,
      connections: [],
    });
  }

  // Build same-author connections (capped at 10 per book)
  for (const [, indices] of authorBooksMap) {
    if (indices.length < 2) continue;
    for (const idx of indices) {
      const others = indices.filter(j => j !== idx);
      const capped = others.slice(0, 10);
      entries[idx].connections = capped.map(j => String(j));
    }
  }

  const edgeSet = new Set<string>();
  for (const e of entries) {
    for (const c of e.connections) {
      const key = e.id < c ? `${e.id}-${c}` : `${c}-${e.id}`;
      edgeSet.add(key);
    }
  }
  console.log(`${edgeSet.size} unique connection edges`);

  // Write output
  const outPath = path.resolve(__dirname, '..', 'src', 'data', 'books.generated.ts');

  let out = `// AUTO-GENERATED — do not edit manually\n`;
  out += `// Generated from Goodreadsbooks2.csv by scripts/generate-book-data.ts\n`;
  out += `// Cleanup: fixed encoding, removed non-English, omnibus, exact & near duplicates\n\n`;
  out += `export interface Book {\n`;
  out += `  id: string;\n`;
  out += `  title: string;\n`;
  out += `  author: string;\n`;
  out += `  genre: string;\n`;
  out += `  year: number;\n`;
  out += `  pages: number;\n`;
  out += `  description: string;\n`;
  out += `  position: [number, number, number];\n`;
  out += `  color: string;\n`;
  out += `  size: number;\n`;
  out += `  connections: string[];\n`;
  out += `  rating?: number;\n`;
  out += `  imageUrl?: string;\n`;
  out += `}\n\n`;

  out += `export const books: Book[] = [\n`;
  for (const e of entries) {
    const title = e.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const author = e.author.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const conns = e.connections.map(c => `'${c}'`).join(', ');
    out += `  {\n`;
    out += `    id: '${e.id}',\n`;
    out += `    title: "${title}",\n`;
    out += `    author: '${author}',\n`;
    out += `    genre: 'Sci-Fi',\n`;
    out += `    year: 2020,\n`;
    out += `    pages: 300,\n`;
    out += `    description: '',\n`;
    out += `    position: [${e.position[0]}, ${e.position[1]}, ${e.position[2]}],\n`;
    out += `    color: '${e.color}',\n`;
    out += `    size: ${e.size},\n`;
    out += `    connections: [${conns}],\n`;
    out += `    rating: ${e.rating},\n`;
    out += `    imageUrl: '${e.imageUrl}',\n`;
    out += `  },\n`;
  }
  out += `];\n\n`;

  out += `export const bookMap = new Map<string, Book>(books.map(b => [b.id, b]));\n`;

  fs.writeFileSync(outPath, out, 'utf8');
  console.log(`Wrote ${entries.length} books to ${outPath}`);
}

generate();
