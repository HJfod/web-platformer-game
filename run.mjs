
import { exec } from 'child_process';
import { existsSync } from 'fs';

if (!existsSync('src/')) {
    console.error('script must be run in project root');
    process.exit(1);
}

if (process.argv.length < 3 || !/^(dev|prod)$/.test(process.argv[2])) {
    console.error('provide a "dev" or "prod" argument');
    process.exit(1);
}

const devMode = process.argv[2] === 'dev';

const tsc = exec(`npx tsc ${devMode ? '--watch' : ''}`);
tsc.stdout.pipe(process.stdout);
tsc.stderr.pipe(process.stderr);

const py = exec('python -m flask --app src/app.py run');
py.stdout.pipe(process.stdout);
py.stderr.pipe(process.stderr);
py.on('exit', function() {
    process.exit();
});
