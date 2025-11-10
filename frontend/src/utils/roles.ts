export type DashboardVariant = "admin" | "tutor" | "student";

const normalizeRole = (role: string) =>
  role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const compactRole = (role: string) => normalizeRole(role).replace(/[\s_-]/g, "");

const includesAny = (roles: string[], targets: string[]) =>
  roles.some((role) => {
    const compact = compactRole(role);
    return targets.some((target) => {
      const normalizedTarget = normalizeRole(target);
      const compactTarget = compactRole(target);
      return role === normalizedTarget || compact === compactTarget || role.includes(normalizedTarget) || compact.includes(compactTarget);
    });
  });

export function resolveDashboardVariant(roles?: string[]): DashboardVariant {
  if (!roles || roles.length === 0) {
    return "admin";
  }

  const normalized = roles.map(normalizeRole);
  if (includesAny(normalized, ["admin", "autoridad", "administrador"])) {
    return "admin";
  }
  if (includesAny(normalized, ["tutor", "docente", "docente tutor", "docente-tutor"])) {
    return "tutor";
  }
  if (includesAny(normalized, ["estudiante", "alumno", "student"])) {
    return "student";
  }
  return "admin";
}
