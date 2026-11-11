import { mkdir, copyFile } from 'node:fs/promises';

for (const route of ['instrument', 'cover', 'ink', 'stamps', 'sound']) {
  await mkdir(`dist/${route}`, { recursive: true });
  await copyFile('dist/index.html', `dist/${route}/index.html`);
}
