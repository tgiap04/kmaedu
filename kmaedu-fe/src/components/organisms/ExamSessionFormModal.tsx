"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/antd/dialog";
import { Button } from "@/components/antd/button";
import { CircleNotchIcon, CalendarBlankIcon, ListNumbersIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { ExamSessionBasic } from "@/types/examRoom";
import {
  ASSESS_TYPE,
  QUESTION_SELECTION_MODE,
  LabelQuestionConfig,
} from "@/types/examSession";
import type { WhitelistUser } from "@/components/molecules/UserSearchInput";
import { getExamSessionSharingSettingsApi } from "@/apis/examSessionApi";
import { QuestionConfigSection } from "./QuestionConfigSection";
import { SessionAccessSection, type AccessType } from "./session-form/session-access-section";
import { SessionFormSection } from "./session-form/session-form-section";
import { SessionRulesSection } from "./session-form/session-rules-section";
import { SessionScoringSection } from "./session-form/session-scoring-section";
import { durationError, SessionTimeSection } from "./session-form/session-time-section";


interface ExamSessionFormData {
  /** Minutes one attempt may last; null: until the session ends. */
  durationMinutes: number | null;
  antiCheatEnabled: boolean;
  allowLeaveMidway: boolean;
  startTime: string;
  endTime: string;
  accessType: AccessType;
  accessCode: string;
  whitelistUsers: WhitelistUser[];
  allowRetake: boolean;
  maxAttempts: number;
  showAnswersAfterSubmit: boolean;
  passingScore: number;
  // Question configuration
  questionCount?: number | null;
  questionSelectionMode?: QUESTION_SELECTION_MODE;
  labelQuestionConfig?: LabelQuestionConfig[] | null;
  shuffleQuestions?: boolean;
}

interface ExamSessionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  examRoomId: string;
  session?: ExamSessionBasic | null;
  onSubmit: (data: {
    startTime: string;
    endTime?: string;
    assessType: ASSESS_TYPE;
    accessCode?: string | null;
    whitelist?: string[];
    allowRetake: boolean;
    maxAttempts: number;
    showAnswersAfterSubmit?: boolean;
    passingScore?: number;
    // Question configuration
    questionCount?: number | null;
    questionSelectionMode?: QUESTION_SELECTION_MODE;
    labelQuestionConfig?: LabelQuestionConfig[] | null;
    shuffleQuestions?: boolean;
    durationMinutes: number | null;
    antiCheatEnabled: boolean;
    allowLeaveMidway: boolean;
  }) => Promise<boolean>;
  isLoading?: boolean;
}

const initialFormData: ExamSessionFormData = {
  startTime: "",
  endTime: "",
  accessType: "public",
  accessCode: "",
  whitelistUsers: [],
  allowRetake: false,
  maxAttempts: 1,
  showAnswersAfterSubmit: true,
  passingScore: 40,
  // Question configuration defaults
  questionSelectionMode: QUESTION_SELECTION_MODE.ALL,
  shuffleQuestions: false,
  durationMinutes: null,
  antiCheatEnabled: true,
  allowLeaveMidway: true,
};

export function ExamSessionFormModal({
  open,
  onOpenChange,
  mode,
  examRoomId,
  session,
  onSubmit,
  isLoading = false,
}: ExamSessionFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] =
    useState<ExamSessionFormData>(initialFormData);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ExamSessionFormData, string>>
  >({});
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Load whitelist users for editing
  const loadWhitelistUsers = useCallback(async (sessionId: string) => {
    setLoadingSettings(true);
    try {
      const settings = await getExamSessionSharingSettingsApi(sessionId);
      if (settings.whitelist) {
        setFormData((prev) => ({
          ...prev,
          whitelistUsers: settings.whitelist,
        }));
      }
    } catch (error) {
      console.error("Failed to load whitelist:", error);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  // Reset form when modal opens/closes or session changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && session) {
        // Populate form with session data
        const startTimeFormatted = session.startTime
          ? format(new Date(session.startTime), "yyyy-MM-dd'T'HH:mm")
          : "";
        const endTimeFormatted = session.endTime
          ? format(new Date(session.endTime), "yyyy-MM-dd'T'HH:mm")
          : "";

        const sessionAny = session as any;
        const isPublic = sessionAny.assessType === ASSESS_TYPE.PUBLIC;
        const hasWhitelist =
          sessionAny.whitelist && sessionAny.whitelist.length > 0;

        let accessType: AccessType = "public";
        if (!isPublic) {
          accessType = hasWhitelist ? "whitelist" : "code";
        }

        setFormData({
          startTime: startTimeFormatted,
          endTime: endTimeFormatted,
          accessType,
          accessCode: sessionAny.accessCode || "",
          whitelistUsers: [],
          allowRetake: sessionAny.allowRetake || false,
          maxAttempts: sessionAny.maxAttempts || 1,
          showAnswersAfterSubmit: sessionAny.showAnswersAfterSubmit ?? true,
          passingScore: sessionAny.passingScore ?? 0,
          // Question configuration
          questionCount: sessionAny.questionCount ?? null,
          questionSelectionMode:
            sessionAny.questionSelectionMode ?? QUESTION_SELECTION_MODE.ALL,
          labelQuestionConfig: sessionAny.labelQuestionConfig ?? null,
          shuffleQuestions: sessionAny.shuffleQuestions ?? false,
          durationMinutes: sessionAny.durationMinutes ?? null,
          antiCheatEnabled: sessionAny.antiCheatEnabled ?? true,
          allowLeaveMidway: sessionAny.allowLeaveMidway ?? true,
        });

        // Load whitelist users if editing
        if (hasWhitelist && session.id) {
          loadWhitelistUsers(session.id);
        }
      } else {
        // Default values for create mode
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30); // Start 30 mins from now
        const defaultStart = format(now, "yyyy-MM-dd'T'HH:mm");

        setFormData({
          ...initialFormData,
          startTime: defaultStart,
          questionSelectionMode: QUESTION_SELECTION_MODE.ALL,
          shuffleQuestions: false,
        });
      }
      setErrors({});
    }
  }, [open, mode, session, loadWhitelistUsers]);

  // A section's change: its fields, clearing their errors.
  const patchForm = useCallback((patch: Partial<ExamSessionFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof ExamSessionFormData)[]) delete next[key];
      return next;
    });
  }, []);

  // Handle question config change
  const handleQuestionConfigChange = useCallback(
    (config: {
      questionCount?: number | null;
      questionSelectionMode?: QUESTION_SELECTION_MODE;
      labelQuestionConfig?: LabelQuestionConfig[] | null;
      shuffleQuestions?: boolean;
    }) => {
      setFormData((prev) => ({
        ...prev,
        questionCount: config.questionCount,
        questionSelectionMode: config.questionSelectionMode,
        labelQuestionConfig: config.labelQuestionConfig,
        shuffleQuestions: config.shuffleQuestions,
      }));
    },
    []
  );

  // Generate random 6-digit access code
  const generateAccessCode = useCallback(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setFormData((prev) => ({ ...prev, accessCode: code }));
  }, []);

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Partial<Record<keyof ExamSessionFormData, string>> = {};

    if (!formData.startTime) {
      newErrors.startTime = "Vui lòng chọn thời gian bắt đầu";
    }

    if (
      formData.accessType === "code" &&
      formData.accessCode &&
      !/^\d{6}$/.test(formData.accessCode)
    ) {
      newErrors.accessCode = "Mã truy cập phải là 6 chữ số";
    }

    if (formData.accessType === "code" && !formData.accessCode) {
      newErrors.accessCode = "Vui lòng nhập mã truy cập";
    }

    if (
      formData.accessType === "whitelist" &&
      formData.whitelistUsers.length === 0
    ) {
      newErrors.whitelistUsers = "Vui lòng thêm ít nhất 1 người dùng";
    }

    if (
      formData.allowRetake &&
      (formData.maxAttempts < 1 || formData.maxAttempts > 10)
    ) {
      newErrors.maxAttempts = "Số lần làm phải từ 1 đến 10";
    }

    const durationMessage = durationError(formData.durationMinutes);
    if (durationMessage) newErrors.durationMinutes = durationMessage;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleFormSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const submitData = {
        startTime: new Date(formData.startTime).toISOString(),
        endTime: formData.endTime
          ? new Date(formData.endTime).toISOString()
          : undefined,
        assessType:
          formData.accessType === "public"
            ? ASSESS_TYPE.PUBLIC
            : ASSESS_TYPE.PRIVATE,
        accessCode:
          formData.accessType === "code" && formData.accessCode
            ? formData.accessCode
            : null,
        whitelist:
          formData.accessType === "whitelist"
            ? formData.whitelistUsers.map((u) => u.id)
            : [],
        allowRetake: formData.allowRetake,
        maxAttempts: formData.maxAttempts,
        showAnswersAfterSubmit: formData.showAnswersAfterSubmit,
        passingScore: formData.passingScore,
        // Question configuration
        questionCount: formData.questionCount ?? null,
        questionSelectionMode:
          formData.questionSelectionMode ?? QUESTION_SELECTION_MODE.ALL,
        labelQuestionConfig: formData.labelQuestionConfig ?? null,
        shuffleQuestions: formData.shuffleQuestions ?? false,
        durationMinutes: formData.durationMinutes,
        antiCheatEnabled: formData.antiCheatEnabled,
        allowLeaveMidway: formData.allowLeaveMidway,
      };

      const success = await onSubmit(submitData);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormLoading = isLoading || submitting || loadingSettings;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent modalWidth={880} className="session-form-modal" bodyStyle={{ overflow: "visible" }}>
        <DialogHeader className="mb-0 flex items-start gap-3.5 border-b border-hairline-soft pb-4 pr-8">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] text-brand" aria-hidden>
            <CalendarBlankIcon weight="duotone" className="size-6" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-xl font-bold text-ink">{mode === "create" ? "Tạo phiên thi mới" : "Chỉnh sửa phiên thi"}</DialogTitle>
            <DialogDescription className="mt-0.5">
              {mode === "create" ? "Thiết lập thời gian, quyền truy cập và luật làm bài cho phiên thi" : "Cập nhật thiết lập của phiên thi. Bài đã nộp giữ nguyên kết quả."}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Only the sections scroll: the title and the actions stay in view. */}
        <div className="-mx-6 max-h-[min(68vh,720px)] space-y-4 overflow-y-auto bg-page/60 px-6 py-5">
          <SessionTimeSection value={formData} errors={errors} disabled={isFormLoading} onChange={patchForm} />
          <SessionAccessSection value={formData} errors={errors} disabled={isFormLoading} onChange={patchForm} onGenerateCode={generateAccessCode} />
          <SessionFormSection icon={<ListNumbersIcon weight="duotone" />} title="Câu hỏi" hint="Cách lấy câu hỏi từ bộ đề cho mỗi thí sinh">
            <QuestionConfigSection
              bare
              examRoomId={examRoomId}
              initialData={{
                questionCount: formData.questionCount,
                questionSelectionMode: formData.questionSelectionMode,
                labelQuestionConfig: formData.labelQuestionConfig,
                shuffleQuestions: formData.shuffleQuestions,
              }}
              onConfigChange={handleQuestionConfigChange}
              disabled={isFormLoading}
            />
          </SessionFormSection>
          <SessionScoringSection value={formData} errors={errors} disabled={isFormLoading} onChange={patchForm} />
          <SessionRulesSection value={formData} disabled={isFormLoading} onChange={patchForm} />
        </div>

        <div className="-mx-6 -mb-1 flex items-center justify-between gap-3 border-t border-hairline-soft px-6 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isFormLoading} className="!h-11 !px-5">
            Hủy
          </Button>
          <Button onClick={handleFormSubmit} disabled={isFormLoading} variant="solid" className="!h-11 !px-6 !font-semibold">
            {isFormLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Tạo phiên thi" : "Lưu thay đổi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
