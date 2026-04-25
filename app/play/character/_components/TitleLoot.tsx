"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { RenderTitleDTO } from "@/application/usecases/title/dtos/RenderTitleDTO";

const TitleLoot = () => {
    const [equipped, setEquipped] = useState<RenderTitleDTO | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/title", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled || !data) return;
                const found = (data.titles ?? []).find(
                    (t: RenderTitleDTO) => t.unlocked && t.equipped,
                );
                setEquipped(found ?? null);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    if (!equipped) return null;

    return (
        <div className="title-loot" aria-label="장착 칭호">
            <span className="loot-item loot-equipped">
                <Image
                    src={equipped.img}
                    alt={equipped.name}
                    width={48}
                    height={48}
                    unoptimized
                    style={{ imageRendering: "pixelated", display: "block" }}
                />
            </span>
        </div>
    );
};

export default TitleLoot;
