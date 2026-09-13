import { readFileSync, writeFileSync } from 'node:fs';
for (const [source, target, key] of [
  ['yukina-original.png', 'yukina-sprite.js', 'YUKINA_SPRITE_DATA'],
  ['yukina-run.png', 'yukina-run.js', 'YUKINA_RUN_DATA'],
]) {
  const png = readFileSync(new URL('../source-art/' + source, import.meta.url));
  writeFileSync(new URL('../docs/assets/' + target, import.meta.url), 'globalThis.' + key + ' = "data:image/png;base64,' + png.toString('base64') + '";\n');
}
console.log('Updated both Yukina sprite textures.');
