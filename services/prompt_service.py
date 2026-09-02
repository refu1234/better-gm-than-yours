import os
import glob
from models.prompt_base import construct_prompt, PROMPT_PATH
from database.database import collection, room_state

# scene_public{n}.txt 파일 개수 = 섹션 상한. (이 수를 넘겨 빈 장면이 되는 것을 방지)
MAX_SECTION = len(glob.glob(os.path.join(PROMPT_PATH, "scene_public*.txt"))) or 1


async def get_section(room_id: str) -> int:
    """방의 현재 섹션 번호를 반환. 기록이 없으면 1."""
    doc = await room_state.find_one({"room_id": room_id})
    return doc.get("section_id", 1) if doc else 1


async def advance_section(room_id: str) -> int:
    """방의 섹션을 다음으로 전진(상한 MAX_SECTION). 전진 후 섹션 번호 반환."""
    current = await get_section(room_id)
    nxt = min(current + 1, MAX_SECTION)
    await room_state.update_one(
        {"room_id": room_id},
        {"$set": {"section_id": nxt}},
        upsert=True,
    )
    return nxt


async def build_message_chain(input_text: str, room_id: str):
    # 방의 현재 섹션에 해당하는 scene_public 을 시스템 프롬프트로 구성
    section_id = await get_section(room_id)
    system_prompt = construct_prompt(section_id)
    messages = [{"role": "system", "content": system_prompt}]

    # created_at 은 '분' 단위라 같은 분 메시지의 순서가 모호함
    #  -> _id(삽입순서 보장) 를 보조 정렬로 추가해 시간순을 확정
    cursor = collection.find({"room_id": room_id}).sort([("created_at", 1), ("_id", 1)])
    msghistory = await cursor.to_list(length=None)
    if msghistory:
        for doc in msghistory:
            messages.append({"role": doc['role'], "content": doc['content']})
        messages.append({"role": "user", "content": input_text})
    else:
        messages.append({"role": "user", "content": input_text})
    return messages
