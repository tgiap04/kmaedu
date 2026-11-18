import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ClipboardTextIcon } from "@phosphor-icons/react"
import { type RecentExamAttempt, togglePinExamRoomApi } from "@/apis/studentMaterialsApi"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/antd/dialog"
import { useToast } from "@/components/antd/toast"
import { PageHeader } from "@/components/k-page/page-header"
import { SectionMessage, ViewAllButton } from "@/components/k-page/section-card"
import { useStudentMaterialsStore } from "@/stores/useStudentMaterialsStore"
import { examOverview, groupBySession, myExamsView, sortWithPinnedFirst, splitByProgress, type SessionSummary } from "./my-exams-types"
import { ContinueExamCard } from "./components/continue-exam-card"
import { MyExamsSkeleton, OverviewPills, OverviewPillsSkeleton, SectionHeading } from "./components/my-exams-sections"
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
  const [failed, setFailed] = useState(false)
  const [expandedByUser, setExpanded] = useState(false)
  /** Only the newest load may write state: a slow answer for a page already left is dropped. */
  const latestLoad = useRef(0)
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; session: SessionSummary | null }>({
    open: false,
    session: null,
  })

  const sessions = useMemo(
    () => sortWithPinnedFirst(groupBySession(examAttempts)),
    [examAttempts],
  )
  const { continuing, others } = useMemo(() => splitByProgress(sessions), [sessions])
  const overview = useMemo(() => examOverview(sessions), [sessions])

  const fetchExams = useCallback(
    async (page: number) => {
      const load = ++latestLoad.current
      try {
        setLoading(true)
        setFailed(false)
        const data = await fetchExamsFromStore(page, PAGE_SIZE)
        if (load !== latestLoad.current) return
        setExamAttempts(data.examAttempts)
        setTotal(data.total)
      } catch (error) {
        if (load !== latestLoad.current) return
        console.error("[my-exams] load failed", error)
        // Never leave another page's rooms under this page number.
        setExamAttempts([])
        setTotal(0)
        setFailed(true)
        toast.error("Không thể tải lịch sử thi")
      } finally {
        if (load === latestLoad.current) setLoading(false)
      }
    },
    [fetchExamsFromStore, toast],
  )

  useEffect(() => {
    fetchExams(currentPage)
  }, [currentPage, fetchExams])

  const handlePageChange = (page: number) => {
    // Paging happens in the full list; keep it open on the way back to page 1.
    setExpanded(true)
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

  const openHistory = (session: SessionSummary) => setHistoryDialog({ open: true, session })

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const view = myExamsView({ expandedByUser, page: currentPage, othersCount: others.length, totalPages, failed })
  const { expanded } = view
  const visibleOthers = others.slice(0, view.visibleOthers)

  const toggleExpanded = () => {
    // Collapsing from page 2+ goes back to the first page, where the preview lives.
    if (expanded && currentPage > 1) setSearchParams({})
    setExpanded(!expanded)
  }

  return (
    <div className="relative text-foreground">
      <PageHeader
        icon={<ClipboardTextIcon />}
        title="Bài thi của tôi"
        subtitle="Danh sách các phòng thi đã tham gia"
        actions={loading ? <OverviewPillsSkeleton /> : view.showOverview ? <OverviewPills overview={overview} /> : undefined}
      />

      {loading ? (
        <MyExamsSkeleton />
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-canvas">
          {failed
            ? <SectionMessage title="Không tải được danh sách bài thi" onRetry={() => fetchExams(currentPage)} />
            : <SectionMessage title="Chưa có bài thi nào" hint="Tham gia phòng thi để bắt đầu" />}
        </div>
      ) : (
        <div className="space-y-8">
          {continuing.length > 0 && (
            <section aria-labelledby="my-exams-continue">
              <SectionHeading id="my-exams-continue" title="Tiếp tục học" />
              <div className="space-y-4">
                {continuing.map((session) => (
                  <ContinueExamCard key={session.examSessionId} session={session} onViewHistory={openHistory} onTogglePin={handleTogglePin} />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section aria-labelledby="my-exams-others" className="@container">
              <SectionHeading
                id="my-exams-others"
                title={continuing.length > 0 ? "Các bài thi khác" : "Bài thi đã làm"}
                action={view.canExpand ? <ViewAllButton expanded={expanded} onToggle={toggleExpanded} /> : undefined}
              />
              <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
                {visibleOthers.map((session) => (
                  <SessionCard
                    key={session.examSessionId}
                    session={session}
                    onViewHistory={openHistory}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </div>
            </section>
          )}

          {view.showPager && (
            <ExamsPagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          )}
        </div>
      )}

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
