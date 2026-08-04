import { SHAPE_LABEL, type Shape } from '../core/character'
import { TASTE_LABEL, type Topping } from '../core/topping'
import './CharacterSprite.css'

/**
 * 도우 캐릭터. 이미지 파일 없이 CSS 도형으로만 그린다.
 *
 * 원본을 96×112 로 고정해 그리고 확대·축소는 transform 이 한다.
 * 바깥 상자만 줄이면 안쪽 그림이 상자를 뚫고 나온다 — 실제로 그 버그가 있었다.
 */
const ART_W = 96
const ART_H = 112

/**
 * 토핑이 놓이는 자리 — 도우 중심 기준 극좌표(각도°, 반지름 비율).
 * 얼굴(중앙)을 피해 가장자리를 돌며 놓인다. 상한 6칸에 맞춰 여섯 자리.
 */
const SPOTS: [number, number][] = [
  [205, 0.36],
  [335, 0.36],
  [265, 0.38],
  [150, 0.33],
  [30, 0.33],
  [95, 0.3],
]

export default function CharacterSprite({
  shape,
  scale = 4,
  toppings = [],
}: {
  shape: Shape
  scale?: number
  /** 도우에 올린 재료. 올린 순서대로 자리를 채운다. */
  toppings?: Topping[]
}) {
  const sauce = toppings.find((t) => t.kind === 'sauce')
  const solid = toppings.filter((t) => t.kind !== 'sauce')
  const label =
    toppings.length === 0
      ? SHAPE_LABEL[shape]
      : `${SHAPE_LABEL[shape]} — ${toppings.map((t) => t.name).join(', ')}`

  return (
    <div
      className={`sprite sprite--${shape}${sauce ? ' sprite--sauced' : ''}`}
      style={{
        width: ART_W * scale,
        height: ART_H * scale,
        ['--s' as string]: scale,
      }}
      role="img"
      aria-label={label}
    >
      <div className="sprite__stack">
        <span className="sprite__shadow" />
        <span className="sprite__body">
          {/* 소스는 도우 위에 깔린다. 보스를 잡아야 생긴다. */}
          {sauce && <i className={`sprite__sauce sprite__sauce--${sauce.taste}`} />}
          <i className="sprite__eye sprite__eye--l" />
          <i className="sprite__eye sprite__eye--r" />
          <i className="sprite__mouth" />
          {solid.slice(0, SPOTS.length).map((t, i) => {
            const [deg, r] = SPOTS[i]
            const rad = (deg * Math.PI) / 180
            return (
              <i
                key={`${t.id}-${i}`}
                className={`sprite__top sprite__top--${t.taste} form form--${t.form}`}
                style={{
                  left: `${50 + Math.cos(rad) * r * 100}%`,
                  top: `${50 + Math.sin(rad) * r * 100}%`,
                }}
                title={`${t.name} (${TASTE_LABEL[t.taste]})`}
              >
                {/* 꼭지·무늬는 forms.css 가 이 두 자식에 그린다.
                    빠뜨렸더니 도우 위 재료만 민짜로 나왔다 — 적은 나오는데. */}
                <i className="form__a" />
                <i className="form__b" />
              </i>
            )
          })}
        </span>
      </div>
    </div>
  )
}
