import { TwitterApi } from "twitter-api-v2";
import { z } from "zod";
import { getPermanentOAuthTokens } from "../../lib/twitter/oauth";
import { getTokens } from "../../lib/twitter/tokens";

export default defineEventHandler(async (event) => {
  const bodyRes = z
    .object({
      id: z.string().min(1),
      text: z.string().min(1),
    })
    .safeParse(await useBody(event));

  if (bodyRes.success === false) {
    return createError({
      statusCode: 400,
      message: bodyRes.error.message,
    });
  }

  const { id, text } = bodyRes.data;

  const tokens = await getPermanentOAuthTokens(id);

  if (tokens.isErr()) {
    return createError({
      statusCode: 400,
      message: tokens.error,
    });
  }

  const appTokens = await getTokens(tokens.value.app_key);

  if (appTokens.isErr()) {
    return createError({
      statusCode: 400,
      message: appTokens.error,
    });
  }
  const client = new TwitterApi({
    appKey: appTokens.value.appKey,
    appSecret: appTokens.value.appSecret,
    accessToken: tokens.value.access_token,
    accessSecret: tokens.value.access_secret,
  });

  const res = await client.v2.tweet(text);

  return res;
});
