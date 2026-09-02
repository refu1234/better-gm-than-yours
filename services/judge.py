import asyncio
import re
from database.database_stat import collection2
from database.database import collection
from models.type_model import DiceMessage
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from Retrieval import search_with_references

class StatCheckRequirement(BaseModel):
    target_key: str = Field(description="캐릭터 데이터에서 가져와야 할 스탯의 정확한 키 이름 (예: 'INT', 'STR', '관찰력')")
    operator: str = Field(description="비교 연산자 (<=, >=, == 중 하나). 크툴루 룰은 보통 '<=' 임")
    reasoning: str = Field(description="이 스탯을 선택한 이유")

async def dicejudgement(request: DiceMessage):
    # rag part
        # 이전 대화 assistant message(content) 가져와서 rag의 querytext로 활용
        # role=assistant 로 직접 필터 -> 주사위 로그/유저 입력을 건너뛰려 skip 쓸 필요 없음
        # created_at 은 '분' 단위라 같은 분에 assistant 가 여러 개면 순서가 모호함
        #  -> _id(ObjectId, 삽입순서 보장) 를 보조 정렬로 써서 진짜 최신 메시지를 확정
    cursor = (
        collection.find({"room_id": request.room_id, "role": "assistant", "type": "talk"})
        .sort([("created_at", -1), ("_id", -1)])
        .limit(1)
    )
    result_list = await cursor.to_list(length=1)
    user_context = result_list[0].get("content", "") if result_list else ""
    # RAG: "관찰 판정을 어떻게 하는가" 같은 판정 메커니즘을 룰북에서 가져온다.
    #  - GM 메시지의 [판정 요청] 블록에 ' 기능: 관찰력 ...' 형태로 판정 종류가 명시됨
    #    -> 분위기 서사 전체가 아니라 이 '기능'을 쿼리로 써야 정확한 룰이 검색됨
    #  - search_with_references 는 동기(faiss/임베딩)라 async 이벤트 루프를 막지 않게 to_thread 로 실행
    #    ("제N장 참고" 식 상호참조까지 따라가 실제 필요한 본문을 모음 - multi-hop)
    #  - 판정 원리(주사위 <= 스탯)는 아래 프롬프트 본문에 따로 명시되어 있어, 룰 텍스트가 비어도 판정은 동작
    skill_match = re.search(r"기능:\s*([^\n(（]+)", user_context)
    skill = skill_match.group(1).strip() if skill_match else ""
    # 기능이 명시되면 그걸로 룰을 검색, 없으면(자유 RP 등) 상황 전체로 폴백
    rag_query = f"{skill} 판정" if skill else user_context

    if rag_query:
        retrieved = await asyncio.to_thread(search_with_references, rag_query, 5)
        rule_text = "\n\n".join(r["text"] for r in retrieved)
    else:
        rule_text = ""

    # 캐릭터 stat 가져오기. ui-> fastapi -> db(update)/ dicejudgement- > db불러오기 및 업데이트로 구상
    data = await collection2.find_one(
        {"character_id": request.senderId},
        {"_id": 0}
    )
    # 캐릭터/스탯이 없으면 판정 불가 -> 원인을 명확히 드러내는 예외 발생
    #  (None 을 그대로 두면 data["stat"] 에서 TypeError 로 모호하게 터짐)
    if not data or "stat" not in data:
        raise ValueError(f"캐릭터(character_id={request.senderId})의 스탯을 찾을 수 없습니다")
    available_keys = list(data["stat"].keys()) #출력할 수 있는 키를 주어진 값으로 제한
    
    # rule 기반 stat + Dice 로 판정 결과 출력 
    # - 고민사항 : rag의 출력 문장을 어떻게 스탯과 매칭시킬까(이해할까)?
    # - 고민사항 : 어떻게 판정에 필요한 스텟을 잘 뽑아낼것인가? 여러 스탯중에 필요한 스탯만 뽑아내는 거를 어떤 방식으로? => llm을 parser로 이용하는 형태 이용되는 stat과 연산자를 판정 로직으로 활용
    llm = ChatOpenAI(model="gpt-5.1", temperature=0)
    structured = llm.with_structured_output(StatCheckRequirement)
    #프롬프트 구성 => key를 뽑아내는걸 목표로 설정.
    prompt = f"""
[상황]
{user_context}
[규칙]
{rule_text}
[데이터베이스 가능한 키 목록]
{available_keys}

위 상황과 규칙을 고려할 때, 판정을 위해 캐릭터의 어떤 스탯(Key)이 필요한가요?
반드시 키 목록 안의 정확한 단어만 사용하세요.
보통 성공 조건은 '주사위 값 <= 스탯 값' 입니다.
"""
    print(prompt)

    try:
        parsed_req = await structured.ainvoke(prompt)
    except AttributeError:
        parsed_req = structured.invoke(prompt)

    key = parsed_req.target_key
    print(key)
    if key not in data["stat"]:
        key = "INT" if "INT" in data["stat"] else available_keys[0] #혹시 key값이 주어진 거 이외의 값이 나왔을 때를 대비해서 추가 처리하였음
    
    target_stat = int(data["stat"][key])
    print(target_stat)
    print(parsed_req.reasoning)
    # 주사위 값이 없으면(None) int 변환에서 모호하게 터지므로 먼저 명확히 막음
    if request.diceval is None:
        raise ValueError("주사위 값(diceval)이 없어 판정할 수 없습니다")
    dice_result = int(request.diceval)
    print(dice_result)
    op = parsed_req.operator
    print(op)
    if op == "<=":
        is_success = dice_result <= target_stat
    elif op == ">=":
        is_success = dice_result >= target_stat
    elif op == "==":
        is_success = dice_result == target_stat
    else:
        is_success = dice_result <= target_stat 
    
    return "성공" if is_success else "실패"
  
