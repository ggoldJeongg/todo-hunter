import { RenderTitleDTO } from "@/application/usecases/title/dtos";
import Image from "next/image";

type TitleItemProps = {
    title: RenderTitleDTO;
    index: number;
};

const RenderTitleItem = ({ title, index }: TitleItemProps) => {
    const isLocked = title.titleId === "df";
    const imageUrl = isLocked ? "/icons/lock.png" : `${title.img}`;
    return (
        <div key={index} className="flex flex-col items-center text-center">
            <div className="bg-[#e8dfc8] is-rounded p-1 aspect-square flex items-center justify-center w-full">
                <Image
                    className={`mx-auto h-auto ${isLocked ? "max-w-[30px]" : "w-full max-w-[55px]"}`}
                    src={imageUrl}
                    alt={`${title.name || "칭호"} 이미지`}
                    width={isLocked ? 30 : 55}
                    height={isLocked ? 30 : 55}
                    loading={index === 0 ? "eager" : "lazy"}
                    priority={index === 0}
                    unoptimized
                />
            </div>
            <p className="text-[9px] text-gray-700 leading-tight mt-1 truncate w-full">{title.name}</p>
        </div>
    );
}

export default RenderTitleItem;