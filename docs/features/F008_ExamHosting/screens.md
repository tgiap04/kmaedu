# Screens — F008_ExamHosting

## Screen List

| Screen Name | What User Sees | What User Can Do |
|-------------|----------------|------------------|
| MyMaterialsPage / ExamRoomGrid (SCR016/REG003) | Grid of user's exam rooms with title, session count, and status | Create new exam room (opens modal), edit room (navigates to detail), delete room (confirmation dialog) |
| HistoryPage / ExamHistoryList (SCR018/REG002) | Center panel listing past exam attempts with scores and timestamps | Click to navigate to ExamHistoryPage for detail |
| HistoryPage / StatsCards (SCR018/REG003) | Right panel showing aggregated study statistics | Refresh stats via button |
| ExamHistoryPage (SCR019) | Paginated list of past exam attempts with scores and timestamps | View attempt details, navigate pages |
| ManageExamPage (SCR021) | List of teacher's exam rooms and quiz sets | Create exam room via modal (secondary path) |
| ManageExamRoomPage (SCR026) | Stat tiles (rooms, running, ended, participants), search / status / created-at filters, table or grid of rooms with quiz set, time span, participants and status | Create a room, open one ("Vào phòng" / "Xem kết quả"), edit or delete from the row menu, tick rooms and delete them together |
| ManageExamRoomDetailPage / Header (SCR027/REG001) | Room name, quiz set, status pill; stat tiles (sessions, running, ended, participants) | Copy the running (else next) session's link, open the results tab, end the room (closes every running session after a confirmation) |
| ManageExamRoomDetailPage / Info + Progress (SCR027/REG002) | Start, end and host of the room; ring of submitted / candidates, counts by status, submissions over the last 30 min / 1 h / 24 h / 7 days | Change the chart range (numbers refresh every 30 s while a session runs) |
| ManageExamRoomDetailPage / Candidates tab (SCR027/REG003) | Every candidate with their latest attempt (whitelisted people who have not started included): status, start, submit, score, time | Search by name, filter by status or result, export a CSV, open an attempt or the session's analytics |
| ManageExamRoomDetailPage / Sessions tab (SCR027/REG004) | Paginated sessions with status badges, share dialog with link | Create / edit / delete sessions, refresh a session's quiz, share |
| ManageExamRoomDetailPage / Stats and Settings tabs (SCR027/REG005) | Submitted, average score, pass rate, score spread, one row per session; room form | Open a session's analytics; edit name, description, quiz set; delete the room |
| ExamRoomSessionAnalyticsPage (SCR028) | Score bar chart, violation pie chart, attempt leaderboard table | Sort leaderboard, click row for per-user attempt detail |
| MyExamsPage (SCR029) | Session cards with attempt count, best score, and status | Enter session, open attempt history dialog |
| ExamSessionPage (SCR031) | Session info, countdown timer, Start/Resume button, attempt list | Start new attempt, resume in-progress attempt, enter access code |

## User Journey

1. Teacher opens My Materials and clicks "Create Exam Room" in the Exam Room Grid. They link it to a quiz set and are taken to the room detail page.
2. On the room detail page, the teacher reviews the StatsGrid, edits room metadata in RoomInfoSection, and creates a session using the SessionTable form. They configure the time window, time limit, attempt limits, and question selection strategy.
3. Teacher clicks "Share" to open ShareDialog, sets the session to PRIVATE, generates an access code, and copies the link to share with students.
4. Students navigate to My Exams, find the session card, and enter the access code if prompted. They click "Start Exam" to begin.
5. While answering, students are in fullscreen mode. Tab switches trigger a warning modal and are logged. The system auto-saves every 30 seconds.
6. When time expires or the student submits, results are shown. The student can view their score and check their answers.
7. The teacher revisits the session analytics page to see how the class performed, which students triggered violations, and can click into individual student attempts for a detailed review.

```mermaid
journey
    title Exam Hosting — teacher setup flow
    section Room creation
      Open My Materials and create exam room: 5: Teacher
      Navigate to room detail page: 5: Teacher
      Edit room metadata: 4: Teacher
    section Session scheduling
      Create session with time window and limits: 5: Teacher
      Configure sharing and access code: 4: Teacher
      Copy shareable link: 3: Teacher
    section Post-exam review
      Open session analytics page: 5: Teacher
      Review score distribution and violations: 4: Teacher
      Drill into individual student attempts: 4: Teacher
```
