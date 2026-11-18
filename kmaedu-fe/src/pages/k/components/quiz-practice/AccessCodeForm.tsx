import { useState } from "react";
import { LockSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/antd/button";
import { Input } from "@/components/antd/input";

interface AccessCodeFormProps {
  title: string;
  submitting: boolean;
  /** Last failure to show (wrong code, locked out, ...). */
  error: string | null;
  /** True while the user is locked out: the form is disabled. */
  locked: boolean;
  onSubmit: (code: string) => void;
}

export function AccessCodeForm({ title, submitting, error, locked, onSubmit }: AccessCodeFormProps) {
  const [code, setCode] = useState("");
  const ready = code.length === 6 && !submitting && !locked;

  return (
    <form
      className="mx-auto w-full max-w-sm space-y-4 p-6 rounded-lg border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit(code);
      }}
    >
      <div className="flex items-center gap-2 text-ink">
        <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand"><LockSimpleIcon className="size-[18px]" /></span>
        <h2 className="text-[16px] font-bold">Nhập mã để luyện tập</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Bộ câu hỏi &quot;{title}&quot; được bảo vệ bằng mã 6 số. Hỏi giáo viên của bạn nếu chưa có mã.
      </p>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={6}
        disabled={locked}
        aria-invalid={error !== null}
        className="text-center font-mono text-2xl tracking-[0.5em]"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!ready}>
        {submitting ? "Đang kiểm tra..." : "Mở bộ câu hỏi"}
      </Button>
    </form>
  );
}
