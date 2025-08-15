import mysql from "mysql2/promise";
import contentfulManagementModule from "contentful-management";
import * as contentful from "contentful";
import TurndownService from "turndown";

export const maxLengthShort = 255;
export const maxLengthLong = 50000;
export const defaultLocale = "en-GB";

export const mysqlClient = {
  async connect() {
    const connection = await mysql.createConnection(process.env["MYSQL_URL"]);
    this.connection = connection;
    return connection;
  },
};

export const contentfulManagement = {
  async connect() {
    const client = await contentfulManagementModule.createClient({
      accessToken: process.env["CTF_CMA_ACCESS_TOKEN"],
    });
    const space = await client.getSpace(process.env["CTF_SPACE_ID"]);
    const environment = await space.getEnvironment(
      process.env["CTF_ENVIRONMENT_ID"],
    );
    this.environment = environment;
    return environment;
  },
};

export const contentfulPreviewClient = contentful.createClient({
  accessToken: process.env["CTF_CPA_ACCESS_TOKEN"],
  space: process.env["CTF_SPACE_ID"],
  environment: process.env["CTF_ENVIRONMENT_ID"],
  host: "preview.contentful.com",
});

export const turndownService = new TurndownService();
turndownService.keep(["cite"]);

export const tags = [
  { identifier: "europeanatech", name: "EuropeanaTech" },
  { identifier: "3d", name: "3D" },
  { identifier: "copyright", name: "copyright" },
  { identifier: "impact", name: "impact", from: ["impactplaybook"] },
  {
    identifier: "aggregators-forum",
    name: "Aggregators Forum",
    from: ["aggregation"],
  },
  { identifier: "diversity-and-inclusion", name: "diversity and inclusion" },
  { identifier: "artificial-intelligence", name: "artificial intelligence" },
  { identifier: "digital-storytelling", name: "digital storytelling" },
  {
    identifier: "womens-history",
    name: "women's history",
    from: ["womens-history-month"],
  },
  { identifier: "twin-it", name: "Twin it!" },
  { identifier: "europeana-communicators", name: "Europeana Communicators" },
  { identifier: "new-professionals", name: "new professionals" },
  { identifier: "members-council", name: "Members Council" },
  { identifier: "black-history", name: "Black history" },
  { identifier: "conference", name: "conference" },
  { identifier: "europeana-foundation", name: "Europeana Foundation" },
  { identifier: "tourism", name: "Tourism" },
  { identifier: "presidency", name: "presidency" },
  { identifier: "elections", name: "elections" },
  { identifier: "built-with-bits", name: "Built with Bits" },
  { identifier: "public-domain", name: "Public Domain" },
  { identifier: "annual-report", name: "annual report" },
  { identifier: "audiovisual-heritage", name: "audiovisual heritage" },
  { identifier: "gif-it-up", name: "GIF IT UP" },
  { identifier: "business-plan", name: "business plan" },
  { identifier: "close-encounters-with-ai", name: "Close Encounters with AI" },
  { identifier: "internships", name: "internships" },
  { identifier: "funding", name: "funding" },
  // { identifier: "", name: "" },
];
