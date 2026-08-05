import * as Sentry from '@sentry/astro';

Sentry.init({
	dsn: 'https://62db4b23629a4ea164830beb0210c0a0@o4511853164625920.ingest.us.sentry.io/4511853174521861',
	dataCollection: {
		// To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
		// https://docs.sentry.io/platforms/javascript/guides/astro/configuration/options/#dataCollection
		// userInfo: false,
		// httpBodies: [],
	},
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],
	// Enable logs to be sent to Sentry
	enableLogs: true,
	// Define how likely traces are sampled. Adjust this value in production,
	// or use tracesSampler for greater control.
	tracesSampleRate: 0.2,
	replaysSessionSampleRate: 0.1,
	// If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
	replaysOnErrorSampleRate: 1.0,
});
