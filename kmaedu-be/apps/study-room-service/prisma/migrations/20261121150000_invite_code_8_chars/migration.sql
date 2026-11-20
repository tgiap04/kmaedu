-- Invite codes move from 6 digits to 8 characters of INVITE_CODE_ALPHABET (study-room.constants.ts).
-- Data only, no DDL: every room still on an old code gets a new random one, so no room keeps a code from the
-- small space. The bytes come from gen_random_uuid() (CSPRNG; bytes 6-9 carry the version/variant bits and are
-- skipped). The subquery references the outer row so Postgres draws new bytes per room.
UPDATE "StudyRoom" r
SET "inviteCode" = (
    SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + get_byte(s.b, i) % 31, 1), '' ORDER BY i)
    FROM (SELECT decode(replace(gen_random_uuid()::text, '-', ''), 'hex') AS b WHERE r.id IS NOT NULL) s,
         unnest(ARRAY[0, 1, 2, 3, 4, 5, 10, 11]) AS i
)
WHERE length(r."inviteCode") <> 8;
