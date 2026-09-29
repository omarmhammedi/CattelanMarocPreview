#!/usr/bin/env bash
# One attempt per container start, editor attach or SSH reconnect. No watchdog.
set -euo pipefail

preview_script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
preview_root="$(CDPATH= cd -- "$preview_script_dir/.." && pwd)"
preview_state="$preview_root/.astro"
preview_disabled="$preview_state/preview-autostart.disabled"

preview_ready() {
  [[ "${CODESPACES:-}" == true && "${CODESPACE_NAME:-}" =~ ^[a-zA-Z0-9-]+$ ]] &&
    [[ ! -e "$preview_disabled" ]] &&
    [[ -f "$preview_root/node_modules/astro/bin/astro.mjs" ]] &&
    [[ -f "$preview_root/.dev.vars" ]] &&
    [[ -d "$preview_root/.wrangler/state/v3/d1" ]]
}

case "${1:-start}" in
  disable)
    mkdir -p -- "$preview_state"
    (umask 077; : > "$preview_disabled")
    echo 'Automatic preview startup disabled. Task shutdown is unchanged.'
    ;;
  enable)
    rm -f -- "$preview_disabled"
    exec /bin/bash "$preview_script_dir/preview-start.sh" start
    ;;
  start)
    # Fresh clones still use the documented manual setup. Never create CMS state.
    if ! preview_ready; then exit 0; fi
    mkdir -p -- "$preview_state"
    # --close keeps the startup lock out of the detached Astro server. The
    # flock parent holds it only until this single startup command finishes.
    # Separate the startup session from the short-lived SSH/editor hook too.
    nohup setsid flock -n -E 0 --close "$preview_state/preview-start.lock" \
      /bin/bash "$preview_script_dir/preview-start.sh" run \
      </dev/null >>"$preview_state/preview-start.log" 2>&1 &
    ;;
  run)
    # Recheck in case startup was disabled while the detached job was launching.
    if ! preview_ready; then exit 0; fi
    cd -- "$preview_root"
    printf '%s Preview startup attempt\n' "$(date -u +%FT%TZ)"
    # Astro reuses a live native dev lock and removes a stale one itself.
    # strictPort in astro.config.mjs prevents silently moving to another port.
    if timeout 60s env RAYON_NUM_THREADS=1 NODE_OPTIONS=--max-old-space-size=1024 \
      node "$preview_root/node_modules/astro/bin/astro.mjs" dev \
      --host 0.0.0.0 --port 4321 --background; then
      printf '%s Native preview startup completed\n' "$(date -u +%FT%TZ)"
    else
      printf '%s Preview startup failed; inspect .astro/dev.log. No automatic retry.\n' "$(date -u +%FT%TZ)" >&2
      exit 1
    fi
    ;;
  *)
    echo 'Use start, enable, or disable.' >&2
    exit 2
    ;;
esac
