/* Fallback configuration.
   Environment variables always win. This file exists so the app can be
   deployed as a self-contained bundle when the dashboard is uncooperative.

   It lives in the functions directory, which Netlify never serves over HTTP —
   only the publish directory is public. Values here are still secrets: do not
   commit real ones, and prefer moving them into environment variables. */
export default {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  DB_APP_SECRET: '',
  APP_SESSION_SECRET: '',
  APP_AGENT_SECRET: '',
  APP_PIN_SALT: '',
  APP_PIN_HASH: '',
  AGENT_WEBHOOK_URL: '',
  AGENT_WEBHOOK_SECRET: '',
  GSHEET_WEBHOOK_URL: ''
};
