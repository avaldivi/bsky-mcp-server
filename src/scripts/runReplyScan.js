import { createServer } from "@ubos.tech/mcp";
import { createAgent } from "../utils/agent.js"; // Or wherever you initialize the Bsky agent
import { registerReplyScanTool } from "../tools/replyWatchTool.js";

const user = process.env.BLUESKY_IDENTIFIER;

const run = async () => {
  const server = createServer();
  const agent = await createAgent();

  registerReplyScanTool(server, agent);

  const tool = server.getTool("scan-replies");
  if (!tool) throw new Error("Tool not registered");

  const result = await tool.invoke({ user, sinceMinutes: null });
  console.log(result);
};

run().catch((err) => {
  console.error("💥 Error running reply scan:", err.message);
  process.exit(1);
});