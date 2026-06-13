import * as fs from 'fs';
import * as path from 'path';

// Mock browser environment globals so the bundle evaluates without ReferenceError on browser basics
const mockWindow: any = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  location: { origin: 'http://localhost:3000', href: 'http://localhost:3000/' },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    share: null,
    clipboard: {
      writeText: async () => {}
    }
  },
  document: {
    readyState: 'complete',
    addEventListener: () => {},
    removeEventListener: () => {},
    title: '',
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  }
};

Object.defineProperty(globalThis, 'window', { value: mockWindow, writable: true, configurable: true });
Object.defineProperty(globalThis, 'document', { value: mockWindow.document, writable: true, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: mockWindow.localStorage, writable: true, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: mockWindow.sessionStorage, writable: true, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: mockWindow.navigator, writable: true, configurable: true });
globalThis.Audio = class {
  volume = 1;
  play = async () => {};
} as any;

// Helper to find the asset file
const assetsDir = path.resolve(process.cwd(), 'dist/assets');
if (!fs.existsSync(assetsDir)) {
  console.error("No dist/assets directory found!");
  process.exit(1);
}

const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js') && f.startsWith('index-'));
if (jsFiles.length === 0) {
  console.error("No index-*.js bundle found!");
  process.exit(1);
}

const bundlePath = path.join(assetsDir, jsFiles[0]);
console.log(`Evaluating bundle: ${bundlePath}`);

const bundleContent = fs.readFileSync(bundlePath, 'utf-8');

const runPath = path.resolve(process.cwd(), 'test-bundle-run.ts');
fs.writeFileSync(runPath, bundleContent, 'utf-8');

async function test() {
  try {
    // Dynamic import to evaluate the bundle content as an ES Module
    await import('./test-bundle-run.ts');
    console.log("Success! The bundle evaluated without any temporal dead zone ReferenceErrors.");
  } catch (error: any) {
    console.log("\n=================== DETECTED CRASH ===================");
    console.log(`Name: ${error.name}`);
    console.log(`Message: ${error.message}`);
    console.log(`Stack Trace:\n${error.stack}`);
    
    // Let's search inside the bundle for the uninitialized variable
    const varMatch = error.message.match(/Cannot access '([^']+)' before initialization/);
    if (varMatch) {
      const varName = varMatch[1];
      console.log(`\nSearching for uninitialized variable: '${varName}'`);
      
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      let occurrenceCount = 0;
      let match;
      const indices: number[] = [];
      while ((match = regex.exec(bundleContent)) !== null && occurrenceCount < 50) {
        indices.push(match.index);
        occurrenceCount++;
      }
      
      console.log(`Found ${occurrenceCount} occurrences of '${varName}' in the bundle.`);
      indices.forEach((index, idx) => {
        const start = Math.max(0, index - 80);
        const end = Math.min(bundleContent.length, index + 80);
        const excerpt = bundleContent.slice(start, end).replace(/\n/g, ' ↵ ');
        console.log(`\nOccurrence #${idx + 1} (index ${index}):`);
        console.log(`  ...${excerpt}...`);
      });
    }
    console.log("======================================================");
  } finally {
    try { fs.unlinkSync(runPath); } catch {}
  }
}

test();
