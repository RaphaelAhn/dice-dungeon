// 영구 저장은 퍼즐 조각 수 하나뿐이다. 그 외는 전부 휘발 — 로그라이크니까.
const KEY = 'dd.pieces'

export const PUZZLE_TOTAL = 9

export function loadPieces(): number {
  const n = Number(localStorage.getItem(KEY))
  // ponytail: 저장값이 손상돼도 게임이 죽지 않게 0~TOTAL 로 가둔다.
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), PUZZLE_TOTAL) : 0
}

export function savePieces(n: number): void {
  localStorage.setItem(KEY, String(Math.min(Math.max(Math.trunc(n), 0), PUZZLE_TOTAL)))
}
