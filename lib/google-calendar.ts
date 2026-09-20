import { google } from "googleapis";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.owned";

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is missing");
  }

  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is missing");
  }

  if (!redirectUri) {
    throw new Error(
      "GOOGLE_CALENDAR_REDIRECT_URI is missing",
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function createGoogleCalendarClient() {
  const {
    clientId,
    clientSecret,
    redirectUri,
  } = getGoogleOAuthConfig();

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  );
}

export function getGoogleCalendarAuthorizationUrl() {
  const client = createGoogleCalendarClient();

  const { redirectUri } = getGoogleOAuthConfig();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_CALENDAR_SCOPE],

    // Explicitly provide the redirect URI as well.
    redirect_uri: redirectUri,
  });
}

export async function exchangeGoogleCalendarCode(
  code: string,
) {
  const client = createGoogleCalendarClient();

  const { tokens } = await client.getToken(code);

  return tokens;
}

/* =========================================================
   CREATE GOOGLE CALENDAR EVENT
   ========================================================= */

type CreateGoogleCalendarEventInput = {
  refreshToken: string;
  title: string;
  description?: string;
  start: string;
  end: string;
};

export async function createGoogleCalendarEvent({
  refreshToken,
  title,
  description,
  start,
  end,
}: CreateGoogleCalendarEventInput) {
  const client = createGoogleCalendarClient();

  /*
   * Use the saved refresh token to obtain a fresh access token.
   *
   * googleapis will automatically refresh the access token
   * when necessary.
   */
  client.setCredentials({
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: client,
  });

  const response = await calendar.events.insert({
    calendarId: "primary",

    requestBody: {
      summary: title,

      ...(description
        ? {
            description,
          }
        : {}),

      start: {
        dateTime: start,
      },

      end: {
        dateTime: end,
      },
    },
  });

  return response.data;
}