import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/utils/auth";
import { RuleSplitSuggester } from "@/infrastructure/split/RuleSplitSuggester";

const suggester = new RuleSplitSuggester();

export async function POST(req: NextRequest) {
  try {
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, tagged, difficulty } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "할일 이름이 필요합니다." },
        { status: 400 }
      );
    }

    const suggestions = suggester.suggest(name, tagged ?? "STR", difficulty ?? "normal");

    return NextResponse.json({ success: true, suggestions });
  } catch (error) {
    console.error("쪼개기 추천 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "추천 생성 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
