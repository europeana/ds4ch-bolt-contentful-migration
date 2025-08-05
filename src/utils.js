import crypto from "crypto";

import { defaultLocale } from "./config.js";

export const pad = {
  depth: 0,
  increase() {
    this.depth = this.depth + 1;
  },
  decrease() {
    this.depth = this.depth - 1;
  },
  log(msg) {
    const prefix = "  ".repeat(this.depth);
    console.log(`${prefix}${msg}`);
  },
};

export const hashedSysId = (guid) => {
  return guid ? crypto.createHash("md5").update(guid).digest("hex") : null;
};

export class LangMap {
  constructor(value, locale = defaultLocale) {
    if (value) this[locale] = value;
  }

  isEmpty() {
    const keys = Object.keys(this);
    if (keys.length === 0) return true;
    if (keys.length === 1 && keys[0] === defaultLocale && !this[keys[0]])
      return true;
    return false;
  }
}

const rightsAbbreviationDefinitions = [
  {
    abbr: ["CC0"],
    rights: "http://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    abbr: ["CC-BY"],
    rights: "http://creativecommons.org/licenses/by/4.0/",
  },
  {
    abbr: ["CC-BY-NC", "CC BY-NC"],
    rights: "http://creativecommons.org/licenses/by-nc/4.0/",
  },
  {
    abbr: ["CC-BY-NC-ND", "CC BY-NC-ND"],
    rights: "http://creativecommons.org/licenses/by-nc-nd/4.0/",
  },
  {
    abbr: ["CC-BY-NC-SA", "CC BY-NC-SA"],
    rights: "http://creativecommons.org/licenses/by-nc-sa/4.0/",
  },
  {
    abbr: ["CC-BY-ND", "CC BY-ND"],
    rights: "http://creativecommons.org/licenses/by-nd/4.0/",
  },
  {
    abbr: ["CC-BY-SA", "CC BY-SA"],
    rights: "http://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    abbr: ["Public-Domain", "Public Domain", "public domain"],
    rights: "http://creativecommons.org/publicdomain/mark/1.0/",
  },
  {
    abbr: ["Copyright not evaluated"],
    rights: "http://rightsstatements.org/vocab/CNE/1.0/",
  },
  {
    abbr: ["In Copyright", "In copyright", "in copyright", "©"],
    rights: "http://rightsstatements.org/vocab/InC/1.0/",
  },
];

export const rightsFromAbbreviation = (abbr) =>
  rightsAbbreviationDefinitions.find((def) => def.abbr.includes(abbr))?.rights;

export const rightsFromTitle = (title) => {
  // count how many different rights statement abbreviations occur
  const rightsInTitle = rightsAbbreviationDefinitions.reduce((memo, def) => {
    if (
      def.abbr.some((abbr) =>
        new RegExp(`(^|[( ])${abbr}([., )]|$)`).test(title),
      )
    ) {
      memo.push(def.rights);
    }
    return memo;
  }, []);

  // if only one, infer that it is the one to apply; else too ambiguous
  if (rightsInTitle.length === 1) {
    return rightsInTitle[0];
  }
};
