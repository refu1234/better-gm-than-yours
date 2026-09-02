from pydantic import BaseModel
from typing import List, Dict
from typing import Optional, Literal , Union
#typing module 지정 Dict[str, str] -> {"key": "value"} json 형태
#typing module 지정 List[type] -> [{"key":"value"},{"key2":"value2"}]
class ChatRequest(BaseModel):
    message:List[Dict[str,str]]
class ChatMessage(BaseModel):
    room_id : str
    id: int
    sender: str
    senderId: Optional[int] = None
    date: str
    time: str
    content:str
class DiceMessage(BaseModel):
    room_id : str
    id: int
    sender: str
    senderId: Optional[int] = None
    date : str
    time : str
    diceval : Optional[int] = None

class statcontent(BaseModel):
    STR : int
    DEX: int
    POW: int
    CON: int
    APP: int
    EDU: int
    SIZ: int
    INT: int
    MOVE: int

class UserStatInfo(BaseModel):
    character_id : int
    stat : statcontent
class UserCharacterInfo(BaseModel): 
#(미구현)유저 캐릭터에 대한 정보 입력 예정 아직 구현x 일단 틀로만 구현해놓음
#생각중인거는 캐릭터 stat이나 개인적인 캐릭터 정보 넣을 예정
#주로 chat에서 보낸 사람 정보에 해당
    id: int
    name : str
class AiCharacterInfo(BaseModel):
#(미구현) 사용자가 지정한 KPC-GM 에 대한 정보에 해당, 아직 구현x 틀로만 구현
# 성격구현 된것도 이쪽에 넣을 거 같은데 나중에 고민해볼 거 같음
    id: int
    name: str
class ChatLog(BaseModel):
    room_id:str

    role: Literal["user","assistant","system"]
    type: Literal["talk","dice","alert"]
    #(설명-수정가능) 유형을 좀 구분해서 각각 대화, 판정, 경고 이런식으로 나눠서 대화 형태를 db에 저장할 예정
    sender : Union[UserCharacterInfo, AiCharacterInfo]
    content: str
    created_at : str