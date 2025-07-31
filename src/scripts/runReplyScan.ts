import { createServer } from "../mcp/createServer.js";
import { createAgent } from "../mcp/createAgent.js";
import { scanReplies } from "../tools/scanReplies.js";

(async () => {
  const agent = await createAgent();

  if (!agent) {
    console.error("❌ Could not log in to Bluesky.");
    process.exit(1);
  }

  const result = await scanReplies(agent, process.env.BLUESKY_IDENTIFIER!, null);
  console.log(result);
})();