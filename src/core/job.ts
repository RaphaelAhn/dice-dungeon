import type { Stats } from './character'
import { affinity, LINES, LINE_LABEL, type SkillLine } from './skill'

/**
 * 전직은 1-8 진입 시 무조건 일어난다.
 * 보유 스킬 수나 보상 획득 여부와 무관하다 — 조건 미달로 전직을 못 하는 경우는 없다.
 */
export const JOB_STAGE = 8

/**
 * 전직 등급. 전직 자체는 막지 않고, 대신 보너스 크기가 달라진다.
 * 계열을 흩뿌리면 '전직 실패'가 아니라 '약한 전직'이 된다.
 */
export type Grade = 'full' | 'partial' | 'thin'

export const GRADE_META: Record<Grade, { label: string; ratio: number; desc: string }> = {
  // 3+0 순수 또는 2+1 하이브리드 — 원래 기획이 완성형으로 정의한 두 조합
  full: { label: '완성', ratio: 1, desc: '주계열 보너스 전량 + 부계열 특성' },
  // 주계열 2개인데 부계열이 없다 — 스킬을 두 개만 집었다
  partial: { label: '미완', ratio: 0.7, desc: '주계열 보너스 70% + 부계열 특성' },
  // 주계열이 1개 — 계열을 흩뿌렸거나 스킬을 거의 안 집었다
  thin: { label: '빈약', ratio: 0.4, desc: '주계열 보너스 40%, 부계열 특성 없음' },
}

/** 주계열 × 부계열 = 25종. 대각선(주=부)은 순수 직업이다. */
export const JOB_NAMES: Record<SkillLine, Record<SkillLine, string>> = {
  sword: {
    sword: '검성',
    fire: '화염검사',
    ice: '서리검사',
    holy: '성기사',
    dark: '흑기사',
  },
  fire: {
    sword: '염화검객',
    fire: '대화염술사',
    ice: '증기술사',
    holy: '성염사제',
    dark: '흑염술사',
  },
  ice: {
    sword: '빙인검객',
    fire: '상극술사',
    ice: '빙결술사',
    holy: '빙결사제',
    dark: '흑빙술사',
  },
  holy: {
    sword: '심판관',
    fire: '성화사제',
    ice: '서리사제',
    holy: '대사제',
    dark: '이단심문관',
  },
  dark: {
    sword: '암살검객',
    fire: '지옥술사',
    ice: '한기술사',
    holy: '타락사제',
    dark: '암흑주교',
  },
}

export type Job = {
  main: SkillLine
  /** 부계열이 없으면 순수 직업 */
  sub: SkillLine | null
  grade: Grade
  name: string
}

/**
 * 1-8 진입 시점의 전직 판정.
 *
 * 주계열은 가장 많이 보유한 계열이다. 동수면 능력치 친화도가 높은 쪽이 이긴다 —
 * 주사위로 받은 능력치가 여기서 한 번 더 방향을 잡아 준다.
 * 스킬이 하나도 없어도 친화도만으로 직업이 정해진다. 전직은 무조건이니까.
 */
export function decideJob(skills: SkillLine[], stats: Stats): Job {
  const count = (line: SkillLine) => skills.filter((s) => s === line).length

  // 보유 수 우선, 동수면 친화도, 그것도 같으면 LINES 순서로 고정한다.
  // 마지막 기준이 없으면 같은 입력에 다른 결과가 나올 수 있다.
  const ranked = [...LINES].sort((a, b) => {
    const byCount = count(b) - count(a)
    if (byCount !== 0) return byCount
    const byAffinity = affinity(stats, b) - affinity(stats, a)
    if (byAffinity !== 0) return byAffinity
    return LINES.indexOf(a) - LINES.indexOf(b)
  })

  const main = ranked[0]
  const sub = ranked.find((l) => l !== main && count(l) > 0) ?? null
  const mainCount = count(main)

  // 원래 기획이 완성형으로 정의한 건 3+0(순수) 과 2+1(하이브리드) 둘이다.
  // 주계열 2개도 부계열이 붙으면 완성이다 — mainCount 만 보면 2+1 이 미완으로 떨어진다.
  const grade: Grade =
    mainCount >= 3 || (mainCount === 2 && sub !== null)
      ? 'full'
      : mainCount === 2
        ? 'partial'
        : 'thin'

  // 스킬이 없거나 하나뿐인데 '검성'·'대사제' 같은 이름이 붙으면 어색하다.
  // 전직은 무조건 되지만, 이름값은 못 했다는 걸 드러낸다.
  const prefix = skills.length <= 1 ? '견습 ' : ''

  return { main, sub, grade, name: prefix + JOB_NAMES[main][sub ?? main] }
}

/** "화염검사 (완성)" 형태의 표시용 문자열 */
export function jobLabel(job: Job): string {
  return `${job.name} (${GRADE_META[job.grade].label})`
}

/** "화염 2 · 검술 1" 형태로 계열 보유 현황을 보여준다. */
export function linesSummary(skills: SkillLine[]): string {
  return LINES.filter((l) => skills.includes(l))
    .map((l) => `${LINE_LABEL[l]} ${skills.filter((s) => s === l).length}`)
    .join(' · ')
}
