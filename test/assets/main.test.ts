import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { expect, test } from 'vitest';

const script = readFileSync(new URL('../../assets/js/main.js', import.meta.url), 'utf8');

type Compiler = (element: unknown) => void;

/** Runs main.js in a fresh context with a stub `up`, returning the context's globals and the registered compilers. */
function loadScript(): Record<string, any> & { compilers: Map<string, Compiler> } {
  const compilers = new Map<string, Compiler>();
  const context = createContext({
    up: { compiler: (selector: string, compiler: Compiler) => compilers.set(selector, compiler) },
  });
  runInContext(script, context);
  return Object.assign(context, { compilers });
}

/** A fake `.random-photos` element whose template holds `boxCount` photo boxes. */
function randomPhotosElement(boxCount: number) {
  const boxes = Array.from({ length: boxCount }, (_, id) => ({
    id,
    cloneNode: (deep: boolean) => ({ cloneOf: id, deep }),
  }));
  const columns = { children: [] as unknown[], replaceChildren: (...nodes: unknown[]) => (columns.children = nodes) };
  const template = { content: { children: boxes } };
  const parts: Record<string, unknown> = { template, '.columns': columns };
  const element = { querySelector: (selector: string) => parts[selector] ?? null };
  return { element, columns };
}

test('pickRandom returns min(count, n) distinct items from the input without mutating it', () => {
  const { pickRandom } = loadScript();
  const items = Array.from({ length: 20 }, (_, i) => i);

  const picked: number[] = pickRandom(items, 12);

  expect(picked).toHaveLength(12);
  expect(new Set(picked).size).toBe(12);
  expect(picked.every((item) => items.includes(item))).toBe(true);
  expect(items).toEqual(Array.from({ length: 20 }, (_, i) => i));
  expect([...pickRandom([1, 2, 3], 12)].sort()).toEqual([1, 2, 3]);
});

test('pickRandom follows Fisher–Yates for the given random numbers', () => {
  const context = loadScript();
  const randoms = [0.5, 0, 0.99];
  runInContext('Math', context).random = () => randoms.shift();

  // i=0: j = 0 + floor(0.5 * 5) = 2 → c b a d e
  // i=1: j = 1 + floor(0 * 4) = 1 → c b a d e
  // i=2: j = 2 + floor(0.99 * 3) = 4 → c b e d a
  expect([...context.pickRandom(['a', 'b', 'c', 'd', 'e'], 3)]).toEqual(['c', 'b', 'e']);
});

test.each([
  [30, 12],
  [12, 12],
  [5, 5],
])('the .random-photos compiler fills columns with deep clones of distinct boxes (%i boxes → %i)', (boxes, shown) => {
  const compiler = loadScript().compilers.get('.random-photos')!;
  const { element, columns } = randomPhotosElement(boxes);
  columns.children = [{ old: true }];

  compiler(element);

  const clones = columns.children as { cloneOf: number; deep: boolean }[];
  expect(clones).toHaveLength(shown);
  expect(new Set(clones.map((clone) => clone.cloneOf)).size).toBe(shown);
  expect(clones.every((clone) => clone.cloneOf >= 0 && clone.cloneOf < boxes && clone.deep)).toBe(true);
});
