export interface RoleAvatar {
  src: string;
  /** Role name for the alt text. */
  label: string;
}

const STUDENT: RoleAvatar = { src: "/avatars/student.webp", label: "Học sinh" };
const TEACHER: RoleAvatar = { src: "/avatars/teacher.webp", label: "Giáo viên" };
const ADMIN: RoleAvatar = { src: "/avatars/admin.webp", label: "Quản trị viên" };

/** The picture shown for a user: admin first, then teacher; anyone else gets the student one. */
export function roleAvatar(roles: readonly string[]): RoleAvatar {
  if (roles.includes("SYSTEM_ADMIN")) return ADMIN;
  if (roles.includes("TEACHER")) return TEACHER;
  return STUDENT;
}
