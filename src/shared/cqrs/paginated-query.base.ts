export type OrderByDirection = "asc" | "desc";

export type PaginatedQueryParams = {
  limit: number;
  offset: number;
  page: number;
  orderBy: { field: string; direction: OrderByDirection };
};

// Use as Props type for paginated queries — omits computed offset, makes pagination fields optional
export type PaginatedParams<T> =
  Omit<T, "limit" | "offset" | "orderBy" | "page"> &
  Partial<Omit<PaginatedQueryParams, "offset">>;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export abstract class PaginatedQueryBase {
  readonly limit: number;
  readonly offset: number;
  readonly page: number;
  readonly orderBy: { field: string; direction: OrderByDirection };

  constructor(props: PaginatedParams<PaginatedQueryParams>) {
    this.limit = props.limit ?? 20;
    this.page = props.page ?? 1;
    this.offset = this.page > 0 ? (this.page - 1) * this.limit : 0;
    this.orderBy = props.orderBy ?? { field: "createdAt", direction: "desc" };
  }
}
