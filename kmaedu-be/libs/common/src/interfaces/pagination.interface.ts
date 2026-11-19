export interface PaginationParams {
    page?: number;
    size?: number;
    sortBy?: string;
    sortType?: 'asc' | 'desc';
    /** Prisma orderBy (an object or a list); when set, sortBy / sortType are not used. */
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
    dateFrom?: string;
    dateTo?: string;
    searchBy?: string[];
    text?: string;
    [key: string]: any;
}

export interface PaginationResult<T> {
    data: T[];
    total: number;
    page: number;
    size: number;
    totalPages: number;
}
