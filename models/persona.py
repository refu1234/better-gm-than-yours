# backend/app/persona.py
# KPC 성격/관계/가정사/신념 JSON 스키마
# JSON 스키마를 Pydantic 모델로 코드화


from typing import List, Optional
from pydantic import BaseModel


class BasicInfo(BaseModel):
    name: str
    birthplace: str
    gender: str  # "male" | "female" | "other"
    job: str


class Appearance(BaseModel):
    age: int
    hairColor: str
    eyeColor: str
    skinColor: str
    heightCm: int
    bodyType: str
    attractiveness: int
    hasTattooOrScar: bool
    tattooOrScarDetail: Optional[str] = None
    accessories: List[str] = []
    vibes: List[str] = []


class Big5(BaseModel):
    openness: int
    conscientiousness: int
    extraversion: int
    agreeableness: int
    neuroticism: int


class RelationshipAxes(BaseModel):
    emotionalValence: str
    powerDynamics: str
    dependency: str
    attachmentStyle: str
    desiredOutcome: str


class ConflictNeedFear(BaseModel):
    conflict: str
    need: str
    fear: str


class RelationalRoles(BaseModel):
    kpcRoles: str
    pcRoles: str


class RelationshipToPC(BaseModel):
    axes: RelationshipAxes
    cnf: ConflictNeedFear
    roles: RelationalRoles


class FamilyComposition(BaseModel):
    parentsAlive: str
    parentsMaritalStatus: str
    siblingType: str
    siblingAndBirthOrder: Optional[str] = None


class PrimaryCaregivers(BaseModel):
    caregiverType: str
    stability: str


class CurrentFamilyRelationship(BaseModel):
    contactWithParents: str
    contactWithSiblings: str
    emotionalRelation: str


class LivingSituation(BaseModel):
    current: str
    past: List[str] = []
    economicLevel: str


class IndependenceLevel(BaseModel):
    economic: str
    emotional: str
    legal: str


class FamilyImpact(BaseModel):
    conflictLevel: str
    impactOnPersonality: str
    desiredDistance: str


class Family(BaseModel):
    composition: FamilyComposition
    primaryCaregivers: PrimaryCaregivers
    currentRelationship: CurrentFamilyRelationship
    livingSituation: LivingSituation
    independence: IndependenceLevel
    impact: FamilyImpact


class Belief(BaseModel):
    item1: str
    item2: str
    item3: str
    item4: str
    item5: str
    item6: str
    item7: str
    item8: str
    item9: str
    item10: str
    summary: str

class KpcPersona(BaseModel):
    basic: BasicInfo
    appearance: Appearance
    big5: Big5
    relationshipToPC: RelationshipToPC
    family: Family
    belief: Belief