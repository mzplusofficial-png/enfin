import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const visited = new Set<string>();
const stack: string[] = [];
const cycles: string[][] = [];

function resolveImport(sourceFile: string, importPath: string): string | null {
  const dir = path.dirname(sourceFile);
  const absolutePath = path.resolve(dir, importPath);

  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  for (const ext of extensions) {
    const p = absolutePath + ext;
    if (fs.existsSync(p)) return p;
  }

  for (const ext of extensions) {
    const p = path.join(absolutePath, 'index' + ext);
    if (fs.existsSync(p)) return p;
  }

  if (fs.existsSync(absolutePath)) return absolutePath;
  return null;
}

function getImports(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports: string[] = [];
    
    // Find all single or double quoted strings starting with ./ or ../
    const relativePathRegex = /['"](\.\.?\/[^'"]+)['"]/g;
    let match;
    while ((match = relativePathRegex.exec(content)) !== null) {
      const imp = match[1];
      // strip any query params like ?t= or ?import
      const cleanImp = imp.split('?')[0];
      imports.push(cleanImp);
    }
    return imports;
  } catch (err) {
    return [];
  }
}

function dfs(filePath: string) {
  const stackIndex = stack.indexOf(filePath);
  if (stackIndex !== -1) {
    const cycle = stack.slice(stackIndex);
    cycle.push(filePath);
    cycles.push(cycle.map(p => path.relative(rootDir, p)));
    return;
  }

  if (visited.has(filePath)) return;
  visited.add(filePath);
  stack.push(filePath);

  const imports = getImports(filePath);
  for (const imp of imports) {
    const resolved = resolveImport(filePath, imp);
    if (resolved) {
      dfs(resolved);
    }
  }

  stack.pop();
}

console.log('Running robust circular detector from index.tsx...');
const entry = path.resolve(rootDir, 'index.tsx');
if (fs.existsSync(entry)) {
  dfs(entry);
}

if (cycles.length === 0) {
  console.log('No circular dependencies found!');
} else {
  console.log(`\nFound ${cycles.length} circular dependencies:\n`);
  cycles.forEach((cycle, idx) => {
    console.log(`Cycle #${idx + 1}:`);
    console.log('  ' + cycle.join(' -> '));
    console.log();
  });
}
