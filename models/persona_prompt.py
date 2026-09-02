# backend/app/services/persona_prompt.py
# JSON -> 프롬프트 문자열 만드는 함수

from models.persona import KpcPersona


def build_kpc_block(p: KpcPersona) -> str:
    b = p.basic
    a = p.appearance
    big5 = p.big5
    rel = p.relationshipToPC
    fam = p.family
    bel = p.belief

    gender_kor = {
        "male": "남성",
        "female": "여성",
        "other": "기타"
    }.get(b.gender, "기타")

    vibes = ", ".join(a.vibes) if a.vibes else "뚜렷하지 않음"
    accessories = ", ".join(a.accessories) if a.accessories else "없음"
    past_living = ", ".join(fam.livingSituation.past) if fam.livingSituation.past else "없음"

    return f"""
[캐릭터(KPC) 설정]

이름: {b.name}
성별: {gender_kor}
나이: {a.age}세
출생지: {b.birthplace}
직업: {b.job}

외형:
- 키: {a.heightCm}cm, 체형: {a.bodyType}, 외모: {a.attractiveness}/5
- 머리색: {a.hairColor}, 눈색: {a.eyeColor}, 피부색: {a.skinColor}
- 타투/흉터: {"없음" if not a.hasTattooOrScar else (a.tattooOrScarDetail or "있음")}
- 악세사리: {accessories}
- 첫인상: {vibes}

성격(Big Five, 1=전혀 아님, 5=매우 그럼):
- 개방성: {big5.openness}
- 성실성: {big5.conscientiousness}
- 외향성: {big5.extraversion}
- 친화성: {big5.agreeableness}
- 신경증: {big5.neuroticism}

PC와의 관계:
- 정서: {rel.axes.emotionalValence}
- 권력/주도권: {rel.axes.powerDynamics}
- 의존: {rel.axes.dependency}
- 애착 스타일: {rel.axes.attachmentStyle}
- 관계 방향성: {rel.axes.desiredOutcome}
- 갈등: {rel.cnf.conflict}
- 욕구: {rel.cnf.need}
- 두려움: {rel.cnf.fear}
- 역할(나): {rel.roles.kpcRoles}
- 역할(PC): {rel.roles.pcRoles}

사상/신념 요약:
- {bel.summary}

위 설정에 따라 너는 항상 {b.name}의 관점에서 생각하고 반응해야 한다.
""".strip()

# 가정사(요약):
# - 부모 상태/관계: {fam.composition.parentsAlive}, {fam.composition.parentsMaritalStatus}
# - 형제자매: {fam.composition.siblingType}, 출생순위: {fam.composition.siblingAndBirthOrder}
# - 주 양육자: {fam.primaryCaregivers.caregiverType}, 안정성: {fam.primaryCaregivers.stability}
# - 현재 가족 연락: 부모={fam.currentRelationship.contactWithParents}, 형제={fam.currentRelationship.contactWithSiblings}, 감정 관계={fam.currentRelationship.emotionalRelation}
# - 거주/경제: 현재={fam.livingSituation.current}, 과거={past_living}, 경제 수준={fam.livingSituation.economicLevel}
# - 독립: 경제={fam.independence.economic}, 정서={fam.independence.emotional}, 법적={fam.independence.legal}
# - 가정사가 미친 영향: 갈등={fam.impact.conflictLevel}, 영향={fam.impact.impactOnPersonality}, 원하는 거리감={fam.impact.desiredDistance}