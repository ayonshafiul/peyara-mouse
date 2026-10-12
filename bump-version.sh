#!/usr/bin/env bash
#
# Bumps android versionCode by 1 and sets versionName to versionCode / 10.
# E.g. versionCode 42 -> 43, versionName "4.3".
#
# Usage: ./bump-version.sh
#
# Run this before every Play Store upload (versionCode must always increase).
set -euo pipefail

BUILD_GRADLE="$(dirname "$0")/android/app/build.gradle"

current="$(sed -nE 's/^[[:space:]]*versionCode ([0-9]+).*$/\1/p' "$BUILD_GRADLE" | head -n 1)"
if [[ -z "$current" ]]; then
  echo "error: versionCode not found in $BUILD_GRADLE" >&2
  exit 1
fi

next=$((current + 1))
versionName="$((next / 10)).$((next % 10))"

# -i.bak works with both GNU sed (Linux) and BSD sed (macOS).
sed -i.bak -E \
  -e "s/^([[:space:]]*versionCode )[0-9]+(.*)$/\1${next}\2/" \
  -e "s/^([[:space:]]*versionName \")[^\"]*(\".*)$/\1${versionName}\2/" \
  "$BUILD_GRADLE"
rm -f "${BUILD_GRADLE}.bak"

echo "versionCode: ${current} -> ${next}"
echo "versionName: -> \"${versionName}\""
