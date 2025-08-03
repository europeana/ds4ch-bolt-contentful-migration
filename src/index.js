import "dotenv/config";

import * as actions from "./actions/index.js";

const act = async (action, args) => {
  if (!Object.keys(actions).includes(action)) {
    throw new Error(`Unknown action: ${action}`);
  }

  actions[action].cli(args);
};

const action = process.argv[2];
try {
  act(action, process.argv.slice(3));
} catch (e) {
  console.log(`ERROR: ${e.message}`);
  process.exit(1);
}
