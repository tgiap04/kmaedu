 
import { displayUserName } from "@/lib/user/display-user-name";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/antd/button";
import { Input } from "@/components/antd/input";
import { Label } from "@/components/antd/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/antd/dialog";
import { LockSimpleIcon, HouseIcon, XIcon } from "@phosphor-icons/react";
import { setRedirectBackTarget } from "@/lib/authRedirect";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  checkFlashcardSetAccess,
  getFlashcardSetPublicInfo,
  getFlashcardSetForStudy,
} from "@/apis/flashcardSetApi";
import { getProgressApi, addStudiedCardApi, saveProgressApi } from "@/apis/flashcardStudyApi";
import { toast } from "@/components/antd/toast";
import { applyVerdict, studiedPercent, type CardVerdict } from "@/lib/flashcard/study-progress";
import { StudyHeader } from "./components/study-header";
import { StudyProgressRow } from "./components/study-progress-row";
import { StudyFlipCard } from "./components/study-flip-card";
import { StudyActions } from "./components/study-actions";
import { StudyNav } from "./components/study-nav";
import type {
  FlashcardSetPublicInfo,
  AccessCheckResult,
  Flashcard,
} from "@/types/flashcardSet";

const SOUND_EFFECTS = {
  flip: "https://cdn.pixabay.com/audio/2022/03/10/audio_71e4fc8a6e.mp3",
  next: "https://cdn.pixabay.com/audio/2025/11/06/audio_69d4c569ef.mp3",
  prev: "https://cdn.pixabay.com/audio/2025/11/06/audio_69d4c569ef.mp3",
};

export default function FlashcardStudyPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, initializing } = useAuthStore();

  const [accessCheckResult, setAccessCheckResult] =
    useState<AccessCheckResult | null>(null);
  const [publicInfo, setPublicInfo] = useState<FlashcardSetPublicInfo | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardSetTitle, setFlashcardSetTitle] = useState("");
  const [flashcardSetDescription, setFlashcardSetDescription] = useState("");
  const [viewCount, setViewCount] = useState(0);
  const [creator, setCreator] = useState<{
    name: string | null;
    username: string;
  } | null>(null);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<string>>(() => new Set());
  const [settings, setSettings] = useState({ soundEffects: false });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback(
    (sound: keyof typeof SOUND_EFFECTS) => {
      if (settings.soundEffects && audioRef.current) {
        audioRef.current.src = SOUND_EFFECTS[sound];
        audioRef.current.play().catch(() => {});
      }
    },
    [settings.soundEffects],
  );

  const loadFlashcards = useCallback(async (flashcardId: string, code?: string) => {
    setIsLoadingFlashcards(true);
    try {
      const data = await getFlashcardSetForStudy(flashcardId, code);
      setFlashcards(data.flashCards || []);
      setFlashcardSetTitle(data.title);
      setFlashcardSetDescription(data.description || "");
      setViewCount(data.viewCount);
      setCreator(data.creator);
      setShowAccessModal(false);
      setAccessCheckResult({ hasAccess: true, requiresCode: false, accessType: "public" });

      try {
        const progress = await getProgressApi(flashcardId);
        if (progress.studiedCardIds && progress.studiedCardIds.length > 0) {
          setStudiedCards(new Set(progress.studiedCardIds));
        }
      } catch {
        // Progress not available
      }
    } catch (error) {
      console.error("Error loading flashcards:", error);
      throw error;
    } finally {
      setIsLoadingFlashcards(false);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setIsCheckingAccess(false);
      return;
    }

    if (initializing) {
      return;
    }

    if (!isAuthenticated) {
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      setRedirectBackTarget(returnTo);
      navigate(`/login?from=${encodeURIComponent(returnTo)}`, { replace: true });
      return;
    }

    const checkAccess = async () => {
      setIsCheckingAccess(true);
      try {
        const result = await checkFlashcardSetAccess(id);
        setAccessCheckResult(result);
        if (result.hasAccess) {
          await loadFlashcards(id);
        } else if (result.requiresCode) {
          const info = await getFlashcardSetPublicInfo(id);
          setPublicInfo(info);
          setShowAccessModal(true);
        } else {
          const info = await getFlashcardSetPublicInfo(id);
          setPublicInfo(info);
        }
      } catch {
        try {
          const info = await getFlashcardSetPublicInfo(id);
          setPublicInfo(info);
        } catch { /* set doesn't exist */ }
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [id, initializing, isAuthenticated, loadFlashcards, location, navigate]);

  const handleVerifyCode = async () => {
    if (!accessCode.trim()) {
      setAccessError("Vui lòng nhập mã truy cập");
      return;
    }
    setIsVerifying(true);
    setAccessError("");
    try {
      await loadFlashcards(id, accessCode);
    } catch (error: any) {
      setAccessError(error?.message || "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    playSound("flip");
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
      playSound("prev");
    }
  };

  const handleNext = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
      playSound("next");
    }
  };

  /** "Đã nhớ" counts the card as studied, "Chưa nhớ" takes it back out; both then move on. */
  const handleVerdict = (verdict: CardVerdict) => {
    const card = flashcards[currentCardIndex];
    if (!card) return;
    const { next, changed } = applyVerdict(studiedCards, card.id, verdict);
    if (changed) {
      setStudiedCards(next);
      const saving = verdict === "remembered" ? addStudiedCardApi(id, card.id) : saveProgressApi(id, [...next]);
      saving.catch(() => toast.error("Chưa lưu được tiến độ học", { description: "Kiểm tra kết nối rồi thử lại." }));
    }
    handleNext();
  };

  const handleShuffle = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || !flashcards.length || showAccessModal) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Typing in a field, or Space/Enter on a focused button or link (which already acts on its own).
      if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === " " || e.key === "Enter") && (tag === "BUTTON" || tag === "A")) return;
      if (e.key === "ArrowLeft") handlePrevious();
      else if (e.key === "ArrowRight") handleNext();
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Loading state
  if (isCheckingAccess) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-hairline border-t-coral" />
          <p className="text-sm text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // No access (not in whitelist)
  if (accessCheckResult && !accessCheckResult.hasAccess && !accessCheckResult.requiresCode) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="max-w-sm px-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-card">
            <LockSimpleIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl tracking-tight text-ink">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm text-body">
            Bộ flashcard này là riêng tư hoặc bạn chưa được thêm vào whitelist.
          </p>
          {publicInfo && (
            <div className="mt-4 rounded-lg border border-hairline bg-surface-card p-4">
              <p className="font-medium text-ink">{publicInfo.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tạo bởi {displayUserName(publicInfo.creator)}
              </p>
            </div>
          )}
          <Button onClick={() => navigate("/")} className="mt-6">
            <HouseIcon className="mr-2 h-4 w-4" />
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // Access code modal
  if (showAccessModal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <Dialog open={showAccessModal} onOpenChange={setShowAccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LockSimpleIcon className="h-5 w-5 text-coral" />
                Yêu cầu mã truy cập
              </DialogTitle>
              <DialogDescription>
                Bộ flashcard này yêu cầu mã truy cập để xem
              </DialogDescription>
            </DialogHeader>
            {publicInfo && (
              <div className="rounded-lg border border-hairline bg-surface-card p-4 text-center">
                <p className="font-medium text-ink">{publicInfo.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tạo bởi {displayUserName(publicInfo.creator)}
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="access-code">Mã truy cập (6 ký tự)</Label>
                <Input
                  id="access-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="text-center font-mono text-lg tracking-widest"
                />
                {accessError && <p className="text-sm text-error">{accessError}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleVerifyCode} disabled={isVerifying}>
                {isVerifying ? "Đang xác nhận..." : "Xác nhận"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Loading flashcards
  if (isLoadingFlashcards) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-hairline border-t-coral" />
          <p className="text-sm text-muted-foreground">Đang tải bộ flashcard...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!id || flashcards.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-card">
            <XIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl tracking-tight text-ink">Không có thẻ</h1>
          <p className="mt-2 text-sm text-body">Bộ flashcard này chưa có thẻ nào</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentCardIndex];
  const totalCards = flashcards.length;
  const studied = studiedPercent(studiedCards, flashcards.map((card) => card.id));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-page bg-[radial-gradient(55rem_40rem_at_-8%_12%,color-mix(in_oklab,var(--brand-soft)_85%,transparent),transparent_60%),radial-gradient(40rem_30rem_at_108%_100%,rgba(251,191,36,0.10),transparent_60%)]">
      <audio ref={audioRef} />
      <StudyHeader
        title={flashcardSetTitle}
        cardCount={totalCards}
        creatorName={creator ? displayUserName(creator) : null}
        viewCount={viewCount}
        soundOn={settings.soundEffects}
        onHome={() => navigate("/k")}
        onShuffle={handleShuffle}
        onToggleSound={() => setSettings((prev) => ({ ...prev, soundEffects: !prev.soundEffects }))}
      />

      <main className="mx-auto w-full max-w-[920px] flex-1 px-4 pb-6 pt-8 sm:pt-10">
        {flashcardSetDescription && <p className="sr-only">{flashcardSetDescription}</p>}
        <StudyProgressRow index={currentCardIndex} total={totalCards} studied={studied.count} percent={studied.percent} />
        <div className="mt-10">
          <StudyFlipCard question={currentCard?.question || ""} answer={currentCard?.answer || ""} flipped={isFlipped} onFlip={handleFlip} />
        </div>
        <div className="mt-10">
          <StudyActions onForgot={() => handleVerdict("forgotten")} onFlip={handleFlip} onRemembered={() => handleVerdict("remembered")} />
        </div>
      </main>

      <StudyNav index={currentCardIndex} total={totalCards} onPrev={handlePrevious} onNext={handleNext} />
    </div>
  );
}
