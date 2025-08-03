import { Entry } from "./Entry.js";
import { hashedSysId } from "../utils.js";

export class PersonEntry extends Entry {
  static get contentTypeId() {
    return "person";
  }

  static sysIdFromMysqlId(id) {
    return hashedSysId(`person.${id}@pro.europeana.eu`);
  }

  get fields() {
    return {
      name: this.shortTextField(this.name),
      affiliation: this.shortTextField(this.affiliation),
      url: this.shortTextField(this.url),
    };
  }
}
