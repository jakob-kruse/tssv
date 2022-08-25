import { z } from "zod";
import { saveTempOAuthTokens } from "../../../lib/twitter/oauth";
import { createTwitterClient, getTokens } from "../../../lib/twitter/tokens";

export default defineEventHandler(async (event) => {
  const valRes = z
    .object({
      appKey: z.string().min(1),
    })
    .safeParse(event.context.params);

  if (valRes.success === false) {
    return createError({
      statusCode: 400,
      message: valRes.error.message,
    });
  }

  const { appKey } = valRes.data;

  const tokensRes = await getTokens(appKey);

  if (tokensRes.isErr()) {
    return createError({
      statusCode: 400,
      message: tokensRes.error,
    });
  }

  const clientRes = await createTwitterClient(appKey);

  if (clientRes.isErr()) {
    return createError({
      statusCode: 400,
      message: clientRes.error,
    });
  }

  const client = clientRes.value;

  const authLinkRes = await client.generateAuthLink(
    "http://127.0.0.1:3000/apps/auth/callback"
  );

  const tokenRes = await saveTempOAuthTokens({
    oauth_token: authLinkRes.oauth_token,
    oauth_token_secret: authLinkRes.oauth_token_secret,
    appKey,
  });

  if (tokenRes.isErr()) {
    return createError({
      statusCode: 400,
      message: tokenRes.error,
    });
  }

  return sendRedirect(event, authLinkRes.url);
});
