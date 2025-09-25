import * as cheerio from "cheerio";

import {
  mysqlClient,
  contentfulManagement,
  contentfulPreviewClient,
  tags,
} from "../config.js";
import { pad } from "../utils.js";
import { BlogPostingEntry } from "../models/BlogPostingEntry.js";
import { CategoryEntry } from "../models/CategoryEntry.js";
import { RichTextEntry } from "../models/RichTextEntry.js";
import { EmbedEntry } from "../models/EmbedEntry.js";
import { LinkEntry } from "../models/LinkEntry.js";
import { PersonEntry } from "../models/PersonEntry.js";
import { ImageWithAttributionEntry } from "../models/ImageWithAttributionEntry.js";
import { loadOrCreateAssetForImage } from "../attachments.js";

const categoryEntries = {};
const personEntries = {};

export const createOne = async (id) => {
  const post = await fetchOneContentEntry(id, "posts");

  const entry = new BlogPostingEntry();

  const fields = post.fields.sort((a, b) => a.order - b.order);

  const coreField = fields[0].data;
  const otherFields = fields.slice(1).map((field) => field.data);
  if (coreField.body) {
    otherFields.unshift({ body: coreField.body });
  }

  pad.log(`Creating entry for post: "${coreField.slug?.[0]}" [ID=${id}]`);

  entry.name = coreField.title?.[0] || post.title;
  entry.identifier = coreField.slug?.[0];
  entry.datePublished = post.published_at;
  entry.site = "dataspace-culturalheritage.eu";

  for (const authorId of coreField.authors || []) {
    const sysId = PersonEntry.sysIdFromMysqlId(authorId);
    pad.log(`- looking up person entry for author [ID=${authorId}]`);

    if (personEntries[authorId] === undefined) {
      try {
        const personEntry = await contentfulPreviewClient.getEntry(sysId);
        personEntries[authorId] = personEntry;
      } catch (e) {
        if (e.message === "The resource could not be found.") {
          personEntries[authorId] = null;
        } else {
          throw e;
        }
      }
    }

    if (personEntries[authorId] === null) {
      pad.log(`  [WARN] not found`);
    } else {
      pad.log(`  found: ${personEntries[authorId].fields.name}`);
      entry.author.push(personEntries[authorId].sys.id);
    }
  }

  pad.log("- link to categories");
  pad.increase();

  for (const tagSlug of Object.values(post.taxonomy || {})
    .flat()
    .filter(Boolean)) {
    pad.log(`- tag "${tagSlug}"`);
    pad.increase();

    const tagCategory = tags.find(
      (tag) => tag.identifier === tagSlug || tag.from?.includes(tag),
    );

    if (tagCategory) {
      pad.log("[KEEP]");

      pad.log(`- looking up category entry for tag "${tagSlug}"`);
      pad.increase();

      if (categoryEntries[tagSlug] === undefined) {
        const categoryEntryResponse = await contentfulPreviewClient.getEntries({
          content_type: "category",
          "fields.identifier": tagSlug,
        });

        if (categoryEntryResponse.total > 0) {
          // memoised to prevent duplicate lookups
          categoryEntries[tagSlug] = categoryEntryResponse.items[0];
          pad.log(`- found`);
        } else {
          // create one
          const categoryEntry = new CategoryEntry();
          categoryEntry.name = tagCategory.name;
          categoryEntry.identifier = tagCategory.identifier;
          await categoryEntry.createAndPublish();
          categoryEntries[tagSlug] = categoryEntry;
        }
      } else {
        pad.log(`- found`);
      }

      pad.decrease();

      entry.categories.push(categoryEntries[tagSlug].sys.id);
    } else {
      pad.log("[DROP]");
    }

    pad.decrease();
  }

  pad.decrease();

  // NOTE: the teaser may have had formatting via html, which is removed here
  if (coreField.teaser?.[0]) {
    entry.description = cheerio.load(coreField.teaser[0]).text();
  }

  if (coreField.intro?.[0]) {
    entry.introduction = coreField.intro[0];
  }

  entry.primaryImageOfPage = await createImageWithAttribution(
    coreField.image,
    {
      creator: coreField.image_attribution_creator,
      holder: coreField.image_attribution_holder,
      license: coreField.image_attribution_license,
      link: coreField.image_attribution_link,
      title: coreField.image_attribution_title,
    },
    true,
  );

  const { associatedMedia, hasPart } = await createOtherFields(
    otherFields,
    entry.name,
  );

  entry.hasPart = hasPart;
  entry.associatedMedia = associatedMedia;

  await entry.createAndPublish();

  return entry;
};

export const createAll = async () => {
  const postIds = await fetchPostIds();
  const count = postIds.length;

  let i = 0;
  for (const id of postIds) {
    i = i + 1;
    pad.log(`Post ${i}/${count}`);
    pad.increase();
    await createOne(id);
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

const createOtherFields = async (fields, postTitle) => {
  pad.log("- create fields");
  pad.increase();

  let hasPart = [];
  let associatedMedia = [];

  for (const field of fields || []) {
    if (field.body || field.selected_resources || field.image) {
      const sysId = await createHasPart(field, postTitle);
      if (sysId) {
        hasPart = hasPart.concat(sysId);
      }
    } else if (field.singlefile) {
      const sysId = await createAssociatedMedia(field);
      if (sysId) {
        associatedMedia = associatedMedia.concat(sysId);
      }
    } else {
      pad.log(`[WARN] unknown field w/ keys ${Object.keys(field)}`);
    }
  }

  pad.decrease();

  return {
    hasPart,
    associatedMedia,
  };
};

const createHasPart = async (field, postTitle) => {
  pad.log("- create post section");
  pad.increase();

  const hasPartSysIds = [];

  const publish =
    !Array.isArray(field.enabled) || field.enabled[0] === "enabled";

  if (field.body) {
    let entry;
    const bodyPart = field.body[0];

    if (/<(iframe|script)[ >]/.test(bodyPart)) {
      entry = new EmbedEntry();
      entry.name = `Embed for ${postTitle}`;
      entry.embed = bodyPart;
    } else if (bodyPart.includes("<lite-youtube ")) {
      const videoid = bodyPart.match(/videoid="([^"]+)"/)[1];
      entry = new EmbedEntry();
      entry.name = `YouTube embed for ${postTitle}`;
      entry.embed = `<iframe src="https://www.youtube.com/embed/${videoid}" title="YouTube"></iframe>`;
    } else if (bodyPart.includes("<lite-vimeo ")) {
      const videoid = bodyPart.match(/videoid="([^"]+)"/)[1];
      entry = new EmbedEntry();
      entry.name = `Vimeo embed for ${postTitle}`;
      entry.embed = `<iframe src="https://player.vimeo.com/video/${videoid}" title="Vimeo"></iframe>`;
    } else {
      entry = new RichTextEntry();
      // const text = await linkAttributesToContentful(part.content);
      entry.text = bodyPart;
    }

    await (publish ? entry.createAndPublish() : entry.create());

    hasPartSysIds.push(entry.sys.id);
  } else if (field.selected_resources) {
    for (const resourceId of field.selected_resources) {
      const resource = await fetchOneContentEntry(resourceId, "resources");
      const resourceData = resource.fields.find(
        (field) => field.order === null,
      )?.data;

      const entry = new LinkEntry();
      entry.text = resourceData?.buttontext?.[0];
      entry.url = resourceData?.htmllink?.[0];

      if (entry.text && entry.url) {
        await (publish ? entry.createAndPublish() : entry.create());
        hasPartSysIds.push(entry.sys.id);
      } else {
        pad.log(`[WARN] unable to get text and url for resource link`);
      }
    }
  } else if (field.image) {
    const entryId = await createImageWithAttribution(
      field.image,
      {
        creator: field.attribution_creator,
        holder: field.attribution_holder,
        license: field.attribution_license,
        link: field.attribution_link,
        title: field.attribution_title,
      },
      publish,
    );
    if (entryId) {
      hasPartSysIds.push(entryId);
    }
  } else {
    pad.log(`[WARN] ignoring field w/ keys ${Object.keys(field)}`);
  }

  pad.decrease();

  return hasPartSysIds;
};

const createAssociatedMedia = async (field) => {
  pad.log("- create post associated media");
  pad.increase();

  const associatedMediaSysIds = [];

  // TODO: selectively publish asset?
  // const publish =
  //   !Array.isArray(field.enabled) || field.enabled[0] === "enabled";

  if (field.singlefile) {
    const filename = field.singlefile.filename || field.singlefile.file;
    const asset = await loadOrCreateAssetForImage(
      filename,
      field.singlefile.title,
    );
    associatedMediaSysIds.push(asset?.sys?.id);
  } else {
    pad.log(`[WARN] ignoring field w/ keys ${Object.keys(field)}`);
  }

  pad.decrease();

  return associatedMediaSysIds;
};

const createImageWithAttribution = async (
  image,
  attribution = {},
  publish = true,
) => {
  const filename = image?.filename || image?.file;
  if (!filename) {
    pad.log("- no image file");
    return null;
  }

  const imageTitle = attribution.title?.[0] || image.title;

  const asset = await loadOrCreateAssetForImage(
    filename,
    imageTitle,
    image.alt,
  );

  const entry = new ImageWithAttributionEntry();
  entry.image = asset?.sys?.id;
  entry.name = imageTitle;
  entry.license = attribution.license?.[0];
  entry.creator = attribution.creator?.[0];
  entry.provider = attribution.holder?.[0];
  entry.url = attribution.link?.[0];

  try {
    await (publish ? entry.createAndPublish() : entry.create());
  } catch (e) {
    if (e.name === "InvalidEntry") {
      pad.increase();
      pad.log(`  [WARN] ${e.name}`);
      pad.decrease();
    } else {
      throw e;
    }
  }

  return entry.sys.id;
};

export const fetchPostIds = async () => {
  let limit = "";
  if (
    process.env.MIGRATE_POSTS_LIMIT &&
    Number.isInteger(Number(process.env.MIGRATE_POSTS_LIMIT))
  ) {
    limit = `limit ${process.env.MIGRATE_POSTS_LIMIT}`;
  }
  let offset = "";
  if (
    process.env.MIGRATE_POSTS_OFFSET &&
    Number.isInteger(Number(process.env.MIGRATE_POSTS_OFFSET))
  ) {
    offset = `offset ${process.env.MIGRATE_POSTS_OFFSET}`;
  }

  const result = await mysqlClient.connection.execute(`
    select
      id
    from
      (
        select
          c.id,
          (
            select
              JSON_EXTRACT(ft.value, '$[0]')
            from
              bolt_field f
              inner join bolt_field_translation ft on f.id=ft.translatable_id
            where
              f.content_id=c.id
              and f.name='posttype'
          ) posttype,
          (
            select
              JSON_EXTRACT(ft.value, '$[0]')
            from
              bolt_field f
              inner join bolt_field_translation ft on f.id=ft.translatable_id
            where
              f.content_id=c.id
              and f.name='subsite'
          ) subsite
        from
          bolt_content c
        where
          content_type='posts'
          and published_at is not null
          and published_at > '2018-09-01'
        order by
          published_at desc
      ) content
    where
      (subsite is null or subsite='pro')
      and posttype <> 'Publication'
    ${limit}
    ${offset}
  `);

  return result[0].map((row) => row.id);
};

const fetchOneContentEntry = async (id, contentType) => {
  const result = await mysqlClient.connection.execute(
    `
    select
      c.id content_id,
      c.title,
      c.published_at,
      (
        select JSON_ARRAYAGG(fields) from
        (
          select
            f.content_id content_id,
            JSON_OBJECT(
              'order', pf.sortorder,
              'data', JSON_OBJECTAGG(f.name, JSON_EXTRACT(ft.value, '$'))
            ) fields

          from
            bolt_field f
            inner join bolt_field_translation ft on f.id=ft.translatable_id
            left join bolt_field pf on f.parent_id=pf.id

          where
            c.id=f.content_id
            and ft.value <> '[""]'

          group by
            pf.id

          order by
            pf.sortorder asc
        ) content_body
        group by content_id
      ) fields,
      (
        select JSON_OBJECTAGG(type, slugs) from
        (
          select
            c.id, t.type, JSON_ARRAYAGG(t.slug) slugs

          from
            bolt_taxonomy_content tc
            inner join bolt_taxonomy t on tc.taxonomy_id=t.id

          where
            c.id=tc.content_id
            and t.slug <> ''

          group by c.id, t.type
        ) content_taxonomies
        group by id
      ) taxonomy

    from
      bolt_content c

    where
      c.content_type=?
      and c.published_at is not null
      and c.id=?
  `,
    [contentType, id],
  );

  return result[0][0];
};
