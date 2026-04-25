export interface RenderTitleDTO {
    titleId: number;
    name: string;
    description: string;
    reqStat: string;
    reqValue: number;
    img: string;
    count: number;
    unlocked: boolean;
    equipped: boolean;
}

export interface TitleDexDTO {
    titles: RenderTitleDTO[];
    equippedTitleId: number | null;
}
