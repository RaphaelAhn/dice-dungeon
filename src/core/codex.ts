import { GRADE_META, PIZZA_NAMES, type Grade, type Pizza } from './pizza'
import { TASTE_LABEL, TASTES, type Taste, type Topping } from './topping'

/**
 * 도감.
 *
 * 재료 58종으로 만들 수 있는 조합은 다 적어 둘 수 없다. 그래서 두 겹으로 나눈다.
 *
 *   1. 칸 — 주 맛 × 부 맛 = 25칸 고정. 모으는 목표가 눈에 보인다.
 *   2. 이름 — 실제 올린 재료로 그때그때 만든다. 같은 칸이라도 이름이 다르다.
 *
 * 칸만 있으면 25번 만에 질리고, 이름만 있으면 무엇을 모으는지 알 수 없다.
 */

const KEY = 'pz.codex'

export const CODEX_TOTAL = TASTES.length * TASTES.length

export type CodexEntry = {
  /** `${main}-${sub}` */
  key: string
  /** 칸의 대표 이름 (PIZZA_NAMES) */
  title: string
  main: Taste
  sub: Taste
  /** 이 칸에서 이제까지 낸 가장 높은 완성도 */
  bestGrade: Grade
  /** 만든 횟수 */
  count: number
  /** 가장 최근에 만든 피자의 전체 이름 */
  lastName: string
  /** 가장 최근에 올렸던 재료 */
  lastToppings: string[]
}

export type Codex = Record<string, CodexEntry>

export function entryKey(main: Taste, sub: Taste | null): string {
  return `${main}-${sub ?? main}`
}

const GRADE_RANK: Record<Grade, number> = { thin: 0, partial: 1, full: 2 }

export function loadCodex(): Codex {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    // 저장값이 손상돼도 게임이 죽지 않게 형태를 확인하고 아니면 버린다.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Codex
  } catch {
    return {}
  }
}

export function saveCodex(codex: Codex): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(codex))
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)에서도 플레이는 계속돼야 한다.
  }
}

/** 몇 칸을 채웠는가 */
export function discoveredCount(codex: Codex): number {
  return Object.keys(codex).length
}

/**
 * 만든 피자를 도감에 적는다. 이미 있는 칸이면 횟수를 올리고 완성도를 갱신한다.
 */
export function recordPizza(pizza: Pizza, toppings: Topping[]): Codex {
  const codex = loadCodex()
  const key = entryKey(pizza.main, pizza.sub)
  const prev = codex[key]
  const name = fullName(pizza, toppings)

  codex[key] = {
    key,
    title: PIZZA_NAMES[pizza.main][pizza.sub ?? pizza.main],
    main: pizza.main,
    sub: pizza.sub ?? pizza.main,
    bestGrade:
      prev && GRADE_RANK[prev.bestGrade] >= GRADE_RANK[pizza.grade] ? prev.bestGrade : pizza.grade,
    count: (prev?.count ?? 0) + 1,
    lastName: name,
    lastToppings: toppings.map((t) => t.name),
  }
  saveCodex(codex)
  return codex
}

/* ── 절차적 명명 ── */

/** 완성도와 맛 충돌에서 나오는 수식어 */
function prefixOf(pizza: Pizza): string {
  if (pizza.clashes >= 2) return '뒤죽박죽'
  if (pizza.clashes === 1) return pizza.grade === 'full' ? '대담한' : '어수선한'
  switch (pizza.grade) {
    case 'full':
      return '완벽한'
    case 'partial':
      return '그럭저럭'
    case 'thin':
      return '밋밋한'
  }
}

/**
 * 이름을 대표할 재료 하나.
 * 고기가 있으면 고기가 이긴다 — 피자는 보통 고기로 불린다(페퍼로니 피자, 불고기 피자).
 */
function signatureOf(pizza: Pizza, toppings: Topping[]): Topping | null {
  const meat = toppings.find((t) => t.kind === 'meat')
  if (meat) return meat
  const main = toppings.find((t) => t.taste === pizza.main && t.kind === 'veg')
  return main ?? toppings.find((t) => t.kind === 'veg') ?? null
}

/**
 * 실제 올린 재료로 이름을 만든다.
 *
 *   완벽한 · 토마토 · 페퍼로니 · 피자
 *   수식어   소스     대표 재료
 */
export function fullName(pizza: Pizza, toppings: Topping[]): string {
  if (toppings.length === 0) return '맨 도우'

  const prefix = prefixOf(pizza)
  const sauce = toppings.find((t) => t.kind === 'sauce')
  // '토마토 소스' 처럼 이미 소스가 붙은 이름은 중복을 떼고 쓴다.
  const sauceWord = sauce ? sauce.name.replace(/\s*(소스|오일|페스토)$/, '') : ''
  const sig = signatureOf(pizza, toppings)

  const parts = [prefix, sauceWord, sig?.name].filter(Boolean)
  return `${parts.join(' ')} 피자`
}

/** 도감 칸 하나를 설명하는 한 줄 */
export function entryLine(e: CodexEntry): string {
  return `${TASTE_LABEL[e.main]}${e.main === e.sub ? '' : ` + ${TASTE_LABEL[e.sub]}`} · ${
    GRADE_META[e.bestGrade].label
  } · ${e.count}회`
}
