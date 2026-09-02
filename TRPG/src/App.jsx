import React, { useState, useEffect, useRef } from "react";
import "./App.css";

import characterSheet from "./data/characterSheet.json";

// ★ 캐릭터 초상화는 백엔드(/character/{role})에서 서빙 -> getPortraitById 참고

// ★ GPT 로봇 아이콘
import gptRobot from "./assets/gptRobot.png";

/** 현재 날짜/시간 문자열을 반환하는 헬퍼 */
const getNowDateTime = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return {
    date: `${year}/${month}/${day}`,
    time: `${hours}:${minutes}`,
  };
};

/* 캐릭터 색상 (최대 4명) */
const CHARACTER_COLORS = ["#f06292", "#4fc3f7", "#ffb74d", "#ce93d8"];

/* =============== 로비에 표시할 기본 방 목록 =============== */
const INITIAL_ROOMS = [
  {
    id: 1,
    title: "겨울 예정 청춘 1권",
    tag: "Legacy",
    nextLabel: "다음 게임 일시",
    nextText: "계획된 일정 없음",
    playerCount: 4,
  },
  {
    id: 2,
    title: "프레스키 카리스마",
    tag: "Legacy",
    nextLabel: "다음 게임 일시",
    nextText: "계획된 일정 없음",
    playerCount: 4,
  },
  {
    id: 3,
    title: "실낙원",
    tag: "Legacy",
    nextLabel: "다음 게임 일시",
    nextText: "계획된 일정 없음",
    playerCount: 4,
  },
];

/* ==================== 자동화 시트용 스킬 데이터 ==================== */
/* 1. 직업 기능 점수(감정 ~ 심리학) */
const JOB_SKILLS = [
  { id: "감정", label: "감정", base: 5 },
  { id: "고고학", label: "고고학", base: 1 },
  { id: "관찰력", label: "관찰력", base: 25 },
  { id: "근접전(격투)", label: "근접전(격투)", base: 25 },
  { id: "기계수리", label: "기계수리", base: 10 },
  { id: "도약", label: "도약", base: 20 },
  { id: "듣기", label: "듣기", base: 20 },
  { id: "말재주", label: "말재주", base: 5 },
  { id: "매혹", label: "매혹", base: 15 },
  { id: "법률", label: "법률", base: 5 },
  { id: "변장", label: "변장", base: 5 },
  { id: "사격(권총)", label: "사격(권총)", base: 20 },
  { id: "사격(라/산)", label: "사격(라/산)", base: 25 },
  { id: "설득", label: "설득", base: 10 },
  { id: "손놀림", label: "손놀림", base: 10 },
  { id: "수영", label: "수영", base: 20 },
  { id: "승마", label: "승마", base: 5 },
  { id: "심리학", label: "심리학", base: 10 },
];

/* 2. 관심 기능 점수(언어 ~ 추적) */
const INTEREST_SKILLS = [
  { id: "언어(모국어)", label: "언어(모국어)", base: 0 },
  { id: "역사", label: "역사", base: 5 },
  { id: "열쇠공", label: "열쇠공", base: 1 },
  { id: "오르기", label: "오르기", base: 20 },
  { id: "오컬트", label: "오컬트", base: 5 },
  { id: "위협", label: "위협", base: 15 },
  { id: "은밀행동", label: "은밀행동", base: 20 },
  { id: "응급처치", label: "응급처치", base: 30 },
  { id: "의료", label: "의료", base: 1 },
  { id: "인류학", label: "인류학", base: 1 },
  { id: "자동차 운전", label: "자동차 운전", base: 20 },
  { id: "자료조사", label: "자료조사", base: 20 },
  { id: "자연", label: "자연", base: 10 },
  { id: "재력", label: "재력", base: 0 },
  { id: "전기수리", label: "전기수리", base: 10 },
  { id: "정신분석", label: "정신분석", base: 1 },
  { id: "중장비 조작", label: "중장비 조작", base: 1 },
  { id: "추적", label: "추적", base: 10 },
];

/* 3. 스킬 성장치(크툴루 신화 ~ 회피) */
const GROWTH_SKILLS = [
  { id: "크툴루 신화", label: "크툴루 신화", base: 0 },
  { id: "투척", label: "투척", base: 20 },
  { id: "항법", label: "항법", base: 10 },
  { id: "회계", label: "회계", base: 5 },
  { id: "회피", label: "회피", base: 0 },
];

const ALL_SKILLS = [...JOB_SKILLS, ...INTEREST_SKILLS, ...GROWTH_SKILLS];

/** 캐릭터 id -> 초상화 이미지 (백엔드 서빙)
 *  - 999: KPC(AI 동행 캐릭터)  -> /character/KPC
 *  - 그 외 truthy id: 플레이어 -> /character/PC
 */
const getPortraitById = (id) => {
  if (id === 999) return "http://localhost:8000/character/KPC";
  if (id) return "http://localhost:8000/character/PC";
  return null;
};

// 캐시 무력화용 버전 (이미지 교체 후 브라우저 캐시가 옛 버전을 잡고 있을 때 v를 올림)
const IMG_V = "?v=3";
// 채팅 아바타용 SD 이미지 (전신 스탠딩과 별개)
const SD_PC = "http://localhost:8000/sd/PC" + IMG_V;
const SD_KPC = "http://localhost:8000/sd/KPC" + IMG_V;

/** 표시에서 내부 제어용 태그([장소: X], [페이싱 ...])는 제거 */
const stripDisplayTags = (text) =>
  (text || "")
    .replace(/\[장소:[^\]]*\]/g, "")
    .replace(/\[페이싱[^\]]*\]/g, "")
    .trim();

/** "GM: ..." / "KPC: ..." 세그먼트로 분리 (줄 단위 파싱)
 *  - 줄머리가 GM:/KPC: 면 새 발화 시작, 그 외 줄은 직전 발화에 이어붙임(멀티라인 대사).
 *  - 빈 KPC 줄(내용 없이 KPC: 만 있고 다음 줄에 GM:)에도 안전하게 동작. (정규식판은 이 경우 GM이 KPC에 빨려들어가는 버그가 있었음) */
const splitGmKpc = (content) => {
  const parts = [];
  let cur = null;
  for (const line of (content || "").split("\n")) {
    const m = line.match(/^\s*(GM|KPC)\s*:\s*(.*)$/);
    if (m) {
      if (cur) parts.push(cur);
      cur = { role: m[1], text: m[2] };
    } else if (cur) {
      cur.text += "\n" + line; // 이어지는 줄
    }
    // cur 없고 마커도 아니면(PROGRESS 등) 무시
  }
  if (cur) parts.push(cur);
  return parts
    .map((p) => ({ role: p.role, text: stripDisplayTags(p.text) }))
    .filter((p) => p.text); // 빈 세그먼트 제거
};

/** 메시지 1개 -> 화면 말풍선 배열. AI(senderId 999)면 GM/KPC로 분리해 각각 아바타 지정 */
const getDisplayBubbles = (msg) => {
  if (msg.senderId === 999) {
    const content = msg.content || msg.text || "";
    const parts = splitGmKpc(content);
    const segs = parts.length
      ? parts
      : [{ role: "GM", text: stripDisplayTags(content) }];
    return segs.map((p, i) => ({
      key: `${msg.id}-${i}`,
      sender: p.role,                              // "GM" / "KPC"
      speaker: p.role,                             // 스탠딩 페이드용
      text: p.text,
      avatar: p.role === "KPC" ? SD_KPC : gptRobot, // KPC=SD 아바타, GM=로봇(내레이터)
      date: msg.date,
      time: msg.time,
    }));
  }
  // 일반 메시지(유저/다이스봇 등)
  return [
    {
      key: msg.id,
      sender: msg.sender,
      speaker: msg.senderId ? "PC" : null,         // 플레이어 발화
      text: msg.text || msg.content,
      avatar: msg.senderId ? SD_PC : null,         // 플레이어=SD PC
      date: msg.date,
      time: msg.time,
    },
  ];
};

function App() {
  /* ====== 공통 상태 : 로비 / 퍼소나 / 룸 전환 ====== */
  const [currentView, setCurrentView] = useState("lobby"); // "lobby" | "persona" | "room"
  const [currentRoom, setCurrentRoom] = useState(null);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);

  // ★ 캐릭터 시트 마법사 단계 (지금은 1단계만 사용)
  const [personaStep, setPersonaStep] = useState(1);

  const [character, setCharacter] = useState(characterSheet.character);
  const options = characterSheet.options;
  const DEFAULT_STATS = {
    STR: 0,
    DEX: 0,
    POW: 0,
    CON: 0,
    APP: 0,
    EDU: 0,
    SIZ: 0,
    INT: 0,
    MOVE: 0
  };
  const [stats,setStats] = useState(DEFAULT_STATS);
  // GM의 [장소: X] 태그로 교체되는 배경 이미지 URL (null이면 기본 배경)
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  // 현재 발화자("PC"/"KPC"/"GM") — 스탠딩 페이드용
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const handleStatChange = (e) => {
    const{name, value}=e.target;
    const numValue = value === ""?"": Number(value);
    setStats((prev)=>({
      ...prev,
      [name]: numValue
    }))
  }
  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setCharacter((prev) => ({
      ...prev,
      basic: {
        ...prev.basic,
        [name]: value,
      },
    }));
  };

  const handleAppearanceChange = (e) => {
    const { name, value } = e.target;
    const numberFields = ["age", "heightCm", "attractiveness"];
    const parsedValue =
      numberFields.includes(name)
        ? value === ""
          ? null
          : Number(value)
        : value;

    setCharacter((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [name]: parsedValue,
      },
    }));
  };

  const { basic, appearance } = character;

  // 악세사리 토글
  const toggleAccessory = (value) => {
    setCharacter((prev) => {
      const current = prev.appearance.accessories || [];
      const exists = current.includes(value);
      const next = exists
        ? current.filter((v) => v !== value)
        : [...current, value];

      return {
        ...prev,
        appearance: {
          ...prev.appearance,
          accessories: next,
          hasAccessories: next.length > 0,
        },
      };
    });
  };

  // 겉보기(분위기) 토글
  const toggleVibe = (value) => {
    setCharacter((prev) => {
      const current = prev.appearance.vibes || [];
      const exists = current.includes(value);
      const next = exists
        ? current.filter((v) => v !== value)
        : [...current, value];

      return {
        ...prev,
        appearance: {
          ...prev.appearance,
          vibes: next,
        },
      };
    });
  };

  /* ====== 룸 내부 상태들 ====== */
  const [selectedCharacterId, setSelectedCharacterId] = useState(1);
  const [activeTab, setActiveTab] = useState("메인");

  const [chatMessages, setChatMessages] = useState({
    메인: [],
    정보: [],
    잡담: [],
  });

  const [chatText, setChatText] = useState("");
  const chatLogRef = useRef(null);


  // ===== GPT 상태 =====
  const [gptOpen, setGptOpen] = useState(false);
  const [gptMessages, setGptMessages] = useState([
    {
      id: 1,
      role: "system",
      text: '게임 진행에 대한 코멘트를 여기에 적어 주세요.\n예) "조금 루즈한 것 같아. 더 빠르게 진행해줘."',
    },
  ]);
  const [gptInput, setGptInput] = useState("");
  const gptLogRef = useRef(null);

  // ===== 자동화 시트 표시 여부 & 스킬 입력 값 =====
  const [showSheet, setShowSheet] = useState(false);

  const [skillInputs, setSkillInputs] = useState(() => {
    const obj = {};
    ALL_SKILLS.forEach((s) => {
      obj[s.id] = 0;
    });
    return obj;
  });

  /* ====== 현재 방의 인원 수에 맞춰 캐릭터 생성 (1~4명) ====== */
  const playerCount = currentRoom?.playerCount ?? 4;

  const characters = Array.from({ length: playerCount }, (_, i) => ({
    id: i + 1,
    name: `PC${i + 1}`,
    color: CHARACTER_COLORS[i],
    hp: 5,
    hpMax: 10,
    san: 47,
    sanMax: 52,
  }));

  /* ====== 로비 <-> persona <-> 룸 전환 함수 ====== */
  const handleEnterRoom = (room) => {
    setCurrentRoom(room);
    setSelectedCharacterId(1); // 먼저 작성할 PC
    setPersonaStep(1); // 마법사 첫 단계
    setCurrentView("persona"); // 중간 캐릭터 시트 화면으로 이동
  };

  const handleBackToLobby = () => {
    setCurrentView("lobby");
    setPersonaStep(1);
  };

  const handlePersonaComplete = () => {
    // 1단계 설문 완료 ACK
    alert("1단계 설문이 완료되었습니다!\n세션에 입장합니다.");
    setCurrentView("room");
  };

  // 로비에서 새 시나리오 생성 (이름 + 인원 수)
  const handleCreateRoom = () => {
    const title = window.prompt("새 시나리오 이름을 입력하세요", "새 시나리오");
    if (!title) return;

    const countStr = window.prompt(
      "사용할 플레이어 수를 입력하세요 (1~4명)",
      "4"
    );
    if (countStr === null) return;

    let count = Number(countStr);
    if (Number.isNaN(count)) count = 4;
    if (count < 1) count = 1;
    if (count > 4) count = 4;

    const newRoom = {
      id: Date.now(),
      title,
      tag: "Custom",
      nextLabel: "다음 게임 일시",
      nextText: "미정",
      playerCount: count,
    };

    setRooms((prev) => [newRoom, ...prev]);
  };

  /* ===== 자동화 시트 입력 변경 ===== */
  const handleSkillInputChange = (id, value) => {
    const num = Number(value) || 0;
    setSkillInputs((prev) => ({
      ...prev,
      [id]: num,
    }));
  };

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  // 채팅/ GPT 스크롤
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  useEffect(() => {
    if (gptLogRef.current) {
      gptLogRef.current.scrollTop = gptLogRef.current.scrollHeight;
    }
  }, [gptMessages, gptOpen]);

  const handleSelectCharacter = (id) => {
    setSelectedCharacterId(id);
  };
//기본적인 채팅 관련 type="text" (일부 완료 *sender, senderId 부분 수정 필요)
  const handleSendChat = async () => {
    const text = chatText.trim();
    if (!text) return;
    const { date, time } = getNowDateTime();
    if (text === "판정") {
      const roll = Math.floor(Math.random() * 100) + 1;
      const DiceMsgObj = {
        room_id: String(currentRoom.id) ,
        id: Date.now(),
        sender: selectedCharacter?.name ?? "주낙엽",
        senderId: selectedCharacter?.id ?? null,
        date,
        time,
        diceval : roll
      }
      setChatMessages((prev) => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab],
          {
            id: Date.now(),
            sender: "다이스봇",
            senderId: null,
            date,
            time,
            text: `[주사위] ${selectedCharacter?.name ?? "PC"} → 1d100 = ${roll}`,
          },
        ],
      }));
      setChatText("");
      try{
        const res = await fetch("http://localhost:8000/dice",{
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(DiceMsgObj)
        });
        const dicedata = await res.json();
        setChatMessages((prev) => ({
          ...prev,
          [activeTab]: [
          ...prev[activeTab],
          dicedata
        ],
      }));
      applyLocationBackground(dicedata.content);   // GM 응답의 [장소: X] -> 배경 교체
      }catch(e){
        console.error("주사위 입력 -> 객체 생성 -> FASTAPI main (/dice) sync 실패",e);
      }
      

    } else {
        const newMsgObj = {
          room_id: String(currentRoom.id) ,
          id: Date.now(),
          sender: selectedCharacter?.name ?? "주낙엽",
          senderId: selectedCharacter?.id ?? null,
          date,
          time,
          content : text
        };
        setChatMessages((prev) => ({
          ...prev,
          [activeTab]: [
            ...prev[activeTab],
            newMsgObj
          ],
        }));
        setChatText("");
        try {
          const res = await fetch("http://localhost:8000/gpt",{
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(newMsgObj)
          });
          const data = await res.json();
          setChatMessages((prev) => ({
            ...prev,
            [activeTab]: [
            ...prev[activeTab],
            data
            ],
          }));
          applyLocationBackground(data.content);   // GM 응답의 [장소: X] -> 배경 교체
        } catch(e){
          console.error("메세지 입력 -> 객체 생성 -> FASTAPI main sync 실패",e);
        }
    }
    
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };
//주사위 돌리는 거 판전 관련 type="dice" (수정 예정)
  const handleDiceRoll = () => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const { date, time } = getNowDateTime();
    setChatMessages((prev) => ({
      ...prev,
      [activeTab]: [
        ...prev[activeTab],
        {
          id: Date.now(),
          sender: "다이스봇",
          senderId: null,
          date,
          time,
          text: `[주사위] ${selectedCharacter?.name ?? "PC"} → 1d100 = ${roll}`,
        },
      ],
    }));
  };


  const handleOpenGpt = () => setGptOpen(true);
  const handleCloseGpt = () => setGptOpen(false);

  const handleSendGpt = () => {
    const content = gptInput.trim();
    if (!content) return;

    const newUserMsg = {
      id: Date.now(),
      role: "user",
      text: content,
    };

    const fakeAssistant = {
      id: Date.now() + 1,
      role: "assistant",
      text: "여기에 GPT API 응답을 표시하면 됩니다.\n(현재는 예시 더미 텍스트입니다.)",
    };

    setGptMessages((prev) => [...prev, newUserMsg, fakeAssistant]);
    setGptInput("");
  };

  const handleGptKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendGpt();
    }
  };

  // ===== 채팅 전체를 JSON 파일로 저장 =====
  const handleExportChat = () => {
    const { date, time } = getNowDateTime();

    const exportData = {
      roomTitle: currentRoom?.title || "무제 방",
      savedAt: `${date} ${time}`,
      chats: {},
    };

    Object.keys(chatMessages).forEach((tab) => {
      exportData.chats[tab] = (chatMessages[tab] || []).map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        senderId: msg.senderId,
        date: msg.date,
        time: msg.time ?? "",
        text: msg.text,
      }));
    });

    const jsonString = JSON.stringify(exportData, null, 2);

    const blob = new Blob([jsonString], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeTitle = (currentRoom?.title || "room").replace(
      /[\\/:*?"<>|]/g,
      "_"
    );

    link.href = url;
    link.download = `chat_${safeTitle}_${date.replace(/\//g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };
  const handleSaveToDB = async () => {
    const statobj = {
      character_id : selectedCharacterId,
      stat : stats
    };
    try{
      const response = await fetch("http://localhost:8000/stats",{
        method: "POST",
        headers:{
          "Content-Type": "application/json",
        },
        body: JSON.stringify(statobj)
      });
      if(response.ok){
        console.log("db 연동 성공");
      }else{
        console.error("stat db 연동 실패");
      }
    } catch(error){
      console.error(error);
    }
  }
  // ===== DB에서 캐릭터 스탯 불러오기 =====
  const loadStatsFromDB = async (characterId) => {
    try {
      const response = await fetch(`http://localhost:8000/stats/${characterId}`);
      if (!response.ok) {
        console.error("stat 불러오기 실패");
        return;
      }
      const data = await response.json();
      // 저장된 스탯이 있으면 폼에 채우고, 없으면 기본값(0)으로 초기화
      setStats(data.stat ?? DEFAULT_STATS);
    } catch (error) {
      console.error("stat 불러오기 중 오류", error);
    }
  };
  // 선택된 캐릭터가 바뀔 때마다 해당 캐릭터의 스탯을 DB에서 로드
  useEffect(() => {
    loadStatsFromDB(selectedCharacterId);
  }, [selectedCharacterId]);
  // ===== GM 응답의 [장소: X] 태그를 읽어 배경 이미지를 교체 =====
  const applyLocationBackground = async (text) => {
    if (!text) return;
    const match = text.match(/\[장소:\s*([^\]]+)\]/);
    if (!match) return;                       // 장소 태그 없으면 배경 유지
    const location = match[1].trim();
    const url = `http://localhost:8000/background/${encodeURIComponent(location)}`;
    try {
      const res = await fetch(url);           // 이미지 존재 여부 확인
      if (res.ok) {
        setBackgroundUrl(url);                // 있으면 교체
      }
      // 404(이미지 없는 장소)면 아무 것도 안 함 -> 이전 배경 유지(폴백)
    } catch (e) {
      console.error("배경 이미지 로드 실패", e);
    }
  };
  // 최신 메시지의 발화자를 추적해 스탠딩 페이드를 갱신 (발화자 전환 시 active/dim 교체)
  useEffect(() => {
    const msgs = chatMessages[activeTab] || [];
    const bubbles = msgs.flatMap((m) => getDisplayBubbles(m));
    for (let i = bubbles.length - 1; i >= 0; i--) {
      if (bubbles[i].speaker) {
        setCurrentSpeaker(bubbles[i].speaker);
        break;
      }
    }
  }, [chatMessages, activeTab]);
  // ===== 캐릭터 시트를 JSON 파일로 저장 =====
  const handleExportCharacter = () => {
    const { date, time } = getNowDateTime();
    const safeName = (basic.name || selectedCharacter?.name || "character").replace(
      /[\\/:*?"<>|]/g,
      "_"
    );

    const exportData = {
      savedAt: `${date} ${time}`,
      pcName: selectedCharacter?.name || "PC1",
      character, // 지금 상태 전체
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    const blob = new Blob([jsonString], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `character_${safeName}_${date.replace(/\//g, "-")}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* =================== 1) 로비 화면 =================== */
  if (currentView === "lobby") {
    return (
      <div className="app-root">
        <div className="lobby-root">
          <header className="lobby-header">
            <div className="lobby-logo">TRPG Lobby</div>
            <nav className="lobby-nav">
              <span>홈</span>
              <span>게임</span>
              <span>도구</span>
              <span>커뮤니티</span>
            </nav>
          </header>

          <section className="lobby-section-bar">
            <div className="lobby-section-title">예정된 게임</div>
            <button className="lobby-action-btn" onClick={handleCreateRoom}>
              새 시나리오 만들기
            </button>
          </section>

          <div className="lobby-room-grid">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="lobby-room-card"
                onClick={() => handleEnterRoom(room)}
              >
                <div className="lobby-room-thumb">
                  <span className="lobby-room-tag">{room.tag}</span>
                </div>
                <div className="lobby-room-body">
                  <div className="lobby-room-title">{room.title}</div>
                  <div className="lobby-room-meta">
                    {room.nextLabel}
                    <br />
                    {room.nextText}
                    <br />
                    인원: {room.playerCount}명
                  </div>
                  <button
                    className="lobby-room-enter"
                    onClick={() => handleEnterRoom(room)}
                  >
                    방 들어가기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* =================== 1.5) 캐릭터 시트(persona) 화면 =================== */
  if (currentView === "persona") {
    return (
      <div className="app-root persona-root">
        <div className="persona-layout card">
          <header className="persona-header">
            <button className="back-lobby-btn" onClick={handleBackToLobby}>
              ← 로비로
            </button>
            <div className="persona-header-text">
              <div className="persona-title">PC 캐릭터 설정</div>
              <div className="persona-sub">
                {currentRoom?.title} · Step {personaStep}
              </div>
            </div>
          </header>

          {/* PC1~4 선택 탭 */}
          <div className="persona-pc-tabs">
            {characters.map((ch) => (
              <button
                key={ch.id}
                className={
                  "persona-pc-tab" +
                  (selectedCharacterId === ch.id ? " active" : "")
                }
                onClick={() => setSelectedCharacterId(ch.id)}
              >
                {ch.name}
              </button>
            ))}
          </div>

          {/* STEP 1: 기본 정보 + 외형 */}
          <div className="persona-step-label">기본 정보 & 외형</div>
          <div className="persona-form-grid">
            {/* 기본 정보 */}
            <div className="persona-column">
              <h3>기본 정보</h3>
              <label className="persona-field">
                <span>이름</span>
                <input
                  name="name"
                  value={basic.name || ""}
                  onChange={handleBasicChange}
                />
              </label>
              <label className="persona-field">
                <span>출생지</span>
                <input
                  name="birthplace"
                  value={basic.birthplace || ""}
                  onChange={handleBasicChange}
                />
              </label>
              <label className="persona-field">
                <span>직업</span>
                <input
                  name="job"
                  value={basic.job || ""}
                  onChange={handleBasicChange}
                />
              </label>
              <label className="persona-field">
                <span>성별</span>
                <select
                  name="gender"
                  value={basic.gender || "male"}
                  onChange={handleBasicChange}
                >
                  {options.gender.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* 외적 특징 */}
            <div className="persona-column">
              <h3>외적 특징</h3>
              <label className="persona-field">
                <span>나이</span>
                <input
                  type="number"
                  name="age"
                  value={appearance.age ?? ""}
                  onChange={handleAppearanceChange}
                />
              </label>
              <label className="persona-field">
                <span>머리색</span>
                <input
                  name="hairColor"
                  value={appearance.hairColor || ""}
                  onChange={handleAppearanceChange}
                />
              </label>
              <label className="persona-field">
                <span>눈색</span>
                <input
                  name="eyeColor"
                  value={appearance.eyeColor || ""}
                  onChange={handleAppearanceChange}
                />
              </label>
              <label className="persona-field">
                <span>피부색</span>
                <input
                  name="skinColor"
                  value={appearance.skinColor || ""}
                  onChange={handleAppearanceChange}
                />
              </label>
              <label className="persona-field">
                <span>키(cm)</span>
                <input
                  type="number"
                  name="heightCm"
                  value={appearance.heightCm ?? ""}
                  onChange={handleAppearanceChange}
                />
              </label>
              <label className="persona-field">
                <span>체형(BMI)</span>
                <select
                  name="bodyType"
                  value={appearance.bodyType || "average"}
                  onChange={handleAppearanceChange}
                >
                  <option value="slim">마른 편</option>
                  <option value="average">보통</option>
                  <option value="chubby">통통</option>
                  <option value="muscular">근육질</option>
                  <option value="overweight">과체중</option>
                </select>
              </label>
              <label className="persona-field">
                <span>외모 수준(1~5)</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  name="attractiveness"
                  value={appearance.attractiveness ?? ""}
                  onChange={handleAppearanceChange}
                />
              </label>
              <label className="persona-field">
                <span>타투/흉터 있음?</span>
                <select
                  name="hasTattooOrScar"
                  value={
                    appearance.hasTattooOrScar === true
                      ? "yes"
                      : appearance.hasTattooOrScar === false
                      ? "no"
                      : ""
                  }
                  onChange={(e) =>
                    setCharacter((prev) => ({
                      ...prev,
                      appearance: {
                        ...prev.appearance,
                        hasTattooOrScar:
                          e.target.value === ""
                            ? null
                            : e.target.value === "yes",
                      },
                    }))
                  }
                >
                  <option value="">선택 안 함</option>
                  <option value="yes">있음</option>
                  <option value="no">없음</option>
                </select>
              </label>
              <label className="persona-field">
                <span>타투/흉터 설명</span>
                <input
                  name="tattooOrScarDetail"
                  value={appearance.tattooOrScarDetail || ""}
                  onChange={handleAppearanceChange}
                />
              </label>
            </div>

            {/* 악세사리 / 겉보기 */}
            <div className="persona-column">
              <h3>악세사리 & 겉보기</h3>

              {/* 악세사리 체크박스 */}
              <label className="persona-field">
                <span>악세사리</span>
                <div className="persona-checkbox-group">
                  {options.accessories.map((item) => (
                    <label key={item} className="persona-checkbox">
                      <input
                        type="checkbox"
                        checked={(appearance.accessories || []).includes(item)}
                        onChange={() => toggleAccessory(item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </label>

              {/* 겉보기(분위기) 체크박스 */}
              <label className="persona-field">
                <span>겉보기</span>
                <div className="persona-checkbox-group persona-checkbox-scroll">
                  {options.vibes.map((item) => (
                    <label key={item} className="persona-checkbox">
                      <input
                        type="checkbox"
                        checked={(appearance.vibes || []).includes(item)}
                        onChange={() => toggleVibe(item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </label>
            </div>
          </div>

          {/* 하단 버튼 */}
          <footer className="persona-footer">
            <button
              className="persona-nav-btn"
              disabled={personaStep === 1}
              onClick={() =>
                setPersonaStep((prev) => (prev > 1 ? prev - 1 : prev))
              }
            >
              이전
            </button>
            <button className="persona-main-btn" onClick={handlePersonaComplete}>
              1단계 완료 및 세션 입장
            </button>
          </footer>
        </div>
      </div>
    );
  }

  /* =================== 2) 룸(기존 화면) =================== */
  return (
    <div className="app-root">
      <div className="trpg-layout">
        {/* LEFT PANEL — VN 화면 정리를 위해 숨김. 되살리려면 false를 true로 */}
        {false && (
        <aside className="left-panel">
          <section className="char-list card">
            {characters.map((ch) => (
              <div
                className={`char-row ${
                  selectedCharacterId === ch.id ? "char-row-selected" : ""
                }`}
                key={ch.id}
                onClick={() => handleSelectCharacter(ch.id)}
              >
                {/* ★ 왼쪽 리스트 초상화 */}
                <div className="char-avatar">
                  {getPortraitById(ch.id) ? (
                    <img
                      src={getPortraitById(ch.id)}
                      alt={ch.name}
                      className="char-avatar-img"
                    />
                  ) : (
                    <div
                      className="char-avatar-fallback"
                      style={{ background: ch.color }}
                    />
                  )}
                </div>

                <div className="char-status">
                  <div className="char-line">
                    <span>HP</span>
                    <span className="value">
                      {ch.hp} / {ch.hpMax}
                    </span>
                  </div>
                  <div className="char-line">
                    <span>SAN</span>
                    <span className="value">
                      {ch.san} / {ch.sanMax}
                    </span>
                  </div>
                </div>

                <div className="char-extra">
                  <div className="char-line">
                    <span>MP</span>
                    <span className="value">11 / 11</span>
                  </div>
                  <div className="char-line">
                    <span>행운</span>
                    <span className="value">53 / 53</span>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="left-menu card">
            <div className="menu-block">
              <h3>이성</h3>
              <button>발작</button>
              <button>광적인 행위</button>
            </div>

            <div className="menu-block">
              <h3>옵션 룰</h3>
              <button>운의 소비</button>
              <button>기관지 손상</button>
              <button>영구적인 상실</button>
            </div>

            <div className="menu-block">
              <h3>주사위봇</h3>
              <button onClick={handleDiceRoll}>일반 주사위</button>
              <button>전투(명중)</button>
              <button>조사(라이플)</button>
            </div>

            <div className="menu-block">
              <h3>룰북 참조</h3>
              <button className="play-btn">PLAY</button>
            </div>
          </section>
        </aside>
        )}

        {/* CENTER PANEL */}
        <main className="center-panel">
          <div className="top-toolbar card">
            <div className="toolbar-left">
              <button className="back-lobby-btn" onClick={handleBackToLobby}>
                로비
              </button>
              <button>😊</button>
              <button>📁</button>
              <button>➕</button>
              <button>🖼</button>
              <button>🎥</button>
            </div>
            <div className="toolbar-right">
              <div className="user-chip" onClick={() => setShowSheet(true)}>
                {selectedCharacter?.name ?? "PN"}
              </div>
            </div>
          </div>

          {/* 메인 화면 vs 자동화 시트 */}
          {showSheet ? (
            <section className="sheet-container card">
              <div className="sheet-header">
                <div className="sheet-title">
                  Call of Cthulhu 7th edition 캐릭터 시트 –{" "}
                  {selectedCharacter?.name}
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="sheet-close-btn"
                    onClick={handleSaveToDB}
                  >
                    스탯 저장(DB)
                  </button>
                  <button
                    className="sheet-close-btn"
                    onClick={() => setShowSheet(false)}
                  >
                    원래 화면
                  </button>
                </div>
              </div>

              <div className="sheet-top-row">
                {/* 탐사자정보 */}
                <div className="sheet-info-block">
                  <div className="sheet-block-title">탐사자정보</div>
                  <table className="info-table">
                    <tbody>
                      {/* 이름 */}
                      <tr>
                        <td className="info-label">이름</td>
                        <td className="info-input" colSpan={3}>
                          <input
                            className="info-input-box"
                            name="name"
                            value={basic.name}
                            onChange={handleBasicChange}
                          />
                        </td>
                      </tr>

                      {/* 플레이어 이름 */}
                      <tr>
                        <td className="info-label">플레이어</td>
                        <td className="info-input" colSpan={3}>
                          <input
                            className="info-input-box"
                            name="playerName"
                            value={basic.playerName || ""}
                            onChange={handleBasicChange}
                          />
                        </td>
                      </tr>

                      {/* 직업 */}
                      <tr>
                        <td className="info-label">직업</td>
                        <td className="info-input" colSpan={3}>
                          <input
                            className="info-input-box"
                            name="job"
                            value={basic.job}
                            onChange={handleBasicChange}
                          />
                        </td>
                      </tr>

                      {/* 나이 + 성별 */}
                      <tr>
                        <td className="info-label">나이</td>
                        <td className="info-input">
                          <input
                            className="info-input-box"
                            type="number"
                            name="age"
                            value={appearance.age ?? ""}
                            onChange={handleAppearanceChange}
                          />
                        </td>
                        <td className="info-label small">성별</td>
                        <td className="info-input">
                          <select
                            className="info-input-box"
                            name="gender"
                            value={basic.gender}
                            onChange={handleBasicChange}
                          >
                            {options.gender.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>

                      {/* 거주지 */}
                      <tr>
                        <td className="info-label">거주지</td>
                        <td className="info-input" colSpan={3}>
                          <input
                            className="info-input-box"
                            name="residence"
                            value={basic.residence || ""}
                            onChange={handleBasicChange}
                          />
                        </td>
                      </tr>

                      {/* 출생지 */}
                      <tr>
                        <td className="info-label">출생지</td>
                        <td className="info-input" colSpan={3}>
                          <input
                            className="info-input-box"
                            name="birthplace"
                            value={basic.birthplace}
                            onChange={handleBasicChange}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 특성치 */}
                <div className="sheet-attr-block">
                  <div className="sheet-block-title">특성치</div>
                  <div className="attr-grid">
                    <div className="attr-row">
                      <div className="attr-cell">
                        <span className="attr-label">근력</span>
                        <input 
                          className = "attr-input"
                          type = "number"
                          name = "STR"
                          value = {stats.STR}
                          onChange = {handleStatChange} />
                      </div>
                      <div className="attr-cell">
                        <span className="attr-label">민첩</span>
                        <input 
                          className="attr-input"
                          type = "number"
                          name = "DEX"
                          value = {stats.DEX}
                          onChange = {handleStatChange} />
                      </div>
                      <div className="attr-cell">
                        <span className="attr-label">정신</span>
                        <input 
                          className="attr-input"
                          type = "number"
                          name = "POW"
                          value = {stats.POW}
                          onChange = {handleStatChange} />
                      </div>
                    </div>
                    <div className="attr-row">
                      <div className="attr-cell">
                        <span className="attr-label">건강</span>
                        <input 
                          className="attr-input"
                          type = "number"
                          name = "CON"
                          value = {stats.CON}
                          onChange = {handleStatChange} />
                      </div>
                      <div className="attr-cell">
                        <span className="attr-label">외모</span>
                        <input 
                          className="attr-input"
                          type = "number"
                          name = "APP"
                          value = {stats.APP}
                          onChange = {handleStatChange} />
                      </div>
                      <div className="attr-cell">
                        <span className="attr-label">교육</span>
                        <input 
                          className="attr-input"
                          type = "number"
                          name = "EDU"
                          value = {stats.EDU}
                          onChange = {handleStatChange} />
                      </div>
                    </div>
                    <div className="attr-row">
                      <div className="attr-cell">
                        <span className="attr-label">크기</span>
                        <input 
                          className="attr-input"
                          type = "number"
                          name = "SIZ"
                          value = {stats.SIZ}
                          onChange = {handleStatChange} />
                      </div>
                      <div className="attr-cell">
                        <span className="attr-label">지능</span>
                        <input 
                          className="attr-input"
                          type = "number"
                          name = "INT"
                          value = {stats.INT}
                          onChange = {handleStatChange} />
                      </div>
                      <div className="attr-cell">
                        <span className="attr-label">이동력</span>
                        <input 
                          className="attr-input"
                          type = "number"
                          name = "MOVE"
                          value = {stats.MOVE}
                          onChange = {handleStatChange} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sheet-subtitle">탐사자 기능</div>

              <div className="sheet-skills-row">
                {/* 직업 기능 */}
                <div className="sheet-skill-block">
                  <div className="sheet-block-title">직업 기능 점수</div>
                  <table className="skill-table">
                    <thead>
                      <tr>
                        <th className="skill-col-name">기능</th>
                        <th className="skill-col-base">기본</th>
                        <th className="skill-col-input">입력</th>
                        <th className="skill-col-total">총합</th>
                      </tr>
                    </thead>
                    <tbody>
                      {JOB_SKILLS.map((skill) => {
                        const extra = skillInputs[skill.id] ?? 0;
                        const total = skill.base + extra;
                        return (
                          <tr key={skill.id}>
                            <td className="skill-name-cell">{skill.label}</td>
                            <td>{skill.base}</td>
                            <td>
                              <input
                                type="number"
                                className="skill-input"
                                value={extra}
                                onChange={(e) =>
                                  handleSkillInputChange(
                                    skill.id,
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 관심 기능 */}
                <div className="sheet-skill-block">
                  <div className="sheet-block-title">관심 기능 점수</div>
                  <table className="skill-table">
                    <thead>
                      <tr>
                        <th className="skill-col-name">기능</th>
                        <th className="skill-col-base">기본</th>
                        <th className="skill-col-input">입력</th>
                        <th className="skill-col-total">총합</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INTEREST_SKILLS.map((skill) => {
                        const extra = skillInputs[skill.id] ?? 0;
                        const total = skill.base + extra;
                        return (
                          <tr key={skill.id}>
                            <td className="skill-name-cell">{skill.label}</td>
                            <td>{skill.base}</td>
                            <td>
                              <input
                                type="number"
                                className="skill-input"
                                value={extra}
                                onChange={(e) =>
                                  handleSkillInputChange(
                                    skill.id,
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 스킬 성장치 */}
                <div className="sheet-skill-block">
                  <div className="sheet-block-title">스킬 성장치</div>
                  <table className="skill-table">
                    <thead>
                      <tr>
                        <th className="skill-col-name">기능</th>
                        <th className="skill-col-base">기본</th>
                        <th className="skill-col-input">입력</th>
                        <th className="skill-col-total">총합</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GROWTH_SKILLS.map((skill) => {
                        const extra = skillInputs[skill.id] ?? 0;
                        const total = skill.base + extra;
                        return (
                          <tr key={skill.id}>
                            <td className="skill-name-cell">{skill.label}</td>
                            <td>{skill.base}</td>
                            <td>
                              <input
                                type="number"
                                className="skill-input"
                                value={extra}
                                onChange={(e) =>
                                  handleSkillInputChange(
                                    skill.id,
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <section className="main-screen">
              <div className="screen-left card">
                <header className="screen-title">
                  <span className="title-main">
                    {currentRoom?.title || "Guest House"}
                  </span>
                  <span className="title-sub">Call of Cthulhu 7th</span>
                </header>

                <div
                  className="screen-image"
                  style={
                    backgroundUrl
                      ? {
                          backgroundImage: `url(${backgroundUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  {/* ★ 배경 위 캐릭터 스탠딩 (발화자=active, 그 외=dim) */}
                  <div
                    className={
                      "standee standee-left " +
                      (currentSpeaker === "PC" ? "speaking" : "dim")
                    }
                  >
                    <img src={"http://localhost:8000/character/PC" + IMG_V} alt="PC" />
                  </div>
                  <div
                    className={
                      "standee standee-right " +
                      (currentSpeaker === "KPC" ? "speaking" : "dim")
                    }
                  >
                    <img src={"http://localhost:8000/character/KPC" + IMG_V} alt="KPC" />
                  </div>
                </div>

                {/* ★ 하단 PC 초상화 (PC1~4) */}
              </div>
            </section>
          )}
        </main>

        {/* RIGHT PANEL */}
        <aside className="right-panel">
          <header className="chat-header card">
            <div className="chat-title">&gt;| 룸 채팅</div>
            <div className="chat-header-actions">
              <button onClick={handleExportChat}>💾</button>
              <button>⚙</button>
            </div>
          </header>

          <section className="chat-log card" ref={chatLogRef}>
            {(chatMessages[activeTab] || [])
              .flatMap((msg) => getDisplayBubbles(msg))
              .map((b) => (
                <div className="chat-item" key={b.key}>
                  {/* ★ 채팅 아바타 (GM=로봇 / KPC=생성 이미지 / 플레이어=PC) */}
                  <div className="chat-avatar">
                    {b.avatar ? (
                      <img
                        src={b.avatar}
                        alt={b.sender}
                        className="chat-avatar-img"
                      />
                    ) : (
                      <div className="chat-avatar-fallback" />
                    )}
                  </div>

                  <div className="chat-content">
                    <div className="chat-meta">
                      <span className="chat-name">{b.sender}</span>
                      <span className="chat-date">
                        {b.date}
                        {b.time ? ` ${b.time}` : ""}
                      </span>
                    </div>
                    <div className="chat-text">{b.text}</div>
                  </div>
                </div>
              ))}
          </section>

          <div className="chat-tabs card">
            {["메인", "정보", "잡담"].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
            <button>＋</button>
          </div>

          <section className="chat-input card">
            <div className="chat-input-top">
              {/* ★ 입력창 왼쪽에도 현재 선택 PC 초상화 */}
              <div className="chat-input-avatar">
                {selectedCharacter ? (
                  <img
                    src={getPortraitById(selectedCharacter.id)}
                    alt={selectedCharacter.name}
                    className="chat-input-avatar-img"
                  />
                ) : (
                  <div className="chat-input-avatar-fallback" />
                )}
              </div>
              <span className="chat-input-name">
                {selectedCharacter?.name ?? "주낙엽"}
              </span>

              <div className="chat-input-icons">
                <button>📄</button>
                <button onClick={handleDiceRoll}>🎲</button>
                <button>❓</button>
                <button onClick={handleSendChat}>전송</button>
              </div>
            </div>

            <textarea
              className="chat-textarea"
              placeholder="메시지를 입력"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={handleChatKeyDown}
            />
          </section>

          <footer className="chat-footer">…</footer>
        </aside>
      </div>

      {/* GPT 토글 버튼 */}
      <button className="gpt-toggle" onClick={handleOpenGpt}>
        <img src={gptRobot} alt="GPT 로봇" className="gpt-icon" />
      </button>

      {/* GPT 보조 패널 */}
      {gptOpen && (
        <div className="gpt-panel-backdrop" onClick={handleCloseGpt}>
          <div className="gpt-panel" onClick={(e) => e.stopPropagation()}>
            <header className="gpt-panel-header">
              <div>
                <div className="gpt-panel-title">GPT 보조 채팅</div>
                <div className="gpt-panel-sub">
                  게임 흐름에 대한 코멘트를 GPT에게만 보냅니다.
                </div>
              </div>
              <button className="gpt-close-btn" onClick={handleCloseGpt}>
                ✕
              </button>
            </header>

            <section className="gpt-panel-log" ref={gptLogRef}>
              {gptMessages.map((m) => (
                <div
                  key={m.id}
                  className={
                    "gpt-msg " +
                    (m.role === "user"
                      ? "gpt-msg-user"
                      : m.role === "assistant"
                      ? "gpt-msg-assistant"
                      : "gpt-msg-system")
                  }
                >
                  <div className="gpt-msg-role">
                    {m.role === "user"
                      ? "나"
                      : m.role === "assistant"
                      ? "GPT"
                      : "안내"}
                  </div>
                  <div className="gpt-msg-text">
                    {m.text.split("\n").map((line, idx) => (
                      <span key={idx}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="gpt-panel-input">
              <textarea
                className="gpt-panel-textarea"
                placeholder={`예) "조금 루즈한 것 같아. 더 빠르게 진행해줘."`}
                value={gptInput}
                onChange={(e) => setGptInput(e.target.value)}
                onKeyDown={handleGptKeyDown}
              />
              <div className="gpt-panel-send-row">
                <span className="gpt-hint">
                  이 채팅은 플레이어에게 보이지 않고 GPT에게만 전송됩니다.
                </span>
                <button className="gpt-send-btn" onClick={handleSendGpt}>
                  전송
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;