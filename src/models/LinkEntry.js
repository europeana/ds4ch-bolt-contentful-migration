import { Entry } from "./Entry.js";

export class LinkEntry extends Entry {
  static get contentTypeId() {
    return "link";
  }

  get fields() {
    return {
      text: this.shortTextField(this.text),
      url: this.longTextField(this.url),
    };
  }
}
