import type { CursorPaginated, Paginated } from "./types.js";

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
