import { CharacterDto } from "@/application/usecases/character/dtos";
import Image from "next/image";

const STATS = [
    { key: "str" as const, label: "체력", icon: "/icons/heart.png", color: "#D4726A" },
    { key: "int" as const, label: "지력", icon: "/icons/brain.png", color: "#6A9FBF" },
    { key: "emo" as const, label: "감성", icon: "/icons/smile.png", color: "#9B7DB8" },
    { key: "fin" as const, label: "경제력", icon: "/icons/coin.png", color: "#6AAF6A" },
    { key: "liv" as const, label: "생활력", icon: "/icons/star.png", color: "#C4A44A" },
];

const Status = ({ str, int, emo, fin, liv }: Pick<CharacterDto, "str" | "int" | "emo" | "fin" | "liv">) => {
    const values = { str, int, emo, fin, liv };

    return (
        <div className="stat-list">
            {STATS.map(({ key, label, icon, color }) => (
                <div key={key} className="stat-row">
                    <div className="stat-icon-circle" style={{ background: color }}>
                        <Image
                            src={icon}
                            alt={label}
                            width={20}
                            height={20}
                            unoptimized
                            style={{ imageRendering: "pixelated" }}
                        />
                    </div>
                    <span className="stat-label">{label}</span>
                    <div className="stat-bar-track">
                        <div
                            className="stat-bar-fill"
                            style={{
                                width: `${Math.min((values[key] / 30) * 100, 100)}%`,
                                background: color,
                            }}
                        />
                    </div>
                    <span className="stat-value" style={{ color }}>{values[key]}</span>
                </div>
            ))}
        </div>
    );
};

export default Status;
