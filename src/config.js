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
