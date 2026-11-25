# Solution

## Run

```sh
git clone -b test-task https://github.com/AlexeyTsutsoev/react-native-test-task.git
cd react-native-test-task
npm ci
npm test
npm run typecheck
```

The regression test is `ignores an older quote that arrives after the current one`. The other new tests are extra.

## Stale quotes

Each request gets an id, and only the latest one can update the screen. I also hide the old quote while a new one loads, so the amount and the rate always match.

I considered adding a debounce for better UX (fewer requests and less flicker while typing), but decided against it. It doesn't fix the race on its own, and it would delay quotes and break the existing tests.

## Analytics

Events carry only `attempt`, the number of the request on this screen, plus `outcome` on the result.

- `quote_requested`: a request starts (valid amount or retry)
- `quote_result`: the latest request ends with `outcome: shown` or `failed`
- `quote_continued`: the user taps Continue

If a visit has no `quote_continued`, look at its last attempt:

- `failed`: the user never got a quote
- `shown`: they saw it and left
- no result: they left, or cleared the amount, before it loaded. I'd count this separately: it may mean slow quotes, but not errors

Earlier attempts don't count, because typing `100` also requests `1` and `10`. `attempt: 1` starts a new visit. I assume the SDK adds the session and event order.

**Duplicates:** each request has its own attempt number, stale responses are ignored, and repeated Continue taps are reported once.

I assume `trackEvent` doesn't throw. If the SDK can, I'd handle it once in `analytics.ts` rather than on every screen.

## Product decision

What to improve first: if most users never get a quote, its reliability (or speed, if most leave before a result). If they see it and leave, the rate, the fee and how we show them.

## Left as is

Two issues in the starter are outside this task: `1,000` is read as `1`, and a double tap calls `onContinue` twice.
