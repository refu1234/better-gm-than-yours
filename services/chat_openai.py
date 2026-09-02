import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
from openai import OpenAI
from database.database import collection
from models.type_model import ChatMessage
from models.type_model import ChatLog
from models.type_model import DiceMessage
from models.type_model import UserCharacterInfo
from models.type_model import AiCharacterInfo
from services.prompt_service import build_message_chain, advance_section
from services.judge import dicejudgement


async def _generate_with_section_progress(input_text: str, room_id: str):
    """현재 섹션으로 GPT 응답을 생성한다.
    응답이 'end of section'이면 섹션을 전진시키고 새 섹션으로 1회만 재생성하여,
    'end of section'이 로그에 남거나 같은 턴에 반복되지 않게 한다.
    반환: (completion, response_text)
    """
    gpt_messages = await build_message_chain(input_text, room_id)
    completion = client.chat.completions.create(model="gpt-5.1", messages=gpt_messages)
    response = completion.choices[0].message.content

    if response and "end of section" in response.lower():
        await advance_section(room_id)
        # 유저의 이전 입력을 재탕하면 또 end of section 이 나기 쉬우므로,
        # "새 장면 도입부를 시작하라"는 명시적 지시로 재생성한다(이 문구는 저장하지 않음).
        transition = "이전 장면이 끝났습니다. 새 scene_public의 도입부를 자연스럽게 시작하세요."
        gpt_messages = await build_message_chain(transition, room_id)
        completion = client.chat.completions.create(model="gpt-5.1", messages=gpt_messages)
        response = completion.choices[0].message.content

    return completion, response

client = OpenAI()
async def chat(request: ChatMessage):
    # (설명) UI 상에서 입력한 text에 대해서 pydantic- > Models의 ChatMessage 를 참고해서 받아온 메시지
    # (설명) db에 저장하기 전에 지정한 변수에 해당
    created_at = f"{request.date} {request.time}"
    user_log = ChatLog(
        room_id=request.room_id,
        role="user",
        type="talk",
        sender = UserCharacterInfo(id=request.senderId,name=request.sender),
        content = request.content,
        created_at = created_at
    )
    await collection.insert_one(user_log.model_dump())
    # (설명)gpt 생성
    # 프롬프트 생성 들어갈 part
    
    # (설명)생성된 text 변수 (end of section 시 섹션 전진 + 다음 장 재생성 포함)
    completion, response = await _generate_with_section_progress(request.content, request.room_id)
    # (미구현)입력 메시지인데 지금은 어차피 유저 text하나만 들어가지만 나중에 프롬프트에 여러개 들어갈까봐
    #따로 지정해둠
    user_msg = request.content
    #gpt가 답변 생성한 시간을 구현 (ai_log -> created_at에 활용하고자)
    unix_time = completion.created
    dt_obj = datetime.fromtimestamp(unix_time)
    ai_created_at = dt_obj.strftime("%Y/%m/%d %H:%M")

    ai_log = ChatLog(
        room_id=request.room_id,
        role="assistant",
        type="talk",
        sender = AiCharacterInfo(id=999, name="character_name"),
        content = response,
        created_at = ai_created_at
    )
    await collection.insert_one(ai_log.model_dump())

    date_part, time_part = ai_created_at.split(" ")
    response_obj = ChatMessage(
        room_id = ai_log.room_id,
        id=int(unix_time*1000),
        sender = ai_log.sender.name,
        senderId = ai_log.sender.id,
        date = date_part,
        time = time_part,
        content = response
    )
    return response_obj

async def dice(request:DiceMessage):
    print("---------------------------------------판정 알고리즘 시작(...chat_openai-dice)----------------------------------------------")
    created_at = f"{request.date} {request.time}"
    dice_log = ChatLog(
        room_id=request.room_id,
        role="user",
        type="dice",
        sender = UserCharacterInfo(id=request.senderId,name=request.sender),
        content = str(request.diceval),
        created_at = created_at
    )
    await collection.insert_one(dice_log.model_dump())
    #dice judgemnet 실행 -> rag + 캐릭터 수치 가져오기 판정 진행 
    
                        #(아직 미구현 코드 구현 필요 -> services.judge로 가서 구현할 예정)
    message = await dicejudgement(request)
    #return 성공 여부 message = {"성공/실패"}
    print("============================== 판정 성공 여부 =======================================")
    print(message)
    print("============================== gpt api 생성 중 ======================================")
    completion, response = await _generate_with_section_progress(message, request.room_id)
    unix_time = completion.created
    dt_obj = datetime.fromtimestamp(unix_time)
    ai_created_at = dt_obj.strftime("%Y/%m/%d %H:%M")

    ai_log = ChatLog(
        room_id=request.room_id,
        role="assistant",
        type="talk",
        sender = AiCharacterInfo(id=999, name="character_name"),
        content = response,
        created_at = ai_created_at
    )
    await collection.insert_one(ai_log.model_dump())

    date_part, time_part = ai_created_at.split(" ")
    response_obj = ChatMessage(
        room_id = ai_log.room_id,
        id=int(unix_time*1000),
        sender = ai_log.sender.name,
        senderId = ai_log.sender.id,
        date = date_part,
        time = time_part,
        content = response
    )
    return response_obj