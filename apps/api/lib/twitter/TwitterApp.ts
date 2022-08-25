import { err, ok, Result } from "neverthrow";
import { TwitterApi } from "twitter-api-v2";
import { z } from "zod";
import { Unpromise } from "../util";

const OAUTH_CALLBACK_URL =
  "http://localhost:3000/twitter/app/auth/callback" as const;

export const TwitterAppCredentialsSchema = z.object({
  appKey: z.string().min(1),
  appSecret: z.string().min(1),
  accessToken: z.string().optional(),
  accessSecret: z.string().optional(),
});

export type TwitterAppCredentials = z.infer<typeof TwitterAppCredentialsSchema>;

export const TemporaryOAuthCredentialsSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenSecret: z.string().min(1),
});

export type TemporaryOAuthCredentials = z.infer<
  typeof TemporaryOAuthCredentialsSchema
>;

export const AuthParamsSchema = z.object({
  oauth_token: z.string().min(1),
  oauth_verifier: z.string().min(1),
});

export type AuthParams = z.infer<typeof AuthParamsSchema>;

export const PersistentOAuthCredentialsSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenSecret: z.string().min(1),
});

export type PersistentOAuthCredentials = z.infer<
  typeof PersistentOAuthCredentialsSchema
>;

function getPersistentOAuthCredentialsKey(appKey: string, oauthToken?: string) {
  let allUsersKey = `main:twitter:app:${appKey}:authorized_user`;

  if (oauthToken) {
    allUsersKey += `:${oauthToken}`;
  }

  return allUsersKey;
}

function getTemporaryOAuthCredentialsKey(
  oAuthToken: TemporaryOAuthCredentials["accessToken"]
) {
  return `main:twitter:temporary_oauth_credentials:${oAuthToken}`;
}

function getCredentialsKey(appKey: TwitterAppCredentials["appKey"]) {
  return `main:twitter:app:${appKey}:app_credentials`;
}

export class TwitterApp {
  private authType: "app" | "user" = "app";

  private twitterClient: TwitterApi;

  constructor(private readonly credentials: TwitterAppCredentials) {
    if (credentials.accessToken || credentials.accessSecret) {
      this.authType = "user";
    }

    this.twitterClient = new TwitterApi({
      appKey: credentials.appKey,
      appSecret: credentials.appSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret,
    });
  }

  static async create({ appKey, appSecret }: TwitterAppCredentials) {
    const key = getCredentialsKey(appKey);

    if (await useStorage().hasItem(key)) {
      return err(`Twitter app with key ${key} already exists.`);
    }

    await useStorage().setItem(key, {
      appKey,
      appSecret,
    });

    return ok(appKey);
  }

  static async load(
    appKey: string,
    oAuthToken?: string
  ): Promise<Result<TwitterApp, string>> {
    const appCredentialsKey = getCredentialsKey(appKey);

    if ((await useStorage().hasItem(appCredentialsKey)) === false) {
      return err(`Twitter app with key ${appKey} not found.`);
    }

    const appCredentials = await useStorage().getItem(appCredentialsKey);

    if (appCredentials === null) {
      throw new Error(`Twitter app with appKey ${appKey} not found`);
    }

    let twitterApiCredentials: TwitterAppCredentials = appCredentials;

    const temporaryOAuthCredentialsKey =
      getTemporaryOAuthCredentialsKey(oAuthToken);

    const persistentOAuthCredentialsKey = getPersistentOAuthCredentialsKey(
      appKey,
      oAuthToken
    );

    if (oAuthToken) {
      const credentials =
        (await useStorage().getItem(temporaryOAuthCredentialsKey)) ||
        (await useStorage().getItem(persistentOAuthCredentialsKey));

      if (credentials === null) {
        return err(
          `Temporary OAuth credentials for appKey ${appKey} and oAuthToken ${oAuthToken} not found.`
        );
      }

      twitterApiCredentials = {
        ...twitterApiCredentials,
        accessToken: credentials.accessToken,
        accessSecret: credentials.accessTokenSecret,
      };
    }

    const apiCredentialsRes = TwitterAppCredentialsSchema.safeParse(
      twitterApiCredentials
    );

    if (apiCredentialsRes.success === false) {
      return err(apiCredentialsRes.error.message);
    }

    return ok(new TwitterApp(apiCredentialsRes.data));
  }

  async getAuthUrl() {
    let authLinkRes: Unpromise<ReturnType<TwitterApi["generateAuthLink"]>>;

    try {
      authLinkRes = await this.twitterClient.generateAuthLink(
        OAUTH_CALLBACK_URL
      );
    } catch (error) {
      console.error(error);
      return err("Could not generate auth link");
    }

    const key = getTemporaryOAuthCredentialsKey(authLinkRes.oauth_token);

    if (await useStorage().hasItem(key)) {
      return err(`Temporary oauth token with key ${key} already exists.`);
    }

    await useStorage().setItem(key, {
      accessToken: authLinkRes.oauth_token,
      accessTokenSecret: authLinkRes.oauth_token_secret,
      ...this.credentials,
    });

    return ok(authLinkRes.url);
  }

  async verifyUser(verifier: string): Promise<Result<boolean, string>> {
    if (this.authType === "app") {
      return err(`User credentials not found.`);
    }

    const key = getPersistentOAuthCredentialsKey(
      this.credentials.appKey,
      this.credentials.accessToken
    );

    try {
      const loginResults = await this.twitterClient.login(verifier);

      await useStorage().setItem(key, {
        accessToken: loginResults.accessToken,
        accessTokenSecret: loginResults.accessSecret,
      });

      await useStorage().removeItem(
        getTemporaryOAuthCredentialsKey(this.credentials.accessToken)
      );

      return ok(true);
    } catch (error) {
      console.error(error);

      return err("Could not verify user");
    }
  }

  static async handleCallback(params: AuthParams) {
    const key = getTemporaryOAuthCredentialsKey(params.oauth_token);

    if ((await useStorage().hasItem(key)) === false) {
      return err(`Temporary oauth token with key ${key} not found.`);
    }

    const temporaryOAuthCredentials: {
      accessToken: TemporaryOAuthCredentials["accessToken"];
      accessTokenSecret: TemporaryOAuthCredentials["accessTokenSecret"];
      appKey: TwitterAppCredentials["appKey"];
      appSecret: TwitterAppCredentials["appSecret"];
    } = await useStorage().getItem(key);

    const twitterAppRes = await TwitterApp.load(
      temporaryOAuthCredentials.appKey,
      temporaryOAuthCredentials.accessToken
    );

    if (twitterAppRes.isErr()) {
      return err(twitterAppRes.error);
    }

    const twitterApp = twitterAppRes.value;

    const res = await twitterApp.verifyUser(params.oauth_verifier);

    if (res.isErr()) {
      return err(res.error);
    }

    return ok(true);
  }

  async asUser(oAuthToken: string) {
    const key = getPersistentOAuthCredentialsKey(
      this.credentials.appKey,
      oAuthToken
    );

    if ((await useStorage().hasItem(key)) === false) {
      return err(`User credentials with key ${key} not found.`);
    }

    const userCredentials = await useStorage().getItem(key);

    if (userCredentials === null) {
      return err(`User credentials with key ${key} not found`);
    }

    const apiCredentialsRes = TwitterAppCredentialsSchema.safeParse(
      this.credentials
    );

    if (apiCredentialsRes.success === false) {
      return err(apiCredentialsRes.error.message);
    }

    return ok(new TwitterApp(apiCredentialsRes.data));
  }

  async getAuthorizedUsers() {
    const allUsersKey = getPersistentOAuthCredentialsKey(
      this.credentials.appKey
    );
    const users = await useStorage().getKeys(allUsersKey);

    const prefixRemoved = users.map((key: string) =>
      key.replace(allUsersKey + ":", "")
    );

    return ok(prefixRemoved);
  }

  getClient() {
    return this.twitterClient;
  }
}
