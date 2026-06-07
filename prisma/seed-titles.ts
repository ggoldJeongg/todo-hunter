import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TITLES = [
  // STR (체력)
  { titleName: "초보 모험가", description: "체력 스탯이 1 이상일 때 획득", reqStat: "str", reqValue: 1 },
  { titleName: "단련된 전사", description: "체력 스탯이 5 이상일 때 획득", reqStat: "str", reqValue: 5 },
  { titleName: "강철의 용사", description: "체력 스탯이 10 이상일 때 획득", reqStat: "str", reqValue: 10 },

  // INT (지력)
  { titleName: "호기심 많은 학생", description: "지력 스탯이 1 이상일 때 획득", reqStat: "int", reqValue: 1 },
  { titleName: "지식의 탐구자", description: "지력 스탯이 5 이상일 때 획득", reqStat: "int", reqValue: 5 },
  { titleName: "현명한 현자", description: "지력 스탯이 10 이상일 때 획득", reqStat: "int", reqValue: 10 },

  // EMO (매력)
  { titleName: "매력의 씨앗", description: "매력 스탯이 1 이상일 때 획득", reqStat: "emo", reqValue: 1 },
  { titleName: "공감하는 마음", description: "매력 스탯이 5 이상일 때 획득", reqStat: "emo", reqValue: 5 },
  { titleName: "영혼의 시인", description: "매력 스탯이 10 이상일 때 획득", reqStat: "emo", reqValue: 10 },

  // FIN (경제력)
  { titleName: "절약하는 견습생", description: "경제력 스탯이 1 이상일 때 획득", reqStat: "fin", reqValue: 1 },
  { titleName: "수완 좋은 상인", description: "경제력 스탯이 5 이상일 때 획득", reqStat: "fin", reqValue: 5 },
  { titleName: "황금의 대부호", description: "경제력 스탯이 10 이상일 때 획득", reqStat: "fin", reqValue: 10 },

  // LIV (생활력)
  { titleName: "정돈된 일상", description: "생활력 스탯이 1 이상일 때 획득", reqStat: "liv", reqValue: 1 },
  { titleName: "생활의 달인", description: "생활력 스탯이 5 이상일 때 획득", reqStat: "liv", reqValue: 5 },
  { titleName: "완벽한 수호자", description: "생활력 스탯이 10 이상일 때 획득", reqStat: "liv", reqValue: 10 },
];

async function main() {
  console.log("칭호 시드 데이터 삽입 시작...\n");

  let created = 0;
  let skipped = 0;

  for (const title of TITLES) {
    // 이미 존재하는지 확인 (titleName + reqStat + reqValue로 판단)
    const existing = await prisma.title.findFirst({
      where: {
        titleName: title.titleName,
        reqStat: title.reqStat,
        reqValue: title.reqValue,
      },
    });

    if (existing) {
      console.log(`  [건너뜀] ${title.titleName} (이미 존재)`);
      skipped++;
      continue;
    }

    await prisma.title.create({ data: title });
    console.log(`  [추가] ${title.titleName} (${title.reqStat} >= ${title.reqValue})`);
    created++;
  }

  console.log(`\n완료: ${created}개 추가, ${skipped}개 건너뜀 (총 ${TITLES.length}개)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
