import { AtpAgent, AppBskyFeedDefs } from "@atproto/api";
import { cleanHandle, mcpErrorResponse, mcpSuccessResponse } from "../utils.js";
import { handleRisingReply } from "./handleRisingReply.js";
import { loadCache, isCached, addToCache } from "./cache.js";

const RISING_REGEX = /aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces/i;

function isThreadViewPost(thread: any): thread is AppBskyFeedDefs.ThreadViewPost {
  return thread?.$type === "app.bsky.feed.defs#threadViewPost";
}

export async function scanReplies(agent: AtpAgent, user: string, sinceMinutes: number | null = null) {
  if (!agent) {
    return mcpErrorResponse("Not connected to Bluesky. Check your environment variables.");
  }

  loadCache();

  try {
    const profileRes = await agent.getProfile({ actor: cleanHandle(user) });
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
      const feedRes: any = await agent.app.bsky.feed.getAuthorFeed({
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

      const threadRes = await agent.app.bsky.feed.getPostThread({ uri: item.post.uri });
      if (!threadRes.success) continue;

      const thread = threadRes.data.thread;

			let replies: any[] = [];
			if (isThreadViewPost(thread)) {
				replies = thread.replies || [];
			}

      for (const reply of replies) {
        const replyText = reply?.post?.record?.text;
        const replyUri = reply?.post?.uri;

        if (!replyText || !replyUri || !RISING_REGEX.test(replyText)) continue;
        if (isCached(replyUri)) continue;

        const replyThreadRes = await agent.app.bsky.feed.getPostThread({ uri: replyUri });
        if (!replyThreadRes.success) continue;

        let existingReplies: any[] = [];
				if (isThreadViewPost(replyThreadRes.data.thread)) {
					existingReplies = replyThreadRes.data.thread.replies || [];
				}
        const alreadyReplied = existingReplies.some((r: any) =>
          r?.post?.author?.did === agent.session?.did
        );

        if (alreadyReplied) {
          addToCache(replyUri);
          continue;
        }

        try {
          const res = await handleRisingReply({ text: replyText, replyTo: replyUri, agent });
          successfulReplies.push(res.uri);
          addToCache(replyUri);
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