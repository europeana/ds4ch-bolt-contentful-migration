import axios from "axios";

import { contentfulManagement, contentfulPreviewClient } from "./config.js";
import { LangMap, pad, hashedSysId } from "./utils.js";

const fileUrl = (fileName) => {
  return `https://pro.europeana.eu/files/${fileName.replaceAll(" ", "%20")}`;
};

export const loadOrCreateAssetForImage = async (fileName, title) => {
  pad.log(`- asset <${fileName}>`);
  pad.increase();
  let asset;

  try {
    const url = fileUrl(fileName);
    const assetId = await hashedSysId(url);

    asset = await loadAsset(assetId);
    if (asset) {
      pad.log(`[EXISTS] ${assetId}`);
    } else {
      await createAndPublish(assetId, url, title, fileName);
      asset = await loadAsset(assetId);
    }
  } catch (e) {
    pad.log(`[ERROR] ${e.message}`);
  }

  pad.decrease();
  return asset;
};

const loadAsset = async (assetId) => {
  try {
    const asset = await contentfulPreviewClient.getAsset(assetId);
    return asset;
  } catch {
    return null;
  }
};

const createAndPublish = async (id, url, title, fileName) => {
  const contentType = await getContentType(url);

  const assetData = {
    fields: {
      // Assets may not be published without a title. Fallback to file name.
      title: new LangMap(title || fileName.split("/").pop()),
      file: new LangMap({
        contentType,
        fileName,
        upload: url,
      }),
    },
  };

  let asset;
  try {
    asset = await contentfulManagement.environment.createAssetWithId(
      id,
      assetData,
    );

    const processedAsset = await asset.processForAllLocales();
    await processedAsset.publish();

    pad.log(`[NEW] ${asset.sys.id}`);
  } catch (e) {
    pad.log(`[ERROR] ${e.message}`);
    // process.exit(1);
  }
  return asset;
};

const getContentType = async (url) => {
  const response = await axios.head(url);
  return response.headers["content-type"];
};
