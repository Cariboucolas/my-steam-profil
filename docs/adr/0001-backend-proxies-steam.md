# The backend proxies Steam; the mobile app never calls Steam directly

Every Steam Web API call carries an API key, and anything shipped inside a mobile bundle can be extracted from it. `apps/api` exists to hold `STEAM_API_KEY` server-side and expose three narrow endpoints to the app; the app holds no Steam credentials and knows nothing of Steam's response shapes.

## Considered options

Calling Steam directly from the Expo app — no service to write, deploy, or pay for. Rejected: the key would be readable by anyone who unpacks the build, and an abused key is rate-limited against the Steam account that owns it. The backend also gives us the one place to translate Steam's shapes into the domain (see `CONTEXT.md`), which the app would otherwise have to do itself.
