import { AtpAgent } from "@atproto/api";

export async function createAgent(): Promise<AtpAgent | null> {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;
  const service = process.env.BLUESKY_SERVICE_URL || "https://bsky.social";

  if (!identifier || !password) {
    console.error("BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD must be set");
    return null;
  }

  const agent = new AtpAgent({ service });

  try {
    const result = await agent.login({ identifier, password });
    if (result.success) {
      console.log(`✅ Logged in as ${result.data.handle}`);
      return agent;
    } else {
      console.error("❌ Login failed");
      return null;
    }
  } catch (error) {
    console.error("❌ Agent error:", (error as Error).message);
    return null;
  }
}