import { SHAPE_LABEL, type Shape } from '../core/character'
import './CharacterSprite.css'

/**
 * 도우 캐릭터. 이미지 파일 없이 CSS 도형으로만 그린다.
 *
 * 원본을 96×112 로 고정해 그리고 확대·축소는 transform 이 한다.
 * 바깥 상자만 줄이면 안쪽 그림이 상자를 뚫고 나온다 — 실제로 그 버그가 있었다.
 */
const ART_W = 96
const ART_H = 112

export default function CharacterSprite({ shape, scale = 4 }: { shape: Shape; scale?: number }) {
  return (
    <div
      className={`sprite sprite--${shape}`}
      style={{
        width: ART_W * scale,
        height: ART_H * scale,
        ['--s' as string]: scale,
      }}
      role="img"
      aria-label={SHAPE_LABEL[shape]}
    >
      <div className="sprite__stack">
        <span className="sprite__shadow" />
        <span className="sprite__body">
          <i className="sprite__eye sprite__eye--l" />
          <i className="sprite__eye sprite__eye--r" />
          <i className="sprite__mouth" />
        </span>
      </div>
    </div>
  )
}
