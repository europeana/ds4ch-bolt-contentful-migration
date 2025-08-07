import * as cheerio from "cheerio";

import {
  mysqlClient,
  contentfulManagement,
  contentfulPreviewClient,
} from "../config.js";
import { pad, rightsFromAbbreviation, rightsFromTitle } from "../utils.js";
import { BlogPostingEntry } from "../models/BlogPostingEntry.js";
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

    try {
      const personEntry = await contentfulPreviewClient.getEntry(sysId);
      personEntries[authorId] = personEntry;
    } catch (e) {
      if (e.message === "The resource could not be found.") {
        // couldn't find it; nevermind
      } else {
        throw e;
      }
    }

    if (personEntries[authorId]) {
      pad.log(`  found: ${personEntries[authorId].fields.name}`);
      entry.author.push(personEntries[authorId].sys.id);
    } else {
      pad.log(`  [WARN] not found`);
    }
  }

  for (const tagSlug of post.taxonomy?.tags || []) {
    pad.log(`- looking up category entry for tag "${tagSlug}"`);

    if (!categoryEntries[tagSlug]) {
      const categoryEntryResponse = await contentfulPreviewClient.getEntries({
        content_type: "category",
        "fields.identifier": tagSlug,
      });

      if (categoryEntryResponse.total > 0) {
        // memoised to prevent duplicate lookups
        categoryEntries[tagSlug] = categoryEntryResponse.items[0];
      }
    }

    // TODO: use object.keys, and store even when the response was empty; same for authors
    if (categoryEntries[tagSlug]) {
      pad.log(`  found: ${categoryEntries[tagSlug].fields.name}`);
      entry.categories.push(categoryEntries[tagSlug].sys.id);
    } else {
      pad.log(`  [WARN] not found`);
    }
  }

  // NOTE: the intro may have had formatting via html, which is lost here
  if (coreField.intro?.[0]) {
    entry.description = cheerio.load(coreField.intro[0]).text();
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
  entry.hasPart = await createHasParts(otherFields, entry.name);

  await entry.createAndPublish();

  return entry;
};

export const createAll = async () => {
  const result = await mysqlClient.connection.execute(`
    select
      *
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
              and f.name='subsite'
          ) subsite
        from
          bolt_content c
        where
          content_type='posts'
          and published_at is not null
        order by
          published_at desc
      ) content
    where
      subsite is null
      or subsite='pro'
  `);
  const count = result[0].length;
  let i = 0;
  for (const row of result[0]) {
    i = i + 1;
    pad.log(`Post ${i}/${count}`);
    pad.increase();
    await createOne(row.id);
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

const createHasParts = async (fields, postTitle) => {
  pad.log("- create post sections");
  pad.increase();

  const hasPartSysIds = [];
  for (const field of fields || []) {
    let entryId;
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
      entryId = entry.sys.id;
      hasPartSysIds.push(entryId);
    } else if (field.image) {
      entryId = await createImageWithAttribution(
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
          entryId = entry.sys.id;
          hasPartSysIds.push(entryId);
        } else {
          pad.log(`[WARN] unable to get text and url for resource link`);
        }
      }
    } else {
      pad.log(`[WARN] unknown field w/ keys ${Object.keys(field)}`);
    }
  }

  pad.decrease();

  return hasPartSysIds;
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

  const imageTitle = attribution.title?.[0] || image.title || image.alt;
  const imageRights =
    rightsFromAbbreviation(attribution.license?.[0]?.trim()) ||
    // TODO: rm from title if found here?
    rightsFromTitle(imageTitle?.trim()) ||
    attribution.license;

  const asset = await loadOrCreateAssetForImage(filename, imageTitle);

  const entry = new ImageWithAttributionEntry();
  entry.image = asset?.sys?.id;
  entry.name = imageTitle;
  entry.license = imageRights;
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
