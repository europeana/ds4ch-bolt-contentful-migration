import { mysqlClient, contentfulManagement } from "../config.js";
import { pad } from "../utils.js";
import { PersonEntry } from "../models/PersonEntry.js";

export const createOne = async (id) => {
  pad.log(`Creating entry for person: ${id}`);

  const result = await mysqlClient.connection.execute(
    `
    select
      JSON_OBJECTAGG(f.name, JSON_EXTRACT(ft.value, '$[0]')) fields

    from
      bolt_content persons
      inner join bolt_field f on persons.id=f.content_id
      inner join bolt_field_translation ft on f.id=ft.translatable_id

    where
      persons.content_type='persons'
      and f.name in ('first_name', 'last_name', 'company')
      and persons.id=?

    group by
      persons.id
  `,
    [id],
  );

  const person = result[0][0];
  if (!person) {
    pad.log("  [WARN] no person content entry found");
    return;
  }

  const sysId = PersonEntry.sysIdFromMysqlId(id);
  const entry = new PersonEntry({ id: sysId });

  entry.name = `${person.fields.first_name} ${person.fields.last_name}`;
  entry.affiliation = person.fields.company;

  await entry.createAndPublish();

  return entry;
};

export const createAll = async () => {
  const result = await mysqlClient.connection.execute(`
    select
      distinct authors.author_id

    from
      bolt_content c
      inner join bolt_field f on c.id=f.content_id
      inner join bolt_field_translation ft on f.id=ft.translatable_id
      inner join JSON_TABLE(
        ft.value,
        '$[*]'
        COLUMNS(
          author_id INT PATH '$'
        )
      ) authors

    where
      c.content_type='posts'
      and f.name='authors'
      and authors.author_id is not null

    order by
      authors.author_id asc
  `);
  const count = result[0].length;
  let i = 0;
  for (const row of result[0]) {
    i = i + 1;
    pad.log(`Author ${i}/${count}`);
    pad.increase();
    await createOne(row.author_id);
    pad.decrease();
  }
};

export const cli = async (args) => {
  await contentfulManagement.connect();
  await mysqlClient.connect();

  if (args[0]) {
    await createOne(args[0]);
  } else {
    await createAll();
  }

  await mysqlClient.connection.end();
};
