import type { HttpClient } from "../http.js";
import { collect, iterateList } from "../pagination.js";
import type { ListPaginated, ListSetsParams, Set } from "../types.js";

export class SetsResource {
  constructor(private readonly http: HttpClient) {}

  list(params?: ListSetsParams): Promise<ListPaginated<Set>> {
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
    return iterateList((pageParams) => this.list(pageParams), params);
  }

  listAll(params?: ListSetsParams): Promise<Set[]> {
    return collect(this.iterate(params));
  }
}
