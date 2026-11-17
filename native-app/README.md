# Project Viz native shell

Capacitor wraps the current teaching library so it can be installed on Android and iOS. The shell loads the same catalog, Guided Tracks, and demonstrations. It does not rewrite them, and it is not a second copy you edit by hand.

This folder is not in the catalog, Guided Tracks, or the site navigation. GitHub Pages is unchanged: the published site is still the repository root. Nothing here is a Play Store or App Store listing.

## Application id

| | |
| --- | --- |
| Display name | Project Viz |
| Application id | `com.yiuhong.demolibrary` |

Android uses that id as the application id. iOS uses it as the bundle identifier. Keep it stable so a later debug install updates the same app instead of sitting beside a second one.

The id is set in [`capacitor.config.json`](capacitor.config.json). `npx cap add` / `npx cap sync` copies it into the Android and iOS projects.

The Android `versionName` and the iOS marketing version are both `1.0`. That is the shell's install version, not the syllabus citation version. The pages inside the bundle still show the citation version from `assets/site-meta.js` (0.1.8 today). Bump that in the usual files when a syllabus should record a change, then sync again. This shell does not bump it.

## Sync the site into the shell

From `native-app`, with Node.js 20 or newer and Python 3:

```bash
npm install
npm run sync
```

`npm run sync` does two things:

1. `python3 scripts/sync_site.py` deletes `www/` and copies the repository site into it. The copy skips this `native-app/` folder, `.git`, and `.github`, so the shell does not contain itself. It then downloads the pinned D3, Chart.js, jStat, KaTeX, and Three.js files named in [`assets/vendor.json`](../assets/vendor.json), checks each sha384 pin, and rewrites **only the copy** of `www/assets/vendor.json` so those files load from the app. The registry in the repository root still points at jsDelivr, which is what GitHub Pages uses. KaTeX fonts are downloaded beside the pinned stylesheet. The stylesheet bytes are not edited, so the pin still matches.
2. `npx cap sync` copies `www/` into the Android and iOS projects and refreshes the native plugin wiring. On this Capacitor 8 app that step does not need CocoaPods or Xcode, so it runs on Linux as well as on a Mac.

Run sync again after any teaching-page change, before you build. Do not edit `www/` or the copied web bundles under `android/` and `ios/`. The next sync replaces them. Those directories are gitignored so the teaching pages are not committed twice.

Sync needs a network once, to fetch the pinned plot libraries. The debug app then opens the library without that network.

If `android/` or `ios/` is missing, add the platform once and sync again:

```bash
npx cap add android
npx cap add ios
npm run sync
```

`cap add ios` creates the Xcode project on Linux. It cannot compile or sign it.

## Debug Android APK

You need JDK 17 or 21, and the Android SDK. `android/variables.gradle` asks for compile and target SDK 36, and minimum SDK 24. Install platform `android-36` and build-tools `36.0.0` (or the newest 36.x build-tools), then point `ANDROID_HOME` at the SDK. The project compiles with Java 21.

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
cd native-app
npm install
npm run android:debug
```

`android:debug` syncs the site, copies it into the Android project, writes `android/local.properties` from `ANDROID_HOME` when that variable is set, and runs `./gradlew assembleDebug`. If `ANDROID_HOME` is unset and the file already exists, Gradle keeps using it. `local.properties` is gitignored.

The debug APK is:

```text
native-app/android/app/build/outputs/apk/debug/app-debug.apk
```

Install it on a device or emulator with USB debugging:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

This is a debug build. It is not signed for the Play Store, and this repository does not create a store listing.

On a machine that already has the SDK, Android Studio can open `native-app/android` after `npm run sync`. Use the debug variant.

## iOS on a Mac

A signed iOS device build needs Xcode on macOS and an Apple ID. Linux cannot compile or sign the iOS app, and a Linux CI job cannot produce an IPA.

Capacitor 8 wires iOS through Swift Package Manager. There is no Podfile and no CocoaPods step. `ios/App/CapApp-SPM/Package.swift` depends on `capacitor-swift-pm` at the same 8.6.2 pin as this folder's `package.json`. The first time Xcode opens the project it downloads that package. That download needs a network. The resolved packages are not committed.

On your Mac:

1. Install Xcode from the App Store. Open Xcode once and let it finish the extra components. Sign in with your Apple ID under Xcode → Settings → Accounts.
2. Clone the repository. In `native-app`, run `npm install`, then `npm run sync`.
3. Open the project:

   ```bash
   npx cap open ios
   ```

   That opens `ios/App/App.xcodeproj`. Wait until Xcode finishes resolving the CapApp-SPM package. If it asks you to trust the package, trust it.
4. Select the **App** target, then **Signing & Capabilities**. Turn on **Automatically manage signing**. Choose your **Team**. That team is the Apple ID from step 1.
5. A free Apple ID can install on a phone you register to that account. The free provisioning profile expires after about a week, and you then run from Xcode again. A paid Apple Developer Program membership is required for a lasting device build, TestFlight, or the App Store. This repository does not start either listing.
6. Connect the iPhone, select it as the run destination, and press Run. Trust the developer certificate on the phone if iOS asks (Settings → General → VPN & Device Management).

The simulator on that Mac does not need a paid account. A device does need the signing step above. The iPhone has no system Back button. Catalog and Guided Tracks use the Back control on the page. Android's system Back walks the WebView history, then leaves the app.

## What works offline

The bundled pages are the library: home, catalog, Guided Tracks, cite, licenses, and the demonstration files, plus the pinned plot libraries (D3, Chart.js, jStat, KaTeX and its fonts, Three.js and OrbitControls).

These still ask the network. The pages open without them. Web fonts fall back to the device sans-serif. The two scripts do not run until the network is there:

- Google Fonts stylesheets, and the favicon on `yiuhong.github.io`
- Lucide on the ERP demonstration (`unpkg.com/lucide@latest`, not pinned)
- compromise on NLP in Psychotherapy (`unpkg.com/compromise`, not pinned)
- The Noematachograph photograph on Unsplash
- About Yiu Hong, GitHub, ORCID, and the Creative Commons license pages

Root-absolute paths such as `/assets/...` are used only in the copied vendor registry. Capacitor serves the bundle at `https://localhost/` on Android and `capacitor://localhost/` on iOS, so those paths resolve inside the app. The published GitHub Pages site stays on relative URLs and the CDN. Do not copy that rewritten registry back to the repository root. Pages is hosted at `/demo-library/`, and a root-absolute path there would miss the project folder.

## What this does not change

- The syllabus / citation version
- GitHub Pages source, branch, or deploy settings
- Catalog cards, `tracks.json`, `demos.json`, or the site navigation
- The teaching pages themselves. Sync copies them. A path fix, if one is ever required, has to keep Pages working.
