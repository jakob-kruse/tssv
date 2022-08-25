import { z } from "zod";
import { TwitterApp } from "../../../../lib/twitter/TwitterApp";

export default defineEventHandler(async (event) => {
  const paramsRes = z
    .object({ appKey: z.string().min(1) })
    .safeParse(event.context.params);

  if (paramsRes.success === false) {
    return createError({
      statusCode: 400,
      message: paramsRes.error.message,
    });
  }

  const twitterAppRes = await TwitterApp.load(paramsRes.data.appKey);

  if (twitterAppRes.isErr()) {
    return createError({
      statusCode: 400,
      message: twitterAppRes.error,
    });
  }

  const authUrlRes = await twitterAppRes.value.getAuthUrl();

  if (authUrlRes.isErr()) {
    return createError({
      statusCode: 400,
      message: authUrlRes.error,
    });
  }

  return sendRedirect(event, authUrlRes.value);
});
