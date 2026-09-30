/** One locale's wording: nested keys, and a plural key per category as `key_one`, `key_other`. */
export type Catalog = { readonly [key: string]: string | readonly string[] | Catalog };
