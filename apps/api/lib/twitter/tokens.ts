import { TwitterApi } from "twitter-api-v2";
import { z } from "zod";
import { err, ok, Result } from "neverthrow";

export const TwitterAppTokensSchema = z.object({
  appKey: z.string().min(1),
  appSecret: z.string().min(1),
});

export type TwitterAppTokens = z.infer<typeof TwitterAppTokensSchema>;

function appTokenKey(appKey: string) {
  return `fs:twitter:apps:${appKey}`;
}

export async function saveTokens(
  tokens: TwitterAppTokens
): Promise<Result<TwitterAppTokens, string>> {
  const key = appTokenKey(tokens.appKey);

  if (await useStorage().hasItem(key)) {
    return err(`App "${tokens.appKey}"   already exists`);
  }

  await useStorage().setItem(key, tokens);

  return ok(tokens);
}

export async function getTokens(
  appKey: string
): Promise<Result<TwitterAppTokens, string>> {
  const tokens = await useStorage().getItem(appTokenKey(appKey));

  if (tokens === null) {
    return err(`No tokens found for app key: ${appKey}`);
  }

  return ok(tokens);
}

export async function createTwitterClient(
  appKey: string
): Promise<Result<TwitterApi, string>> {
  const tokens = await getTokens(appKey);

  if (tokens.isErr()) {
    return err(tokens.error);
  }

  const { appSecret } = tokens.value;

  return ok(
    new TwitterApi({
      appKey,
      appSecret,
    })
  );
}
