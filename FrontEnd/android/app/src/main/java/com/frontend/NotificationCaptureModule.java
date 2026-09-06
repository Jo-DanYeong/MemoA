package com.frontend;

import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import org.json.JSONArray;
import org.json.JSONObject;

public class NotificationCaptureModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext context;

    public NotificationCaptureModule(ReactApplicationContext context) {
        super(context);
        this.context = context;
    }

    @Override
    public String getName() {
        return "MemoaNotificationCapture";
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
    public void drainPending(Promise promise) {
        try {
            SharedPreferences preferences = context.getSharedPreferences(
                NotificationCaptureService.STORE_NAME,
                0
            );
            JSONArray pending = new JSONArray(
                preferences.getString(NotificationCaptureService.STORE_KEY, "[]")
            );
            WritableArray result = Arguments.createArray();

            for (int index = 0; index < pending.length(); index += 1) {
                JSONObject item = pending.getJSONObject(index);
                WritableMap map = Arguments.createMap();
                map.putString("id", item.optString("id"));
                map.putString("appName", item.optString("appName"));
                map.putString("title", item.optString("title"));
                map.putString("text", item.optString("text"));
                map.putDouble("receivedAt", item.optLong("receivedAt"));
                result.pushMap(map);
            }

            preferences.edit().remove(NotificationCaptureService.STORE_KEY).apply();
            promise.resolve(result);
        } catch (Exception exception) {
            promise.reject(
                "CAPTURE_READ_FAILED",
                "감지된 알림을 읽을 수 없습니다.",
                exception
            );
        }
    }
}
