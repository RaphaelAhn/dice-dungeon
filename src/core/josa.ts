/**
 * 한국어 조사 자동 선택.
 *
 * 재료 이름 58종이 로그에 그대로 들어가는데 '이(가)' 로 뭉뚱그리면
 * "가지이(가) 4 흡수" 처럼 읽힌다. 받침 유무는 코드포인트로 계산할 수 있다.
 */

const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3
/** 한글 음절 = 초성 19 × 중성 21 × 종성 28. 종성 인덱스가 0이면 받침이 없다. */
const JONGSEONG_COUNT = 28

/** 마지막 글자에 받침이 있는가. 한글이 아니면 null */
export function hasFinalConsonant(word: string): boolean | null {
  const chars = [...word.trim()]
  const last = chars[chars.length - 1]
  if (!last) return null

  const code = last.codePointAt(0)!
  if (code < HANGUL_START || code > HANGUL_END) return null
  return (code - HANGUL_START) % JONGSEONG_COUNT !== 0
}

/**
 * 받침에 맞는 조사를 붙인다.
 *
 *   josa('가지', '이', '가')  -> '가지가'
 *   josa('베이컨', '이', '가') -> '베이컨이'
 *
 * 한글이 아니면(숫자·영문) 판단할 수 없으므로 '이(가)' 형태로 둔다.
 */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const has = hasFinalConsonant(word)
  if (has === null) return `${word}${withBatchim}(${withoutBatchim})`
  return `${word}${has ? withBatchim : withoutBatchim}`
}

/** 주격 — 이/가 */
export const ga = (w: string) => josa(w, '이', '가')
/** 주제격 — 은/는 */
export const neun = (w: string) => josa(w, '은', '는')
/** 목적격 — 을/를 */
export const reul = (w: string) => josa(w, '을', '를')
