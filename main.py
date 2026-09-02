import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from models.type_model import ChatMessage
from models.type_model import DiceMessage
from models.type_model import UserStatInfo

from services.chat_openai import chat
from services.chat_openai import dice

from database.database_stat import collection2

# ===== 생성 이미지(배경/캐릭터) 서빙 설정 =====
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "generated_assets")
BG_DIR = os.path.join(ASSETS_DIR, "backgrouds")      # 폴더명 오타(backgrouds) 그대로 사용
CHAR_DIR = os.path.join(ASSETS_DIR, "characters")    # 전신 스탠딩
SD_DIR = os.path.join(ASSETS_DIR, "sds")             # SD(채팅 아바타)

# 장소명 -> 배경 파일 매핑 (장소 태그 [장소: X] 의 X 와 일치).
#  새 배경이 생기면 여기에 한 줄 추가만 하면 됨. 없는 장소는 404 -> 프론트에서 폴백.
LOCATION_IMAGES = {
    "거실": "living_room_fabric_sofa_television_on_a_simple_media_console_normal_window_wi_s-1000.png",
    "화장실": "medium_bathroom_small_bathtub_white_tiles_toiletries_on_shelf_mirror_sink_s-1000.png",
    "현관": "bottom_of_front_doorshoe_shelf_slipper_sneaker_on_floor_umbrella_stand_rea_s-63.png",
    "놀이공원": "amusement_park_entrance_ticket_booth_colorful_banners_gate_crowds_in_distanc_s-63.png",
}
# 역할 -> 전신 스탠딩 이미지 매핑
CHARACTER_IMAGES = {"PC": "PC.png", "KPC": "KPC.png"}
# 역할 -> SD(채팅 아바타) 이미지 매핑
SD_IMAGES = {"PC": "PC_sd.png", "KPC": "KPC_sd.png"}
# 이미지 교체 시 브라우저가 옛 버전을 캐싱하지 않도록 매번 재검증
NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate"}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers=["*"],
)

@app.post("/gpt")
async def chat_end(req: ChatMessage):
    print(req)
    result = await chat(req)
    return result
@app.post("/dice")
async def dice_end(req: DiceMessage):
    print(req)
    result = await dice(req)
    return result
@app.post("/judge")
async def judge_end(req: DiceMessage):
    print("-------------판정 부분 시작-------------")
    result = await dice(req)
    print("결과 값 리턴 받음 : ", result )
    return result
@app.post("/stats")
async def save_stats(req: UserStatInfo):
    stat_dict = req.model_dump()
    filter = {"character_id":req.character_id}
    content = {"$set": stat_dict}
    await collection2.update_one(filter,content,upsert=True)
    return {"message": "업데이트 성공"}

@app.get("/stats/{character_id}")
async def load_stats(character_id: int):
    # DB에 저장된 캐릭터 스탯을 불러온다. 없으면 stat=None 으로 응답(프론트에서 기본값 처리).
    doc = await collection2.find_one({"character_id": character_id}, {"_id": 0})
    if not doc:
        return {"character_id": character_id, "stat": None}
    return doc

@app.get("/background/{location}")
async def get_background(location: str):
    # 장소명에 해당하는 배경 이미지를 반환. 매핑/파일이 없으면 404 -> 프론트에서 폴백 처리.
    filename = LOCATION_IMAGES.get(location)
    if not filename:
        # 정확히 일치하는 키가 없으면, 장소명에 키가 포함되는지로 부분 매칭
        #  (예: "놀이공원 입구"/"놀이공원 내부" -> "놀이공원")
        for key, fname in LOCATION_IMAGES.items():
            if key in location:
                filename = fname
                break
    if not filename:
        raise HTTPException(status_code=404, detail=f"배경 이미지 없음: {location}")
    path = os.path.join(BG_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"배경 파일 없음: {filename}")
    return FileResponse(path, headers=NO_CACHE)

@app.get("/character/{role}")
async def get_character(role: str):
    # 역할(PC/KPC)에 해당하는 전신 스탠딩 이미지를 반환.
    filename = CHARACTER_IMAGES.get(role.upper())
    if not filename:
        raise HTTPException(status_code=404, detail=f"캐릭터 이미지 없음: {role}")
    path = os.path.join(CHAR_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"캐릭터 파일 없음: {filename}")
    return FileResponse(path, headers=NO_CACHE)

@app.get("/sd/{role}")
async def get_sd(role: str):
    # 역할(PC/KPC)에 해당하는 SD(채팅 아바타) 이미지를 반환.
    filename = SD_IMAGES.get(role.upper())
    if not filename:
        raise HTTPException(status_code=404, detail=f"SD 이미지 없음: {role}")
    path = os.path.join(SD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"SD 파일 없음: {filename}")
    return FileResponse(path, headers=NO_CACHE)

    
