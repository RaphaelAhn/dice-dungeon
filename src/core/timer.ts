/**
 * 제한 시간. 데모 규칙 두 가지 중 첫 번째다.
 *
 *   1. 제한 시간 내 클리어하지 못하면 게임 오버
 *   2. 전투 중 사망하면 게임 오버 (남은 시간과 무관)
 *
 * 두 조건은 완전히 독립이다. 시간이 남아도 죽으면 끝이고,
 * 살아 있어도 시간이 다하면 끝이다.
 */

/**
 * 시계의 범위.
 * 'run'   — 한 판 전체에 하나의 시계. 초반에 시간을 흘리면 후반이 조여든다.
 * 'stage' — 스테이지마다 시계가 초기화된다. 실패가 국소적이다.
 *
 * 'run' 을 택한 이유는 누적된 선택이 결과를 만드는 구조(기획서 04 §0)와 맞기 때문이다.
 * 스테이지별로 두면 앞 스테이지에서 시간을 낭비한 대가가 사라진다.
 */
export type TimerScope = 'run' | 'stage'
export const TIMER_SCOPE: TimerScope = 'run'

/**
 * ⚠ 런 전체 제한. 전투 중에만 흐르므로 실제 플레이 시간보다 짧게 잡는다.
 *
 * 시뮬레이션 실측: 정상 빌드 약 40턴, 스킬 없는 느린 빌드 약 71턴.
 * 한 턴 3~4초로 보면 각각 2~3분 / 4~5분이다. 6분이면 정상 빌드는 여유가 있고
 * 느린 빌드는 조인다 — 화력 부족이 시간으로 갚아지는 구조가 된다.
 * 실제 연출 속도가 붙으면 다시 측정해야 한다.
 */
export const RUN_LIMIT_MS = 6 * 60 * 1000

/** ⚠ 스테이지별 제한 (TIMER_SCOPE 가 'stage' 일 때만 쓴다) */
export const STAGE_LIMIT_MS = 75 * 1000

export function initialBudget(): number {
  return TIMER_SCOPE === 'run' ? RUN_LIMIT_MS : STAGE_LIMIT_MS
}

/**
 * 스테이지에 들어갈 때 남은 시간.
 * 런 범위면 그대로 이어받고, 스테이지 범위면 매번 새로 채운다.
 */
export function budgetForStage(carried: number): number {
  return TIMER_SCOPE === 'run' ? carried : STAGE_LIMIT_MS
}

/**
 * 시계는 전투 중에만 흐른다. 보상 선택과 메뉴에서는 멈춘다.
 *
 * 보상 화면에서도 시간이 흐르면 "고민되는 3택"이 성립하지 않는다.
 * 급하게 고르면 판단이 아니라 반사가 되고, 그건 기획서 04 §0 이 요구하는 것과 반대다.
 * 시간 압박은 전투 실행에 걸고, 선택에는 걸지 않는다.
 */
export function shouldTick(screen: 'battle' | 'other'): boolean {
  return screen === 'battle'
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
