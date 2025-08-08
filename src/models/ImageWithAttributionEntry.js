import { Entry } from "./Entry.js";
import { rightsFromAbbreviation, rightsFromTitle } from "../utils.js";

export class ImageWithAttributionEntry extends Entry {
  static get contentTypeId() {
    return "imageWithAttribution";
  }

  normaliseUrl(langMap) {
    return this.constructor.typecastOneOrMany(langMap, (value) => {
      if (typeof value !== "string") return value;

      const itemIdMatch = value.match(
        /europeana\.eu(\/portal)?\/([a-z][a-z]\/)?(record|item)(\/[0-9]+\/[^/.#$]+)/,
      );
      if (itemIdMatch) {
        return `http://data.europeana.eu/item${itemIdMatch[4]}`;
      }

      if (value.startsWith("www.")) {
        return `https://${value}`;
      }

      return value.startsWith("http://") || value.startsWith("https://")
        ? value
        : null;
    });
  }

  get fields() {
    let title = this.name;
    let rights = rightsFromAbbreviation(this.license?.trim());

    if (!rights) {
      const fromTitle = rightsFromTitle(this.name?.trim());
      if (fromTitle) {
        rights = fromTitle.rights;
        title = fromTitle.title;
      }
    }

    return {
      name: this.shortTextField(title),
      image: this.image ? this.linkField(this.image, "Asset") : null,
      creator: this.shortTextField(this.creator),
      provider: this.shortTextField(this.provider),
      license: this.shortTextField(rights || this.license),
      url: this.longTextField(this.normaliseUrl(this.trimField(this.url))),
    };
  }
}
