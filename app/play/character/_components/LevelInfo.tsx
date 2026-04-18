"use client";

import { EXP_TO_LEVEL_UP } from "@/constants/game";

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
      {/* EXP */}
      <div className="custom-progress is-rounded-progress">
        <p className="text-white">경험치</p>
        <progress
          className="progress-bar-bg is-rounded-progress w-9/12 progress-yellow"
          value={exp}
          max={expToNext}
          aria-label="경험치 상태"
        />
      </div>

      {/* 의지력 */}
      <div className="custom-progress is-rounded-progress">
        <p className="text-white">의지력</p>
        <progress
          className="progress-bar-bg is-rounded-progress w-9/12 progress-green"
          value={willpower}
          max={maxWillpower}
          aria-label="의지력 상태"
        />
      </div>
    </div>
  );
};

export default LevelInfo;
