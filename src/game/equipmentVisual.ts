import { Group } from "three";

/** Only the active tier belongs to the character scene, including its shadows. */
export function mountEquipmentTier(holder: Group, wood: Group, upgraded: Group, useUpgrade: boolean) {
  const selected = useUpgrade ? upgraded : wood;
  if (holder.children.length === 1 && holder.children[0] === selected) return;
  holder.clear();
  holder.add(selected);
  selected.visible = true;
}
