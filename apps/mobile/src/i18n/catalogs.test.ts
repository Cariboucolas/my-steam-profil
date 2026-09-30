import type { Catalog } from "./catalogs/catalog";
import { CATALOGS } from "./i18n";
import { LOCALES, type Locale } from "./locale";

type Node = Catalog | readonly string[] | string;

/** i18next's plural suffixes, which are CLDR's category names. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Every leaf string, by dotted path: `library.gamesCounted_one`, `date.months.0`. */
const leaves = (node: Node, path = ""): string[] => {
  if (typeof node === "string") return [path];
  const entries: [string, Node][] = Array.isArray(node)
    ? node.map((child, index) => [String(index), child])
    : Object.entries(node);
  return entries.flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
};

const keysOf = (locale: Locale): string[] => leaves(CATALOGS[locale]);

/**
 * What `locale` must hold, given every key any locale writes: a plain key as
 * itself, a plural key as one form per category that locale needs.
 */
const requiredBy = (locale: Locale): string[] => {
  const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
  const written = LOCALES.flatMap(keysOf);
  const plural = new Set(
    written.filter((key) => PLURAL_SUFFIX.test(key)).map((key) => key.replace(PLURAL_SUFFIX, "")),
  );
  const bases = new Set(written.map((key) => key.replace(PLURAL_SUFFIX, "")));
  return [...bases].flatMap((base) =>
    plural.has(base) ? categories.map((category) => `${base}_${category}`) : [base],
  );
};

describe("message catalogs", () => {
  it("differ in plural categories, which is why the keys of one cannot stand for both", () => {
    const categoriesOf = (locale: Locale) =>
      [...new Intl.PluralRules(locale).resolvedOptions().pluralCategories].sort();

    expect(categoriesOf("en")).toEqual(["one", "other"]);
    expect(categoriesOf("fr")).toEqual(["many", "one", "other"]);
  });

  it.each(LOCALES)("%s holds every key and plural form the app writes, and no orphan", (locale) => {
    expect(keysOf(locale).sort()).toEqual(requiredBy(locale).sort());
  });

  it("would notice a French form gone missing", () => {
    const withoutMany = keysOf("fr").filter((key) => key !== "library.gamesCounted_many");

    expect(withoutMany.sort()).not.toEqual(requiredBy("fr").sort());
  });
});
