export type SplitProfile = "ALL" | "FOOD_ONLY";

export type EventParticipantRow = {
  userId: string;
  status: string;
  splitProfile: string;
};

export type SplitParticipantRow = {
  participantId: string;
  status: string;
  splitProfile: string;
};

/** Aceita "YES", "yes", espaços, etc. — evita split vazio por inconsistência na BD. */
export function isParticipantYes(status: string): boolean {
  return String(status ?? "").trim().toUpperCase() === "YES";
}

function normalizeProfile(raw: string): SplitProfile {
  if (raw === "FOOD_ONLY" || raw === "ALL") {
    return raw;
  }
  // Compatibilidade com dados antigos ("NO_DRINK" passa a "FOOD_ONLY")
  if (raw === "NO_DRINK") {
    return "FOOD_ONLY";
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
  participants: SplitParticipantRow[];
  foodCents: number;
  drinkCents: number;
  otherCents: number;
}): Map<string, number> {
  const active = input.participants
    .filter((p) => isParticipantYes(p.status))
    .map((p) => ({
      participantId: p.participantId,
      profile: normalizeProfile(p.splitProfile),
    }));

  const foodUsers = active
    .filter((p) => p.profile === "ALL" || p.profile === "FOOD_ONLY")
    .map((p) => p.participantId);
  const drinkUsers = active
    .filter((p) => p.profile === "ALL")
    .map((p) => p.participantId);
  const otherUsers = active
    .filter((p) => p.profile === "ALL")
    .map((p) => p.participantId);

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
    default:
      return "Tudo";
  }
}

