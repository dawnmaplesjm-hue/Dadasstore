const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const androidDir = path.join(projectRoot, 'android');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function forceJava17(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const original = fs.readFileSync(filePath, 'utf-8');
  const updated = original
    .replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17')
    .replace(/sourceCompatibility\s*=\s*21/g, 'sourceCompatibility = 17')
    .replace(/targetCompatibility\s*=\s*21/g, 'targetCompatibility = 17');

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf-8');
    console.log(`Patched Java compatibility in ${filePath}`);
  }
}

console.log('Building mobile web assets...');
run('npm', ['run', 'build'], projectRoot);

console.log('Syncing Capacitor Android...');
run('npx', ['cap', 'sync', 'android'], projectRoot);

// Capacitor sync may regenerate these files with Java 21; force them back to Java 17.
forceJava17(path.join(androidDir, 'app', 'capacitor.build.gradle'));
forceJava17(path.join(androidDir, 'capacitor-cordova-android-plugins', 'build.gradle'));
forceJava17(path.resolve(projectRoot, '..', 'node_modules', '@capacitor', 'android', 'capacitor', 'build.gradle'));

console.log('Assembling debug APK...');
run('gradlew', ['assembleDebug'], androidDir);

console.log('Done. APK path: mobile-app/android/app/build/outputs/apk/debug/app-debug.apk');
