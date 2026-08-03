import type { Stats } from './character'

/**
 * 토핑의 맛. 피자의 정체성을 정하는 축이다.
 *
 * 야채 30 / 고기 20 / 소스로 나누면 라운드 대부분이 야채라 정체성이 갈리지 않는다.
 * 맛을 따로 두면 "매콤한 고기 피자"와 "향긋한 야채 피자"가 구분된다.
 */
export type Taste = 'mild' | 'spicy' | 'tangy' | 'herbal' | 'rich'

export const TASTES: Taste[] = ['mild', 'spicy', 'tangy', 'herbal', 'rich']

export const TASTE_LABEL: Record<Taste, string> = {
  mild: '담백',
  spicy: '매콤',
  tangy: '새콤',
  herbal: '향긋',
  rich: '진한',
}

/** 맛 ↔ 능력치. 토핑을 올리면 이 능력치가 오르고, 이 값이 높으면 같은 맛이 더 자주 등장한다. */
export const TASTE_STAT: Record<Taste, keyof Stats> = {
  mild: 'hp',
  spicy: 'atk',
  tangy: 'luk',
  herbal: 'spd',
  rich: 'mag',
}

/** 서로 부딪치는 맛. 도감 이름과 완성도 판정에 쓴다. */
export const TASTE_CLASH: Partial<Record<Taste, Taste>> = {
  spicy: 'tangy',
  tangy: 'spicy',
  rich: 'herbal',
  herbal: 'rich',
}

export type ToppingKind = 'veg' | 'meat' | 'sauce'

export const KIND_LABEL: Record<ToppingKind, string> = {
  veg: '야채',
  meat: '고기',
  sauce: '소스',
}

export type Topping = {
  id: string
  name: string
  kind: ToppingKind
  taste: Taste
  /** 도우가 무거워지는 정도. 총합만큼 속도가 깎인다. */
  weight: number
}

/** 종류별 기본 무게 — 고기와 소스가 무겁다 */
const WEIGHT: Record<ToppingKind, number> = { veg: 1, meat: 2, sauce: 2 }

/** 토핑 하나가 올려 주는 능력치 크기 ⚠ */
const GAIN: Record<ToppingKind, number> = { veg: 1, meat: 2, sauce: 3 }

function make(kind: ToppingKind, taste: Taste, names: string[]): Topping[] {
  return names.map((name, i) => ({
    id: `${kind}-${taste}-${i}`,
    name,
    kind,
    taste,
    weight: WEIGHT[kind],
  }))
}

/**
 * 야채 60종 — 일반 라운드에 등장한다. 맛마다 12종씩.
 *
 * 일반 라운드가 여덟 번이라 한 판에 최대 10마리를 만난다. 종류가 적으면
 * 두세 판 만에 같은 얼굴이 반복된다. 맛별로 고르게 늘려 어느 맛을 노려도
 * 뽑히는 폭이 같게 뒀다.
 */
export const VEGGIES: Topping[] = [
  ...make('veg', 'mild', [
    '양송이버섯', '옥수수', '애호박', '감자', '콜리플라워', '완두콩',
    '단호박', '고구마', '연근', '두부', '숙주', '아스파라거스',
  ]),
  ...make('veg', 'spicy', [
    '할라피뇨', '페페론치노', '청양고추', '홍고추', '마늘', '양파',
    '와사비', '겨자잎', '고추냉이순', '쪽파', '생강', '후추알',
  ]),
  ...make('veg', 'tangy', [
    '방울토마토', '파인애플', '그린올리브', '피클', '선드라이토마토', '레몬제스트',
    '라임', '사과', '유자껍질', '케이퍼', '적양파절임', '토마토링',
  ]),
  ...make('veg', 'herbal', [
    '바질', '루꼴라', '시금치', '오레가노', '파슬리', '로즈마리',
    '타임', '세이지', '딜', '차이브', '민트잎', '고수',
  ]),
  ...make('veg', 'rich', [
    '가지', '아티초크', '트러플', '블랙올리브', '구운파프리카', '표고버섯',
    '포르치니', '선드라이가지', '캐러멜양파', '구운마늘', '말린토마토', '올리브타프나드',
  ]),
]

/** 고기 20종 — 중간보스로 등장한다 */
export const MEATS: Topping[] = [
  ...make('meat', 'mild', ['닭가슴살', '훈제오리', '새우', '관자']),
  ...make('meat', 'spicy', ['페퍼로니', '초리조', '매운소시지', '스파이시치킨']),
  ...make('meat', 'tangy', ['하몽', '프로슈토', '앤초비', '훈제연어']),
  ...make('meat', 'herbal', ['허브소시지', '로즈마리램', '바질치킨', '판체타']),
  ...make('meat', 'rich', ['불고기', '베이컨', '살라미', '이탈리안소시지']),
]

/** 소스 8종 — 최종 보스. 이기면 피자에 발려 완성된다. */
export const SAUCES: Topping[] = [
  ...make('sauce', 'mild', ['크림 소스', '알프레도 소스']),
  ...make('sauce', 'spicy', ['핫칠리 소스']),
  ...make('sauce', 'tangy', ['토마토 소스']),
  ...make('sauce', 'herbal', ['바질 페스토']),
  ...make('sauce', 'rich', ['바베큐 소스', '트러플 오일', '고르곤졸라 소스']),
]

export const ALL_TOPPINGS: Topping[] = [...VEGGIES, ...MEATS, ...SAUCES]

export function toppingById(id: string): Topping | undefined {
  return ALL_TOPPINGS.find((t) => t.id === id)
}

/** 토핑을 올렸을 때 오르는 능력치 */
export function toppingStats(t: Topping): Partial<Stats> {
  const key = TASTE_STAT[t.taste]
  const base: Record<keyof Stats, number> = { hp: 18, atk: 5, mag: 5, spd: 3, luk: 3 }
  return { [key]: base[key] * GAIN[t.kind] }
}

/**
 * 도우에 올릴 수 있는 토핑 수 ⚠
 *
 * 라운드 1~9 에서 9번의 기회가 오는데 상한이 6이면 세 번은 지나쳐야 한다.
 * 상한이 없으면 '지나치기' 버튼을 누를 이유가 사라진다.
 */
export const MAX_TOPPINGS = 6

/** 총 무게만큼 속도가 깎인다. 많이 올릴수록 도우가 굼떠진다. */
export function totalWeight(list: Topping[]): number {
  return list.reduce((a, t) => a + t.weight, 0)
}

/** 능력치에서 이 맛이 얼마나 어울리는지 — 등장 가중치와 동점 판정에 쓴다 */
export function tasteAffinity(stats: Stats, taste: Taste): number {
  return stats[TASTE_STAT[taste]]
}
