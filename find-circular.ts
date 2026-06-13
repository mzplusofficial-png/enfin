import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const visited = new Set<string>();
const stack = new Array<string>();
const cycles: string[][] = [];

function resolveImport(sourceFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.') && !importPath.startsWith('..')) {
    return null; // Ignore external packages
  }

  const dir = path.dirname(sourceFile);
  const absolutePath = path.resolve(dir, importPath);

  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  for (const ext of extensions) {
    const p = absolutePath + ext;
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Check if directory index
  for (const ext of extensions) {
    const p = path.join(absolutePath, 'index' + ext);
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // If import path is raw but exists
  if (fs.existsSync(absolutePath)) {
    return absolutePath;
  }

  return null;
}

function getImports(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports: string[] = [];
    
    // Simple regex to match: import ... from '...' or import '...'
    const importRegex = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // Also support dynamic imports: import('...')
    const dynamicRegex = /import\(['"]([^'"]+)['"]\)/g;
    while ((match = dynamicRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  } catch (err) {
    return [];
  }
}

function dfs(filePath: string) {
  const stackIndex = stack.indexOf(filePath);
  if (stackIndex !== -1) {
    // Cycle found!
    const cycle = stack.slice(stackIndex);
    cycle.push(filePath);
    cycles.push(cycle.map(p => path.relative(rootDir, p)));
    return;
  }

  if (visited.has(filePath)) {
    return;
  }

  stack.push(filePath);
  visited.add(filePath);

  const imports = getImports(filePath);
  for (const imp of imports) {
    const resolved = resolveImport(filePath, imp);
    if (resolved) {
      dfs(resolved);
    }
  }

  stack.pop();
}

console.log('Finding circular dependencies starting from index.tsx...');
const entry = path.resolve(rootDir, 'index.tsx');
if (fs.existsSync(entry)) {
  dfs(entry);
} else {
  console.log('Error: entry point index.tsx not found in', rootDir);
}

if (cycles.length === 0) {
  console.log('No circular dependencies detected between imported local files!');
} else {
  console.log(`\nFound ${cycles.length} circular dependencies:\n`);
  cycles.forEach((cycle, idx) => {
    console.log(`Cycle #${idx + 1}:`);
    console.log('  ' + cycle.join(' -> '));
    console.log();
  });
}
