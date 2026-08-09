# DPrime Agent Main Build

## Goal

Provide a `dprime-agent` command on Linux x86_64 that runs the latest verified standalone build produced from this fork's `main` branch while preserving the directory from which the command was invoked.

## Deliverables

1. Publish a Linux x86_64 standalone archive and checksum manifest to a moving `dprime-agent-main` GitHub prerelease after every successful `main` build.
2. Install a lightweight `dprime-agent` launcher under `~/.local/bin`.
3. Check for a newer main build on every invocation, atomically activate verified downloads, and fall back to the current cached build when the release endpoint is unavailable.
4. Execute the cached binary without changing directories so it inherits the caller's working directory.
5. Document installation and validate initial download, update, working-directory preservation, and offline fallback without contacting GitHub.

## Compatibility

This is an additional fork-specific distribution path. It does not change the existing `prime-agent` command, npm package, release workflow, configuration directory, or daemon protocol.
