import type { UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  cc: "Chef de camp",
  cca: "Chef de camp adjoint",
  rp: "Responsable polyvalent",
  equipier: "Equipier",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}
