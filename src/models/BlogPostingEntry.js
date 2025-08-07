import { Entry } from "./Entry.js";

export class BlogPostingEntry extends Entry {
  static get contentTypeId() {
    return "blogPosting";
  }

  constructor(sys = {}) {
    super(sys);
    this.author = [];
    this.categories = [];
    this.hasPart = [];
  }

  get fields() {
    return {
      author: this.linkField(this.author),
      categories: this.linkField(this.categories),
      datePublished: this.dateField(this.datePublished),
      description: this.shortTextField(this.description),
      hasPart: this.linkField(this.hasPart),
      identifier: this.shortTextField(this.identifier),
      introduction: this.textField(
        this.markdownTextField(this.introduction),
        { max: 550 },
      ),
      name: this.shortTextField(this.name),
      site: this.shortTextField(this.site),
      primaryImageOfPage: this.linkField(this.primaryImageOfPage),
    };
  }
}
