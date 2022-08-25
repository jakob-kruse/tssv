import cuid from "cuid";
import { err, ok, Result } from "neverthrow";
import { z } from "zod";

const TempOAuthTokensSchema = z.object({
  oauth_token: z.string().min(1),
  oauth_token_secret: z.string().min(1),
  appKey: z.string().min(1),
});

export type TempOAuthTokens = z.infer<typeof TempOAuthTokensSchema>;

const PermaTokensSchema = z.object({
  access_token: z.string().min(1),
  access_secret: z.string().min(1),
  app_key: z.string().min(1),
});

export type PermaTokens = z.infer<typeof PermaTokensSchema>;

function getTempOAuthSecretKey(token: string) {
  return `fs:twitter:oauth:tokens:temp:${token}`;
}

function getPermaOAuthSecretKey(id = cuid()) {
  return `fs:twitter:oauth:tokens:perma:${id}`;
}

export async function saveTempOAuthTokens(
  tokens: TempOAuthTokens
): Promise<Result<string, string>> {
  const validationRes = TempOAuthTokensSchema.safeParse(tokens);

  if (validationRes.success === false) {
    return err(validationRes.error.message);
  }

  await useStorage().setItem(
    getTempOAuthSecretKey(validationRes.data.oauth_token),
    validationRes.data
  );

  return ok(validationRes.data.oauth_token);
}

export async function getTempOAuthTokens(
  token: string
): Promise<Result<TempOAuthTokens, string>> {
  const secretKey = getTempOAuthSecretKey(token);
  const tokens = await useStorage().getItem(secretKey);

  if (tokens === null) {
    return err(`No tokens found for token: ${token}`);
  }

  const validationRes = TempOAuthTokensSchema.safeParse(tokens);

  if (validationRes.success === false) {
    return err(validationRes.error.message);
  }

  return ok(validationRes.data);
}

export async function savePermanentOAuthTokens(
  tokens: PermaTokens
): Promise<Result<string, string>> {
  const validationRes = PermaTokensSchema.safeParse(tokens);

  if (validationRes.success === false) {
    return err(validationRes.error.message);
  }

  const id = cuid();
  await useStorage().setItem(getPermaOAuthSecretKey(id), validationRes.data);

  return ok(id);
}

export async function getPermanentOAuthTokens(
  id: string
): Promise<Result<PermaTokens, string>> {
  const secretKey = getPermaOAuthSecretKey(id);
  const tokens = await useStorage().getItem(secretKey);

  if (tokens === null) {
    return err(`No tokens found for token: ${id}`);
  }

  const validationRes = PermaTokensSchema.safeParse(tokens);

  if (validationRes.success === false) {
    return err(validationRes.error.message);
  }

  return ok(validationRes.data);
}
