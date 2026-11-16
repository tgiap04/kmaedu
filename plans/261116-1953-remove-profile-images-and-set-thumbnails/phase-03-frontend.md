# Phase 03: frontend

## Steps
1. Remove profile avatar/banner upload (profileApi, ProfilePage) and banner rendering.
2. Remove `avatar` from user types and every place that renders an image avatar; show initials (existing fallback
   components where present).
3. Remove set thumbnail fields from types/APIs/stores/forms (QuizSetForm, FlashcardSetForm, FormSelect*), tables and
   cards (thumbnail img → existing icon fallback). Drop FormData thumbnail append; send JSON if no file remains.
4. `yarn build`, `yarn test`, `yarn lint` on touched files.
