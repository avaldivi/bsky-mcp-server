import { z } from "zod";
import { scanReplies } from "./scanReplies.js";

export function registerReplyScanTool(server: any, agent: any) {
  server.tool(
    "scan-replies",
    "Check a user's recent posts with replies and respond to any reply with a rising sign.",
    {
      user: z.string().describe("The handle or DID of the user to scan (e.g., celestialdoses.bsky.social)"),
      sinceMinutes: z.number().optional().describe("Optional time window in minutes to check for recent posts"),
    },
    async ({ user, sinceMinutes }: {user: any, sinceMinutes: any}) => {
      return scanReplies(agent, user, sinceMinutes);
    }
  );
}