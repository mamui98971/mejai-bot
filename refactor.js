const fs = require('fs');
const path = require('path');

// 1. Move directories
if (fs.existsSync('src')) fs.renameSync('src', 'server');
if (fs.existsSync('liff/src')) fs.renameSync('liff/src', 'src');
if (fs.existsSync('liff/index.html')) fs.renameSync('liff/index.html', 'index.html');
if (fs.existsSync('liff/vite.config.ts')) fs.renameSync('liff/vite.config.ts', 'vite.config.ts');
if (fs.existsSync('liff/tsconfig.node.json')) fs.renameSync('liff/tsconfig.node.json', 'tsconfig.node.json');

if (fs.existsSync('liff/public')) {
    if (!fs.existsSync('public')) fs.mkdirSync('public');
    const files = fs.readdirSync('liff/public');
    for (const file of files) {
        fs.renameSync(`liff/public/${file}`, `public/${file}`);
    }
}

// 2. Merge package.json
const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const liffPkg = JSON.parse(fs.readFileSync('liff/package.json', 'utf8'));

// Update scripts
rootPkg.scripts.dev = 'vite & tsx watch server/index.ts';
rootPkg.scripts.build = 'tsc -b && vite build';
rootPkg.scripts.preview = 'vite preview';
delete rootPkg.scripts['lint'];

// Merge dependencies
rootPkg.dependencies = { ...rootPkg.dependencies, ...liffPkg.dependencies };
rootPkg.devDependencies = { ...rootPkg.devDependencies, ...liffPkg.devDependencies };

fs.writeFileSync('package.json', JSON.stringify(rootPkg, null, 2));

// 3. Fix imports inside api/
const apiDir = path.join(__dirname, 'api');
const apiFiles = fs.readdirSync(apiDir);
for (const file of apiFiles) {
    const fullPath = path.join(apiDir, file);
    if (fullPath.endsWith('.ts')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(/from '\.\.\/src\//g, "from '../server/");
        fs.writeFileSync(fullPath, content);
    }
}

// 4. Update tsconfig.json
const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
tsconfig.include = ["src", "server", "api"];
fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));

// 5. Cleanup vercel.json
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
delete vercel.buildCommand; // Let Vercel use vite build natively
delete vercel.rewrites; // Let Vercel handle SPA routing natively
fs.writeFileSync('vercel.json', JSON.stringify(vercel, null, 2));

// 6. Delete liff directory
fs.rmSync('liff', { recursive: true, force: true });
fs.unlinkSync('refactor.js');

console.log('Refactor complete!');
