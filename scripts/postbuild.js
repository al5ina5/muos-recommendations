#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '..', 'dist', 'index.js');

// Read the file
let content = fs.readFileSync(indexPath, 'utf8');

// Check if shebang is already present
if (!content.startsWith('#!/usr/bin/env node')) {
    // Add shebang if not present
    content = '#!/usr/bin/env node\n' + content;
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log('✓ Added shebang to dist/index.js');
} else {
    console.log('✓ Shebang already present in dist/index.js');
}



