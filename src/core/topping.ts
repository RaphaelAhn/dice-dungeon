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
  /** 화면에 그릴 생김새. 이름에서 자동으로 정해진다. (formOf) */
  form: Form
}

/** 종류별 기본 무게 — 고기와 소스가 무겁다 */
const WEIGHT: Record<ToppingKind, number> = { veg: 1, meat: 2, sauce: 2 }

/** 토핑 하나가 올려 주는 능력치 크기 ⚠ */
const GAIN: Record<ToppingKind, number> = { veg: 1, meat: 2, sauce: 3 }

/* ── 생김새 ── */

/**
 * 재료의 생김새. 이름에서 자동으로 정해진다.
 *
 * 95종을 하나씩 그려 두면 재료를 추가할 때마다 그림도 같이 손봐야 한다.
 * 이름에 든 낱말로 판정하면 새 재료를 넣어도 알맞은 모양이 저절로 붙는다.
 */
export type Form =
  | 'round'
  | 'leaf'
  | 'chili'
  | 'mushroom'
  | 'ring'
  | 'root'
  | 'slice'
  | 'chunk'
  | 'drop'

/** 앞에 있는 규칙이 먼저 이긴다 — '표고버섯'은 버섯이지 뿌리가 아니다. */
const FORM_RULES: [Form, string[]][] = [
  ['mushroom', ['버섯', '포르치니', '송이']],
  ['chili', ['고추', '할라피뇨', '페페론치노', '와사비', '겨자', '후추', '생강']],
  ['leaf', ['바질', '루꼴라', '시금치', '오레가노', '파슬리', '로즈마리', '타임', '세이지',
            '딜', '차이브', '민트', '고수', '숙주', '겨자잎', '아스파라거스', '쪽파']],
  ['ring', ['양파', '파프리카', '파인애플', '링', '올리브']],
  ['root', ['감자', '고구마', '연근', '단호박', '마늘', '유자', '레몬', '라임', '트러플']],
  ['slice', ['하몽', '프로슈토', '살라미', '베이컨', '판체타', '앤초비', '연어', '페퍼로니']],
  ['chunk', ['치킨', '가슴살', '오리', '새우', '관자', '소시지', '초리조', '불고기', '램', '두부']],
  ['round', ['토마토', '완두콩', '옥수수', '애호박', '콜리플라워', '가지', '아티초크',
             '피클', '케이퍼', '사과', '체리']],
]

export function formOf(name: string, kind: ToppingKind): Form {
  for (const [form, words] of FORM_RULES) {
    if (words.some((w) => name.includes(w))) return form
  }
  // 못 찾으면 종류로 되돌린다. 소스는 방울, 고기는 덩어리, 야채는 동그라미.
  return kind === 'sauce' ? 'drop' : kind === 'meat' ? 'chunk' : 'round'
}

function make(kind: ToppingKind, taste: Taste, names: string[]): Topping[] {
  return names.map((name, i) => ({
    id: `${kind}-${taste}-${i}`,
    name,
    kind,
    taste,
    weight: WEIGHT[kind],
    form: formOf(name, kind),
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

/**
 * 소스 15종 — 최종 보스. 이기면 피자에 발려 완성된다. 맛마다 3종씩.
 *
 * 야채·고기와 달리 여기만 맛별 수가 어긋나 있었다(2·1·1·1·3). 보스는
 * 이 목록에서 뽑히므로 진한 보스가 38%, 매콤·새콤·향긋이 각 13% 였다 —
 * 한 판만 돌리면 62%가 담백 아니면 진한이었다. 맛별로 고르게 맞춘다.
 *
 * 이름은 전부 소스·오일·페스토로 끝낸다. 피자 이름을 지을 때 이 꼬리를
 * 떼고 앞말만 쓰기 때문이다(codex.ts fullName) — '마리나라 ... 피자'.
 */
export const SAUCES: Topping[] = [
  ...make('sauce', 'mild', ['크림 소스', '알프레도 소스', '베샤멜 소스']),
  ...make('sauce', 'spicy', ['핫칠리 소스', '아라비아타 소스', '칠리 오일']),
  ...make('sauce', 'tangy', ['토마토 소스', '마리나라 소스', '발사믹 소스']),
  ...make('sauce', 'herbal', ['바질 페스토', '루꼴라 페스토', '허브 오일']),
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
