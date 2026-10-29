package com.frontend;

import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import org.jetbrains.annotations.NotNull;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class NotificationCaptureModule extends ReactContextBaseJavaModule {
    private static final String CANDIDATES_CHANGED_EVENT = "MemoaNotificationCandidatesChanged";
    private static final String SETUP_STORE = "memoa_app_setup";
    private static final String BACKGROUND_SETUP_SHOWN_KEY = "background_setup_v1_shown";
    private final ReactApplicationContext context;
    private final AtomicInteger candidateListenerCount = new AtomicInteger();
    private SharedPreferences candidatePreferences;
    private final SharedPreferences.OnSharedPreferenceChangeListener candidatePreferenceListener =
        this::onCandidatePreferencesChanged;

    private void onCandidatePreferencesChanged(SharedPreferences preferences, String key) {
        if (NotificationCaptureService.STORE_KEY.equals(key)
            && candidateListenerCount.get() > 0 && context.hasActiveReactInstance()) {
            try {
                context.emitDeviceEvent(CANDIDATES_CHANGED_EVENT);
            } catch (IllegalStateException ignored) {
                // React may be invalidated between the active-instance check and a reload.
            }
        }
    }

    public NotificationCaptureModule(ReactApplicationContext context) {
        super(context);
        this.context = context;
    }

    @Override
    public @NotNull String getName() {
        return "MemoaNotificationCapture";
    }

    @Override
    public Map<String, Object> getConstants() {
        return Collections.singletonMap("captureEventsSupported", true);
    }

    @Override
    public void initialize() {
        super.initialize();
        candidatePreferences = context.getSharedPreferences(NotificationCaptureService.STORE_NAME, 0);
        candidatePreferences.registerOnSharedPreferenceChangeListener(candidatePreferenceListener);
    }

    @Override
    public void invalidate() {
        candidateListenerCount.set(0);
        if (candidatePreferences != null) {
            candidatePreferences.unregisterOnSharedPreferenceChangeListener(candidatePreferenceListener);
            candidatePreferences = null;
        }
        super.invalidate();
    }

    @ReactMethod
    public void addListener(String eventName) {
        if (CANDIDATES_CHANGED_EVENT.equals(eventName)) {
            candidateListenerCount.incrementAndGet();
        }
    }

    @ReactMethod
    public void removeListeners(double count) {
        candidateListenerCount.updateAndGet(current -> Math.max(0, current - (int) count));
    }

    @ReactMethod
    public void isAccessGranted(Promise promise) {
        String componentName = new ComponentName(
            context,
            NotificationCaptureService.class
        ).flattenToString();
        String enabledListeners = Settings.Secure.getString(
            context.getContentResolver(),
            "enabled_notification_listeners"
        );

        boolean granted = false;
        if (enabledListeners != null) {
            for (String listener : enabledListeners.split(":")) {
                if (listener.equalsIgnoreCase(componentName)) {
                    granted = true;
                    break;
                }
            }
        }
        promise.resolve(granted);
    }

    @ReactMethod
    public void openAccessSettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            promise.resolve(null);
        } catch (Exception exception) {
            promise.reject(
                "SETTINGS_UNAVAILABLE",
                "알림 접근 설정을 열 수 없습니다.",
                exception
            );
        }
    }

    @ReactMethod
    public void openApplicationSettings(Promise promise) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + context.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            promise.resolve(null);
        } catch (Exception exception) {
            promise.reject("APP_SETTINGS_UNAVAILABLE", "앱 권한 설정을 열 수 없습니다.", exception);
        }
    }

    @ReactMethod
    public void isBackgroundExecutionAllowed(Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve(true);
            return;
        }
        PowerManager powerManager = context.getSystemService(PowerManager.class);
        promise.resolve(
            powerManager != null
                && powerManager.isIgnoringBatteryOptimizations(context.getPackageName())
        );
    }

    @ReactMethod
    public void openBackgroundExecutionSettings(Promise promise) {
        try {
            openBackgroundExecutionSettings();
            promise.resolve(null);
        } catch (Exception exception) {
            promise.reject(
                "BACKGROUND_SETTINGS_UNAVAILABLE",
                "백그라운드 실행 설정을 열 수 없습니다.",
                exception
            );
        }
    }

    @ReactMethod
    public void requestInitialBackgroundAccess(Promise promise) {
        SharedPreferences setup = context.getSharedPreferences(SETUP_STORE, 0);
        if (setup.getBoolean(BACKGROUND_SETUP_SHOWN_KEY, false)) {
            promise.resolve(false);
            return;
        }
        setup.edit().putBoolean(BACKGROUND_SETUP_SHOWN_KEY, true).apply();

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve(false);
            return;
        }
        PowerManager powerManager = context.getSystemService(PowerManager.class);
        if (powerManager != null
            && powerManager.isIgnoringBatteryOptimizations(context.getPackageName())) {
            promise.resolve(false);
            return;
        }

        try {
            openBackgroundExecutionSettings();
            promise.resolve(true);
        } catch (Exception exception) {
            promise.reject(
                "BACKGROUND_SETTINGS_UNAVAILABLE",
                "최초 백그라운드 실행 설정을 열 수 없습니다.",
                exception
            );
        }
    }

    @ReactMethod
    public void getSelectableApps(Promise promise) {
        try {
            PackageManager packageManager = context.getPackageManager();
            List<Map.Entry<String, String>> sortedApps = selectableApps(packageManager);
            WritableArray result = Arguments.createArray();
            for (Map.Entry<String, String> app : sortedApps) {
                WritableMap map = Arguments.createMap();
                map.putString("packageName", app.getKey());
                map.putString("appName", app.getValue());
                map.putString("iconDataUrl", appIconDataUrl(packageManager, app.getKey()));
                result.pushMap(map);
            }
            promise.resolve(result);
        } catch (Exception exception) {
            promise.reject("APP_LIST_FAILED", "설치된 앱 목록을 불러올 수 없습니다.", exception);
        }
    }

    @ReactMethod
    public void getSelectedPackages(Promise promise) {
        Set<String> selected = NotificationCaptureStore.selectedPackages(context);
        WritableArray result = Arguments.createArray();
        for (String packageName : selected) {
            result.pushString(packageName);
        }
        promise.resolve(result);
    }

    @ReactMethod
    public void setSelectedPackages(ReadableArray packages, Promise promise) {
        try {
            Set<String> selected = new HashSet<>();
            for (int index = 0; index < packages.size(); index += 1) {
                String packageName = packages.getString(index);
                if (packageName != null && !packageName.isBlank() && !context.getPackageName().equals(packageName)) {
                    selected.add(packageName);
                }
            }

            NotificationCaptureStore.selectPackages(context, selected);
            promise.resolve(null);
        } catch (Exception exception) {
            promise.reject("APP_SELECTION_FAILED", "알림 감지 앱을 저장할 수 없습니다.", exception);
        }
    }

    @ReactMethod
    public void getPending(Promise promise) {
        try {
            JSONArray pending = NotificationCaptureStore.pending(context);
            WritableArray result = Arguments.createArray();
            for (int index = pending.length() - 1; index >= 0; index -= 1) {
                result.pushMap(candidateMap(pending.getJSONObject(index)));
            }
            promise.resolve(result);
        } catch (Exception exception) {
            promise.reject("CAPTURE_READ_FAILED", "감지된 알림을 읽을 수 없습니다.", exception);
        }
    }

    @ReactMethod
    public void removePending(String id, Promise promise) {
        try {
            NotificationCaptureStore.remove(context, id);
            promise.resolve(null);
        } catch (Exception exception) {
            promise.reject("CAPTURE_REMOVE_FAILED", "일정 후보를 삭제할 수 없습니다.", exception);
        }
    }

    // Kept for older JavaScript bundles; the current UI reads the queue without consuming it.
    @ReactMethod
    public void drainPending(Promise promise) {
        try {
            WritableArray result = Arguments.createArray();
            synchronized (NotificationCaptureStore.class) {
                JSONArray pending = NotificationCaptureStore.pending(context);
                if (pending.length() > 0) {
                    JSONObject item = pending.getJSONObject(pending.length() - 1);
                    result.pushMap(candidateMap(item));
                    NotificationCaptureStore.remove(context, item.optString("id"));
                }
            }
            promise.resolve(result);
        } catch (Exception exception) {
            promise.reject("CAPTURE_READ_FAILED", "감지된 알림을 읽을 수 없습니다.", exception);
        }
    }

    private WritableMap candidateMap(JSONObject item) {
        WritableMap map = Arguments.createMap();
        map.putString("id", item.optString("id"));
        map.putString("packageName", item.optString("packageName"));
        map.putString("appName", item.optString("appName"));
        map.putString("title", item.optString("title"));
        map.putString("text", item.optString("text"));
        map.putDouble("receivedAt", item.optLong("receivedAt"));
        return map;
    }

    private List<Map.Entry<String, String>> selectableApps(PackageManager packageManager) {
        Intent launcherIntent = new Intent(Intent.ACTION_MAIN);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> resolvedApps = packageManager.queryIntentActivities(launcherIntent, 0);
        Map<String, String> uniqueApps = new LinkedHashMap<>();
        for (ResolveInfo resolvedApp : resolvedApps) {
            String packageName = resolvedApp.activityInfo.packageName;
            if (context.getPackageName().equals(packageName)) {
                continue;
            }
            String appName = resolvedApp.loadLabel(packageManager).toString().trim();
            uniqueApps.putIfAbsent(packageName, appName.isEmpty() ? packageName : appName);
        }
        List<Map.Entry<String, String>> sortedApps = new ArrayList<>(uniqueApps.entrySet());
        sortedApps.sort(Comparator.comparing(Map.Entry::getValue, String.CASE_INSENSITIVE_ORDER));
        return sortedApps;
    }

    private String appIconDataUrl(PackageManager packageManager, String packageName) {
        try {
            Drawable drawable = packageManager.getApplicationIcon(packageName);
            Bitmap bitmap = Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, output);
            return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        } catch (Exception ignored) {
            return "";
        }
    }

    private void openBackgroundExecutionSettings() {
        Intent intent = new Intent(
            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            Uri.parse("package:" + context.getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(intent);
        } catch (Exception ignored) {
            Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(fallback);
        }
    }
}
