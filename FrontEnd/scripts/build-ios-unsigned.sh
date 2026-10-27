#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
  echo 'This script needs a macOS build runner with Xcode.' >&2
  exit 1
fi
if [[ "${MEMOA_IOS_SIDELOAD:-}" != 1 ]]; then
  echo 'Set MEMOA_IOS_SIDELOAD=1 to create this personal-test build.' >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/.." && pwd)"
cd "$project_dir"
node -e "require('./app.config')"

output_dir="$project_dir/build/ios"
mkdir -p "$output_dir"
workspace="$(find "$project_dir/ios" -maxdepth 1 -type d -name '*.xcworkspace' -print -quit)"
if [[ -z "$workspace" ]]; then
  echo 'No iOS workspace found. Run Expo iOS prebuild and pod install first.' >&2
  exit 1
fi
scheme="$(basename "$workspace" .xcworkspace)"
plist="$project_dir/ios/$scheme/Info.plist"
if [[ ! -f "$plist" ]]; then
  echo "Expected generated Info.plist at $plist" >&2
  exit 1
fi

# A personal-test-only IPA must reach the existing HTTP development server on the LAN.
# Do not copy this transport exception into a production/App Store build.
/usr/libexec/PlistBuddy -c 'Delete :NSAppTransportSecurity' "$plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c 'Add :NSAppTransportSecurity dict' "$plist"
/usr/libexec/PlistBuddy -c 'Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool true' "$plist"

xcodebuild \
  -workspace "$workspace" \
  -scheme "$scheme" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$output_dir/DerivedData" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= \
  DEVELOPMENT_TEAM= \
  build 2>&1 | tee "$output_dir/xcodebuild.log"

app="$(find "$output_dir/DerivedData/Build/Products/Release-iphoneos" -maxdepth 1 -type d -name '*.app' -print -quit)"
if [[ -z "$app" || ! -f "$app/main.jsbundle" ]]; then
  echo 'The Release iPhone app or its bundled JavaScript was not created.' >&2
  exit 1
fi
platform="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleSupportedPlatforms:0' "$app/Info.plist")"
if [[ "$platform" != iPhoneOS ]]; then
  echo 'Refusing to package a simulator build for a physical iPhone.' >&2
  exit 1
fi

# Package in a fresh folder, retaining Payload/ at the root of the IPA archive.
package_dir="$(mktemp -d "$output_dir/package.XXXXXX")"
mkdir -p "$package_dir/Payload"
ditto "$app" "$package_dir/Payload/$(basename "$app")"
ipa="$output_dir/MemoA-unsigned.ipa"
ditto -c -k --sequesterRsrc --keepParent "$package_dir/Payload" "$ipa"
shasum -a 256 "$ipa" > "$ipa.sha256"

node <<'NODE'
const fs = require('node:fs');
const {expo} = require('./app.config');
fs.writeFileSync('build/ios/build-info.json', JSON.stringify({
  app: expo.name,
  platform: 'iphoneos',
  configuration: 'Release',
  signed: false,
  bundleIdentifier: expo.ios.bundleIdentifier,
  apiBaseUrl: expo.extra.apiBaseUrl,
  commit: process.env.GITHUB_SHA || null,
  builtAt: new Date().toISOString(),
}, null, 2) + '\n');
NODE

echo "Created $ipa"
echo 'Sign and install this file locally with Sideloadly. No Apple credentials were used by this build.'
