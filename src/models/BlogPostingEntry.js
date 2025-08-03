import { Entry } from "./Entry.js";

export class BlogPostingEntry extends Entry {
  static get contentTypeId() {
    return "blogPosting";
  }

  constructor(sys = {}) {
    super(sys);
    this.hasPart = [];
    this.author = [];
  }

  get fields() {
    return {
      author: this.linkField(this.author),
      datePublished: this.dateField(this.datePublished),
      description: this.shortTextField(this.description),
      // genre: this.shortTextField(this.genre),
      hasPart: this.linkField(this.hasPart),
      identifier: this.shortTextField(this.identifier),
      // keywords: this.shortTextField(this.keywords),
      name: this.shortTextField(this.name),
      site: this.shortTextField(this.site),
      primaryImageOfPage: this.linkField(this.primaryImageOfPage),
    };
  }
}
