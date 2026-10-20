// tsc only emits JavaScript; the runtime's stylesheets ride along to dist/.
import {cpSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

for (const file of readdirSync('src/runtime')) {
  if (file.endsWith('.css')) cpSync(join('src/runtime', file), join('dist/runtime', file));
}
