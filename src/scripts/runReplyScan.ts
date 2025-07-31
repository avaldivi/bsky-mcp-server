import { createServer } from "../mcp/createServer.js";
import { createAgent } from "../mcp/createAgent.js";
import { registerReplyScanTool } from "../tools/replyWatchTool.js";

(async () => {
	const server = createServer();
	const agent = await createAgent();

	if (!agent) {
		console.error("❌ Could not log in to Bluesky.");
		process.exit(1);
	}

	registerReplyScanTool(server, agent);

	// const tool = server.tool("scan-replies");
	// if (!tool) {
	// 	console.error("❌ Tool not registered.");
	// 	process.exit(1);
	// }

	// const result = await tool.invoke({
	// 	user: process.env.BLUESKY_IDENTIFIER,
	// 	sinceMinutes: null
	// });

	console.log("✅ function ran");
})();