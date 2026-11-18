import { ConnectionError } from "./errors.js";
import { parseNumberHeader, type HttpClient } from "./http.js";
import type { CardsExport } from "./types.js";

const FILENAME_PATTERN = /filename="?([^";]+)"?/i;

const parseFilename = (disposition: string | null): string | null =>
  disposition?.match(FILENAME_PATTERN)?.[1] ?? null;

export const openExport = async (
  http: HttpClient,
  path: string
): Promise<CardsExport> => {
  const response = await http.stream({
    path,
    auth: "apiKey",
    accept: "application/gzip",
  });

  if (!response.body) {
    throw new ConnectionError(`Response from ${path} had no body to stream`);
  }

  return {
    body: response.body,
    filename: parseFilename(response.headers.get("content-disposition")),
    downloadsRemaining: parseNumberHeader(
      response.headers.get("x-export-downloads-remaining")
    ),
    arrayBuffer: () => response.arrayBuffer(),
  };
};
