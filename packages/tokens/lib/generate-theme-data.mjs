// Étape du build : régénère theme/data.generated.js (exécutée avant build-all.mjs).
import { writeThemeData } from './theme-data.mjs';

await writeThemeData();
console.log('theme/data.generated.js régénéré.');
