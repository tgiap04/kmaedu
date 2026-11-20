import type { ReactNode } from "react";
import { ArrowsClockwiseIcon, KeyIcon, LockSimpleIcon, UserPlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Input } from "@/components/antd/input";
import { UserSearchInput, type WhitelistUser } from "@/components/molecules/UserSearchInput";
import { cn } from "@/lib/utils";
import { FieldError, fieldLabel, SessionFormSection } from "./session-form-section";

export type AccessType = "public" | "code" | "whitelist";

export interface SessionAccessValue {
  accessType: AccessType;
  accessCode: string;
  whitelistUsers: WhitelistUser[];
}

interface Props {
  value: SessionAccessValue;
  errors: Partial<Record<keyof SessionAccessValue, string>>;
  disabled: boolean;
  onChange: (patch: Partial<SessionAccessValue>) => void;
  onGenerateCode: () => void;
}

const CHOICES: { value: AccessType; title: string; detail: string; icon: ReactNode }[] = [
  { value: "public", title: "Công khai", detail: "Ai có đường dẫn cũng vào thi được", icon: <UsersThreeIcon weight="duotone" /> },
  { value: "code", title: "Mã truy cập", detail: "Thí sinh nhập mã 6 chữ số", icon: <KeyIcon weight="duotone" /> },
  { value: "whitelist", title: "Danh sách mời", detail: "Chỉ những người bạn chọn", icon: <UserPlusIcon weight="duotone" /> },
];

/** Who may take the session: three choice cards, then the code or the invited people. */
export function SessionAccessSection({ value, errors, disabled, onChange, onGenerateCode }: Props) {
  return (
    <SessionFormSection icon={<LockSimpleIcon weight="duotone" />} title="Quyền truy cập" hint="Ai được tham gia phiên thi này">
      <div role="radiogroup" aria-label="Kiểu truy cập" className="grid gap-3 sm:grid-cols-3">
        {CHOICES.map((choice) => {
          const checked = value.accessType === choice.value;
          return (
            <label
              key={choice.value}
              className={cn(
                "relative flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors duration-200 focus-within:ring-2 focus-within:ring-brand/40",
                checked ? "border-brand bg-brand-soft/50" : "border-hairline hover:border-brand/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="session-access"
                value={choice.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange({ accessType: choice.value })}
                aria-label={choice.title}
                className="sr-only"
              />
              <span className={cn("mt-0.5 [&_svg]:size-5", checked ? "text-brand" : "text-body")} aria-hidden>{choice.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{choice.title}</span>
                <span className="mt-0.5 block text-xs text-body">{choice.detail}</span>
              </span>
            </label>
          );
        })}
      </div>

      {value.accessType === "code" && (
        <div className="mt-4 max-w-sm">
          <label htmlFor="session-access-code" className={fieldLabel}>
            Mã truy cập (6 chữ số) <span className="text-brand">*</span>
          </label>
          <div className="flex gap-2">
            <Input
              id="session-access-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="Nhập mã 6 chữ số"
              value={value.accessCode}
              onChange={(e) => onChange({ accessCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
              disabled={disabled}
              status={errors.accessCode ? "error" : undefined}
              className="!h-11 font-mono !text-[16px] tracking-[0.3em]"
            />
            <button
              type="button"
              onClick={onGenerateCode}
              disabled={disabled}
              aria-label="Tạo mã ngẫu nhiên"
              title="Tạo mã ngẫu nhiên"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-hairline text-body transition-colors hover:border-brand/50 hover:text-brand disabled:opacity-50"
            >
              <ArrowsClockwiseIcon className="size-[18px]" />
            </button>
          </div>
          <FieldError message={errors.accessCode} />
        </div>
      )}

      {value.accessType === "whitelist" && (
        <div className="mt-4">
          <UserSearchInput selectedUsers={value.whitelistUsers} onUsersChange={(whitelistUsers) => onChange({ whitelistUsers })} disabled={disabled} />
          <FieldError message={errors.whitelistUsers} />
        </div>
      )}
    </SessionFormSection>
  );
}
