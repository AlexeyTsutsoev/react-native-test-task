# React Native take-home: transfer quote screen

**Timebox: 90 minutes.** AI tools are allowed. The starter uses synthetic data only: no network calls, no emulator, no Scopex code.

## The screen

The user enters an amount in EUR, sees an exchange rate and a fee, and taps **Continue**.

Two problems:

- An older API response can overwrite the current quote.
- We can't tell whether users drop off because they never got a quote, or because they saw one and chose not to continue.

## Tasks

1. **Fix stale quotes in `TransferQuoteScreen.tsx`.** Enter `100`, then quickly `200`: the mock API answers `200` first, then `100` overwrites it. An older quote must never replace the current one, and the user must not be able to continue with a quote that doesn't match the current input. Keep the happy path, the retry after an error, and the design.
2. **Add up to three analytics events** with `track()` (or the injected `trackEvent`) that tell the two drop-off cases apart. Don't log amounts, input text, user IDs, or other personal data.
3. **Add one regression test** that fails on the original code and passes with your fix. Keep the existing tests passing. You can inject `requestQuote` in tests.

## Run

Requires Node.js 20 or newer.

```sh
npm ci
npm test
npm run typecheck
```

## Submit

Send one GitHub Gist with the files you changed or added and a short `README.md` that covers:

- how to apply your changes to the starter and run the test
- when each event fires, how to read them, and how you avoid duplicates
- one product decision the events would inform

If you run out of time, submit what works and note what remains. Don't include secrets or proprietary code.
