#!/bin/sh
set -eu

usage() {
  cat <<EOF >&2
usage: $0 [DIR]

施設マスタのフィールド別・自治体別の網羅率を表示する。
null・空文字・空配列・*_UNKNOWN・キーの欠落を未入力として数える。
DIR の既定値は packages/scraper/data/institutions（実行時の作業ディレクトリによらない）。
EOF
  exit 2
}

case "${1:-}" in -h | --help) usage ;; esac
[ $# -le 1 ] || usage

DIR=${1:-$(dirname "$0")/../data/institutions}
[ -d "$DIR" ] || { echo "not a directory: $DIR" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq が必要（brew install jq）" >&2; exit 1; }

TAB=$(printf '\t')

jq -nr '
  def filled: . != null and . != "" and . != [] and ((type == "string" and endswith("_UNKNOWN")) | not);
  def pct($a; $b): if $b == 0 then "-" else "\(($a * 100 / $b) | round)%" end;

  [inputs | {m: (input_filename | split("/") | last | rtrimstr(".json") | sub("^[^-]+-"; "")), rows: .}]
  | sort_by(.m) as $ms
  | ($ms | map(.rows[] | keys_unsorted[]) | reduce .[] as $k ([]; if index([$k]) then . else . + [$k] end)
     | map(select(. != "id" and . != "prefecture" and . != "municipality"))) as $fields
  | ($ms | map(.rows | length) | add) as $total
  | ($ms | map(.m as $m | {key: $m, value: (reduce $fields[] as $f ({}; .[$f] = ([$ms[] | select(.m == $m) | .rows[] | select(.[$f] | filled)] | length)))}) | from_entries) as $c
  | ($fields | map({key: ., value: (. as $f | [$c[] | .[$f]] | add)}) | from_entries) as $all
  | (["field", "all"] + ($ms | map(.m))),
    ($fields[] as $f | [$f, pct($all[$f]; $total)] + ($ms | map(pct($c[.m][$f]; .rows | length)))),
    (["(n)", ($total | tostring)] + ($ms | map(.rows | length | tostring))),
    (["overall", pct([$all[]] | add; $total * ($fields | length))]
      + ($ms | map(pct([$c[.m][]] | add; (.rows | length) * ($fields | length)))))
  | @tsv
' "$DIR"/*.json | column -t -s "$TAB"
