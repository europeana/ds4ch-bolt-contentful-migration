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

export const supportedLocales = [
  "bg-BG",
  "cs-CZ",
  "da-DK",
  "de-DE",
  "el-GR",
  "es-ES",
  "et-EE",
  "fi-FI",
  "fr-FR",
  "ga-IE",
  "hr-HR",
  "hu-HU",
  "it-IT",
  "lt-LT",
  "lv-LV",
  "mt-MT",
  "nl-NL",
  "pl-PL",
  "pt-PT",
  "ro-RO",
  "sk-SK",
  "sl-SI",
  "sv-SE",
];

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
  { identifier: "education", name: "education" },
  { identifier: "academic-research", name: "academic research" },
  { identifier: "network", name: "network" },
  { identifier: "sport", name: "sport" },
  { identifier: "covid-19", name: "COVID-19" },
  { identifier: "new-european-bauhaus", name: "New European Bauhaus" },
  { identifier: "industrial-heritage", name: "industrial heritage" },
  { identifier: "open-access", name: "open access" },
  { identifier: "low-code-fest", name: "Low Code Fest" },
  { identifier: "ukraine", name: "Ukraine" },
  { identifier: "climate-action", name: "Climate Action" },
  {
    identifier: "europeana-2019",
    name: "Europeana 2019",
    from: ["europeana2019"],
  },
  { identifier: "europeana-2022", name: "Europeana 2022" },
  { identifier: "europeana-2025", name: "Europeana 2025" },
  {
    identifier: "europeanatech-2023",
    name: "EuropeanaTech 2023",
    from: ["europeanatech2023"],
  },
  { identifier: "europeana-2020", name: "Europeana 2020" },
  { identifier: "api", name: "API" },
  { identifier: "reuse", name: "reuse" },
  { identifier: "latvia", name: "Latvia" },
  { identifier: "denmark", name: "Denmark" },
  { identifier: "norway", name: "Norway" },
  { identifier: "luxembourg", name: "Luxembourg" },
  { identifier: "lithuania", name: "Lithuania" },
  { identifier: "estonia", name: "Estonia" },
  { identifier: "cyprus", name: "Cyprus" },
  { identifier: "austria", name: "Austria" },
  { identifier: "malta", name: "Malta" },
  { identifier: "hungary", name: "Hungary" },
  { identifier: "croatia", name: "Croatia" },
  { identifier: "extended-reality", name: "Extended Reality" },
  { identifier: "multilinguality", name: "multilinguality" },
  { identifier: "ireland", name: "Ireland" },
  { identifier: "translation", name: "translation" },
  { identifier: "portugal", name: "Portugal" },
  { identifier: "germany", name: "Germany" },
  { identifier: "greece", name: "Greece" },
  { identifier: "italy", name: "Italy" },
  { identifier: "poland", name: "Poland" },
  { identifier: "france", name: "France" },
  { identifier: "serbia", name: "Serbia" },
  { identifier: "moldova", name: "Moldova" },
  { identifier: "spain", name: "Spain" },
  { identifier: "slovenia", name: "Slovenia" },
  { identifier: "bulgaria", name: "Bulgaria" },
  { identifier: "finland", name: "Finland" },
  { identifier: "romania", name: "Romania" },
  { identifier: "wales", name: "Wales" },
  { identifier: "uk", name: "UK" },
];
