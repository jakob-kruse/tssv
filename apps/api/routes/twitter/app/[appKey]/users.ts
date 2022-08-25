import { z } from "zod";
import { TwitterApp } from "../../../../lib/twitter/TwitterApp";

export default defineEventHandler(async (event) => {
  const paramsRes = z
    .object({
      appKey: z.string().min(1),
    })
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

  const usersRes = await twitterAppRes.value.getAuthorizedUsers();

  if (usersRes.isErr()) {
    return createError({
      statusCode: 400,
      message: usersRes.error,
    });
  }

  return usersRes.value;
});
