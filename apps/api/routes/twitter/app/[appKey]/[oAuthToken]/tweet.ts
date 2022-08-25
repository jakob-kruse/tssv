import { z } from "zod";
import { TwitterApp } from "../../../../../lib/twitter/TwitterApp";

export default defineEventHandler(async (event) => {
  const paramsRes = z
    .object({
      appKey: z.string().min(1),
      oAuthToken: z.string().min(1),
    })
    .safeParse(event.context.params);
  if (paramsRes.success === false) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: paramsRes.error.message,
      })
    );
  }

  const bodyRes = z
    .object({
      text: z.string().min(1),
    })
    .safeParse(await useBody(event));

  if (bodyRes.success === false) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: bodyRes.error.message,
      })
    );
  }

  const twitterAppRes = await TwitterApp.load(
    paramsRes.data.appKey,
    paramsRes.data.oAuthToken
  );

  if (twitterAppRes.isErr()) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: twitterAppRes.error,
      })
    );
  }

  const twitterApp = twitterAppRes.value;

  try {
    await twitterApp.getClient().v2.tweet(bodyRes.data.text);

    return true;
  } catch (error) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: error.message,
      })
    );
  }
});
