// To parse this data:
//
//   import { Convert, ContentPackBundle } from "./file";
//
//   const contentPackBundle = Convert.toContentPackBundle(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface ContentPackBundle {
    enginePackage: EnginePackage;
    generatedAt:   Date;
    hashes:        Hashes;
    packs:         Packs;
    schemaVersion: string;
}

export interface EnginePackage {
    name:    string;
    version: string;
}

export interface Hashes {
    actionCatalog:   string;
    actionContracts: string;
    actionIntents:   string;
    actionPolicies:  string;
    archetypePack:   string;
    contentSchema:   string;
    contentSource:   string;
    cutscenePack:    string;
    dialoguePack:    string;
    dungeonLayouts:  string;
    eventPack:       string;
    itemPack:        string;
    overall:         string;
    questPack:       string;
    roomTemplates:   string;
    skillPack:       string;
    spaceVectors:    string;
}

export interface ContentSource {
    $schema:       string;
    contentSchema: ContentSchema;
    packs:         Packs;
    schemaVersion: string;
    vectorRuntime: SpaceVectors;
}

export interface Packs {
    actionCatalog:   ActionCatalog;
    actionContracts: ActionContracts;
    actionIntents:   ActionIntents;
    actionPolicies:  ActionPolicies;
    archetypePack:   ArchetypePack;
    contentSchema?:  ContentSchema;
    contentSource?:  ContentSource;
    cutscenePack:    CutscenePack;
    dialoguePack:    DialoguePack;
    dungeonLayouts:  DungeonLayouts;
    eventPack:       EventPack;
    itemPack:        ItemPack;
    questPack:       QuestPack;
    roomTemplates:   RoomTemplates;
    skillPack:       SkillPack;
    spaceVectors?:   SpaceVectors;
}

export interface ContentSchema {
    $schema:       string;
    featureSchema: FeatureSchema[];
    modelSchemas:  ModelSchema[];
    schemaVersion: string;
    statSchema:    StatSchema;
}

export interface FeatureSchema {
    defaultValue: number;
    featureId:    string;
    groups:       string[];
    label:        string;
}

export interface ModelSchema {
    description: string;
    featureRefs: FeatureRef[];
    label:       string;
    modelId:     string;
}

export interface FeatureRef {
    featureId: string;
    required?: boolean;
}

export interface StatSchema {
    combat:    StatDomain;
    narrative: StatDomain;
    rune:      StatDomain;
    skill:     StatDomain;
}

export interface StatDomain {
    entityKeyField:     string;
    generatedKeyExport: string;
    lookupIdField:      string;
    lookupPack:         string;
}

export interface SpaceVectors {
    actionSemantics:  ActionSemantics;
    behaviorDefaults: BehaviorDefaults;
    contentFeatures:  ContentFeature[];
    entityProjection: EntityProjection;
    eventSemantics:   EventSemantics;
    featureSchema?:   FeatureSchema[];
    itemSemantics:    ItemSemantics;
    levelSemantics:   LevelSemantics;
    modelSchemas?:    ModelSchema[];
    powerFeatures:    PowerFeature[];
    roomSemantics:    RoomSemantics;
}

export interface ActionSemantics {
    choose_dialogue: ChooseDialogue;
    drop_item:       TrainClass;
    equip_item:      EquipItem;
    evolve_skill:    EvolveSkill;
    fight:           MurderClass;
    flee:            EscapeGateClass;
    live_stream:     LiveStreamClass;
    move:            Move;
    murder:          MurderClass;
    purchase:        ActionSemanticsPurchase;
    re_equip:        EquipItem;
    recruit:         LiveStreamClass;
    rest:            ActionSemanticsREST;
    search:          Search;
    speak:           LiveStreamClass;
    steal:           Search;
    talk:            LiveStreamClass;
    train:           TrainClass;
    use_item:        UseItemClass;
}

export interface ChooseDialogue {
    explorationIntensity: number;
    socialIntensity:      number;
}

export interface TrainClass {
    combatIntensity?:  number;
    craftingIntensity: number;
    pressure:          number;
    risk:              number;
}

export interface EquipItem {
    craftingIntensity: number;
    pressure:          number;
}

export interface EvolveSkill {
    craftingIntensity: number;
    pressure:          number;
    visibility:        number;
}

export interface MurderClass {
    combatIntensity:  number;
    pressure:         number;
    risk:             number;
    socialIntensity?: number;
}

export interface EscapeGateClass {
    mobility: number;
    pressure: number;
    risk:     number;
}

export interface LiveStreamClass {
    pressure?:        number;
    risk?:            number;
    socialIntensity?: number;
    visibility:       number;
}

export interface Move {
    explorationIntensity: number;
    mobility:             number;
    risk:                 number;
}

export interface ActionSemanticsPurchase {
    craftingIntensity: number;
    risk:              number;
    socialIntensity:   number;
}

export interface ActionSemanticsREST {
    pressure:          number;
    recoveryIntensity: number;
    risk:              number;
}

export interface Search {
    explorationIntensity: number;
    risk:                 number;
    visibility:           number;
}

export interface UseItemClass {
    craftingIntensity: number;
    recoveryIntensity: number;
    risk:              number;
}

export interface BehaviorDefaults {
    actionStyle:   ActionStyle;
    eventStyle:    EventStyle;
    roomStyle:     RoomStyle;
    stepSeconds:   number;
    windowSeconds: number;
}

export interface ActionStyle {
    choose_dialogue: string;
    evolve_skill:    string;
    fight:           string;
    flee:            string;
    live_stream:     string;
    purchase:        string;
    rest:            string;
    search:          string;
    talk:            string;
    train:           string;
}

export interface EventStyle {
    deterministic: string;
    emergent:      string;
}

export interface RoomStyle {
    combat: string;
    rest:   string;
}

export interface ContentFeature {
    basisId:     string;
    description: string;
    label:       string;
    traits:      VectorProfile;
}

export interface VectorProfile {
    Comprehension?: number;
    Constraint?:    number;
    Construction?:  number;
    Direction?:     number;
    Empathy?:       number;
    Equilibrium?:   number;
    Freedom?:       number;
    Levity?:        number;
    Projection?:    number;
    Survival?:      number;
}

export interface EntityProjection {
    healthRiskScale:           number;
    manaRecoveryScale:         number;
    pressureHealthScale:       number;
    pressureReputationScale:   number;
    reputationVisibilityScale: number;
}

export interface EventSemantics {
    kind:   Kind;
    metric: Metric;
}

export interface Kind {
    deterministic: Deterministic;
    emergent:      Emergent;
}

export interface Deterministic {
    pressure: number;
}

export interface Emergent {
    explorationIntensity: number;
    risk:                 number;
}

export interface Metric {
    player_feature: LiveStreamClass;
    turn_index:     TurnIndex;
}

export interface TurnIndex {
    explorationIntensity: number;
    pressure:             number;
    risk:                 number;
}

export interface ItemSemantics {
    rarityWeights: RarityWeights;
    tagWeights:    TagWeights;
}

export interface RarityWeights {
    epic:      Epic;
    legendary: LiveStreamClass;
    rare:      Rare;
}

export interface Epic {
    pressure:   number;
    visibility: number;
}

export interface Rare {
    visibility: number;
}

export interface TagWeights {
    potion:   Potion;
    treasure: Treasure;
    weapon:   Weapon;
}

export interface Potion {
    recoveryIntensity: number;
}

export interface Treasure {
    explorationIntensity: number;
    visibility:           number;
}

export interface Weapon {
    combatIntensity: number;
    risk:            number;
}

export interface LevelSemantics {
    combatRoomPressureScale: number;
    restRoomRecoveryScale:   number;
}

export interface PowerFeature {
    basisId:     string;
    description: string;
    label:       string;
    traits:      FeatureProfile;
}

export interface FeatureProfile {
    Awareness?: number;
    Effort?:    number;
    Fame?:      number;
    Guile?:     number;
    Momentum?:  number;
}

export interface RoomSemantics {
    combat:      MurderClass;
    corridor:    Corridor;
    dialogue:    LiveStreamClass;
    escape_gate: EscapeGateClass;
    exit:        EscapeGateClass;
    rest:        ActionSemanticsREST;
    rune_forge:  EvolveSkill;
    stairs_down: Move;
    stairs_up:   StairsUp;
    start:       Start;
    training:    Training;
    treasure:    Search;
}

export interface Corridor {
    explorationIntensity: number;
    mobility:             number;
}

export interface StairsUp {
    explorationIntensity: number;
    mobility:             number;
    pressure:             number;
}

export interface Start {
    explorationIntensity: number;
    pressure:             number;
    visibility:           number;
}

export interface Training {
    combatIntensity:   number;
    pressure:          number;
    recoveryIntensity: number;
}

export interface ActionCatalog {
    actions: Action[];
}

export interface Action {
    actionType:           string;
    group:                string;
    requiresEncounter?:   boolean;
    requiresRoomFeature?: string;
    requiresTarget:       boolean;
}

export interface ActionContracts {
    actions:            Actions;
    canonicalSeedV1:    number;
    deedProjection:     DeedProjection;
    entityPressure:     EntityPressure;
    roomInfluenceScale: number;
}

export interface Actions {
    dropItem:    DropItemClass;
    equipItem:   DropItemClass;
    fight:       ActionsFight;
    flee:        ActionsFlee;
    liveStream:  LiveStream;
    murder:      Murder;
    purchase:    ActionsPurchase;
    recruit:     Recruit;
    reEquip:     DropItemClass;
    rest:        ActionsREST;
    searchEmpty: SearchEmpty;
    steal:       Steal;
    talk:        Talk;
    train:       Train;
    useItem:     UseItem;
}

export interface DropItemClass {
    featureDelta: DropItemFeatureDelta;
}

export interface DropItemFeatureDelta {
    Momentum: number;
}

export interface ActionsFight {
    featureDelta: DropItemFeatureDelta;
    traitDelta:   FightTraitDelta;
    xpDelta:      number;
}

export interface FightTraitDelta {
    Direction: number;
    Survival:  number;
}

export interface ActionsFlee {
    traitDelta: FleeTraitDelta;
}

export interface FleeTraitDelta {
    Survival: number;
}

export interface LiveStream {
    effortCost:   number;
    featureDelta: DropItemFeatureDelta;
    traitDelta:   LiveStreamTraitDelta;
}

export interface LiveStreamTraitDelta {
    Projection: number;
}

export interface Murder {
    featureDelta:    DropItemFeatureDelta;
    reputationDelta: number;
    traitDelta:      MurderTraitDelta;
    xpDelta:         number;
}

export interface MurderTraitDelta {
    Constraint: number;
    Survival:   number;
}

export interface ActionsPurchase {
    featureDelta: PurchaseFeatureDelta;
    traitDelta:   PurchaseTraitDelta;
}

export interface PurchaseFeatureDelta {
    Awareness: number;
    Momentum:  number;
}

export interface PurchaseTraitDelta {
    Comprehension: number;
    Constraint:    number;
}

export interface Recruit {
    featureDelta: RecruitFeatureDelta;
    traitDelta:   TraitDelta;
}

export interface RecruitFeatureDelta {
    Awareness: number;
}

export interface TraitDelta {
    Empathy: number;
}

export interface ActionsREST {
    manaDeltaBase:     number;
    manaDeltaRestRoom: number;
    traitDelta:        RESTTraitDelta;
}

export interface RESTTraitDelta {
    Equilibrium: number;
    Levity:      number;
}

export interface SearchEmpty {
    traitDelta: SearchEmptyTraitDelta;
}

export interface SearchEmptyTraitDelta {
    Comprehension: number;
}

export interface Steal {
    featureDelta: StealFeatureDelta;
    traitDelta:   MurderTraitDelta;
}

export interface StealFeatureDelta {
    Guile: number;
}

export interface Talk {
    featureDelta:       RecruitFeatureDelta;
    noTargetTraitDelta: TraitDelta;
    traitDelta:         PurpleTraitDelta;
}

export interface PurpleTraitDelta {
    Comprehension: number;
    Empathy:       number;
}

export interface Train {
    featureDelta: DropItemFeatureDelta;
    manaDelta:    number;
    traitDelta:   TrainTraitDelta;
    xpDelta:      number;
}

export interface TrainTraitDelta {
    Constraint: number;
    Direction:  number;
}

export interface UseItem {
    featureDelta: RecruitFeatureDelta;
    traitDelta:   SearchEmptyTraitDelta;
}

export interface DeedProjection {
    globalBudget:  number;
    perFeatureCap: number;
}

export interface EntityPressure {
    cap:                  number;
    countItemsAsEntities: boolean;
}

export interface ActionIntents {
    intents: Intent[];
}

export interface Intent {
    actionType: string;
    uiIntent:   string;
    uiPriority: number;
    uiScreen:   string;
}

export interface ActionPolicies {
    policies: Policy[];
}

export interface Policy {
    entityKindFilter: string[];
    label:            string;
    policyId:         string;
    priorityOrder:    string[];
}

export interface ArchetypePack {
    archetypes: Archetype[];
}

export interface Archetype {
    archetypeId:      string;
    description:      string;
    label:            string;
    narrativeProfile: { [key: string]: number };
    preferredSkills:  string[];
    visual?:          VisualReference;
}

export interface VisualReference {
    backSpriteUrl?:   string;
    frontSpriteUrl?:  string;
    iconSpriteUrl?:   string;
    spriteCollection: string;
}

export interface CutscenePack {
    cutscenes: Cutscene[];
}

export interface Cutscene {
    cutsceneId:           string;
    minCombatStat?:       MinCombatStat;
    minFame?:             number;
    once:                 boolean;
    requiredActionType?:  string;
    requiredItemTag?:     string;
    requiredRoomFeature?: string;
    requiredRoomId?:      string;
    requiredSkillId?:     string;
    text:                 string;
    title:                string;
    triggerKind:          TriggerKind;
}

export interface MinCombatStat {
    key:   string;
    value: number;
}

export enum TriggerKind {
    ChapterComplete = "chapter_complete",
    CombatStatMilestone = "combat_stat_milestone",
    Escape = "escape",
    FameMilestone = "fame_milestone",
    ItemTag = "item_tag",
    RoomEntryFeature = "room_entry_feature",
    RoomEntryRoom = "room_entry_room",
    SkillUnlock = "skill_unlock",
}

export interface DialoguePack {
    dialogues:        DialogueEntry[];
    presenterStrings: PresenterStrings;
}

export interface DialogueEntry {
    anchorVector?:           VectorProfile;
    dialogueId:              string;
    effectVector?:           VectorProfile;
    label:                   string;
    line:                    string;
    nextDialogueId?:         string;
    onSelectCutsceneIds?:    string[];
    onSelectEventIds?:       string[];
    radius?:                 number;
    requiresItemTagAbsent?:  string;
    requiresItemTagPresent?: string;
    requiresRoomFeature?:    string;
    requiresSkillId?:        string;
    responseText:            string;
    sceneId?:                string;
    takeItemTag?:            string;
}

export interface PresenterStrings {
    $schema?:           string;
    actionGroupTitles:  { [key: string]: string };
    defaults:           PresenterDefaults;
    description?:       string;
    initialFeed:        PresenterInitialFeed;
    schemaVersion:      string;
    systemActionLabels: { [key: string]: string };
    templates:          PresenterTemplates;
}

export interface PresenterDefaults {
    cutsceneTitle:   string;
    speakIntentText: string;
}

export interface PresenterInitialFeed {
    "boot-1":       string;
    "boot-2":       string;
    "boot-3Prefix": string;
    "boot-3Suffix": string;
}

export interface PresenterTemplates {
    dialogueChoose: string;
    eventLine:      string;
    warningLine:    string;
}

export interface DungeonLayouts {
    dungeons: Dungeon[];
}

export interface Dungeon {
    dungeonId:      string;
    dungeonOrigin:  DungeonOrigin;
    escapeDepth:    number;
    escapeRoomId:   string;
    itemBlueprints: ItemBlueprint[];
    levels:         Level[];
    levelSpacing:   number;
    roomBlueprints: RoomBlueprint[];
    roomSize:       DungeonOrigin;
    startDepth:     number;
    startRoomId:    string;
    title:          string;
}

export interface DungeonOrigin {
    x: number;
    y: number;
    z: number;
}

export interface ItemBlueprint {
    description:     string;
    itemBlueprintId: string;
    name:            string;
    rarity:          string;
    tags:            string[];
    vectorDelta?:    { [key: string]: number };
}

export interface Level {
    columns:     number;
    depth:       number;
    heightScale: number;
    rooms:       Room[];
    rows:        number;
    transform:   Transform;
}

export interface Room {
    baseVector:      VectorProfile;
    column:          number;
    description:     string;
    exits:           Exit[];
    feature:         string;
    index:           number;
    items:           RoomItem[];
    name:            string;
    roomBlueprintId: string;
    roomId:          string;
    row:             number;
    transform:       Transform;
}

export interface Exit {
    depth:     number;
    direction: string;
    roomId:    string;
}

export interface RoomItem {
    description:     string;
    isPresent:       boolean;
    itemBlueprintId: string;
    itemId:          string;
    name:            string;
    rarity:          string;
    tags:            string[];
    transform:       Transform;
    vectorDelta?:    { [key: string]: number };
}

export interface Transform {
    position: DungeonOrigin;
    rotation: DungeonOrigin;
    scale:    DungeonOrigin;
}

export interface RoomBlueprint {
    baseVector:      VectorProfile;
    description:     string;
    feature:         string;
    name:            string;
    roomBlueprintId: string;
}

export interface EventPack {
    events: Event[];
}

export interface Event {
    eventId:                     string;
    globalEnemyLevelBonusDelta?: number;
    kind:                        string;
    message:                     string;
    narrativeStatDelta?:         { [key: string]: number };
    probability?:                number;
    trigger:                     Trigger;
}

export interface Trigger {
    gte:    number;
    key?:   string;
    metric: string;
}

export interface ItemPack {
    items:        ItemPackItem[];
    rarityTiers?: string[];
}

export interface ItemPackItem {
    equip_slot_id?: string;
    itemId:         string;
    name?:          string;
    rarityId?:      string;
    tags:           string[];
    vectorDelta?:   { [key: string]: number };
    visual?:        VisualReference;
}

export interface QuestPack {
    quests: Quest[];
}

export interface Quest {
    description:      string;
    iconSpriteUrl?:   string;
    progressRules:    ProgressRule[];
    questId:          string;
    rarityId?:        string;
    requiredProgress: RequiredProgress;
    title:            string;
}

export interface ProgressRule {
    actionType?:    string;
    amount?:        number;
    kind:           string;
    setToRequired?: boolean;
}

export interface RequiredProgress {
    mode:   string;
    value?: number;
}

export interface RoomTemplates {
    templates: Template[];
}

export interface Template {
    baseVector: VectorProfile;
    feature:    string;
}

export interface SkillPack {
    skills: Skill[];
}

export interface Skill {
    branch:             string;
    branchGroup?:       string;
    description:        string;
    evolvesFrom?:       string;
    exclusiveWith?:     string[];
    name:               string;
    narrativeProfile:   { [key: string]: number };
    narrativeStatBonus: { [key: string]: number };
    requiresRuneForge?: boolean;
    skillId:            string;
    unlockRadius:       number;
    unlockRequirements: Requirement[];
    useRequirements:    Requirement[];
    visual?:            VisualReference;
}

export interface Requirement {
    description: string;
    key?:        string;
    kind:        string;
    value?:      number;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toContentPackBundle(json: string): ContentPackBundle {
        return cast(JSON.parse(json), r("ContentPackBundle"));
    }

    public static contentPackBundleToJson(value: ContentPackBundle): string {
        return JSON.stringify(uncast(value, r("ContentPackBundle")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "ContentPackBundle": o([
        { json: "enginePackage", js: "enginePackage", typ: r("EnginePackage") },
        { json: "generatedAt", js: "generatedAt", typ: Date },
        { json: "hashes", js: "hashes", typ: r("Hashes") },
        { json: "packs", js: "packs", typ: r("Packs") },
        { json: "schemaVersion", js: "schemaVersion", typ: "" },
    ], false),
    "EnginePackage": o([
        { json: "name", js: "name", typ: "" },
        { json: "version", js: "version", typ: "" },
    ], false),
    "Hashes": o([
        { json: "actionCatalog", js: "actionCatalog", typ: "" },
        { json: "actionContracts", js: "actionContracts", typ: "" },
        { json: "actionIntents", js: "actionIntents", typ: "" },
        { json: "actionPolicies", js: "actionPolicies", typ: "" },
        { json: "archetypePack", js: "archetypePack", typ: "" },
        { json: "contentSchema", js: "contentSchema", typ: "" },
        { json: "contentSource", js: "contentSource", typ: "" },
        { json: "cutscenePack", js: "cutscenePack", typ: "" },
        { json: "dialoguePack", js: "dialoguePack", typ: "" },
        { json: "dungeonLayouts", js: "dungeonLayouts", typ: "" },
        { json: "eventPack", js: "eventPack", typ: "" },
        { json: "itemPack", js: "itemPack", typ: "" },
        { json: "overall", js: "overall", typ: "" },
        { json: "questPack", js: "questPack", typ: "" },
        { json: "roomTemplates", js: "roomTemplates", typ: "" },
        { json: "skillPack", js: "skillPack", typ: "" },
        { json: "spaceVectors", js: "spaceVectors", typ: "" },
    ], false),
    "ContentSource": o([
        { json: "$schema", js: "$schema", typ: "" },
        { json: "contentSchema", js: "contentSchema", typ: r("ContentSchema") },
        { json: "packs", js: "packs", typ: r("Packs") },
        { json: "schemaVersion", js: "schemaVersion", typ: "" },
        { json: "vectorRuntime", js: "vectorRuntime", typ: r("SpaceVectors") },
    ], false),
    "Packs": o([
        { json: "actionCatalog", js: "actionCatalog", typ: r("ActionCatalog") },
        { json: "actionContracts", js: "actionContracts", typ: r("ActionContracts") },
        { json: "actionIntents", js: "actionIntents", typ: r("ActionIntents") },
        { json: "actionPolicies", js: "actionPolicies", typ: r("ActionPolicies") },
        { json: "archetypePack", js: "archetypePack", typ: r("ArchetypePack") },
        { json: "contentSchema", js: "contentSchema", typ: u(undefined, r("ContentSchema")) },
        { json: "contentSource", js: "contentSource", typ: u(undefined, r("ContentSource")) },
        { json: "cutscenePack", js: "cutscenePack", typ: r("CutscenePack") },
        { json: "dialoguePack", js: "dialoguePack", typ: r("DialoguePack") },
        { json: "dungeonLayouts", js: "dungeonLayouts", typ: r("DungeonLayouts") },
        { json: "eventPack", js: "eventPack", typ: r("EventPack") },
        { json: "itemPack", js: "itemPack", typ: r("ItemPack") },
        { json: "questPack", js: "questPack", typ: r("QuestPack") },
        { json: "roomTemplates", js: "roomTemplates", typ: r("RoomTemplates") },
        { json: "skillPack", js: "skillPack", typ: r("SkillPack") },
        { json: "spaceVectors", js: "spaceVectors", typ: u(undefined, r("SpaceVectors")) },
    ], false),
    "ContentSchema": o([
        { json: "$schema", js: "$schema", typ: "" },
        { json: "featureSchema", js: "featureSchema", typ: a(r("FeatureSchema")) },
        { json: "modelSchemas", js: "modelSchemas", typ: a(r("ModelSchema")) },
        { json: "schemaVersion", js: "schemaVersion", typ: "" },
        { json: "statSchema", js: "statSchema", typ: r("StatSchema") },
    ], false),
    "FeatureSchema": o([
        { json: "defaultValue", js: "defaultValue", typ: 0 },
        { json: "featureId", js: "featureId", typ: "" },
        { json: "groups", js: "groups", typ: a("") },
        { json: "label", js: "label", typ: "" },
    ], false),
    "ModelSchema": o([
        { json: "description", js: "description", typ: "" },
        { json: "featureRefs", js: "featureRefs", typ: a(r("FeatureRef")) },
        { json: "label", js: "label", typ: "" },
        { json: "modelId", js: "modelId", typ: "" },
    ], false),
    "FeatureRef": o([
        { json: "featureId", js: "featureId", typ: "" },
        { json: "required", js: "required", typ: u(undefined, true) },
    ], false),
    "StatSchema": o([
        { json: "combat", js: "combat", typ: r("StatDomain") },
        { json: "narrative", js: "narrative", typ: r("StatDomain") },
        { json: "rune", js: "rune", typ: r("StatDomain") },
        { json: "skill", js: "skill", typ: r("StatDomain") },
    ], false),
    "StatDomain": o([
        { json: "entityKeyField", js: "entityKeyField", typ: "" },
        { json: "generatedKeyExport", js: "generatedKeyExport", typ: "" },
        { json: "lookupIdField", js: "lookupIdField", typ: "" },
        { json: "lookupPack", js: "lookupPack", typ: "" },
    ], false),
    "SpaceVectors": o([
        { json: "actionSemantics", js: "actionSemantics", typ: r("ActionSemantics") },
        { json: "behaviorDefaults", js: "behaviorDefaults", typ: r("BehaviorDefaults") },
        { json: "contentFeatures", js: "contentFeatures", typ: a(r("ContentFeature")) },
        { json: "entityProjection", js: "entityProjection", typ: r("EntityProjection") },
        { json: "eventSemantics", js: "eventSemantics", typ: r("EventSemantics") },
        { json: "featureSchema", js: "featureSchema", typ: u(undefined, a(r("FeatureSchema"))) },
        { json: "itemSemantics", js: "itemSemantics", typ: r("ItemSemantics") },
        { json: "levelSemantics", js: "levelSemantics", typ: r("LevelSemantics") },
        { json: "modelSchemas", js: "modelSchemas", typ: u(undefined, a(r("ModelSchema"))) },
        { json: "powerFeatures", js: "powerFeatures", typ: a(r("PowerFeature")) },
        { json: "roomSemantics", js: "roomSemantics", typ: r("RoomSemantics") },
    ], false),
    "ActionSemantics": o([
        { json: "choose_dialogue", js: "choose_dialogue", typ: r("ChooseDialogue") },
        { json: "drop_item", js: "drop_item", typ: r("TrainClass") },
        { json: "equip_item", js: "equip_item", typ: r("EquipItem") },
        { json: "evolve_skill", js: "evolve_skill", typ: r("EvolveSkill") },
        { json: "fight", js: "fight", typ: r("MurderClass") },
        { json: "flee", js: "flee", typ: r("EscapeGateClass") },
        { json: "live_stream", js: "live_stream", typ: r("LiveStreamClass") },
        { json: "move", js: "move", typ: r("Move") },
        { json: "murder", js: "murder", typ: r("MurderClass") },
        { json: "purchase", js: "purchase", typ: r("ActionSemanticsPurchase") },
        { json: "re_equip", js: "re_equip", typ: r("EquipItem") },
        { json: "recruit", js: "recruit", typ: r("LiveStreamClass") },
        { json: "rest", js: "rest", typ: r("ActionSemanticsREST") },
        { json: "search", js: "search", typ: r("Search") },
        { json: "speak", js: "speak", typ: r("LiveStreamClass") },
        { json: "steal", js: "steal", typ: r("Search") },
        { json: "talk", js: "talk", typ: r("LiveStreamClass") },
        { json: "train", js: "train", typ: r("TrainClass") },
        { json: "use_item", js: "use_item", typ: r("UseItemClass") },
    ], false),
    "ChooseDialogue": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "socialIntensity", js: "socialIntensity", typ: 3.14 },
    ], false),
    "TrainClass": o([
        { json: "combatIntensity", js: "combatIntensity", typ: u(undefined, 3.14) },
        { json: "craftingIntensity", js: "craftingIntensity", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
    ], false),
    "EquipItem": o([
        { json: "craftingIntensity", js: "craftingIntensity", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
    ], false),
    "EvolveSkill": o([
        { json: "craftingIntensity", js: "craftingIntensity", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "visibility", js: "visibility", typ: 3.14 },
    ], false),
    "MurderClass": o([
        { json: "combatIntensity", js: "combatIntensity", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
        { json: "socialIntensity", js: "socialIntensity", typ: u(undefined, 3.14) },
    ], false),
    "EscapeGateClass": o([
        { json: "mobility", js: "mobility", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
    ], false),
    "LiveStreamClass": o([
        { json: "pressure", js: "pressure", typ: u(undefined, 3.14) },
        { json: "risk", js: "risk", typ: u(undefined, 3.14) },
        { json: "socialIntensity", js: "socialIntensity", typ: u(undefined, 3.14) },
        { json: "visibility", js: "visibility", typ: 3.14 },
    ], false),
    "Move": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "mobility", js: "mobility", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
    ], false),
    "ActionSemanticsPurchase": o([
        { json: "craftingIntensity", js: "craftingIntensity", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
        { json: "socialIntensity", js: "socialIntensity", typ: 3.14 },
    ], false),
    "ActionSemanticsREST": o([
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "recoveryIntensity", js: "recoveryIntensity", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
    ], false),
    "Search": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
        { json: "visibility", js: "visibility", typ: 3.14 },
    ], false),
    "UseItemClass": o([
        { json: "craftingIntensity", js: "craftingIntensity", typ: 3.14 },
        { json: "recoveryIntensity", js: "recoveryIntensity", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
    ], false),
    "BehaviorDefaults": o([
        { json: "actionStyle", js: "actionStyle", typ: r("ActionStyle") },
        { json: "eventStyle", js: "eventStyle", typ: r("EventStyle") },
        { json: "roomStyle", js: "roomStyle", typ: r("RoomStyle") },
        { json: "stepSeconds", js: "stepSeconds", typ: 0 },
        { json: "windowSeconds", js: "windowSeconds", typ: 0 },
    ], false),
    "ActionStyle": o([
        { json: "choose_dialogue", js: "choose_dialogue", typ: "" },
        { json: "evolve_skill", js: "evolve_skill", typ: "" },
        { json: "fight", js: "fight", typ: "" },
        { json: "flee", js: "flee", typ: "" },
        { json: "live_stream", js: "live_stream", typ: "" },
        { json: "purchase", js: "purchase", typ: "" },
        { json: "rest", js: "rest", typ: "" },
        { json: "search", js: "search", typ: "" },
        { json: "talk", js: "talk", typ: "" },
        { json: "train", js: "train", typ: "" },
    ], false),
    "EventStyle": o([
        { json: "deterministic", js: "deterministic", typ: "" },
        { json: "emergent", js: "emergent", typ: "" },
    ], false),
    "RoomStyle": o([
        { json: "combat", js: "combat", typ: "" },
        { json: "rest", js: "rest", typ: "" },
    ], false),
    "ContentFeature": o([
        { json: "basisId", js: "basisId", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "label", js: "label", typ: "" },
        { json: "traits", js: "traits", typ: r("VectorProfile") },
    ], false),
    "VectorProfile": o([
        { json: "Comprehension", js: "Comprehension", typ: u(undefined, 3.14) },
        { json: "Constraint", js: "Constraint", typ: u(undefined, 3.14) },
        { json: "Construction", js: "Construction", typ: u(undefined, 3.14) },
        { json: "Direction", js: "Direction", typ: u(undefined, 3.14) },
        { json: "Empathy", js: "Empathy", typ: u(undefined, 3.14) },
        { json: "Equilibrium", js: "Equilibrium", typ: u(undefined, 3.14) },
        { json: "Freedom", js: "Freedom", typ: u(undefined, 3.14) },
        { json: "Levity", js: "Levity", typ: u(undefined, 3.14) },
        { json: "Projection", js: "Projection", typ: u(undefined, 3.14) },
        { json: "Survival", js: "Survival", typ: u(undefined, 3.14) },
    ], false),
    "EntityProjection": o([
        { json: "healthRiskScale", js: "healthRiskScale", typ: 0 },
        { json: "manaRecoveryScale", js: "manaRecoveryScale", typ: 0 },
        { json: "pressureHealthScale", js: "pressureHealthScale", typ: 3.14 },
        { json: "pressureReputationScale", js: "pressureReputationScale", typ: 3.14 },
        { json: "reputationVisibilityScale", js: "reputationVisibilityScale", typ: 3.14 },
    ], false),
    "EventSemantics": o([
        { json: "kind", js: "kind", typ: r("Kind") },
        { json: "metric", js: "metric", typ: r("Metric") },
    ], false),
    "Kind": o([
        { json: "deterministic", js: "deterministic", typ: r("Deterministic") },
        { json: "emergent", js: "emergent", typ: r("Emergent") },
    ], false),
    "Deterministic": o([
        { json: "pressure", js: "pressure", typ: 3.14 },
    ], false),
    "Emergent": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
    ], false),
    "Metric": o([
        { json: "player_feature", js: "player_feature", typ: r("LiveStreamClass") },
        { json: "turn_index", js: "turn_index", typ: r("TurnIndex") },
    ], false),
    "TurnIndex": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
    ], false),
    "ItemSemantics": o([
        { json: "rarityWeights", js: "rarityWeights", typ: r("RarityWeights") },
        { json: "tagWeights", js: "tagWeights", typ: r("TagWeights") },
    ], false),
    "RarityWeights": o([
        { json: "epic", js: "epic", typ: r("Epic") },
        { json: "legendary", js: "legendary", typ: r("LiveStreamClass") },
        { json: "rare", js: "rare", typ: r("Rare") },
    ], false),
    "Epic": o([
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "visibility", js: "visibility", typ: 3.14 },
    ], false),
    "Rare": o([
        { json: "visibility", js: "visibility", typ: 3.14 },
    ], false),
    "TagWeights": o([
        { json: "potion", js: "potion", typ: r("Potion") },
        { json: "treasure", js: "treasure", typ: r("Treasure") },
        { json: "weapon", js: "weapon", typ: r("Weapon") },
    ], false),
    "Potion": o([
        { json: "recoveryIntensity", js: "recoveryIntensity", typ: 3.14 },
    ], false),
    "Treasure": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "visibility", js: "visibility", typ: 3.14 },
    ], false),
    "Weapon": o([
        { json: "combatIntensity", js: "combatIntensity", typ: 3.14 },
        { json: "risk", js: "risk", typ: 3.14 },
    ], false),
    "LevelSemantics": o([
        { json: "combatRoomPressureScale", js: "combatRoomPressureScale", typ: 0 },
        { json: "restRoomRecoveryScale", js: "restRoomRecoveryScale", typ: 0 },
    ], false),
    "PowerFeature": o([
        { json: "basisId", js: "basisId", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "label", js: "label", typ: "" },
        { json: "traits", js: "traits", typ: r("FeatureProfile") },
    ], false),
    "FeatureProfile": o([
        { json: "Awareness", js: "Awareness", typ: u(undefined, 3.14) },
        { json: "Effort", js: "Effort", typ: u(undefined, 0) },
        { json: "Fame", js: "Fame", typ: u(undefined, 3.14) },
        { json: "Guile", js: "Guile", typ: u(undefined, 3.14) },
        { json: "Momentum", js: "Momentum", typ: u(undefined, 3.14) },
    ], false),
    "RoomSemantics": o([
        { json: "combat", js: "combat", typ: r("MurderClass") },
        { json: "corridor", js: "corridor", typ: r("Corridor") },
        { json: "dialogue", js: "dialogue", typ: r("LiveStreamClass") },
        { json: "escape_gate", js: "escape_gate", typ: r("EscapeGateClass") },
        { json: "exit", js: "exit", typ: r("EscapeGateClass") },
        { json: "rest", js: "rest", typ: r("ActionSemanticsREST") },
        { json: "rune_forge", js: "rune_forge", typ: r("EvolveSkill") },
        { json: "stairs_down", js: "stairs_down", typ: r("Move") },
        { json: "stairs_up", js: "stairs_up", typ: r("StairsUp") },
        { json: "start", js: "start", typ: r("Start") },
        { json: "training", js: "training", typ: r("Training") },
        { json: "treasure", js: "treasure", typ: r("Search") },
    ], false),
    "Corridor": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "mobility", js: "mobility", typ: 3.14 },
    ], false),
    "StairsUp": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "mobility", js: "mobility", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
    ], false),
    "Start": o([
        { json: "explorationIntensity", js: "explorationIntensity", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "visibility", js: "visibility", typ: 3.14 },
    ], false),
    "Training": o([
        { json: "combatIntensity", js: "combatIntensity", typ: 3.14 },
        { json: "pressure", js: "pressure", typ: 3.14 },
        { json: "recoveryIntensity", js: "recoveryIntensity", typ: 3.14 },
    ], false),
    "ActionCatalog": o([
        { json: "actions", js: "actions", typ: a(r("Action")) },
    ], false),
    "Action": o([
        { json: "actionType", js: "actionType", typ: "" },
        { json: "group", js: "group", typ: "" },
        { json: "requiresEncounter", js: "requiresEncounter", typ: u(undefined, true) },
        { json: "requiresRoomFeature", js: "requiresRoomFeature", typ: u(undefined, "") },
        { json: "requiresTarget", js: "requiresTarget", typ: true },
    ], false),
    "ActionContracts": o([
        { json: "actions", js: "actions", typ: r("Actions") },
        { json: "canonicalSeedV1", js: "canonicalSeedV1", typ: 0 },
        { json: "deedProjection", js: "deedProjection", typ: r("DeedProjection") },
        { json: "entityPressure", js: "entityPressure", typ: r("EntityPressure") },
        { json: "roomInfluenceScale", js: "roomInfluenceScale", typ: 3.14 },
    ], false),
    "Actions": o([
        { json: "dropItem", js: "dropItem", typ: r("DropItemClass") },
        { json: "equipItem", js: "equipItem", typ: r("DropItemClass") },
        { json: "fight", js: "fight", typ: r("ActionsFight") },
        { json: "flee", js: "flee", typ: r("ActionsFlee") },
        { json: "liveStream", js: "liveStream", typ: r("LiveStream") },
        { json: "murder", js: "murder", typ: r("Murder") },
        { json: "purchase", js: "purchase", typ: r("ActionsPurchase") },
        { json: "recruit", js: "recruit", typ: r("Recruit") },
        { json: "reEquip", js: "reEquip", typ: r("DropItemClass") },
        { json: "rest", js: "rest", typ: r("ActionsREST") },
        { json: "searchEmpty", js: "searchEmpty", typ: r("SearchEmpty") },
        { json: "steal", js: "steal", typ: r("Steal") },
        { json: "talk", js: "talk", typ: r("Talk") },
        { json: "train", js: "train", typ: r("Train") },
        { json: "useItem", js: "useItem", typ: r("UseItem") },
    ], false),
    "DropItemClass": o([
        { json: "featureDelta", js: "featureDelta", typ: r("DropItemFeatureDelta") },
    ], false),
    "DropItemFeatureDelta": o([
        { json: "Momentum", js: "Momentum", typ: 3.14 },
    ], false),
    "ActionsFight": o([
        { json: "featureDelta", js: "featureDelta", typ: r("DropItemFeatureDelta") },
        { json: "traitDelta", js: "traitDelta", typ: r("FightTraitDelta") },
        { json: "xpDelta", js: "xpDelta", typ: 0 },
    ], false),
    "FightTraitDelta": o([
        { json: "Direction", js: "Direction", typ: 3.14 },
        { json: "Survival", js: "Survival", typ: 3.14 },
    ], false),
    "ActionsFlee": o([
        { json: "traitDelta", js: "traitDelta", typ: r("FleeTraitDelta") },
    ], false),
    "FleeTraitDelta": o([
        { json: "Survival", js: "Survival", typ: 3.14 },
    ], false),
    "LiveStream": o([
        { json: "effortCost", js: "effortCost", typ: 0 },
        { json: "featureDelta", js: "featureDelta", typ: r("DropItemFeatureDelta") },
        { json: "traitDelta", js: "traitDelta", typ: r("LiveStreamTraitDelta") },
    ], false),
    "LiveStreamTraitDelta": o([
        { json: "Projection", js: "Projection", typ: 3.14 },
    ], false),
    "Murder": o([
        { json: "featureDelta", js: "featureDelta", typ: r("DropItemFeatureDelta") },
        { json: "reputationDelta", js: "reputationDelta", typ: 0 },
        { json: "traitDelta", js: "traitDelta", typ: r("MurderTraitDelta") },
        { json: "xpDelta", js: "xpDelta", typ: 0 },
    ], false),
    "MurderTraitDelta": o([
        { json: "Constraint", js: "Constraint", typ: 3.14 },
        { json: "Survival", js: "Survival", typ: 3.14 },
    ], false),
    "ActionsPurchase": o([
        { json: "featureDelta", js: "featureDelta", typ: r("PurchaseFeatureDelta") },
        { json: "traitDelta", js: "traitDelta", typ: r("PurchaseTraitDelta") },
    ], false),
    "PurchaseFeatureDelta": o([
        { json: "Awareness", js: "Awareness", typ: 3.14 },
        { json: "Momentum", js: "Momentum", typ: 3.14 },
    ], false),
    "PurchaseTraitDelta": o([
        { json: "Comprehension", js: "Comprehension", typ: 3.14 },
        { json: "Constraint", js: "Constraint", typ: 3.14 },
    ], false),
    "Recruit": o([
        { json: "featureDelta", js: "featureDelta", typ: r("RecruitFeatureDelta") },
        { json: "traitDelta", js: "traitDelta", typ: r("TraitDelta") },
    ], false),
    "RecruitFeatureDelta": o([
        { json: "Awareness", js: "Awareness", typ: 3.14 },
    ], false),
    "TraitDelta": o([
        { json: "Empathy", js: "Empathy", typ: 3.14 },
    ], false),
    "ActionsREST": o([
        { json: "manaDeltaBase", js: "manaDeltaBase", typ: 3.14 },
        { json: "manaDeltaRestRoom", js: "manaDeltaRestRoom", typ: 3.14 },
        { json: "traitDelta", js: "traitDelta", typ: r("RESTTraitDelta") },
    ], false),
    "RESTTraitDelta": o([
        { json: "Equilibrium", js: "Equilibrium", typ: 3.14 },
        { json: "Levity", js: "Levity", typ: 3.14 },
    ], false),
    "SearchEmpty": o([
        { json: "traitDelta", js: "traitDelta", typ: r("SearchEmptyTraitDelta") },
    ], false),
    "SearchEmptyTraitDelta": o([
        { json: "Comprehension", js: "Comprehension", typ: 3.14 },
    ], false),
    "Steal": o([
        { json: "featureDelta", js: "featureDelta", typ: r("StealFeatureDelta") },
        { json: "traitDelta", js: "traitDelta", typ: r("MurderTraitDelta") },
    ], false),
    "StealFeatureDelta": o([
        { json: "Guile", js: "Guile", typ: 3.14 },
    ], false),
    "Talk": o([
        { json: "featureDelta", js: "featureDelta", typ: r("RecruitFeatureDelta") },
        { json: "noTargetTraitDelta", js: "noTargetTraitDelta", typ: r("TraitDelta") },
        { json: "traitDelta", js: "traitDelta", typ: r("PurpleTraitDelta") },
    ], false),
    "PurpleTraitDelta": o([
        { json: "Comprehension", js: "Comprehension", typ: 3.14 },
        { json: "Empathy", js: "Empathy", typ: 3.14 },
    ], false),
    "Train": o([
        { json: "featureDelta", js: "featureDelta", typ: r("DropItemFeatureDelta") },
        { json: "manaDelta", js: "manaDelta", typ: 3.14 },
        { json: "traitDelta", js: "traitDelta", typ: r("TrainTraitDelta") },
        { json: "xpDelta", js: "xpDelta", typ: 0 },
    ], false),
    "TrainTraitDelta": o([
        { json: "Constraint", js: "Constraint", typ: 3.14 },
        { json: "Direction", js: "Direction", typ: 3.14 },
    ], false),
    "UseItem": o([
        { json: "featureDelta", js: "featureDelta", typ: r("RecruitFeatureDelta") },
        { json: "traitDelta", js: "traitDelta", typ: r("SearchEmptyTraitDelta") },
    ], false),
    "DeedProjection": o([
        { json: "globalBudget", js: "globalBudget", typ: 3.14 },
        { json: "perFeatureCap", js: "perFeatureCap", typ: 3.14 },
    ], false),
    "EntityPressure": o([
        { json: "cap", js: "cap", typ: 0 },
        { json: "countItemsAsEntities", js: "countItemsAsEntities", typ: true },
    ], false),
    "ActionIntents": o([
        { json: "intents", js: "intents", typ: a(r("Intent")) },
    ], false),
    "Intent": o([
        { json: "actionType", js: "actionType", typ: "" },
        { json: "uiIntent", js: "uiIntent", typ: "" },
        { json: "uiPriority", js: "uiPriority", typ: 0 },
        { json: "uiScreen", js: "uiScreen", typ: "" },
    ], false),
    "ActionPolicies": o([
        { json: "policies", js: "policies", typ: a(r("Policy")) },
    ], false),
    "Policy": o([
        { json: "entityKindFilter", js: "entityKindFilter", typ: a("") },
        { json: "label", js: "label", typ: "" },
        { json: "policyId", js: "policyId", typ: "" },
        { json: "priorityOrder", js: "priorityOrder", typ: a("") },
    ], false),
    "ArchetypePack": o([
        { json: "archetypes", js: "archetypes", typ: a(r("Archetype")) },
    ], false),
    "Archetype": o([
        { json: "archetypeId", js: "archetypeId", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "label", js: "label", typ: "" },
        { json: "narrativeProfile", js: "narrativeProfile", typ: m(3.14) },
        { json: "preferredSkills", js: "preferredSkills", typ: a("") },
        { json: "visual", js: "visual", typ: u(undefined, r("VisualReference")) },
    ], false),
    "VisualReference": o([
        { json: "backSpriteUrl", js: "backSpriteUrl", typ: u(undefined, "") },
        { json: "frontSpriteUrl", js: "frontSpriteUrl", typ: u(undefined, "") },
        { json: "iconSpriteUrl", js: "iconSpriteUrl", typ: u(undefined, "") },
        { json: "spriteCollection", js: "spriteCollection", typ: "" },
    ], false),
    "CutscenePack": o([
        { json: "cutscenes", js: "cutscenes", typ: a(r("Cutscene")) },
    ], false),
    "Cutscene": o([
        { json: "cutsceneId", js: "cutsceneId", typ: "" },
        { json: "minCombatStat", js: "minCombatStat", typ: u(undefined, r("MinCombatStat")) },
        { json: "minFame", js: "minFame", typ: u(undefined, 3.14) },
        { json: "once", js: "once", typ: true },
        { json: "requiredActionType", js: "requiredActionType", typ: u(undefined, "") },
        { json: "requiredItemTag", js: "requiredItemTag", typ: u(undefined, "") },
        { json: "requiredRoomFeature", js: "requiredRoomFeature", typ: u(undefined, "") },
        { json: "requiredRoomId", js: "requiredRoomId", typ: u(undefined, "") },
        { json: "requiredSkillId", js: "requiredSkillId", typ: u(undefined, "") },
        { json: "text", js: "text", typ: "" },
        { json: "title", js: "title", typ: "" },
        { json: "triggerKind", js: "triggerKind", typ: r("TriggerKind") },
    ], false),
    "MinCombatStat": o([
        { json: "key", js: "key", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], false),
    "DialoguePack": o([
        { json: "dialogues", js: "dialogues", typ: a(r("DialogueEntry")) },
        { json: "presenterStrings", js: "presenterStrings", typ: r("PresenterStrings") },
    ], false),
    "DialogueEntry": o([
        { json: "anchorVector", js: "anchorVector", typ: u(undefined, r("VectorProfile")) },
        { json: "dialogueId", js: "dialogueId", typ: "" },
        { json: "effectVector", js: "effectVector", typ: u(undefined, r("VectorProfile")) },
        { json: "label", js: "label", typ: "" },
        { json: "line", js: "line", typ: "" },
        { json: "nextDialogueId", js: "nextDialogueId", typ: u(undefined, "") },
        { json: "onSelectCutsceneIds", js: "onSelectCutsceneIds", typ: u(undefined, a("")) },
        { json: "onSelectEventIds", js: "onSelectEventIds", typ: u(undefined, a("")) },
        { json: "radius", js: "radius", typ: u(undefined, 3.14) },
        { json: "requiresItemTagAbsent", js: "requiresItemTagAbsent", typ: u(undefined, "") },
        { json: "requiresItemTagPresent", js: "requiresItemTagPresent", typ: u(undefined, "") },
        { json: "requiresRoomFeature", js: "requiresRoomFeature", typ: u(undefined, "") },
        { json: "requiresSkillId", js: "requiresSkillId", typ: u(undefined, "") },
        { json: "responseText", js: "responseText", typ: "" },
        { json: "sceneId", js: "sceneId", typ: u(undefined, "") },
        { json: "takeItemTag", js: "takeItemTag", typ: u(undefined, "") },
    ], false),
    "PresenterStrings": o([
        { json: "$schema", js: "$schema", typ: u(undefined, "") },
        { json: "actionGroupTitles", js: "actionGroupTitles", typ: m("") },
        { json: "defaults", js: "defaults", typ: r("PresenterDefaults") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "initialFeed", js: "initialFeed", typ: r("PresenterInitialFeed") },
        { json: "schemaVersion", js: "schemaVersion", typ: "" },
        { json: "systemActionLabels", js: "systemActionLabels", typ: m("") },
        { json: "templates", js: "templates", typ: r("PresenterTemplates") },
    ], false),
    "PresenterDefaults": o([
        { json: "cutsceneTitle", js: "cutsceneTitle", typ: "" },
        { json: "speakIntentText", js: "speakIntentText", typ: "" },
    ], false),
    "PresenterInitialFeed": o([
        { json: "boot-1", js: "boot-1", typ: "" },
        { json: "boot-2", js: "boot-2", typ: "" },
        { json: "boot-3Prefix", js: "boot-3Prefix", typ: "" },
        { json: "boot-3Suffix", js: "boot-3Suffix", typ: "" },
    ], false),
    "PresenterTemplates": o([
        { json: "dialogueChoose", js: "dialogueChoose", typ: "" },
        { json: "eventLine", js: "eventLine", typ: "" },
        { json: "warningLine", js: "warningLine", typ: "" },
    ], false),
    "DungeonLayouts": o([
        { json: "dungeons", js: "dungeons", typ: a(r("Dungeon")) },
    ], false),
    "Dungeon": o([
        { json: "dungeonId", js: "dungeonId", typ: "" },
        { json: "dungeonOrigin", js: "dungeonOrigin", typ: r("DungeonOrigin") },
        { json: "escapeDepth", js: "escapeDepth", typ: 0 },
        { json: "escapeRoomId", js: "escapeRoomId", typ: "" },
        { json: "itemBlueprints", js: "itemBlueprints", typ: a(r("ItemBlueprint")) },
        { json: "levels", js: "levels", typ: a(r("Level")) },
        { json: "levelSpacing", js: "levelSpacing", typ: 0 },
        { json: "roomBlueprints", js: "roomBlueprints", typ: a(r("RoomBlueprint")) },
        { json: "roomSize", js: "roomSize", typ: r("DungeonOrigin") },
        { json: "startDepth", js: "startDepth", typ: 0 },
        { json: "startRoomId", js: "startRoomId", typ: "" },
        { json: "title", js: "title", typ: "" },
    ], false),
    "DungeonOrigin": o([
        { json: "x", js: "x", typ: 3.14 },
        { json: "y", js: "y", typ: 3.14 },
        { json: "z", js: "z", typ: 3.14 },
    ], false),
    "ItemBlueprint": o([
        { json: "description", js: "description", typ: "" },
        { json: "itemBlueprintId", js: "itemBlueprintId", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "rarity", js: "rarity", typ: "" },
        { json: "tags", js: "tags", typ: a("") },
        { json: "vectorDelta", js: "vectorDelta", typ: u(undefined, m(3.14)) },
    ], false),
    "Level": o([
        { json: "columns", js: "columns", typ: 0 },
        { json: "depth", js: "depth", typ: 0 },
        { json: "heightScale", js: "heightScale", typ: 3.14 },
        { json: "rooms", js: "rooms", typ: a(r("Room")) },
        { json: "rows", js: "rows", typ: 0 },
        { json: "transform", js: "transform", typ: r("Transform") },
    ], false),
    "Room": o([
        { json: "baseVector", js: "baseVector", typ: r("VectorProfile") },
        { json: "column", js: "column", typ: 0 },
        { json: "description", js: "description", typ: "" },
        { json: "exits", js: "exits", typ: a(r("Exit")) },
        { json: "feature", js: "feature", typ: "" },
        { json: "index", js: "index", typ: 0 },
        { json: "items", js: "items", typ: a(r("RoomItem")) },
        { json: "name", js: "name", typ: "" },
        { json: "roomBlueprintId", js: "roomBlueprintId", typ: "" },
        { json: "roomId", js: "roomId", typ: "" },
        { json: "row", js: "row", typ: 0 },
        { json: "transform", js: "transform", typ: r("Transform") },
    ], false),
    "Exit": o([
        { json: "depth", js: "depth", typ: 0 },
        { json: "direction", js: "direction", typ: "" },
        { json: "roomId", js: "roomId", typ: "" },
    ], false),
    "RoomItem": o([
        { json: "description", js: "description", typ: "" },
        { json: "isPresent", js: "isPresent", typ: true },
        { json: "itemBlueprintId", js: "itemBlueprintId", typ: "" },
        { json: "itemId", js: "itemId", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "rarity", js: "rarity", typ: "" },
        { json: "tags", js: "tags", typ: a("") },
        { json: "transform", js: "transform", typ: r("Transform") },
        { json: "vectorDelta", js: "vectorDelta", typ: u(undefined, m(3.14)) },
    ], false),
    "Transform": o([
        { json: "position", js: "position", typ: r("DungeonOrigin") },
        { json: "rotation", js: "rotation", typ: r("DungeonOrigin") },
        { json: "scale", js: "scale", typ: r("DungeonOrigin") },
    ], false),
    "RoomBlueprint": o([
        { json: "baseVector", js: "baseVector", typ: r("VectorProfile") },
        { json: "description", js: "description", typ: "" },
        { json: "feature", js: "feature", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "roomBlueprintId", js: "roomBlueprintId", typ: "" },
    ], false),
    "EventPack": o([
        { json: "events", js: "events", typ: a(r("Event")) },
    ], false),
    "Event": o([
        { json: "eventId", js: "eventId", typ: "" },
        { json: "globalEnemyLevelBonusDelta", js: "globalEnemyLevelBonusDelta", typ: u(undefined, 0) },
        { json: "kind", js: "kind", typ: "" },
        { json: "message", js: "message", typ: "" },
        { json: "narrativeStatDelta", js: "narrativeStatDelta", typ: u(undefined, m(3.14)) },
        { json: "probability", js: "probability", typ: u(undefined, 3.14) },
        { json: "trigger", js: "trigger", typ: r("Trigger") },
    ], false),
    "Trigger": o([
        { json: "gte", js: "gte", typ: 0 },
        { json: "key", js: "key", typ: u(undefined, "") },
        { json: "metric", js: "metric", typ: "" },
    ], false),
    "ItemPack": o([
        { json: "items", js: "items", typ: a(r("ItemPackItem")) },
        { json: "rarityTiers", js: "rarityTiers", typ: u(undefined, a("")) },
    ], false),
    "ItemPackItem": o([
        { json: "equip_slot_id", js: "equip_slot_id", typ: u(undefined, "") },
        { json: "itemId", js: "itemId", typ: "" },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "rarityId", js: "rarityId", typ: u(undefined, "") },
        { json: "tags", js: "tags", typ: a("") },
        { json: "vectorDelta", js: "vectorDelta", typ: u(undefined, m(3.14)) },
        { json: "visual", js: "visual", typ: u(undefined, r("VisualReference")) },
    ], false),
    "QuestPack": o([
        { json: "quests", js: "quests", typ: a(r("Quest")) },
    ], false),
    "Quest": o([
        { json: "description", js: "description", typ: "" },
        { json: "iconSpriteUrl", js: "iconSpriteUrl", typ: u(undefined, "") },
        { json: "progressRules", js: "progressRules", typ: a(r("ProgressRule")) },
        { json: "questId", js: "questId", typ: "" },
        { json: "rarityId", js: "rarityId", typ: u(undefined, "") },
        { json: "requiredProgress", js: "requiredProgress", typ: r("RequiredProgress") },
        { json: "title", js: "title", typ: "" },
    ], false),
    "ProgressRule": o([
        { json: "actionType", js: "actionType", typ: u(undefined, "") },
        { json: "amount", js: "amount", typ: u(undefined, 0) },
        { json: "kind", js: "kind", typ: "" },
        { json: "setToRequired", js: "setToRequired", typ: u(undefined, true) },
    ], false),
    "RequiredProgress": o([
        { json: "mode", js: "mode", typ: "" },
        { json: "value", js: "value", typ: u(undefined, 0) },
    ], false),
    "RoomTemplates": o([
        { json: "templates", js: "templates", typ: a(r("Template")) },
    ], false),
    "Template": o([
        { json: "baseVector", js: "baseVector", typ: r("VectorProfile") },
        { json: "feature", js: "feature", typ: "" },
    ], false),
    "SkillPack": o([
        { json: "skills", js: "skills", typ: a(r("Skill")) },
    ], false),
    "Skill": o([
        { json: "branch", js: "branch", typ: "" },
        { json: "branchGroup", js: "branchGroup", typ: u(undefined, "") },
        { json: "description", js: "description", typ: "" },
        { json: "evolvesFrom", js: "evolvesFrom", typ: u(undefined, "") },
        { json: "exclusiveWith", js: "exclusiveWith", typ: u(undefined, a("")) },
        { json: "name", js: "name", typ: "" },
        { json: "narrativeProfile", js: "narrativeProfile", typ: m(3.14) },
        { json: "narrativeStatBonus", js: "narrativeStatBonus", typ: m(3.14) },
        { json: "requiresRuneForge", js: "requiresRuneForge", typ: u(undefined, true) },
        { json: "skillId", js: "skillId", typ: "" },
        { json: "unlockRadius", js: "unlockRadius", typ: 3.14 },
        { json: "unlockRequirements", js: "unlockRequirements", typ: a(r("Requirement")) },
        { json: "useRequirements", js: "useRequirements", typ: a(r("Requirement")) },
        { json: "visual", js: "visual", typ: u(undefined, r("VisualReference")) },
    ], false),
    "Requirement": o([
        { json: "description", js: "description", typ: "" },
        { json: "key", js: "key", typ: u(undefined, "") },
        { json: "kind", js: "kind", typ: "" },
        { json: "value", js: "value", typ: u(undefined, 3.14) },
    ], false),
    "TriggerKind": [
        "chapter_complete",
        "combat_stat_milestone",
        "escape",
        "fame_milestone",
        "item_tag",
        "room_entry_feature",
        "room_entry_room",
        "skill_unlock",
    ],
};
