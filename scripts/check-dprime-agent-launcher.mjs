import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

if (process.platform !== "linux" || process.arch !== "x64") {
	console.log("dprime-agent launcher check skipped: Linux x86_64 only.");
	process.exit(0);
}

const repoRoot = resolve(import.meta.dirname, "..");
const installerPath = join(repoRoot, "scripts", "install-dprime-agent.sh");
const launcherSourcePath = join(repoRoot, "scripts", "dprime-agent");
const tempRoot = mkdtempSync(join(tmpdir(), "dprime-agent-launcher-"));
const releaseDir = join(tempRoot, "release");
const payloadDir = join(tempRoot, "payload");
const installBinDir = join(tempRoot, "bin");
const dataDir = join(tempRoot, "data");
const invocationDir = join(tempRoot, "project with spaces");

try {
	mkdirSync(releaseDir, { recursive: true });
	mkdirSync(invocationDir, { recursive: true });

	const firstCommit = "1111111111111111111111111111111111111111";
	writeRelease(firstCommit, "first");
	runInstaller();
	assertInvocation("first");
	assertCurrentBuild(firstCommit);

	const secondCommit = "2222222222222222222222222222222222222222";
	writeRelease(secondCommit, "second");
	assertInvocation("second");
	assertCurrentBuild(secondCommit);

	rmSync(releaseDir, { recursive: true, force: true });
	assertInvocation("second");
	assertCurrentBuild(secondCommit);
} finally {
	rmSync(tempRoot, { recursive: true, force: true });
}

console.log("dprime-agent launcher check passed.");

function writeRelease(commit, label) {
	rmSync(payloadDir, { recursive: true, force: true });
	const packageDir = join(payloadDir, "dprime-agent");
	mkdirSync(packageDir, { recursive: true });
	const executablePath = join(packageDir, "dprime-agent");
	writeFileSync(executablePath, `#!/bin/sh\nprintf '${label}:%s\\n' "$PWD"\n`);
	chmodSync(executablePath, 0o755);

	const archiveName = `dprime-agent-linux-x64-${commit}.tar.gz`;
	const archivePath = join(releaseDir, archiveName);
	run("tar", ["-czf", archivePath, "-C", payloadDir, "dprime-agent"]);
	const sha256 = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
	writeFileSync(
		join(releaseDir, "dprime-agent-main.env"),
		`commit=${commit}\narchive=${archiveName}\nsha256=${sha256}\n`,
	);
}

function runInstaller() {
	const result = run("sh", [installerPath], {
		DPRIME_AGENT_BIN_DIR: installBinDir,
		DPRIME_AGENT_HOME: dataDir,
		DPRIME_AGENT_LAUNCHER_URL: pathToFileURL(launcherSourcePath).href,
		DPRIME_AGENT_RELEASE_BASE_URL: pathToFileURL(releaseDir).href,
	});
	if (!result.stdout.includes(`Installed dprime-agent at ${join(installBinDir, "dprime-agent")}`)) {
		throw new Error(`installer did not report the installed launcher:\n${result.stdout}`);
	}
}

function assertInvocation(expectedLabel) {
	const result = run(join(installBinDir, "dprime-agent"), [], {
		DPRIME_AGENT_HOME: dataDir,
		DPRIME_AGENT_RELEASE_BASE_URL: pathToFileURL(releaseDir).href,
	}, invocationDir);
	const expected = `${expectedLabel}:${invocationDir}`;
	if (result.stdout.trim() !== expected) {
		throw new Error(`expected launcher output ${JSON.stringify(expected)}, got ${JSON.stringify(result.stdout.trim())}`);
	}
}

function assertCurrentBuild(commit) {
	const target = readlinkSync(join(dataDir, "current"));
	if (target !== `builds/${commit}`) {
		throw new Error(`expected current build ${commit}, got ${target}`);
	}
}

function run(command, args, extraEnv = {}, cwd = repoRoot) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: "utf8",
		env: { ...process.env, ...extraEnv },
	});
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} exited with ${result.status ?? "unknown"}\n${result.stderr}${result.stdout}`,
		);
	}
	return result;
}
