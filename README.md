# TODO-HUNTER : ~ RETURN OF SCROLL ~

<img src="https://github.com/user-attachments/assets/eadbc89a-10a0-45a9-86d8-33d74376ff49">

### 프로젝트 소개
투두리스트 사용시 현실에서 즉각적인 성장을 체감하기 어려워 습관 형성이 힘든 문제점을 발견하고, <br> 유저 상호작용과 시각적 성장 요소를 추가한 게이미피케이션(gamification) 웹 서비스입니다.

[👉 할일 사냥하러 가기! (배포 링크)](http://todo-hunter.com) 

- 개발 기간 : 2025.02.14 ~ (진행중)
 
### 시작 가이드
```
git clone https://github.com/ggoldJeongg/todo-hunter
cd todo-hunter
npm install
npm run dev

TEST ID : test / TEST PASSWORD : testcode

version : Typescript 5+ / React 19+ / Next.js 15+ / Node v22.14.0 (25.03.20 기준 LTS)
```

### 기술 스택
| CATEGORY| SKILLS|
| --- | --- | 
| FrontEnd| <img src="https://img.shields.io/badge/Typescript-3178C6?style=for-the-badge&logo=Typescript&logoColor=white"> <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=React&logoColor=white"> <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=TailwindCSS&logoColor=white"> <img src="https://img.shields.io/badge/Shadcn/UI-000000?style=for-the-badge&logo=Shadcn/UI&logoColor=white"> <img src="https://img.shields.io/badge/Zustand-8D6748?style=for-the-badge&logo=Zustand&logoColor=white"> <img src="https://img.shields.io/badge/node.cron-006600?style=for-the-badge&logo=node-cron&logoColor=white"> <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=Next.js&logoColor=white"> |
| Database & ORM| <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=PostgreSQL&logoColor=white"> <img src="https://img.shields.io/badge/prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white"> <img src="https://img.shields.io/badge/redis-FF4438?style=for-the-badge&logo=redis&logoColor=white"> |
| Deploy | <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=PWA&logoColor=white"> <img src="https://img.shields.io/badge/LINUX (Ubuntu)-FCC624?style=for-the-badge&logo=LINUX&logoColor=white">  <img src="https://img.shields.io/badge/NginX-009639?style=for-the-badge&logo=NginX&logoColor=white"> <img src="https://img.shields.io/badge/Github Actions-2088FF?style=for-the-badge&logo=Github Actions&logoColor=white"> <img src="https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=PM2&logoColor=white"> |
| Collaboration| <img src="https://img.shields.io/badge/git-F05032?style=for-the-badge&logo=git&logoColor=white"> <img src="https://img.shields.io/badge/github-181717?style=for-the-badge&logo=github&logoColor=white"> <img src="https://img.shields.io/badge/figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white"> |


### 기능 소개
| 영상 | 1. 퀘스트 페이지 |
| --- | --- | 
| <img src="https://github.com/user-attachments/assets/616a6be9-784a-4639-ad24-d4ff5d88f072" width="200"> | - 할일 추가/삭제/완료 반복 여부에 따라 일일 / 주간 할일 지정 <br> - 할일 완료시 카테고리별 스탯, 일일 진행 상태 % 증가 <br> - pixi.js를 활용한 캐릭터 공격 모션 처리 |

| 영상 | 2. 광장 |
| --- | --- | 
| <img src="https://github.com/user-attachments/assets/7ee8b1ec-e2ee-4a62-99b8-4e75d224b1a6" width="200"> | - pixi.js를 활용한 캐릭터와 npc 상호작용 기능 <br> - 할일 돌림판, 휴식 행동 추천 인터랙티브 npc 구현 |

| 영상 | 3. 캐릭터 페이지 |
| --- | --- | 
| <img src="https://github.com/user-attachments/assets/edb7fcd7-6d09-4051-9d0f-e67833a5bd01" width="200"> | - 유저의 당일 진척도, 카테고리별 완료 수치를 시각적으로 확인 <br> - 진행률 계산: 오늘 추가된 퀘스트 목록을 조회한 뒤, <br> 완료된 퀘스트 개수를 기반으로 진행률 (%)을 계산하여 반환하는 usecase 구현 <br> - pixi.js를 활용한 할일 완료 정원 가꾸기 기능 구현 |

| 영상 | 4. 칭호 페이지 |
| --- | --- | 
| <img src="https://github.com/user-attachments/assets/29c5d825-0a6c-4342-8aa5-6bbcb49b2732" width="200"> | - titles 테이블에 저장된 칭호 목록 확인 가능 <br> - 특정 조건 달성시 칭호 획득 가능 <br> - 수집형 컨텐츠를 통해 가변적 보상으로 만족할 수 있도록 함  |

| 영상 | 5. 주간 엔딩 페이지 |
| --- | --- | 
| <img src="https://github.com/user-attachments/assets/e0dd58f5-bd36-401b-95ea-89ba77557de2" width="200"> | - 칭호 조건에 따른 일요일 엔딩 스토리 확인 <br> - 텍스트 + 이미지 처리를 통한 스토리 전달 <br> - 주기적 DB 업데이트 스케줄링: node-cron을 활용하여 <br> 특정 요일과 시간에 character 및 status 테이블의 데이터를 자동 업데이트, 주간엔딩 실행 |

### 배포 전략
<img src="https://github.com/user-attachments/assets/3b6bd478-cb9c-4a50-8339-5aa48cb8a869">
- main repository와 node-cron 구동을 위한 cron repository를 동시 운영을 위해 CI/CD를 구축하여 자동화를 통한 효율적인 배포를 진행함.

[관련 링크 : 👉cron-job repository](https://github.com/FRONT-END-BOOTCAMP-PLUS-3/todo-hunter-cron)
