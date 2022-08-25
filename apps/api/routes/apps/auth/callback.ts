import { TwitterApi } from "twitter-api-v2";
import { z } from "zod";
import {
  getTempOAuthTokens,
  savePermanentOAuthTokens,
} from "../../../lib/twitter/oauth";
import { createTwitterClient, getTokens } from "../../../lib/twitter/tokens";

export default defineEventHandler(async (event) => {
  const queryRes = z
    .object({
      oauth_token: z.string().min(1),
      oauth_verifier: z.string().min(1),
    })
    .safeParse(useQuery(event));

  if (queryRes.success === false) {
    return createError({
      statusCode: 400,
      message: queryRes.error.message,
    });
  }

  const { oauth_token, oauth_verifier } = queryRes.data;

  const tokens = await getTempOAuthTokens(oauth_token);

  if (tokens.isErr()) {
    return createError({
      statusCode: 400,
      message: tokens.error,
    });
  }

  const appTokensRes = await getTokens(tokens.value.appKey);

  if (appTokensRes.isErr()) {
    return createError({
      statusCode: 400,
      message: appTokensRes.error,
    });
  }

  const client = new TwitterApi({
    appKey: appTokensRes.value.appKey,
    appSecret: appTokensRes.value.appSecret,
    accessToken: tokens.value.oauth_token,
    accessSecret: tokens.value.oauth_token_secret,
  });

  const res = await client.login(oauth_verifier);

  const permaTokenRes = await savePermanentOAuthTokens({
    access_token: res.accessToken,
    access_secret: res.accessSecret,
    app_key: appTokensRes.value.appKey,
  });

  if (permaTokenRes.isErr()) {
    return createError({
      statusCode: 400,
      message: permaTokenRes.error,
    });
  }

  return permaTokenRes.value;
});
