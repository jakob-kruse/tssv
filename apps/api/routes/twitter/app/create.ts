import {
  TwitterApp,
  TwitterAppCredentialsSchema,
} from "../../../lib/twitter/TwitterApp";

export default defineEventHandler(async (event) => {
  const appCredentialsRes = TwitterAppCredentialsSchema.safeParse(
    await useBody(event)
  );

  if (appCredentialsRes.success === false) {
    return createError({
      statusCode: 400,
      message: appCredentialsRes.error.message,
    });
  }

  return await TwitterApp.create(appCredentialsRes.data);
});
