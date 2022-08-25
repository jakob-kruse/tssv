import { z } from "zod";
import { TwitterApp } from "../../../../lib/twitter/TwitterApp";

export default defineEventHandler(async (event) => {
  const queryRes = z
    .object({
      oauth_token: z.string().min(1),
      oauth_verifier: z.string().min(1),
    })
    .safeParse(useQuery(event));

  if (queryRes.success === false) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: queryRes.error.message,
      })
    );
  }

  const authRes = await TwitterApp.handleCallback(queryRes.data);

  if (authRes.isErr()) {
    return sendError(
      event,
      createError({
        statusCode: 400,
        message: authRes.error,
      })
    );
  }

  return true;
});
