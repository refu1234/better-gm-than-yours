import json
import os
from models.persona import KpcPersona
from models.persona_prompt import build_kpc_block
PROMPT_PATH = "./prompts"
#파일 로드
def load_file(name):
    path = os.path.join(PROMPT_PATH,name)
    if not os.path.exists(path):
        return ""
    with open(path,"r",encoding="utf-8") as f:
        return f.read()
#json 로드
def load_json(name):
    path = os.path.join(PROMPT_PATH, name)
    if not os.path.exists(path):
        return None
    with open(path,"r",encoding="utf-8") as f:
        return json.load(f)

#페르소나 json 
persona_json = load_json("persona.json")
if persona_json:
       persona = KpcPersona.model_validate(persona_json["persona"])
       kpc_block = build_kpc_block(persona)
else:
    print("error with creating persona json")
#txt 파일 로드
trpg_rules = load_file("trpg_rules.txt")
scenario_secret = load_file("scenario_secret.txt")
formatting_guide = load_file("print_formatting_guide.txt")
#프롬프트 조립 및 return 
def construct_prompt(section_id):
    string = f"scene_public{section_id}.txt"
    scene_public = load_file(string)
    final_prompt = f"""
    {kpc_block}
    {trpg_rules}
    [시나리오 비밀 정보 - GM 전용]
    {scenario_secret}
    [시나리오 전체 장면 목록 - 참고만, 즉시 출력 금지]
    {scene_public}
    {formatting_guide}
    """.strip()
    return final_prompt