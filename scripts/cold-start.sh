#!/usr/bin/env bash
# Cold start time of Judexp on a phone, from the launcher intent to the lookup
# box having the caret (spec Watercolor §8). The start mark is the
# ActivityTaskManager "START" line of the launch; the end mark is the
# "[judexp] lookup-ready" console line LookupPage logs in a build. Both are read
# from logcat on the phone, so adb latency does not count.
#
# Usage: scripts/cold-start.sh <serial> <runs> <reboot|force-stop>
#   reboot      reboot before every run (dGen1: force-stop leaves its WebView
#               black until the next reboot). Waits for the phone to be
#               unlocked by hand, then 20 s for the boot to settle.
#   force-stop  am force-stop before every run, then 5 s (UBS1).
set -euo pipefail

if [ $# -ne 3 ] || { [ "$3" != reboot ] && [ "$3" != force-stop ]; }; then
  echo "usage: $0 <serial> <runs> <reboot|force-stop>" >&2
  exit 2
fi

serial=$1
runs=$2
mode=$3
pkg=com.judexp.app
timeout_s=60

a() { adb -s "$serial" "$@"; }

wait_until_unlocked() {
  local told=0
  until a shell dumpsys window policy | grep -m1 'mIsShowing=' | grep -q 'mIsShowing=false'; do
    if [ "$told" -eq 0 ]; then
      echo "  unlock $serial by hand; waiting..." >&2
      told=1
    fi
    sleep 2
  done
}

make_cold() {
  if [ "$mode" = reboot ]; then
    a reboot
    a wait-for-device
    until [ "$(a shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
    wait_until_unlocked
    sleep 20
  else
    a shell am force-stop "$pkg"
    sleep 5
  fi
}

# Prints "<ready ms> <displayed ms>", or nothing when the app never got ready.
measure() {
  a logcat -c
  a shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  local waited=0 log=""
  while [ "$waited" -lt $((timeout_s * 2)) ]; do
    log=$(a logcat -d -v epoch)
    if printf '%s\n' "$log" | grep -qF '[judexp] lookup-ready'; then break; fi
    log=""
    sleep 0.5
    waited=$((waited + 1))
  done
  [ -n "$log" ] || return 0
  printf '%s\n' "$log" | awk -v pkg="$pkg" '
    start == "" && /ActivityTaskManager: START u0/ && index($0, "cmp=" pkg "/.MainActivity") { start = $1 }
    displayed == "" && index($0, "Displayed " pkg "/.MainActivity") {
      t = $0; sub(/.*: \+/, "", t); sub(/ .*/, "", t)
      s = 0; if (t ~ /^[0-9]+s[0-9]/) { s = t; sub(/s.*/, "", s); sub(/^[0-9]+s/, "", t) }
      sub(/ms$/, "", t); displayed = s * 1000 + t
    }
    ready == "" && index($0, "[judexp] lookup-ready") { ready = $1 }
    END { if (start != "" && ready != "") printf "%d %s\n", (ready - start) * 1000, (displayed == "" ? "-" : displayed) }
  '
}

stats() {
  sort -n | awk '{ v[NR] = $1 } END {
    if (NR == 0) { print "no runs"; exit }
    m = (NR % 2) ? v[(NR + 1) / 2] : (v[NR / 2] + v[NR / 2 + 1]) / 2
    printf "median %d ms, min %d ms, max %d ms (%d runs)\n", m, v[1], v[NR], NR
  }'
}

readys=""
displays=""
for i in $(seq 1 "$runs"); do
  make_cold
  result=$(measure)
  if [ -z "$result" ]; then
    echo "run $i: no lookup-ready (kho did not open, or a PIN is set?)"
    continue
  fi
  read -r ready displayed <<<"$result"
  echo "run $i: ready $ready ms, displayed $displayed ms"
  readys="$readys$ready"$'\n'
  [ "$displayed" = - ] || displays="$displays$displayed"$'\n'
done

echo "ready:     $(printf '%s' "$readys" | grep . | stats)"
echo "displayed: $(printf '%s' "$displays" | grep . | stats)"
