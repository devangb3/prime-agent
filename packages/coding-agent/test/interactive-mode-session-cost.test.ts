import { describe, expect, test, vi } from "vitest";
import { emptyGoalState } from "../src/core/goals.js";
import { formatSessionCost, InteractiveMode } from "../src/modes/interactive/interactive-mode.js";

describe("interactive session cost", () => {
	test("formats positive costs and hides unavailable costs", () => {
		expect(formatSessionCost(1.234)).toBe("$1.23");
		expect(formatSessionCost(0)).toBeUndefined();
		expect(formatSessionCost(undefined)).toBeUndefined();
	});

	test("adds available cost to the lower tray", () => {
		const fakeThis = Object.create(InteractiveMode.prototype) as {
			heartbeats: [];
			connectionState: { goal: ReturnType<typeof emptyGoalState>; contextUsage: undefined };
			sessionCost: number;
			getTrayContextLabel(): string | undefined;
		};
		fakeThis.heartbeats = [];
		fakeThis.connectionState = { goal: emptyGoalState(), contextUsage: undefined };
		fakeThis.sessionCost = 0.42;

		expect(fakeThis.getTrayContextLabel()).toBe("$0.42");
	});

	test("refreshes cost with the authoritative session stats", async () => {
		const invalidate = vi.fn();
		const requestRender = vi.fn();
		const fakeThis = Object.create(InteractiveMode.prototype) as {
			agentConnection: { getSessionStats(): Promise<{ cost: number; contextUsage: undefined }> };
			connectionState: { sessionId: string; contextUsage: undefined };
			activityTracker: { getStatus(): { tokens: number } };
			contextUsageTokenBaseline: number;
			contextUsageRefresh: { generation: number; lastSuccessGeneration: number };
			sessionCost: number | undefined;
			subagentSummaryLine: { invalidate(): void };
			ui: { requestRender(): void };
			patchConnectionState(patch: Record<string, unknown>): void;
			refreshConnectionContextUsage(): Promise<void>;
		};
		fakeThis.agentConnection = {
			getSessionStats: async () => ({ cost: 0.73, contextUsage: undefined }),
		};
		fakeThis.connectionState = { sessionId: "session-1", contextUsage: undefined };
		fakeThis.activityTracker = { getStatus: () => ({ tokens: 0 }) };
		fakeThis.contextUsageTokenBaseline = 0;
		fakeThis.contextUsageRefresh = { generation: 0, lastSuccessGeneration: 0 };
		fakeThis.subagentSummaryLine = { invalidate };
		fakeThis.ui = { requestRender };
		fakeThis.patchConnectionState = vi.fn();

		await fakeThis.refreshConnectionContextUsage();

		expect(fakeThis.sessionCost).toBe(0.73);
		expect(invalidate).toHaveBeenCalledOnce();
		expect(requestRender).toHaveBeenCalledOnce();
	});
});
