export function isRoomFocusFeature(roomFeature: string): boolean {
  return (
    roomFeature === "treasure" ||
    roomFeature === "training" ||
    roomFeature === "rune_forge"
  );
}
