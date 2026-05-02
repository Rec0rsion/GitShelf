---
description: How to generate an Android APK for GitSync
---

To convert your GitSync project into an installable Android APK, follow these steps:

### Phase 1: Build the Web Assets
First, you need to compile the latest React/Javascript code into the `dist` folder.
// turbo
1. Run the build command:
   ```bash
   npm run build
   ```

### Phase 2: Sync with Android Project
This step copies the built web assets into the native Android folder and updates any plugins.
// turbo
2. Run the sync command:
   ```bash
   npx cap sync android
   ```

### Phase 3: Generate the APK
Now, use the Gradle wrapper to build the actual APK file.
3. Run the Gradle build command:
   - **On Windows (PowerShell/CMD):**
     ```powershell
     cd android
     ./gradlew.bat assembleDebug
     ```
   - **On Mac/Linux:**
     ```bash
     cd android
     ./gradlew assembleDebug
     ```

### Phase 4: Find your APK
Once the build is complete, you can find your APK file at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---
**Note:** If you want a production APK (for release), use `assembleRelease` instead of `assembleDebug`.
