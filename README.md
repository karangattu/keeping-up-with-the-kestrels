# Keeping Up with the Kestrels

![poster](assets/keeping_up_README_poster.png)

Tap to count raptors as they fly by — a Bay Area bird ID game. Run `npm install && npm run dev` to start.

## Android

Also ships as an APK via [Capacitor](https://capacitorjs.com/), with every asset packaged inside
it, so **it runs fully offline**. Landscape, fullscreen, Android 7.0+ including tablets.

Download the APK from a [release](https://github.com/karangattu/keeping-up-with-the-kestrels/releases),
copy it to the device, and open it.

Releasing: push a `vMAJOR.MINOR.PATCH` tag. The
[APK workflow](.github/workflows/android-apk.yml) attaches `kestrels-v<version>-android.apk` to
that tag's release, using the tag as the app version. All builds are signed with one shared debug
keystore so new versions upgrade over old ones.

Building locally (needs Node 22, JDK 21, Android SDK): `npm run android:apk`. Also `npm run
android:sync`, `npm run android:open`, `npm run android:assets`.