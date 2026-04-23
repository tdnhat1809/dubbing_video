import { existsSync } from 'fs';
import path from 'path';

export function getPythonRuntime() {
  const rootDir = path.join(process.cwd(), '..');
  const candidates = [
    process.env.OMMIVOICE_PYTHON,
    path.join(rootDir, '.venv-py311', 'Scripts', 'python.exe'),
    path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
    path.join(rootDir, 'tools', 'python311', 'python.exe'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return 'python';
}
