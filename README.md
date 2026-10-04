# Keeping Up with the Kestrels

![poster](assets/keeping_up_README_poster.png)

Tap to count raptors as they fly by — a Bay Area bird ID game. Run `npm install && npm run dev` to start.

## Android app

The game also ships as an Android APK built with [Capacitor](https://capacitorjs.com/). Every asset
— sprite sheets, sounds, videos — is packaged inside the APK, so **the game runs completely
offline**. Only the online leaderboard needs a network, and scores earned offline are queued
locally and synced later.

The app is landscape-locked, fullscreen, and supports Android 7.0 (API 24) and newer, including
tablets.

### Releasing a new APK

Push a `vMAJOR.MINOR.PATCH` tag:

```bash
git tag v0.3.0
git push origin v0.3.0
```

The [Android APK workflow](.github/workflows/android-apk.yml) then builds the app and attaches
`kestrels-v0.3.0-android.apk` to the GitHub Release for that tag. The tag also becomes the app's
version name, and drives its version code.

To install on a tablet: download the APK, copy it to the device, and open it. Android will ask you
to allow "install unknown apps" for your file manager the first time.

> **Signing.** This project signs every build — CI and local — with one shared debug
> keystore (`~/.kestrels-android/kestrels-debug.keystore`), wired up through the
> `ANDROID_DEBUG_KEYSTORE_*` repository secrets. That is what lets a new APK install over an
> older one instead of failing with a signature mismatch.
>
> To rotate the keystore, generate a new one and re-set all four secrets. Anyone who already
> installed an APK signed by the old key will have to uninstall first.
>
> For distribution through the Play Store, swap in a proper release keystore and emit an `.aab`
> instead (see `android/app/build.gradle`).

### Building locally

Requires Node 22, JDK 21, and the Android SDK.

```bash
npm install
npm run android:apk       # builds android/app/build/outputs/apk/debug/app-debug.apk
npm run android:open      # opens the project in Android Studio
```

Local builds sign with the shared keystore via `kestrelsDebug*` entries in
`~/.gradle/gradle.properties`, so they match CI. The default version name/code is `1.0`/`1`;
override with `./android/gradlew -p android assembleDebug -PkestrelsVersionName=0.3.1 -PkestrelsVersionCode=3001`.

Other useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run android:sync` | Build the web app and copy it into the native project |
| `npm run android:assets` | Regenerate Android launcher icons and splash screens from `public/icons/icon-512.png` (needs ImageMagick) |

After changing `android/` files by hand, re-run `npm run android:sync` — Capacitor regenerates parts
of the native project. Files under `android/app/src/main/res/` and the Gradle build are ours to edit
and are safe to keep.

### Layout

- `src/` — the game (React + Vite)
- `public/sw.js` — offline cache for the **web** build only; skipped inside the APK
- `android/` — Capacitor native project wrapping `dist/`
- `capacitor.config.ts` — app id `org.sfbbo.kestrels`, app name "Kestrels"
- `scripts/generate-android-assets.sh` — icon/splash generator