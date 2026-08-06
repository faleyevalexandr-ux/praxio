// Проверка перед запуском: без неё отсутствие node_modules всплывает сырым
// ESM-стектрейсом вида «Cannot find package 'cheerio' imported from html.ts»,
// который читается как ошибка в коде, а не как забытая установка.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
  require.resolve('cheerio');
} catch {
  process.stderr.write(
    '\nЗависимости не установлены.\n\n' +
      '  npm ci        — установка строго по package-lock.json\n' +
      '  npm install   — если lock-файла нет или он устарел\n\n' +
      'Запускать нужно из каталога person-osint.\n\n',
  );
  process.exit(1);
}
