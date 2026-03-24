export type SplitProfile = "ALL" | "FOOD_ONLY" | "NO_DRINK";

export type EventParticipantRow = {
  userId: string;
  status: string;
  splitProfile: string;
};

function normalizeProfile(raw: string): SplitProfile {
  if (raw === "FOOD_ONLY" || raw === "NO_DRINK" || raw === "ALL") {
    return raw;
  }
  return "ALL";
}

function splitCategory(total: number, userIds: string[]): Map<string, number> {
  const out = new Map<string, number>();
  if (total <= 0 || userIds.length === 0) return out;

  const sorted = [...userIds].sort();
  const base = Math.floor(total / sorted.length);
  const remainder = total % sorted.length;

  sorted.forEach((id, idx) => {
    out.set(id, base + (idx < remainder ? 1 : 0));
  });
  return out;
}

export function computeEventSplit(input: {
  participants: EventParticipantRow[];
  foodCents: number;
  drinkCents: number;
  otherCents: number;
}): Map<string, number> {
  const active = input.participants
    .filter((p) => p.status === "YES")
    .map((p) => ({
      userId: p.userId,
      profile: normalizeProfile(p.splitProfile),
    }));

  const foodUsers = active
    .filter((p) => p.profile === "ALL" || p.profile === "FOOD_ONLY" || p.profile === "NO_DRINK")
    .map((p) => p.userId);
  const drinkUsers = active.filter((p) => p.profile === "ALL").map((p) => p.userId);
  const otherUsers = active.filter((p) => p.profile === "ALL" || p.profile === "NO_DRINK").map((p) => p.userId);

  const foodMap = splitCategory(Math.max(0, input.foodCents), foodUsers);
  const drinkMap = splitCategory(Math.max(0, input.drinkCents), drinkUsers);
  const otherMap = splitCategory(Math.max(0, input.otherCents), otherUsers);

  const total = new Map<string, number>();
  for (const id of new Set([...foodUsers, ...drinkUsers, ...otherUsers])) {
    total.set(id, (foodMap.get(id) ?? 0) + (drinkMap.get(id) ?? 0) + (otherMap.get(id) ?? 0));
  }
  return total;
}

export function splitProfileLabel(raw: string): string {
  switch (normalizeProfile(raw)) {
    case "FOOD_ONLY":
      return "Só comida";
    case "NO_DRINK":
      return "Sem bebida";
    default:
      return "Tudo";
  }
}

