<div align="center">

# 🎲 Better GM Than Yours

**API 기반 자동화 TRPG 세션 진행 서비스**  
*CoC 7판 기반 1:1 텍스트 세션을, 언제든 시작하고 “완결”까지 도달하도록 설계한 TRPG 전용 진행 엔진*

<br/>

<!-- 선택: 배지(원하는 것만 남겨도 됨) -->
![status](https://img.shields.io/badge/status-prototype-blue)
![rulebook](https://img.shields.io/badge/rulebook-CoC%207th-black)
![mode](https://img.shields.io/badge/mode-1%3A1%20session-orange)
![platform](https://img.shields.io/badge/platform-local%20run-lightgrey)

<br/>

</div>

---
# Better GM Than Yours

> AI가 GM과 KPC를 동시에 수행하는 TRPG 세션 자동화 플랫폼
> 룰북 RAG, 시나리오 진행, 캐릭터 페르소나, 주사위 판정, 비주얼 노벨형 UI를 결합한 AI-GM 프로젝트입니다.

<br />

## Final Report

프로젝트의 전체 기획, 구현 구조, 기술 설명, 데모 UI, 창업 플랜, 멘토링 피드백은 아래 최종 결과 보고서에서 확인할 수 있습니다.

[View Final Report](https://minju5054.github.io/GraduationPJ-TRPG/)

<br />

## Project Overview

**Better GM Than Yours**는 TRPG(Tabletop Role-Playing Game)에서 가장 큰 부담이 되는 GM(Game Master) 역할을 AI로 자동화하는 프로젝트입니다.

기존의 일반 챗봇은 자유로운 대화는 가능하지만, TRPG 세션에 필요한 룰 기반 판정, 장면 진행, 캐릭터 반응, 세션 상태 관리가 불안정합니다. 본 프로젝트는 LLM을 단순 대화 상대가 아니라 **TRPG 세션을 진행하는 AI-GM 엔진**으로 설계했습니다.

AI-GM은 사용자의 행동 입력을 바탕으로 현재 장면을 해석하고, 룰북 RAG와 캐릭터 데이터를 참고해 GM 서술, KPC 대사, 주사위 판정 결과를 생성합니다. 또한 배경 이미지와 캐릭터 스탠딩 이미지를 결합해 텍스트 중심 세션을 비주얼 노벨형 UI로 확장했습니다.

<br />

## Demo UI

![Demo UI](docs/BetterGMThanYours_readable_assets/demo_ui_livingroom.png)

<br />

## Key Features

### AI-GM Session Engine

* GM 없이 TRPG 세션 진행
* 사용자 입력에 따른 장면 묘사와 사건 전개
* KPC 대사 및 반응 자동 생성
* 세션 로그와 진행 상태 관리
* 섹션 종료 조건 감지 및 다음 장면 연결

### Rulebook-Based RAG

* Call of Cthulhu 7th Edition 룰북 기반 검색
* 판정 의도가 포함된 사용자 행동을 쿼리로 변환
* 관련 룰 조항 검색 후 판정 근거로 활용
* 성공 / 실패 / Hard Success / Extreme Success 판정 반영

### Character Persona System

* PC / KPC 정보 관리
* persona.json 기반 캐릭터 성격 구성
* Big Five 성격 수치, 관계 정보, 신념, 말투 반영
* KPC의 일관된 대화와 행동 생성

### Visual Novel-Style UI

* 시나리오 장소별 배경 이미지 표시
* 캐릭터 스탠딩 이미지를 배경 위에 합성
* 말하는 캐릭터는 전면 강조
* 말하지 않는 캐릭터는 dim 처리
* 채팅 로그에 캐릭터 초상화 기반 프로필 표시

### Image Layer

* 정적 배경 이미지 생성
* 캐릭터 초상화 생성
* `[장소: X]` 태그 기반 배경 전환
* 생성된 이미지 자산을 세션 UI와 연결

<br />

## System Architecture

![System Architecture](docs/BetterGMThanYours_readable_assets/demo_ui_livingroom.png)

<br />

## Core Flow

```text
User Input
   ↓
AI-GM Session Loop
   ↓
Context Builder
   ↓
Rulebook / Scenario / Character Retrieval
   ↓
LLM Generation
   ↓
Dice & Rule Judgment
   ↓
GM Narrative + KPC Dialogue
   ↓
Text + Image Session Output
```

<br />

## Tech Stack

| Area        | Stack                                             |
| ----------- | ------------------------------------------------- |
| Back-End    | FastAPI                                           |
| Database    | MongoDB                                           |
| AI          | LLM + Custom RAG                                  |
| Rule System | Call of Cthulhu 7th Edition                       |
| Image       | Static Background / Character Portrait Generation |
| Front-End   | Visual Novel-style Session UI                     |
| Report Page | HTML / CSS / GitHub Pages                         |

<br />

## Directory Structure

```text
GraduationPJ-TRPG/
├── TRPG/                         # React + Vite 기반 프론트엔드
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── data/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── README.md
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
│
├── database/                     # MongoDB 연동 및 stat DB 처리
│   ├── database.py
│   └── database_stat.py
│
├── docs/                         # GitHub Pages용 최종 결과 보고서
│   ├── BetterGMThanYours_readable_assets/
│   ├── index.html
│   └── style_pdf_safe_redesign.css
│
├── generated_assets/             # 생성된 이미지 자산
│   ├── backgrouds/
│   ├── characters/
│   └── sds/
│
├── models/                       # 페르소나 및 프롬프트 구성 모델
│   ├── persona.py
│   ├── persona_prompt.py
│   ├── prompt_base.py
│   └── type_model.py
│
├── prompts/                      # 세션 진행용 프롬프트 / 시나리오 데이터
│   ├── chat_history.json
│   ├── full_system_prompt.txt
│   ├── persona.json
│   ├── persona_AQ.json
│   ├── print_formatting_guide.txt
│   ├── scenario_secret.txt
│   ├── scene_public1.txt
│   ├── scene_public2.txt
│   ├── scene_public3.txt
│   ├── scene_public4.txt
│   ├── scene_public5.txt
│   ├── scene_public6.txt
│   ├── scene_public7.txt
│   └── trpg_rules.txt
│
├── services/                     # LLM, RAG, 판정, 프롬프트 서비스
│   ├── chat_openai.py
│   ├── judge.py
│   ├── prompt_service.py
│   └── rag.py
│
├── .env.example
├── .gitignore
├── CHANGES.md
├── README.md
├── Retrieval.py                  # RAG 검색 / retrieval 실행 로직
├── chain.py                      # LLM 체인 실행 로직
└── main.py                       # FastAPI 백엔드 진입점
```

<br />

## Project Pages

* [Final Report](https://minju5054.github.io/GraduationPJ-TRPG/)
* [Repository](https://github.com/minju5054/GraduationPJ-TRPG)

<br />

## Project Period

2026.03.03 - 2026.06.30

<br />

## Team

**4조 밥사조**

<br />

## Project Goal

본 프로젝트의 목표는 LLM을 활용해 “그럴듯한 대화”를 만드는 것이 아니라, TRPG 세션에 필요한 **룰, 판정, 캐릭터 반응, 장면 진행, 시각적 출력**을 하나의 실행 루프로 통합하는 것입니다.

이를 통해 사용자는 사람 GM 없이도 언제든 시나리오 기반 TRPG 세션을 시작하고, AI-GM과 KPC가 반응하는 몰입형 세션을 경험할 수 있습니다.

<br />

## What I Built & Learned

### 구현하며 배운 점

**LLM을 "엔진"으로 쓰는 설계.** 일반 챗봇과 달리 세션 상태(장면, 캐릭터 스탯, 로그)가 프롬프트 밖 MongoDB에 살아 있어야 한다는 걸 배웠습니다. 매 턴 `build_message_chain`으로 시스템 프롬프트 + 시나리오 섹션 + 대화 이력을 재조립하고, 모델 출력의 `end of section` 신호를 감지해 섹션을 전진시키는 상태 머신을 만들면서, LLM 출력을 신뢰 가능한 제어 신호로 다루는 법(감지 → 상태 변경 → 재생성 1회 제한)을 익혔습니다.

**룰북 RAG와 multi-hop 검색.** CoC 7판 룰북을 임베딩(text-embedding-3-large)해 MongoDB에 저장하고 FAISS L2 인덱스로 검색하는 파이프라인을 직접 구축했습니다. 룰북 특성상 "제N장 참고" 같은 상호참조가 많아, 검색 결과의 참조를 따라가 본문을 추가로 모으는 multi-hop 검색(`search_with_references`)이 필요하다는 걸 실제 판정 품질 문제를 겪으며 배웠습니다. 또한 분위기 서사 전체가 아니라 GM 메시지의 `기능: 관찰력` 같은 판정 키워드를 추출해 쿼리로 써야 정확한 룰이 검색된다는 것도요.

**구조화된 출력으로 만드는 주사위 판정.** "어떤 스탯으로 판정할지"를 LLM이 자유 텍스트로 답하면 파싱이 불안정합니다. Pydantic 스키마(`StatCheckRequirement`)로 스탯 키·비교 연산자를 구조화 출력받아 DB의 캐릭터 시트와 대조하고, 실제 주사위 값과 비교하는 판정 루프를 만들며 LLM+규칙 하이브리드 시스템 설계를 경험했습니다.

**비동기 FastAPI 실전.** Motor(async MongoDB) 커서 정렬에서 분 단위 timestamp의 동률 문제를 `_id` 보조 정렬로 해결했고, 동기 FAISS 검색이 이벤트 루프를 막지 않도록 `asyncio.to_thread`로 감싸는 등 async 경계 관리를 배웠습니다.

**프론트-백 연동과 에셋 파이프라인.** React 비주얼노벨 UI와 FastAPI를 CORS로 연결하고, 생성형 이미지(배경/스탠딩/SD)를 장소 태그 `[장소: X]` → 파일 매핑으로 서빙하는 구조를 만들었습니다. 없는 장소는 404를 돌려주고 프론트에서 폴백 처리하는 식으로, 콘텐츠가 늘어나도 한 줄 추가로 확장되게 설계했습니다.

**프롬프트 버전 관리.** 프롬프트를 코드처럼 version1/version2로 관리하며 반복 개선했고, 시나리오를 공개 장면(`scene_public*`)과 비밀(`scenario_secret`)로 분리해 스포일러 없이 진행을 제어하는 구조를 잡았습니다.
