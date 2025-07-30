import fs from "fs";

const CACHE_FILE = "./replied_cache.json";
let repliedToCache = new Set<string>();

// Load the cache from file into memory
export function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        repliedToCache = new Set(parsed);
      }
    } catch (err) {
      console.error("⚠️ Failed to load cache:", err);
    }
  }
}

// Save the in-memory cache to disk
export function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify([...repliedToCache]), "utf-8");
  } catch (err) {
    console.error("⚠️ Failed to save cache:", err);
  }
}

// Check if a URI is already in the cache
export function isCached(uri: string): boolean {
  return repliedToCache.has(uri);
}

// Add a URI to the cache and save
export function addToCache(uri: string) {
  repliedToCache.add(uri);
  saveCache();
}
