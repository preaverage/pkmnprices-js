import type { HttpClient } from "../http.js";
import { collect, iteratePages } from "../pagination.js";
import type { ListSetsParams, Paginated, Set } from "../types.js";

export class SetsResource {
  constructor(private readonly http: HttpClient) {}

  list(params?: ListSetsParams): Promise<Paginated<Set>> {
    return this.http.request({
      path: "/v1/sets",
      query: { ...params },
      auth: "apiKey",
    });
  }

  get(id: number): Promise<Set> {
    return this.http.request({ path: `/v1/sets/${id}`, auth: "apiKey" });
  }

  iterate(params?: ListSetsParams): AsyncGenerator<Set> {
    return iteratePages(
      (page) => this.list({ ...params, page }),
      params?.page ?? 1
    );
  }

  listAll(params?: ListSetsParams): Promise<Set[]> {
    return collect(this.iterate(params));
  }
}
