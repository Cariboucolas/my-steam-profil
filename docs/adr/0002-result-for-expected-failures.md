# Result for expected failures, exceptions for broken invariants

`SteamId.create` returns a `Result` because a malformed id is a normal outcome of user input, and that failure has to survive all the way to an HTTP 400. `Playtime.fromMinutes` and `CompletionRate.from` throw `RangeError` instead, because they are built from data the mapper has already validated — a negative playtime is a programming error, not a case to handle.

## Consequences

Constructors fed from outside the system (user input, Steam responses) return `Result`. Constructors fed from already-trusted data throw. Don't unify the two for consistency's sake: making invariant violations return `Result` would thread impossible error branches through every caller, and callers would learn to ignore them.
