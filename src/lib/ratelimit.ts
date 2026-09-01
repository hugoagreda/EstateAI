import { RATELIMIT_PER_IP_PER_HOUR, RATELIMIT_GLOBAL_DAILY } from "./config";

// In-memory limiter. Resets on server restart and is per-instance — fine for a
// portfolio demo and works fully offline.
// ⚠️ LIKELY-ADJUST (later, online): for multi-instance Vercel, swap this for
// Upstash Redis. Hook left commented at the bottom.

interface Bucket { count: number; resetAt: number; }
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ipBuckets = new Map<string, Bucket>();
let globalBucket: Bucket = { count: 0, resetAt: Date.now() + DAY };

function hit(bucket: Bucket, limit: number, windowMs: number, now: number): { ok: boolean; bucket: Bucket } {
  if (now > bucket.resetAt) bucket = { count: 0, resetAt: now + windowMs };
  if (bucket.count >= limit) return { ok: false, bucket };
  bucket.count += 1;
  return { ok: true, bucket };
}

export type LimitResult =
  | { ok: true }
  | { ok: false; reason: "rate_limit_ip" | "rate_limit_global" };

export function checkRateLimit(ip: string): LimitResult {
  const now = Date.now();

  const g = hit(globalBucket, RATELIMIT_GLOBAL_DAILY, DAY, now);
  globalBucket = g.bucket;
  if (!g.ok) return { ok: false, reason: "rate_limit_global" };

  const existing = ipBuckets.get(ip) ?? { count: 0, resetAt: now + HOUR };
  const r = hit(existing, RATELIMIT_PER_IP_PER_HOUR, HOUR, now);
  ipBuckets.set(ip, r.bucket);
  if (!r.ok) return { ok: false, reason: "rate_limit_ip" };

  return { ok: true };
}

// --- Upstash Redis version (uncomment + `npm i @upstash/ratelimit @upstash/redis` when online) ---
// import { Ratelimit } from "@upstash/ratelimit";
// import { Redis } from "@upstash/redis";
// const rl = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(8, "1 h") });
// export async function checkRateLimit(ip: string) { const { success } = await rl.limit(ip); ... }
