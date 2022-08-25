import { loadConfig } from "c12";

function createCached<T>(source: () => T): () => T {
  let cache: T | undefined;
  return (): T => {
    if (cache === undefined) {
      cache = source();
    }
    return cache;
  };
}

export const getConfig = createCached(async () => {
  return await loadConfig({
    dotenv: {
      cwd: ".",
      env: {
        TWITTER_API_KEY: "",
      },
    },
  });
});
