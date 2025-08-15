import { Entry } from "./Entry.js";

export class CategoryEntry extends Entry {
  static get contentTypeId() {
    return "category";
  }

  get fields() {
    return {
      name: this.shortTextField(this.name),
      identifier: this.shortTextField(this.identifier),
    };
  }
}
