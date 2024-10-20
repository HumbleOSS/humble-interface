import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./style.css";
import { currentVersion } from "./constants/versions";
/*
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: "https://7cf1de51a2077d109b793369d924bb4c@o4507456022904832.ingest.us.sentry.io/4507456024739840",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/voi\.humble\.sh/],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});
*/

const dbname = "dexDatabase";
const versionKey = "humble-versions";
const version = Number(localStorage.getItem(versionKey) || "0");
if (version < currentVersion) {
  localStorage.clear();
  localStorage.setItem(versionKey, `${currentVersion}`);
  indexedDB.deleteDatabase(dbname);
}

ReactDOM.render(<App />, document.getElementById("root"));
