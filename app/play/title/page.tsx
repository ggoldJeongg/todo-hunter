"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import RenderTitleItem from "./_components/renderTitleItem";
import { useUserStore } from "@/utils/stores/userStore";

export default function TitlePage(){
    const [titles, setTitles] = useState([]);
    const [page, setPage] = useState(1);

    const { id } = useUserStore();

    const getTitle = useCallback(async (page: number) => {
        try {
            const res = await fetch(`/api/title?page=${page}`, {
                headers: {
                    "user-id": id?.toString() || "",
                }
            });
            const data = await res.json();
            setTitles(data);
        }
        catch {
            // 칭호 조회 실패
        }
    }, [id]);

    const gridItems = Array.from({ length: 9 }, (_, index) => titles[index] ||
        { name: "잠금", titleId: "df" });

    const hasPrevPage = page > 1;
    const hasNextPage = titles.length > 0 && titles.length % 9 === 0;

    const handlePreviousPage = () => {
        if (hasPrevPage) setPage(page - 1);
    };

    const handleNextPage = () => {
        if (hasNextPage) setPage(page + 1);
    };

    useEffect(() => {
        getTitle(page);
    }, [getTitle, page]);

    return (
        <div
            className="flex-1 flex flex-col items-center justify-center min-h-screen"
            style={{
                backgroundImage: "url('/images/backgrounds/table-background1.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* 책 배경 */}
            <div className="relative w-full mx-auto" style={{ height: "calc(100vh - 90px)" }}>
                <Image
                    src="/images/backgrounds/titlebook-backround.png"
                    alt="칭호 도감 책"
                    fill
                    className="object-contain"
                    unoptimized
                    priority
                />

                {/* 책 위에 콘텐츠 오버레이 */}
                <div className="absolute top-[2%] bottom-[12%] left-[20%] right-[12%] flex flex-col">
                    {/* 칭호 그리드 */}
                    <div className="flex-1 grid grid-cols-3 gap-6 content-center px-1">
                        {gridItems.map((title, index) => (
                            <RenderTitleItem key={index} title={title} index={index} />
                        ))}
                    </div>

                    {/* 이전/다음 버튼 */}
                    <div className="flex justify-between items-center pb-11">
                        <button
                            className={`text-sm font-galmuri11-bold cursor-pointer ${hasPrevPage ? "text-gray-800" : "text-gray-400"}`}
                            onClick={handlePreviousPage}
                            disabled={!hasPrevPage}
                        >
                            ≪ 이전
                        </button>
                        <button
                            className={`text-sm font-galmuri11-bold cursor-pointer ${hasNextPage ? "text-gray-800" : "text-gray-400"}`}
                            onClick={handleNextPage}
                            disabled={!hasNextPage}
                        >
                            다음 ≫
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}