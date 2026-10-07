export interface Pagination {
  page: number;
  perPage: number;
  offset: number;
}

export function buildPagination(page?: number, perPage?: number): Pagination {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const safePerPage = Math.min(100, Math.max(1, Math.floor(perPage ?? 30)));
  return { page: safePage, perPage: safePerPage, offset: (safePage - 1) * safePerPage };
}

export function paginationMeta(pagination: Pagination, total: number) {
  return {
    page: pagination.page,
    perPage: pagination.perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.perPage)),
    hasMore: pagination.page * pagination.perPage < total,
  };
}
