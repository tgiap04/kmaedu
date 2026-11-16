# Phase 02: content, assessment, study-room

## Steps
1. content: remove thumbnail upload (FileInterceptor('thumbnail') on quizset/flashcardset create/update; routes stay
   multipart-compatible only if other fields need it, else JSON), `owned-thumbnail.ts`, thumbnail in DTOs, response mappers,
   sharing/student-content/quiz-practice views, R2 upload client if now unused (keep delete worker).
2. content: drop `avatar` from user views (sharing-view, user-search, flashcardset-public mapper, sharing dto).
3. Migration `remove_set_thumbnails`: queue owned `quizset-thumbnails/<userId>/…` and `flashcardset-thumbnails/<userId>/…`
   keys (DISTINCT) into `r2_delete_tasks`, then drop `thumbnail` from both set tables.
4. assessment: drop thumbnail (quiz-set titles cache, examattempt view, examsession public mapper) and avatar
   (user-search, examroom host, sharing dto, public mapper).
5. study-room: drop avatar from socket auth profile, events, gateway member payload.
6. Tests in these services updated.
