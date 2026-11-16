# Phase 03 frontend report

## Changed (kmaedu-fe/src)
- apis: profileApi (upload fns, avatar/banner, UploadImageResponse removed), quizsetApi/flashcardSetApi (FormData branch + thumbnailFile removed, JSON only), historyApi, quizPracticeApi, studentMaterialsApi, adminApi, adminRolesApi, examAttemptApi, examSessionApi.
- types: user, quizset, flashcardSet, examRoom, examSession, studyRoom; lib/quiz-practice/sharing-types.
- stores: useQuizSetStore, useFlashcardSetStore (thumbnailFile params), useStudyRoomStore.
- forms: QuizSetForm, FlashcardSetForm, FormSelectQuizSet, FormSelectFlashcardSet (thumbnail picker removed). ThumbnailUpload.tsx deleted (was unused elsewhere; note: `git rm --cached` staged its deletion).
- tables/pages: ManagementTable (icon only), ExamTable, FlashcardTable, ManageExamPage, FlashcardsPage, ManageExamRoomPage, FlashcardStudyPage, ProfilePage (upload UI, banner image, hidden inputs removed; plain gradient header kept; completeness now 3 x 33%), study-room leaderboard-panel/room-card/roster-row.
- avatar rendering -> initials/Facehash: ProfileDropdown, HeaderSection, SideBar, KLayout, ExamSessionLayout, AdminLayout, RoleUserTable, UserSearchInput, WhitelistUserPicker, auth-layout-shell, UserAvatar, ParticipantListItem, RecentParticipantsList, PostCard, TopContributors, ConversationItem, NotificationItem. antd/avatar.tsx: unused AvatarImage removed.
- mediaApi / ImageUrlDialog untouched.

## Commands
- yarn build (tsc -b + vite): exit 0
- yarn test: exit 0 (18 files, 122 tests)
- eslint on all changed files (xargs): exit 0, 2 pre-existing warnings (KLayout unused `language`/`setLanguage`)
- Not verified in a browser.

## Remaining grep hits (-w avatar|banner|thumbnail)
- Imports/usages of the Radix-style `Avatar`/`AvatarFallback` components (initials only) - kept by design.
- src/components/organisms/FeedbackSection.tsx: static landing-page testimonial photos (hardcoded URLs, not user data) - unrelated, kept.
- src/components/k/word-family/WordFamilyNode.tsx:13 comment mention "avatar" - unrelated comment.
- snapshot-banner.ts/.test.ts, snapshot-outdated-banner.tsx, ManageExamRoomDetailPage, useExamRoomDetailStore comment, useWordFamilyStore comment: exam "snapshot banner" / UI banner, unrelated.
- `thumbnail`: no hits.
