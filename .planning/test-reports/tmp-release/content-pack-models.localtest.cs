// generated from content-pack.manifest.v1

public record class EntityBaseModel
{
  public float Comprehension { get; init; } = 0.000f;
  public float Constraint { get; init; } = 0.000f;
  public float Survival { get; init; } = 0.000f;
  public float Fame { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
  public float Guile { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
}

public record class EntityWerewolfModel
{
  public float Survival { get; init; } = 0.000f;
  public float Direction { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
  public float Guile { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
}

public record class EntityVillagerModel
{
  public float Empathy { get; init; } = 0.000f;
  public float Comprehension { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
  public float Fame { get; init; } = 0.000f;
  public float Equilibrium { get; init; } = 0.000f;
}

public record class EntityHostileModel
{
  public float Survival { get; init; } = 0.000f;
  public float Constraint { get; init; } = 0.000f;
  public float Direction { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
}

public record class ItemBaseModel
{
  public float Construction { get; init; } = 0.000f;
  public float Constraint { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
}

public record class ItemWeaponModel
{
  public float Constraint { get; init; } = 0.000f;
  public float Direction { get; init; } = 0.000f;
  public float Survival { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
}

public record class ItemPotionModel
{
  public float Equilibrium { get; init; } = 0.000f;
  public float Levity { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
}

public record class ItemQuestModel
{
  public float Projection { get; init; } = 0.000f;
  public float Comprehension { get; init; } = 0.000f;
  public float Fame { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
}

public record class RoomBaseModel
{
  public float Equilibrium { get; init; } = 0.000f;
  public float Freedom { get; init; } = 0.000f;
  public float Direction { get; init; } = 0.000f;
  public float Survival { get; init; } = 0.000f;
}

public record class RoomCombatModel
{
  public float Survival { get; init; } = 0.000f;
  public float Constraint { get; init; } = 0.000f;
  public float Direction { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
}

public record class RoomDialogueModel
{
  public float Empathy { get; init; } = 0.000f;
  public float Comprehension { get; init; } = 0.000f;
  public float Levity { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
}

public record class RoomRuneForgeModel
{
  public float Construction { get; init; } = 0.000f;
  public float Constraint { get; init; } = 0.000f;
  public float Projection { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
}

public record class RoomTreasureModel
{
  public float Freedom { get; init; } = 0.000f;
  public float Projection { get; init; } = 0.000f;
  public float Survival { get; init; } = 0.000f;
  public float Fame { get; init; } = 0.000f;
}

public record class LevelBaseModel
{
  public float Effort { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
  public float Fame { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
}

public record class LevelBossFloorModel
{
  public float Survival { get; init; } = 0.000f;
  public float Constraint { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
  public float Fame { get; init; } = 0.000f;
}

public record class LevelSafeFloorModel
{
  public float Equilibrium { get; init; } = 0.000f;
  public float Levity { get; init; } = 0.000f;
  public float Empathy { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
}

public record class EffectBaseModel
{
  public float Projection { get; init; } = 0.000f;
  public float Survival { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
}

public record class EffectDotModel
{
  public float Constraint { get; init; } = 0.000f;
  public float Survival { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
}

public record class EffectHotModel
{
  public float Equilibrium { get; init; } = 0.000f;
  public float Levity { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
  public float Effort { get; init; } = 0.000f;
}

public record class EffectAuraModel
{
  public float Projection { get; init; } = 0.000f;
  public float Freedom { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
}

public record class EffectTriggeredModel
{
  public float Projection { get; init; } = 0.000f;
  public float Constraint { get; init; } = 0.000f;
  public float Momentum { get; init; } = 0.000f;
  public float Awareness { get; init; } = 0.000f;
}

