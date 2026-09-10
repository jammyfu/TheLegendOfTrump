type Destination = "office" | "grounds";
let destination: Destination | null = null;
const listeners = new Set<() => void>();
export const getZoneLoading = () => destination;
export const subscribeZoneLoading = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function setZoneLoading(next: Destination | null) {
  destination = next;
  listeners.forEach((listener) => listener());
}
