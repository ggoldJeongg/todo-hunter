import Image from "next/image";

type ProgressBarProps = {
    nickname: string | undefined;
    progress: number | undefined;
};

const ProgressBar = ({ nickname, progress }: ProgressBarProps) => (
    <div className="bubble-wrapper">
        {/* 말풍선 배경 이미지 (absolute) */}
        <div className="bubble-bg-container">
            <Image
                src="/images/backgrounds/text_bubble.png"
                alt="말풍선"
                fill
                sizes="300px"
                className="bubble-bg"
                unoptimized
            />
        </div>
        {/* 콘텐츠 (relative, 크기 결정) */}
        <div className="bubble-content">
            <p className="bubble-text">
                {nickname ?? "모험가"}님, 오늘의 경험치에요!
            </p>
            <div className="bubble-progress-row">
                <span className="bubble-pct">{progress ?? 0}%</span>
                <div className="bubble-progress-track">
                    <div
                        className="bubble-progress-fill"
                        style={{ width: `${progress ?? 0}%` }}
                    />
                </div>
            </div>
        </div>
    </div>
);

export default ProgressBar;
