import type { Gender } from '../core/character'
import './CharacterSprite.css'

/**
 * 도트 스프라이트 자리를 잡아두는 임시 실루엣.
 * ponytail: 실제 시트가 나오면 이 파일만 background-image + steps() 애니메이션으로 갈아끼운다.
 * 바깥에서는 <CharacterSprite gender scale /> 시그니처만 보므로 다른 화면은 손댈 필요 없다.
 */
/** 원본 그림 크기. scale 은 이 값에 곱해진다. */
const ART_W = 96
const ART_H = 176

export default function CharacterSprite({
  gender,
  scale = 4,
}: {
  gender: Gender
  scale?: number
}) {
  return (
    <div
      className={`sprite sprite--${gender}`}
      // 바깥 상자만 줄이면 안쪽 그림(96x176 고정)이 상자를 뚫고 나온다.
      // 실제 축소는 CSS 의 transform 이 하고, 여기서는 그 결과 크기만 알려 준다.
      style={{
        width: ART_W * scale,
        height: ART_H * scale,
        ['--s' as string]: scale,
      }}
      role="img"
      aria-label={gender === 'female' ? '여성 캐릭터' : '남성 캐릭터'}
    >
      <div className="sprite__stack">
        <span className="sprite__hair" />
        <span className="sprite__head" />
        <span className="sprite__body" />
        <span className="sprite__legs" />
        <span className="sprite__shadow" />
      </div>
    </div>
  )
}
