import { z } from "zod";
import { cleanHandle, mcpErrorResponse, mcpSuccessResponse } from "../utils.js";
import { handleRisingReply } from "./handleRisingReply.js";
import {
  loadCache,
  isCached,
  addToCache
} from "./cache.js";

const RISING_REGEX = /aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces/i;

export function registerReplyScanTool(server: any, agent: any) {
  server.tool(
    "scan-replies",
    "Check a user's recent posts with replies and respond to any reply with a rising sign.",
    {
      user: z.string().describe("The handle or DID of the user to scan (e.g., celestialdoses.bsky.social)"),
      sinceMinutes: z.number().optional().describe("Optional time window in minutes to check for recent posts (e.g., 30)"),
    },
    async ({ user, sinceMinutes }: { user: any, sinceMinutes: any }) => {
      if (!agent) {
        return mcpErrorResponse("Not connected to Bluesky. Check your environment variables.");
      }

      const currentAgent = agent;
      loadCache(); // ⬅️ Load the file-based cache

      try {
        const profileRes = await currentAgent.getProfile({ actor: cleanHandle(user) });
        if (!profileRes.success) {
          return mcpErrorResponse(`User not found: ${user}`);
        }

        const MAX_TOTAL_POSTS = 500;
        const did = profileRes.data.did;
        const allPosts = [];
        let cursor;
        const now = new Date();
        const targetDate = sinceMinutes ? new Date(now.getTime() - sinceMinutes * 60000) : null;

        while (allPosts.length < MAX_TOTAL_POSTS) {
          const feedRes: any = await currentAgent.app.bsky.feed.getAuthorFeed({
            actor: did,
            limit: 100,
            cursor,
          });

          if (!feedRes.success) break;

          let filtered = feedRes.data.feed;

          if (targetDate) {
            filtered = filtered.filter((post: any) => {
              const created = post?.post?.record?.createdAt;
              return created ? new Date(created) >= targetDate : false;
            });
          }

          allPosts.push(...filtered);

          cursor = feedRes.data.cursor;
          if (!cursor) break;

          const oldest = feedRes.data.feed[feedRes.data.feed.length - 1]?.post?.record?.createdAt;
          if (targetDate && oldest && new Date(oldest) < targetDate) break;
        }

        const successfulReplies = [];

        for (const item of allPosts) {
          if (!item?.post?.replyCount || item.post.replyCount < 1) continue;

          const threadRes = await currentAgent.app.bsky.feed.getPostThread({ uri: item.post.uri });
          if (!threadRes.success) continue;

          const thread = threadRes.data.thread;
          const replies = thread?.replies || [];

          for (const reply of replies) {
            const replyText = reply?.post?.record?.text;
            const replyUri = reply?.post?.uri;

            if (!replyText || !replyUri || !RISING_REGEX.test(replyText)) continue;

            // ✅ Skip if cached
            if (isCached(replyUri)) {
              console.log(`⏩ Already replied to (cached): ${replyUri}`);
              continue;
            }

            // Also check in thread for extra safety (in case cache lost)
            const replyThreadRes = await currentAgent.app.bsky.feed.getPostThread({ uri: replyUri });
            if (!replyThreadRes.success) continue;

            const existingReplies = replyThreadRes.data.thread?.replies || [];

            const alreadyReplied = existingReplies.some((r: any) =>
              r?.post?.author?.did === currentAgent.session?.did
            );

            if (alreadyReplied) {
              console.log(`⏩ Already replied to (confirmed): ${replyUri}`);
              addToCache(replyUri); // ⬅️ Add to cache so it’s skipped next run
              continue;
            }

            try {
              const res = await handleRisingReply({ text: replyText, replyTo: replyUri, agent: currentAgent });
              successfulReplies.push(res.uri);

              addToCache(replyUri); // ⬅️ Add to cache after success
            } catch (err: any) {
              console.warn("❌ Failed to reply to:", replyUri, err.message);
            }
          }
        }

        return mcpSuccessResponse(`✅ Replied to ${successfulReplies.length} rising sign replies.`);
      } catch (error) {
        return mcpErrorResponse(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
