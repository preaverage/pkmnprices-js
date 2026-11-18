import type {
  CursorPaginated,
  ListPageParams,
  ListPaginated,
  Paginated,
} from "./types.js";

// Walks the set, card and sealed lists. It follows the keyset cursor whenever
// the API hands one out, and falls back to page numbers on price-ordered
// lists, which have no cursor.
export const iterateList = async function* <T, P extends ListPageParams>(
  fetchPage: (params: P) => Promise<ListPaginated<T>>,
  params: P | undefined
): AsyncGenerator<T> {
  let page = params?.page ?? 1;
  let cursor = params?.cursor;

  for (;;) {
    // A cursor replaces the page number: the API refuses both together.
    const position = cursor === undefined ? { page } : { cursor, page: undefined };
    const result = await fetchPage({ ...params, ...position } as P);
    yield* result.data;

    const { next_cursor, total_pages } = result.pagination;
    if (next_cursor) {
      cursor = next_cursor;
      continue;
    }

    // Under a cursor `page` stays at 1, so only a page-number walk can
    // continue past a null cursor.
    const walkedByCursor = cursor !== undefined;
    if (walkedByCursor || page >= total_pages || result.data.length === 0) return;

    page += 1;
  }
};

// Walks page-based endpoints one item at a time, fetching the next page on demand.
export const iteratePages = async function* <T>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
  startPage = 1
): AsyncGenerator<T> {
  let page = startPage;

  for (;;) {
    const result = await fetchPage(page);
    yield* result.data;

    const { total_pages } = result.pagination;
    if (page >= total_pages || result.data.length === 0) return;

    page += 1;
  }
};

// Same as iteratePages, but for cursor-based endpoints.
export const iterateCursor = async function* <T>(
  fetchPage: (cursor: string | undefined) => Promise<CursorPaginated<T>>
): AsyncGenerator<T> {
  let cursor: string | undefined = undefined;

  for (;;) {
    const result = await fetchPage(cursor);
    yield* result.data;

    const { has_more, next_cursor } = result.pagination;
    if (!has_more || next_cursor === null) return;

    cursor = next_cursor;
  }
};

export const collect = async <T>(source: AsyncGenerator<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of source) {
    items.push(item);
  }

  return items;
};
