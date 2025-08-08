import { Entry } from "./Entry.js";

export class LinkEntry extends Entry {
  static get contentTypeId() {
    return "link";
  }

  get fields() {
    // handle a few links missing scheme
    let url = this.url;
    if (!url.includes('://')) {
      if (url.startsWith('www.')) {
        url = `http://${url}`;
      } else if (url.includes('@')) {
        url = `mailto://${url}`;
      }
    }
    return {
      text: this.shortTextField(this.text),
      url: this.longTextField(url),
    };
  }
}
