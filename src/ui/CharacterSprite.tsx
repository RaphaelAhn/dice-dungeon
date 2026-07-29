import type { Gender } from '../core/character'
import './CharacterSprite.css'

/**
 * 도트 스프라이트 자리를 잡아두는 임시 실루엣.
 * ponytail: 실제 시트가 나오면 이 파일만 background-image + steps() 애니메이션으로 갈아끼운다.
 * 바깥에서는 <CharacterSprite gender scale /> 시그니처만 보므로 다른 화면은 손댈 필요 없다.
 */
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
      style={{ width: 64 * scale, height: 64 * scale }}
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
