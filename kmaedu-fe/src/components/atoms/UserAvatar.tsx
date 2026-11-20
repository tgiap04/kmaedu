import { roleAvatar } from "@/lib/avatar/role-avatar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

interface Props {
  /** Pixel size of the round picture. */
  size: number;
  /** Who it is, for the alt text. */
  name?: string;
  className?: string;
}

/** The signed-in user's round avatar: one picture per role (student, teacher, admin). */
export function UserAvatar({ size, name, className }: Props) {
  const roles = useAuthStore((s) => s.roles);
  const avatar = roleAvatar(roles);
  return (
    <img
      src={avatar.src}
      alt={name ? `${name} (${avatar.label})` : avatar.label}
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      className={cn("shrink-0 rounded-full bg-brand-soft object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
