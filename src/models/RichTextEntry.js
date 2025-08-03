import * as cheerio from "cheerio";

import { Entry } from "./Entry.js";

export class RichTextEntry extends Entry {
  static get contentTypeId() {
    return "richText";
  }

  headlineFromText() {
    const html = cheerio.load(this.text);
    const h2Text = html("h2").first()?.text();
    return h2Text || html.text();
  }

  get fields() {
    return {
      headline: this.textField(
        this.headline ? this.headline : this.headlineFromText(),
        { max: 150 },
      ),
      text: this.longTextField(this.markdownTextField(this.text)),
    };
  }
}
