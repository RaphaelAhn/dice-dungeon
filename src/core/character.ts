export type Gender = 'female' | 'male'

export type Stats = {
  hp: number
  atk: number
  mag: number
  spd: number
  luk: number
}

/**
 * 모든 도우는 같은 값으로 시작한다.
 * 시작 차이는 주사위가 만든다.
 */
export const BASE_STATS: Stats = {
  hp: 100,
  atk: 20,
  mag: 20,
  spd: 10,
  luk: 10,
}

/**
 * 능력치 이름은 여기 한 곳에서만 정한다.
 * 화면마다 따로 적어 두면 같은 값이 '마법력'과 '반죽 탄력'으로 갈린다.
 */
export const STAT_META: { key: keyof Stats; label: string; desc: string }[] = [
  { key: 'hp', label: '반죽 두께', desc: '0이 되면 무너진다' },
  { key: 'atk', label: '불의 세기', desc: '직접 때리는 힘' },
  { key: 'mag', label: '반죽 탄력', desc: '기술 위력과 최대 탄력' },
  { key: 'spd', label: '손놀림', desc: '선공 판정·회피' },
  { key: 'luk', label: '감각', desc: '보상 등급·결정적 한 방' },
]

export const STAT_LABEL: Record<keyof Stats, string> = {
  hp: '반죽 두께',
  atk: '불의 세기',
  mag: '반죽 탄력',
  spd: '손놀림',
  luk: '감각',
}

export const GENDER_LABEL: Record<Gender, string> = {
  female: '여성',
  male: '남성',
}

/** 모양은 겉모습만 바꾼다. 성능 차이는 없다. */
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
