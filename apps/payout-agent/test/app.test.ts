import { describe, expect, it } from "vitest";
import { MOCK_ORG_WALLET, createPayoutAgent } from "../src/agent.ts";

const RECIPIENT = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

async function invoke(app: Awaited<ReturnType<typeof createPayoutAgent>>["app"], key: string, input: unknown) {
  const res = await app.request(`/entrypoints/${key}/invoke`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const text = await res.text();
  return { status: res.status, text, body: JSON.parse(text) as Record<string, unknown> };
}

describe("payout agent (replay mode, no network)", () => {
  it("serves health, the agent card with the KeeperHub descriptor, and three entrypoints", async () => {
    const { app, summary } = await createPayoutAgent({ mock: true });
    expect(summary).toMatchObject({ mock: true, chainId: "84532", paid: false, maxAmount: "1000" });
    expect((await app.request("/health")).status).toBe(200);
    const card = (await (await app.request("/.well-known/agent-card.json")).json()) as {
      name: string;
      entrypoints: Record<string, unknown>;
      capabilities?: { extensions?: Array<{ uri: string; params: Record<string, unknown> }> };
    };
    expect(card.name).toBe("landed-payout-agent");
    expect(Object.keys(card.entrypoints).sort()).toEqual(["dry-run", "execution", "payout"]);
    const descriptor = card.capabilities?.extensions?.find((e) => e.uri === "urn:landed:keeperhub-execution:v1");
    expect(descriptor?.params).toMatchObject({ executionLayer: "keeperhub", keeperhub: "https://keeperhub.mock" });
  });

  it("lands a payout and reports the org wallet", async () => {
    const { app, client } = await createPayoutAgent({ mock: true });
    expect((await client.me()).walletAddress).toBe(MOCK_ORG_WALLET);
    const res = await invoke(app, "payout", { reference: "demo-1", recipientAddress: RECIPIENT, amount: "0.01" });
    expect(res.status).toBe(200);
    expect(res.body.output).toMatchObject({ reference: "demo-1", sponsored: true, replayed: false });
    expect((res.body.output as { transactionLink: string }).transactionLink).toMatch(/basescan/);
    const status = await invoke(app, "execution", { reference: "demo-1" });
    expect(status.body.output).toMatchObject({ found: true });
  });

  it("the cent never leaves: a dry run that would revert never broadcasts", async () => {
    const { app } = await createPayoutAgent({ mock: true });
    const res = await invoke(app, "payout", { reference: "demo-2", recipientAddress: RECIPIENT, amount: "500" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.text).toMatch(/preflight_failed/);
    expect(res.text).toMatch(/insufficient_balance/);
    const status = await invoke(app, "execution", { reference: "demo-2" });
    expect((status.body.output as { record: { outcome: string; executionId?: string } }).record).toMatchObject({ outcome: "preflight_failed" });
    expect((status.body.output as { record: { executionId?: string } }).record.executionId).toBeUndefined();
  });

  it("policy stops amounts above the ceiling before KeeperHub is contacted", async () => {
    const { app } = await createPayoutAgent({ mock: true, maxAmount: "0.5" });
    const res = await invoke(app, "payout", { reference: "demo-3", recipientAddress: RECIPIENT, amount: "0.75" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.text).toMatch(/policy_denied/);
  });

  it("refuses to price the entrypoint without a payments runtime", async () => {
    const { summary } = await createPayoutAgent({ mock: true, price: "0.01" });
    expect(summary.paid).toBe(false);
  });
});
