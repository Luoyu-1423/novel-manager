Native Android app skeleton

This folder now contains a native Android app skeleton instead of a Capacitor WebView wrapper.

Steps for you (on a machine with Android Studio and Android SDK):

1. Open the `novel_manager_android/android` folder in Android Studio.
2. Sync Gradle and build the app.
3. Run the app on an emulator or device.

Current native app behavior:
- `MainActivity` shows a native landing screen.
- `SkillsActivity` now displays a native skills list from local sample data.

Note: This skeleton is not yet connected to the original web frontend or backend API. You can extend it by replacing local sample data with API networking or local storage persistence.
