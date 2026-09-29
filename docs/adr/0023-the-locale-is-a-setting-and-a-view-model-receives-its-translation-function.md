# The locale is a setting, and a view-model receives its translation function
**Amends [0010](0010-the-app-chooses-its-language.md).**

The app's locale is a setting the reader makes and the app persists, `en` until they choose.
Every string a view-model writes comes from a **translation function** it is handed as an
argument, already bound to that locale. A view-model reads no global i18n state.

ADR-0010 said the app chooses its language and left open who chooses it and how the choice reaches
the code that writes sentences. Issue #155 had to answer both before the first translated string.

## What it binds

- **The setting.** `en` or `fr`, stored beside the SteamID with the same store and storage shape,
  changed from the setup screen. With nothing stored the app is in English and the stored value is
  `en`. The device's locale is never read, not even to seed the default.
- **The library.** `i18next` with `react-i18next` holds one message catalog per locale. Components
  reach it through the translation hook.
- **The view-models.** A function that builds a sentence takes a translation function bound to a
  locale (`i18n.getFixedT(locale)`) as a parameter. The `use-*` hooks obtain it from the hook and
  hand it down. A view-model stays pure: same input, same translation function, same output.
- **Numbers and dates.** They read the locale from the translation function they were given, so
  the decimal mark and the grouping follow the app and never the device (ADR-0010). Grouping keeps
  its thin space through one `formatNumber` wrapper around the function. `K` and `M` are not
  translated, as ADR-0010 already says; only the decimal mark before them changes, `45.5K` in
  English and `45,5K` in French.
- **Parity.** A test fails when a key or a plural category present in one catalog is missing from
  the other, or the reverse. Typing cannot guarantee it: plural categories differ per locale, and
  French has `many` where English has none.
- **Width.** The width model of ADR-0011 is unchanged. A test fails when a French form of
  `UnlockHeadline` has more characters than its English counterpart, so the promise of ADR-0011
  and ADR-0012 holds in both locales.

## Why the translation function is an argument

A view-model is tested by what it returns, and ADR-0010 already refuses a test whose result depends
on where it runs. A global instance moves the locale out of the call: the same call returns
different text depending on what some other test or screen last set, and a test has to reset shared
state to be honest. Passing the function keeps the locale in the call, as ADR-0010 wants it, at the
cost of one parameter carried down to the functions that write a sentence.

## Considered options

**Hand the view-model a locale code and let it call a global instance.** Rejected above: the locale
is written in the call to nothing, and suites can leak into one another.

**Have the view-model return keys and parameters, and let the component translate.** Rejected. It
moves the logic that assembles a sentence (which plural, which unit, which order) into the
components, and components are presentation only (ADR-0022).

**A typed dictionary of our own instead of a library.** Rejected because more locales are expected
after French. A library brings plural rules and formatting for locales nobody here will write by
hand. The price, that missing keys are caught by a test rather than by the compiler, is accepted.

**Follow the device locale for the default.** Rejected by ADR-0010's reasons, which nothing here
weakens.

## Consequences

A new formatting helper takes the translation function, or a locale it was given, and never
reads the device. A new locale is a new catalog that passes the parity test, plus a plural check
for the categories it needs; nothing in a view-model changes.

The component gallery sets the locale for every story through a toolbar global, `en` by default,
with a decorator that gives the story an i18n instance for that locale and does not mount the
SteamID store. The published gallery does not change on its own.

Not decided here: any locale beyond English and French, right-to-left layout, and the wording of
the French catalog, which is #157.
