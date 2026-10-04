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

> **Signing.** By default the APK is signed with a throwaway debug keystore, which means a new
> build cannot upgrade an older one — you must uninstall the previous build first. To make upgrades
> work, add these repository secrets so every build shares one keystore:
>
> | Secret | Value |
> | --- | --- |
> | `ANDROID_DEBUG_KEYSTORE_BASE64` | `base64 -i debug.keystore` output of your keystore |
> | `ANDROID_DEBUG_KEY_ALIAS` | keystore alias |
> | `ANDROID_DEBUG_KEY_PASSWORD` | key password |
> | `ANDROID_DEBUG_STORE_PASSWORD` | store password |
>
> For distribution through the Play Store, swap in a proper release keystore and emit an `.aab`
> instead (see `android/app/build.gradle`).

### Building locally

Requires Node 22, JDK 21, and the Android SDK.

```bash
npm install
npm run android:apk       # builds dist-android/app-debug.apk via android/
npm run android:open      # opens the project in Android Studio
```

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