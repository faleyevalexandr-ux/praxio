import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildNameVariants,
  containsHint,
  levenshtein,
  nameMatchScore,
  normalize,
  parseName,
  tokenMatches,
  translitVariants,
  truncate,
} from '../src/core/text.ts';

describe('normalize', () => {
  it('снимает диакритику, регистр и пунктуацию', () => {
    assert.equal(normalize('José  Müller-Schmidt, Ph.D.'), 'jose muller schmidt ph d');
  });

  it('приводит ё и й к базовым буквам, чтобы разнобой в написании не мешал', () => {
    assert.equal(normalize('Пётр Алексеевич'), normalize('Петр Алексеевич'));
    assert.equal(normalize('Андрей'), normalize('Андреи'));
  });

  it('на пустой строке не падает', () => {
    assert.equal(normalize('   ...   '), '');
  });
});

describe('parseName', () => {
  it('находит отчество и раскладывает «Имя Отчество Фамилия»', () => {
    const parsed = parseName('Иван Сергеевич Петров');
    assert.equal(parsed.given, 'Иван');
    assert.equal(parsed.patronymic, 'Сергеевич');
    assert.equal(parsed.surname, 'Петров');
  });

  it('раскладывает «Фамилия Имя Отчество»', () => {
    const parsed = parseName('Петров Иван Сергеевич');
    assert.equal(parsed.given, 'Иван');
    assert.equal(parsed.surname, 'Петров');
    assert.equal(parsed.patronymic, 'Сергеевич');
  });

  it('по суффиксу понимает, что фамилия стоит первой', () => {
    const parsed = parseName('Петров Иван');
    assert.equal(parsed.surname, 'Петров');
    assert.equal(parsed.given, 'Иван');
  });

  it('без сигналов принимает порядок «Имя Фамилия»', () => {
    const parsed = parseName('Ada Lovelace');
    assert.equal(parsed.given, 'Ada');
    assert.equal(parsed.surname, 'Lovelace');
  });

  it('переживает одиночный токен', () => {
    assert.equal(parseName('Cher').surname, 'Cher');
  });
});

describe('translitVariants', () => {
  it('даёт несколько написаний для -ий', () => {
    const variants = translitVariants('Дмитрий');
    assert.ok(variants.includes('dmitriy'));
    assert.ok(variants.includes('dmitry'));
  });

  it('учитывает kh/h для х', () => {
    assert.ok(translitVariants('Михаил').includes('mihail'));
  });
});

describe('buildNameVariants', () => {
  const names = buildNameVariants('Иван Сергеевич Петров');

  it('строит формы для запросов, включая латиницу', () => {
    assert.ok(names.queryForms.includes('Иван Петров'));
    assert.ok(names.queryForms.includes('Петров Иван'));
    assert.ok(names.queryForms.some((f) => f.toLowerCase() === 'ivan petrov'));
  });

  it('строит инициальные формы', () => {
    assert.ok(names.initialForms.includes('и петров'));
  });

  it('не теряет отчество', () => {
    assert.equal(names.patronymic, 'Сергеевич');
  });
});

describe('nameMatchScore', () => {
  const names = buildNameVariants('Иван Петров');

  it('точное вхождение даёт максимум', () => {
    assert.equal(nameMatchScore('Выступил Иван Петров, разработчик', names), 1);
  });

  it('обратный порядок тоже засчитывается', () => {
    assert.equal(nameMatchScore('Петров Иван — руководитель отдела', names), 1);
  });

  it('склонение фамилии не ломает совпадение', () => {
    assert.ok(nameMatchScore('интервью с Иваном Петровым', names) >= 0.75);
  });

  it('инициалы дают половину', () => {
    assert.equal(nameMatchScore('доклад И. Петров, 2019', names), 0.5);
  });

  it('чужое имя не совпадает', () => {
    assert.equal(nameMatchScore('Сергей Иванов работает тут', names), 0);
  });

  it('латинская запись кириллического имени находится', () => {
    assert.equal(nameMatchScore('Ivan Petrov, engineer', names), 1);
  });
});

describe('tokenMatches', () => {
  it('сопоставляет словоформы', () => {
    assert.ok(tokenMatches('петрова', 'петров'));
    assert.ok(tokenMatches('петровым', 'петров'));
  });

  it('не склеивает разные фамилии', () => {
    assert.ok(!tokenMatches('сидоров', 'петров'));
  });

  it('короткие токены сравниваются строго', () => {
    assert.ok(!tokenMatches('или', 'имя'));
  });
});

describe('containsHint', () => {
  it('находит город в тексте', () => {
    assert.ok(containsHint('Живёт в Москве, работает в банке', 'Москва'));
  });

  it('находит многословную организацию', () => {
    assert.ok(containsHint('Ведущий инженер Яндекс Такси в Москве', 'Яндекс Такси'));
  });

  it('не срабатывает на постороннем тексте', () => {
    assert.ok(!containsHint('Живёт в Казани', 'Москва'));
  });

  it('пустой уточнитель — не совпадение', () => {
    assert.ok(!containsHint('что угодно', undefined));
  });
});

describe('levenshtein', () => {
  it('считает расстояние', () => {
    assert.equal(levenshtein('петров', 'петрова', 3), 1);
  });

  it('выходит раньше порога', () => {
    assert.ok(levenshtein('абв', 'ябвгдеёжз', 2) > 2);
  });
});

describe('truncate', () => {
  it('не режет короткое', () => {
    assert.equal(truncate('коротко', 100), 'коротко');
  });

  it('режет по границе слова', () => {
    const result = truncate('один два три четыре пять шесть', 12);
    assert.ok(result.endsWith('…'));
    assert.ok(result.length <= 13);
  });
});
