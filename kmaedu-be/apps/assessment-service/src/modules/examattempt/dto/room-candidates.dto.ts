import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { queryInt } from '../../common/query-schema';

export const RoomOverviewSchema = z.object({
    window: z.enum(['30m', '1h', '24h', '7d']).default('30m'),
});
export class RoomOverviewDto extends createZodDto(RoomOverviewSchema) {}

export const RoomCandidatesSchema = z.object({
    page: queryInt(1).default(1),
    limit: queryInt(1, 100).default(10),
    search: z.string().trim().max(100).optional(),
    status: z.enum(['submitted', 'in_progress', 'not_started']).optional(),
    result: z.enum(['passed', 'failed']).optional(),
});
export class RoomCandidatesDto extends createZodDto(RoomCandidatesSchema) {}
