import { useId, useState, type ReactNode } from "react";
import { BarbellIcon, CheckCircleIcon, ClockCounterClockwiseIcon, ListBulletsIcon, LockSimpleIcon, PlayIcon } from "@phosphor-icons/react";
import { Sparkle } from "@/components/atoms/Sparkle";
import { SectionCard } from "@/components/k-page/section-card";
import { cn } from "@/lib/utils";

type Tab = "practice" | "history";

interface Props {
  questionCount: number;
  busy: boolean;
  problem: string | null;
  onStart: () => void;
  /** The history list, shown under the "Lịch sử" tab. */
  history: ReactNode;
}

/** Same size as the stat cards of the other /k pages (exam waiting room, room overview). */
function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas p-3.5 shadow-soft">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand [&_svg]:size-[22px]" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] text-body">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}

/** Before practising: what the set holds, the start banner and how resuming works; the history sits in a second tab. */
export function PracticeIntroCard({ questionCount, busy, problem, onStart, history }: Props) {
  const [tab, setTab] = useState<Tab>("practice");
  const base = useId();
  const tabs: { key: Tab; label: string }[] = [
    { key: "practice", label: "Luyện tập" },
    { key: "history", label: "Lịch sử" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<ListBulletsIcon weight="duotone" />} label="Số câu hỏi" value={`${questionCount} câu`} />
        <StatCard icon={<CheckCircleIcon weight="duotone" />} label="Hình thức" value="Trắc nghiệm" />
        <StatCard icon={<LockSimpleIcon weight="duotone" />} label="Đáp án" value="Sau khi nộp bài" />
      </div>

      <SectionCard icon={<BarbellIcon />} title="Luyện tập" countLabel={`${questionCount} câu hỏi`} plain>
        <div role="tablist" aria-label="Luyện tập" className="flex gap-5 border-b border-hairline-soft px-4 md:px-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`${base}-${t.key}-tab`}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`${base}-${t.key}-panel`}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative -mb-px h-11 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                tab === t.key ? "text-brand-strong after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand" : "text-body hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "practice" ? (
          <div role="tabpanel" id={`${base}-practice-panel`} aria-labelledby={`${base}-practice-tab`} className="space-y-3 p-4 md:p-5">
            <div className="relative flex flex-col gap-4 overflow-hidden rounded-lg border border-brand-border/50 bg-gradient-to-r from-[#fde8e7] via-[#fdf1f0] to-[#fdf6f5] p-4 sm:flex-row sm:items-center md:px-5">
              <Sparkle className="right-60 top-3 hidden size-8 lg:block" />
              <Sparkle className="bottom-3 right-72 hidden size-4 lg:block" />
              <Sparkle className="bottom-4 right-48 hidden size-5 lg:block" />
              <span aria-hidden className="relative grid size-14 shrink-0 -rotate-6 place-items-center rounded-xl bg-canvas text-brand shadow-[0_8px_20px_-10px_rgba(185,28,28,0.4)]">
                <BarbellIcon weight="bold" className="size-7" />
              </span>
              <div className="relative min-w-0 flex-1">
                <h3 className="text-[16px] font-bold text-ink">Bắt đầu luyện tập</h3>
                <p className="mt-0.5 text-sm text-body">
                  <strong className="font-semibold text-ink">{questionCount} câu hỏi.</strong> Đáp án chỉ hiện sau khi bạn nộp bài.
                </p>
              </div>
              <button
                type="button"
                onClick={onStart}
                disabled={busy}
                className="relative inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_var(--brand)] transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <PlayIcon weight="fill" className="size-4" aria-hidden />
                {busy ? "Đang tải..." : "Bắt đầu / Tiếp tục"}
              </button>
            </div>
            {problem && <p role="alert" className="text-sm font-medium text-destructive">{problem}</p>}
            <p className="flex items-center gap-2.5 rounded-lg border border-hairline-soft bg-page px-4 py-2.5 text-sm text-body">
              <ClockCounterClockwiseIcon weight="bold" className="size-4 shrink-0 text-brand" aria-hidden />
              Nếu bạn đang làm dở, bài sẽ được tiếp tục từ chỗ dừng.
            </p>
          </div>
        ) : (
          <div role="tabpanel" id={`${base}-history-panel`} aria-labelledby={`${base}-history-tab`} className="p-4 md:p-5">
            {history}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
