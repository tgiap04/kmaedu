import { type PropsWithChildren, use, useMemo } from "react";
import { IconContext, type Icon, type IconProps } from "@phosphor-icons/react";

/** Any icon component of the app's icon set (Phosphor). */
export type AppIcon = Icon;
export type AppIconProps = IconProps;

/**
 * App-wide icon defaults: 24px (the size the previous icon set drew without a size class, so layouts
 * keep their spacing) and the two-tone duotone weight everywhere. A size class (`size-4`, `h-5 w-5`)
 * still wins. Set `weight` back to "regular" to return to plain line icons for controls.
 * Icons are hidden from screen readers (the previous set did the same); one that carries meaning on its
 * own passes `aria-hidden={false} role="img" aria-label="…"`.
 */
const DEFAULTS: IconProps = { size: 24, weight: "duotone", "aria-hidden": true };

export function IconDefaultsProvider({ children }: PropsWithChildren) {
  return <IconContext value={DEFAULTS}>{children}</IconContext>;
}

/**
 * Wrap decorative icons (page header tiles, stat cards, sidebar, empty states): they switch to the
 * two-tone duotone weight, in the colour of their text. Controls inside keep working the same.
 */
export function DecorativeIcons({ children }: PropsWithChildren) {
  const parent = use(IconContext);
  const value = useMemo(() => ({ ...parent, weight: "duotone" as const }), [parent]);
  return <IconContext value={value}>{children}</IconContext>;
}
