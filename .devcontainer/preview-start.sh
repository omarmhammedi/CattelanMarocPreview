#!/usr/bin/env bash
# Bounded startup per reconnect, with one retry for Astro's cold-start timeout.
# No watchdog or restart loop.
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

preview_start_native() {
  # Capture only this invocation's CLI output, so an old log message cannot
  # trigger a retry. Keep Astro responsible for its own server and lock file.
  if preview_output="$(timeout 60s env RAYON_NUM_THREADS=1 NODE_OPTIONS=--max-old-space-size=1024 \
    node "$preview_root/node_modules/astro/bin/astro.mjs" dev \
    --host 0.0.0.0 --port 4321 --background 2>&1)"; then
    preview_exit=0
  else
    preview_exit=$?
  fi
  if [[ -n "$preview_output" ]]; then printf '%s\n' "$preview_output"; fi
  return "$preview_exit"
}

preview_native_cold_timeout() {
  [[ "$preview_exit" -eq 1 ]] || return 1
  if [[ $'\n'"$preview_output"$'\n' == *$'\nDev server failed to start within 30s.\n'* ]]; then return 0; fi
  # Astro automatically emits JSON when it detects an agent environment.
  # Parse complete log lines as data; never evaluate text or match a substring
  # inside an unrelated diagnostic.
  printf '%s\n' "$preview_output" | node --input-type=module -e '
    let output = "";
    for await (const chunk of process.stdin) output += chunk;
    const timeout = output.split(/\r?\n/).some((line) => {
      try {
        const event = JSON.parse(line);
        return event !== null && typeof event === "object" && !Array.isArray(event)
          && event.message === "Dev server failed to start within 30s."
          && event.label === "SKIP_FORMAT" && event.level === "error";
      } catch { return false; }
    });
    process.exit(timeout ? 0 : 1);
  '
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
    # flock parent holds it until this bounded startup, including its one
    # possible cold-start retry, finishes.
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
    if preview_start_native; then
      printf '%s Native preview startup completed\n' "$(date -u +%FT%TZ)"
      exit 0
    fi
    # Astro 7.3.5 terminates its new child after its own 30-second deadline.
    # A cold cache can exceed that deadline. Retry that exact native failure
    # once, under the same startup lock; other errors and the outer 60-second
    # timeout must not start another server.
    if preview_native_cold_timeout; then
      printf '%s Native cold-start timeout; one retry in 2 seconds\n' "$(date -u +%FT%TZ)"
      sleep 2
      if ! preview_ready; then
        printf '%s Preview retry cancelled: startup prerequisites changed\n' "$(date -u +%FT%TZ)"
        exit 0
      fi
      printf '%s Preview startup attempt 2 of 2\n' "$(date -u +%FT%TZ)"
      if preview_start_native; then
        printf '%s Native preview startup completed\n' "$(date -u +%FT%TZ)"
        exit 0
      fi
    fi
    printf '%s Preview startup failed; inspect .astro/dev.log. No further automatic retry.\n' "$(date -u +%FT%TZ)" >&2
    exit 1
    ;;
  *)
    echo 'Use start, enable, or disable.' >&2
    exit 2
    ;;
esac
