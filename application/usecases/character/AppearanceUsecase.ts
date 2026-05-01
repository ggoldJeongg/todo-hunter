import { ICharacterRepository } from "@/domain/repositories";
import {
  AppearanceDto,
  UpdateAppearanceInput,
} from "./dtos/AppearanceDTO";
import {
  isValidOutfitId,
  isValidHairId,
  isValidHatId,
} from "@/constants/appearance";

// 도메인 에러 — API 레이어에서 status code로 매핑
export class CharacterNotFoundError extends Error {
  constructor() {
    super("캐릭터를 찾을 수 없습니다.");
    this.name = "CharacterNotFoundError";
  }
}

export class InvalidAppearanceIdError extends Error {
  constructor(field: string, value: unknown) {
    super(`유효하지 않은 ${field}: ${String(value)}`);
    this.name = "InvalidAppearanceIdError";
  }
}

export class EmptyAppearanceUpdateError extends Error {
  constructor() {
    super("변경할 외형이 지정되지 않았습니다.");
    this.name = "EmptyAppearanceUpdateError";
  }
}

export class AppearanceUsecase {
  constructor(
    private readonly characterRepository: ICharacterRepository
  ) {}

  // 현재 외형 조회
  async getAppearance(userId: number): Promise<AppearanceDto> {
    const character = await this.characterRepository.findByUserId(userId);
    if (!character) throw new CharacterNotFoundError();

    return {
      outfitId: character.outfitId,
      hairId: character.hairId,
      hatId: character.hatId,
    };
  }

  // 외형 부분 업데이트 — 보내지 않은 필드는 변경 안 함
  async updateAppearance(
    userId: number,
    input: UpdateAppearanceInput
  ): Promise<AppearanceDto> {
    // 입력 검증 — 도메인 규칙: 등록된 ID 만 허용
    const validated: UpdateAppearanceInput = {};

    if (input.outfitId !== undefined) {
      if (typeof input.outfitId !== "string" || !isValidOutfitId(input.outfitId)) {
        throw new InvalidAppearanceIdError("outfitId", input.outfitId);
      }
      validated.outfitId = input.outfitId;
    }

    if (input.hairId !== undefined) {
      if (typeof input.hairId !== "string" || !isValidHairId(input.hairId)) {
        throw new InvalidAppearanceIdError("hairId", input.hairId);
      }
      validated.hairId = input.hairId;
    }

    if (input.hatId !== undefined) {
      // hatId 는 null 허용 (모자 벗기)
      if (input.hatId === null) {
        validated.hatId = null;
      } else if (typeof input.hatId === "string" && isValidHatId(input.hatId)) {
        validated.hatId = input.hatId;
      } else {
        throw new InvalidAppearanceIdError("hatId", input.hatId);
      }
    }

    if (Object.keys(validated).length === 0) {
      throw new EmptyAppearanceUpdateError();
    }

    const character = await this.characterRepository.findByUserId(userId);
    if (!character) throw new CharacterNotFoundError();

    const updated = await this.characterRepository.updateAppearance(
      character.id,
      validated
    );

    return {
      outfitId: updated.outfitId,
      hairId: updated.hairId,
      hatId: updated.hatId,
    };
  }
}
