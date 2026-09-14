import { existsSync } from "node:fs";

export type ModelConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ConfigResult =
  | { ok: true; config: ModelConfig }
  | { ok: false; missing: string[]; present: string[] };

const REQUIRED_VARS = ["MODEL_BASE_URL", "MODEL_API_KEY", "MODEL_NAME"] as const;

export function loadDotEnv(path = ".env"): boolean {
  if (!existsSync(path)) return false;
  process.loadEnvFile(path);
  return true;
}

export function readModelConfig(env: NodeJS.ProcessEnv = process.env): ConfigResult {
  const missing: string[] = [];
  const present: string[] = [];
  for (const name of REQUIRED_VARS) {
    (env[name] ? present : missing).push(name);
  }
  if (missing.length > 0) return { ok: false, missing, present };

  return {
    ok: true,
    config: {
      baseUrl: (env.MODEL_BASE_URL ?? "").replace(/\/+$/, ""),
      apiKey: env.MODEL_API_KEY ?? "",
      model: env.MODEL_NAME ?? "",
    },
  };
}
