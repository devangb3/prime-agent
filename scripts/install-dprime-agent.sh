#!/bin/sh

set -eu

DPRIME_AGENT_REPOSITORY="${DPRIME_AGENT_REPOSITORY:-devangb3/prime-agent}"
DPRIME_AGENT_LAUNCHER_URL="${DPRIME_AGENT_LAUNCHER_URL:-https://raw.githubusercontent.com/${DPRIME_AGENT_REPOSITORY}/main/scripts/dprime-agent}"

if [ "$(uname -s)" != "Linux" ] || [ "$(uname -m)" != "x86_64" ]; then
	printf 'error: dprime-agent main builds support only Linux x86_64.\n' >&2
	exit 1
fi

if [ -z "${HOME:-}" ]; then
	printf 'error: HOME is not set.\n' >&2
	exit 1
fi

for command in curl install mktemp; do
	if ! command -v "$command" >/dev/null 2>&1; then
		printf 'error: the dprime-agent installer requires %s.\n' "$command" >&2
		exit 1
	fi
done

bin_dir="${DPRIME_AGENT_BIN_DIR:-$HOME/.local/bin}"
launcher_path="$bin_dir/dprime-agent"
launcher_temp=$(mktemp "${TMPDIR:-/tmp}/dprime-agent-launcher.XXXXXX")

cleanup() {
	rm -f -- "$launcher_temp"
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

curl --fail --location --silent --show-error "$DPRIME_AGENT_LAUNCHER_URL" --output "$launcher_temp"
sh -n "$launcher_temp"
install -d "$bin_dir"
install -m 0755 "$launcher_temp" "$launcher_path"

DPRIME_AGENT_UPDATE_ONLY=1 "$launcher_path"

printf 'Installed dprime-agent at %s\n' "$launcher_path"
case ":$PATH:" in
	*":$bin_dir:"*) ;;
	*) printf 'Add %s to PATH before running dprime-agent.\n' "$bin_dir" ;;
esac
