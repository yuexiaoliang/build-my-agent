export type EvidenceMode = "synthetic" | "live";

export interface SummaryRequest {
  input: string;
}

export interface SummaryResult {
  text: string;
  mode: EvidenceMode;
}

export interface ModelProvider {
  readonly mode: EvidenceMode;
  summarize(request: SummaryRequest): Promise<SummaryResult>;
}

/**
 * A deterministic stand-in for a remote model provider.
 *
 * It lets us test the browser/server/provider boundary without credentials or
 * billable traffic. It does not demonstrate model quality or provider behavior.
 */
export class SyntheticSummaryProvider implements ModelProvider {
  readonly mode = "synthetic" as const;

  async summarize({ input }: SummaryRequest): Promise<SummaryResult> {
    const normalized = input.replace(/\s+/g, " ").trim();
    const firstSentence = normalized.split(/(?<=[。！？.!?])/u)[0] ?? normalized;
    const clipped = firstSentence.length > 80
      ? `${firstSentence.slice(0, 77)}…`
      : firstSentence;

    return {
      text: `[合成响应] ${clipped}`,
      mode: this.mode,
    };
  }
}
