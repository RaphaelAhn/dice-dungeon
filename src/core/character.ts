export type Gender = 'female' | 'male'

export type Stats = {
  hp: number
  atk: number
  mag: number
  spd: number
  luk: number
}

/**
 * 모든 캐릭터는 동일 스탯으로 시작한다.
 * 시작 차이는 스탯이 아니라 주사위 '시작 축복'이 만든다. (기획서 v0.2 §2)
 */
export const BASE_STATS: Stats = {
  hp: 100,
  atk: 20,
  mag: 20,
  spd: 10,
  luk: 10,
}

export const STAT_META: { key: keyof Stats; label: string; desc: string }[] = [
  { key: 'hp', label: '체력', desc: '0이 되면 사망' },
  { key: 'atk', label: '공격력', desc: '물리 데미지' },
  { key: 'mag', label: '마법력', desc: '스킬 데미지·최대 마나' },
  { key: 'spd', label: '속도', desc: '선공 판정·회피' },
  { key: 'luk', label: '행운', desc: '보상 티어·크리티컬' },
]

export const GENDER_LABEL: Record<Gender, string> = {
  female: '여성',
  male: '남성',
}

/** 성별은 외형만 바꾼다. 성능 차이는 없다. */
export const GENDERS: Gender[] = ['female', 'male']

export const NAME_MAX = 8

/**
 * 입력 이름을 8자로 자른다.
 * 길이는 코드 포인트 기준 — 이모지나 일부 한자는 .length 로 세면 2로 잡혀
 * 4자만 쳐도 잘리고, slice 로 자르면 글자가 반 토막 나 깨진다.
 */
export function clampName(raw: string): string {
  return [...raw].slice(0, NAME_MAX).join('')
}

/** 공백만 남는 이름은 거부한다. */
export function isValidName(raw: string): boolean {
  const n = [...raw.trim()]
  return n.length > 0 && n.length <= NAME_MAX
}
