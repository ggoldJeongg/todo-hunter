"use client";

import { EXP_TO_LEVEL_UP } from "@/constants/game";
import StatBar from "@/components/common/StatBar";

type LevelInfoProps = {
  level: number;
  exp: number;
  willpower: number;
  maxWillpower: number;
};

const LevelInfo = ({ level, exp, willpower, maxWillpower }: LevelInfoProps) => {
  const expToNext = EXP_TO_LEVEL_UP(level);

  return (
    <div className="is-rounded-progress custom-status-size ml-5">
      {/* EXP — 공용 StatBar (HP·스탯과 동일 디자인) */}
      <div className="custom-progress is-rounded-progress">
        <p className="text-white">경험치</p>
        <StatBar
          value={exp}
          max={expToNext}
          color="#facc15"
          height={14}
          className="w-9/12"
          ariaLabel="경험치 상태"
        />
      </div>

      {/* 의지력 */}
      <div className="custom-progress is-rounded-progress">
        <p className="text-white">의지력</p>
        <StatBar
          value={willpower}
          max={maxWillpower}
          color="#4ade80"
          height={14}
          className="w-9/12"
          ariaLabel="의지력 상태"
        />
      </div>
    </div>
  );
};

export default LevelInfo;
