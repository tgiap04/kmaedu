import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { defaultDraft, toRoomPayload, toSessionPayload, validateDraft, type CreateRoomDraft, type DraftErrors } from "@/lib/exam-room/create-room-draft";
import { useExamRoomDetailStore } from "@/stores/useExamRoomDetailStore";
import { useExamRoomStore } from "@/stores/useExamRoomStore";
import { useQuizSetStore } from "@/stores/useQuizSetStore";
import { toast } from "@/components/antd/toast";
import type { QuizSetChoice } from "./basic-info-section";

/**
 * State of the create-room page: the draft, its errors, the user's quiz sets, and the two-call submit
 * (the room, then its first session with the chosen rules).
 */
export function useCreateExamRoom(initialQuizSetId: string) {
  const navigate = useNavigate();
  const createExamRoom = useExamRoomStore((s) => s.createExamRoom);
  const createSession = useExamRoomDetailStore((s) => s.createSession);
  const { fetchAllQuizSets, quizSetsK } = useQuizSetStore();

  const [draft, setDraft] = useState<CreateRoomDraft>(() => defaultDraft(new Date(), initialQuizSetId));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [loadingQuizSets, setLoadingQuizSets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // A second click lands before React re-renders the disabled button: one creation at a time.
  const inFlight = useRef(false);

  useEffect(() => {
    void fetchAllQuizSets().finally(() => setLoadingQuizSets(false));
  }, [fetchAllQuizSets]);

  const quizSets = useMemo<QuizSetChoice[]>(
    () => quizSetsK.map((qs) => ({ id: qs.id, title: qs.title, questionCount: qs.questionCount })),
    [quizSetsK],
  );
  // A prefilled set that is not one of the user's sets (deleted, someone else's) counts as not chosen.
  useEffect(() => {
    if (!loadingQuizSets && draft.quizSetId && !quizSets.some((qs) => qs.id === draft.quizSetId)) {
      setDraft((d) => ({ ...d, quizSetId: "" }));
    }
  }, [loadingQuizSets, quizSets, draft.quizSetId]);

  const questionTotal = quizSets.find((qs) => qs.id === draft.quizSetId)?.questionCount;

  const update = useCallback((patch: Partial<CreateRoomDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    // Editing a field clears its error; the rest stay until the next check.
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as (keyof CreateRoomDraft)[]) delete next[key];
      return next;
    });
  }, []);

  /** Checks the whole draft; returns the errors so the page can bring the first one into view. */
  const check = useCallback(() => {
    const found = validateDraft(draft, new Date(), questionTotal);
    setErrors(found);
    return found;
  }, [draft, questionTotal]);

  const submit = useCallback(async () => {
    if (inFlight.current || Object.keys(check()).length > 0) return false;
    inFlight.current = true;
    setSubmitting(true);
    try {
      // One toast for the whole creation: the stores stay quiet on success (a failed room still says why).
      const room = await createExamRoom(toRoomPayload(draft), { silentSuccess: true });
      const opened = await createSession(toSessionPayload(draft, room.id, new Date()), { silent: true });
      if (opened) toast.success("Đã tạo phòng thi và mở phiên thi đầu tiên");
      else toast.warning("Đã tạo phòng thi nhưng chưa mở được phiên thi", { description: "Hãy thêm phiên thi trong tab Phiên thi của phòng." });
      // Without its session the room still exists: open its sessions tab so the host can add one.
      navigate(`/k/manage-exam-room/${room.id}${opened ? "" : "?tab=sessions"}`, { replace: true });
      return true;
    } catch {
      // The store already told the user why the room could not be created; the draft stays.
      return false;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [check, createExamRoom, createSession, draft, navigate]);

  return { draft, errors, update, check, submit, submitting, quizSets, loadingQuizSets, questionTotal };
}
