import { useId } from 'react'
import type { Form } from '../core/topping'
import './FormArt.css'

/**
 * 재료 실루엣. 이미지 파일 없이 인라인 SVG 로 그린다.
 *
 * 전에는 border-radius 로 만들었다. 아홉 모양이 구분은 됐지만 잎맥이 갈라지는
 * 잎, 주름 있는 버섯 갓, 휘어진 고추처럼 곡선이 필요한 것은 만들 수 없었다 —
 * border-radius 는 모서리를 깎는 도구지 형태를 그리는 도구가 아니다.
 *
 * 색은 여전히 CSS 가 정한다. --lit / --dim 을 그라디언트 stop 에 꽂아 두어
 * 맛 색 변수 하나만 바꾸면 적이든 도우 위 재료든 같이 따라온다.
 *
 * ⚠ 그라디언트 id 는 인스턴스마다 달라야 한다. 문서 전체에서 찾기 때문에
 *   같은 id 가 둘이면 나중 것이 먼저 것을 덮어 색이 뒤섞인다. useId 로 나눈다.
 */

/** 그림판은 100×100 으로 고정하고 크기는 부모가 정한다. */
const BOX = 100

type Parts = { body: string; detail?: JSX.Element; evenOdd?: boolean }

/*
 * 아홉 모양의 윤곽. 테두리(stroke)가 잘리지 않도록 가장자리를 6 남긴다.
 * 작을 때(도우 위 13px)는 실루엣만 보이므로 곁가지보다 바깥선이 중요하다.
 */
const SHAPES: Record<Form, Parts> = {
  /* 동그란 것 — 토마토, 완두콩, 올리브 */
  round: { body: 'M50 6a44 44 0 1 1 0 88 44 44 0 0 1 0-88z' },

  /* 뿌리·덩이 — 감자, 고구마. 위가 좁고 아래가 부푼 덩이 */
  root: {
    body: 'M50 6c17 0 29 15 30 37 1 26-12 51-30 51S19 69 20 43C21 21 33 6 50 6z',
    detail: (
      <>
        <ellipse className="fa__spot" cx="38" cy="40" rx="4" ry="3" />
        <ellipse className="fa__spot" cx="60" cy="62" rx="3.5" ry="2.6" />
      </>
    ),
  },

  /* 잎 — 바질, 시금치. 양끝이 뾰족하고 잎맥이 갈라진다 */
  leaf: {
    body: 'M86 14C86 52 52 86 14 86 14 48 48 14 86 14z',
    detail: (
      <>
        <path className="fa__vein" d="M82 18 18 82" />
        <path className="fa__vein fa__vein--thin" d="M62 26 52 46M74 38 54 58M42 42 34 62M54 62 40 70" />
      </>
    ),
  },

  /* 고추 — 아래로 갈수록 좁아지고 끝이 살짝 휜다. 꼭지가 달렸다 */
  chili: {
    body: 'M50 18c11 0 17 10 17 24 0 20-4 38-11 48-3 4-9 4-11-1-6-11-10-28-10-47 0-14 4-24 15-24z',
    detail: (
      <>
        <path className="fa__stem" d="M50 20c-1-8 1-13 5-16" />
        <path className="fa__shine" d="M44 34c-2 10-2 24 0 36" />
      </>
    ),
  },

  /* 버섯 — 갓과 기둥. 갓 아래에 주름이 있다 */
  mushroom: {
    body: 'M50 10c22 0 38 18 38 40 0 4-3 6-7 6H19c-4 0-7-2-7-6 0-22 16-40 38-40zM39 56h22v26c0 7-5 11-11 11s-11-4-11-11z',
    detail: (
      <>
        <path className="fa__gill" d="M26 52c2-14 10-24 24-27M74 52c-2-14-10-24-24-27" />
        <path className="fa__stem-line" d="M45 60v28" />
      </>
    ),
  },

  /* 링 — 양파, 파프리카. 가운데가 뚫려 있다 */
  ring: {
    body: 'M50 6a44 44 0 1 1 0 88 44 44 0 0 1 0-88zM50 32a18 18 0 1 0 0 36 18 18 0 0 0 0-36z',
    evenOdd: true,
    detail: <circle className="fa__inner" cx="50" cy="50" r="27" />,
  },

  /* 얇게 썬 것 — 페퍼로니, 살라미. 원반에 기름 점이 박혀 있다 */
  slice: {
    body: 'M50 6a44 44 0 1 1 0 88 44 44 0 0 1 0-88z',
    detail: (
      <>
        <circle className="fa__spot" cx="36" cy="36" r="7" />
        <circle className="fa__spot" cx="63" cy="58" r="6" />
        <circle className="fa__spot" cx="42" cy="66" r="4.5" />
        <circle className="fa__spot" cx="66" cy="34" r="3.5" />
      </>
    ),
  },

  /* 덩어리 — 닭가슴살, 소시지. 네모지만 모서리가 뭉개진 살점 */
  chunk: {
    body: 'M26 14h48c8 0 12 5 12 12v48c0 8-5 12-12 12H26c-8 0-12-5-12-12V26c0-8 5-12 12-12z',
    /* 결은 길이를 흩어 둔다. 끝을 맞추면 살점이 아니라 공책 줄로 보였다. */
    detail: <path className="fa__grain" d="M30 34h38M26 48h44M34 62h30M28 74h22" />,
  },

  /* 소스 — 물방울. 위가 뾰족하다 */
  drop: {
    body: 'M50 6c0 0 34 40 34 57 0 17-15 31-34 31S16 80 16 63C16 46 50 6 50 6z',
    detail: <path className="fa__shine" d="M34 62c0-9 4-17 10-23" />,
  },
}

export default function FormArt({ form }: { form: Form }) {
  const id = useId()
  const key = id.replace(/:/g, '')
  const gid = `fa-g-${key}`
  const cid = `fa-c-${key}`
  const shape = SHAPES[form] ?? SHAPES.round

  return (
    <svg className={`fa fa--${form}`} viewBox={`0 0 ${BOX} ${BOX}`} aria-hidden="true" focusable="false">
      <defs>
        {/*
         * stop-color 를 CSS 로 준다. 속성으로 쓰면 var() 가 안 풀린다.
         * defs 가 이 svg 안에 있어야 부모의 --lit / --dim 을 물려받는다.
         */}
        <linearGradient id={gid} x1="0.2" y1="0" x2="0.75" y2="1">
          <stop className="fa__lit" offset="0" />
          <stop className="fa__dim" offset="1" />
        </linearGradient>
        {/*
         * 광택을 몸통 모양으로 자른다. 안 자르면 잎이나 고추처럼 좁은 모양에서
         * 흰 타원이 실루엣 밖 빈 곳에 떠서 얼룩처럼 보인다.
         */}
        <clipPath id={cid}>
          <path d={shape.body} clipRule={shape.evenOdd ? 'evenodd' : undefined} />
        </clipPath>
      </defs>
      <path
        className="fa__body"
        d={shape.body}
        fill={`url(#${gid})`}
        fillRule={shape.evenOdd ? 'evenodd' : undefined}
      />
      {shape.detail}
      {/* 좌상 광택. 어느 모양이든 빛은 한 방향에서 온다. */}
      <ellipse className="fa__gloss" cx="37" cy="31" rx="19" ry="15" clipPath={`url(#${cid})`} />
    </svg>
  )
}
