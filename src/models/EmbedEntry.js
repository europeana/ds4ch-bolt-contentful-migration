import { Entry } from "./Entry.js";

export class EmbedEntry extends Entry {
  static TRANSLATE = false;

  static get contentTypeId() {
    return "embed";
  }

  get fields() {
    return {
      // FIXME: default to something more informative of context. url from embed?
      name: this.shortTextField(this.name || "Blog post embed"),
      embed: this.longTextField(this.embed),
    };
  }
}
