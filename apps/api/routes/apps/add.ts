import { saveTokens, TwitterAppTokensSchema } from "../../lib/twitter/tokens";

export default defineEventHandler(async (event) => {
  const body = await useBody(event);

  const valRes = TwitterAppTokensSchema.safeParse(body);

  if (valRes.success === false) {
    return createError({
      statusCode: 400,
      message: valRes.error.message,
    });
  }

  const saveTokenRes = await saveTokens(valRes.data);

  if (saveTokenRes.isErr()) {
    return createError({
      statusCode: 400,
      message: saveTokenRes.error,
    });
  }

  return true;
});
