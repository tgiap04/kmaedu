import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { NotePencilIcon, DoorOpenIcon } from "@phosphor-icons/react";
import { type RecentExamAttempt, togglePinExamRoomApi } from "@/apis/studentMaterialsApi"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/antd/dialog"
import { Skeleton } from "@/components/antd/skeleton"
import { useToast } from "@/components/antd/toast"
import { PageHeader } from "@/components/k-page/page-header"
import { SectionCard, SectionMessage } from "@/components/k-page/section-card"
import { useStudentMaterialsStore } from "@/stores/useStudentMaterialsStore"
import { groupBySession, sortWithPinnedFirst, type SessionSummary } from "./my-exams-types"
import { ExamsPagination } from "./components/my-exams-pagination"
import { SessionCard } from "./components/session-card"
import { SessionHistoryDialog } from "./components/session-history-dialog"

const PAGE_SIZE = 50

export default function MyExamsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { fetchExams: fetchExamsFromStore } = useStudentMaterialsStore()

  const currentPage = Number(searchParams.get("page")) || 1

  const [examAttempts, setExamAttempts] = useState<RecentExamAttempt[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; session: SessionSummary | null }>({
    open: false,
    session: null,
  })

  const sessions = useMemo(
    () => sortWithPinnedFirst(groupBySession(examAttempts)),
    [examAttempts],
  )

  const fetchExams = useCallback(
    async (page: number) => {
      try {
        setLoading(true)
        const data = await fetchExamsFromStore(page, PAGE_SIZE)
        setExamAttempts(data.examAttempts)
        setTotal(data.total)
      } catch {
        toast.error("Không thể tải lịch sử thi")
      } finally {
        setLoading(false)
      }
    },
    [fetchExamsFromStore, toast],
  )

  useEffect(() => {
    fetchExams(currentPage)
  }, [currentPage, fetchExams])

  const handlePageChange = (page: number) => {
    setSearchParams({ page: String(page) })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleTogglePin = async (session: SessionSummary) => {
    const newPinned = !session.isPinned
    setExamAttempts((prev) =>
      prev.map((a) =>
        a.examSession.examRoom.id === session.examRoomId ? { ...a, isPinned: newPinned } : a,
      ),
    )
    try {
      await togglePinExamRoomApi(session.examRoomId)
    } catch {
      setExamAttempts((prev) =>
        prev.map((a) =>
          a.examSession.examRoom.id === session.examRoomId ? { ...a, isPinned: !newPinned } : a,
        ),
      )
      toast.error("Không thể ghim phòng thi")
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (loading) {
    return (
      <div className="relative text-foreground">
        <PageHeader icon={<NotePencilIcon />} title="Bài thi của tôi" subtitle="Danh sách các phòng thi đã tham gia" />
        <SectionCard icon={<DoorOpenIcon />} title="Phòng thi đã tham gia" plain>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[240px] rounded-lg" />
            ))}
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="relative text-foreground">
      <PageHeader icon={<NotePencilIcon />} title="Bài thi của tôi" subtitle="Danh sách các phòng thi đã tham gia" />

      <SectionCard
        icon={<DoorOpenIcon />}
        title="Phòng thi đã tham gia"
        countLabel={sessions.length > 0 ? `${sessions.length} phòng thi` : undefined}
        plain
      >
        {sessions.length === 0 ? (
          <SectionMessage title="Chưa có bài thi nào" hint="Tham gia phòng thi để bắt đầu" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
              {sessions.map((session) => (
                <div
                  key={session.examSessionId}
                  className="transition-all duration-300 ease-out"
                  style={{ order: session.isPinned ? 0 : 1 }}
                >
                  <SessionCard
                    session={session}
                    onViewHistory={(s) => setHistoryDialog({ open: true, session: s })}
                    onTogglePin={handleTogglePin}
                  />
                </div>
              ))}
            </div>
            <ExamsPagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </SectionCard>

      <Dialog
        open={historyDialog.open}
        onOpenChange={(open) => setHistoryDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {historyDialog.session?.title ?? "Lịch sử bài thi"}
            </DialogTitle>
          </DialogHeader>
          <SessionHistoryDialog session={historyDialog.session} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
