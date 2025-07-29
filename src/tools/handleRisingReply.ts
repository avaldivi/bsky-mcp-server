import fetch from 'node-fetch';
import { AtpAgent } from "@atproto/api";

export async function handleRisingReply({
  text,
  replyTo,
  agent,
}: {
  text: string;
  replyTo?: string;
  agent: AtpAgent;
}): Promise<{ uri: string }> {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];

  const risingSign = signs.find(sign =>
    text.toLowerCase().includes(sign.toLowerCase())
  );

  if (!risingSign) throw new Error("Could not extract a valid rising sign from the input.");

  const moonRes = await fetch('http://localhost:3000/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ risingSign }),
  });

  if (!moonRes.ok) {
    throw new Error(`Moon bot API failed: ${moonRes.status}`);
  }

  const { message }: any = await moonRes.json();
  const postContent = message || "Here's your Moon update 🌕";

  const record: any = {
    text: postContent,
    createdAt: new Date().toISOString(),
  };

  if (replyTo) {
    const cidResponse = await agent.app.bsky.feed.getPostThread({ uri: replyTo });
    if (!cidResponse.success) {
      throw new Error('Could not get post information');
    }

    const threadPost = cidResponse.data.thread as any;
    const parentUri = threadPost.post.uri;
    const parentCid = threadPost.post.cid;

    const rootUri = threadPost.post?.record?.reply?.root?.uri || parentUri;
    const rootCid = threadPost.post?.record?.reply?.root?.cid || parentCid;

    record.reply = {
      parent: { uri: parentUri, cid: parentCid },
      root: { uri: rootUri, cid: rootCid },
    };
  }

  const response = await agent.post(record);
  return { uri: response.uri };
}