package com.frontend;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Shares selection rules and queue locking between the listener and the React bridge. */
final class NotificationCaptureStore {
    private static final String DEFAULTS_KEY = "selected_packages_v3_initialized";
    private static final int MAX_PENDING = 20;

    private NotificationCaptureStore() {
    }

    static long installedAt(Context context) throws PackageManager.NameNotFoundException {
        return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).firstInstallTime;
    }

    static boolean selectedByDefault(String packageName, String appName) {
        String source = (packageName + " " + appName).toLowerCase(Locale.ROOT);
        return !source.matches(".*(?:weather|accuweather|날씨|기상|airquality|미세먼지|뉴스|news|battery|배터리|devicecare).*")
            && !packageName.equals("android")
            && !packageName.equals("com.android.systemui")
            && !packageName.equals("com.samsung.android.lool");
    }

    static synchronized Set<String> selectedPackages(Context context) {
        SharedPreferences preferences = preferences(context);
        Set<String> selected = new HashSet<>(preferences.getStringSet(
            NotificationCaptureService.SELECTED_PACKAGES_KEY, java.util.Collections.emptySet()
        ));
        if (!preferences.getBoolean(DEFAULTS_KEY, false)) {
            Intent launcher = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> apps = context.getPackageManager().queryIntentActivities(launcher, 0);
            boolean initialized = preferences.getBoolean(NotificationCaptureService.SELECTION_INITIALIZED_KEY, false);
            // Older versions selected every launcher app automatically. Preserve actual custom selections.
            boolean previouslyAll = initialized && apps.stream()
                .filter(app -> !context.getPackageName().equals(app.activityInfo.packageName))
                .allMatch(app -> selected.contains(app.activityInfo.packageName));
            if (!initialized || previouslyAll) {
                selected.clear();
                for (ResolveInfo app : apps) {
                    String packageName = app.activityInfo.packageName;
                    String name = app.loadLabel(context.getPackageManager()).toString();
                    if (!context.getPackageName().equals(packageName) && selectedByDefault(packageName, name)) {
                        selected.add(packageName);
                    }
                }
            }
            preferences.edit()
                .putStringSet(NotificationCaptureService.SELECTED_PACKAGES_KEY, selected)
                .putBoolean(NotificationCaptureService.SELECTION_INITIALIZED_KEY, true)
                .putBoolean(DEFAULTS_KEY, true)
                .apply();
        }
        return selected;
    }

    static synchronized void selectPackages(Context context, Set<String> selected) throws Exception {
        preferences(context).edit()
            .putStringSet(NotificationCaptureService.SELECTED_PACKAGES_KEY, new HashSet<>(selected))
            .putBoolean(NotificationCaptureService.SELECTION_INITIALIZED_KEY, true)
            .putBoolean(DEFAULTS_KEY, true)
            .apply();
        pending(context);
    }

    static synchronized JSONArray pending(Context context) throws Exception {
        SharedPreferences preferences = preferences(context);
        JSONArray stored;
        try {
            stored = new JSONArray(preferences.getString(NotificationCaptureService.STORE_KEY, "[]"));
        } catch (Exception ignored) {
            stored = new JSONArray();
        }
        Set<String> selected = selectedPackages(context);
        long installedAt = installedAt(context);
        JSONArray retained = new JSONArray();
        for (int index = 0; index < stored.length(); index++) {
            JSONObject item = stored.optJSONObject(index);
            if (item != null && item.optLong("receivedAt") >= installedAt
                && selected.contains(item.optString("packageName"))) {
                retained.put(item);
            }
        }
        preferences.edit().putString(NotificationCaptureService.STORE_KEY, retained.toString()).apply();
        return retained;
    }

    static synchronized boolean add(Context context, JSONObject candidate) throws Exception {
        JSONArray stored = pending(context);
        for (int index = 0; index < stored.length(); index++) {
            JSONObject existing = stored.getJSONObject(index);
            if (existing.optString("packageName").equals(candidate.optString("packageName"))
                && existing.optString("title").equals(candidate.optString("title"))
                && existing.optString("text").equals(candidate.optString("text"))) {
                return false;
            }
        }
        JSONArray updated = new JSONArray();
        for (int index = Math.max(0, stored.length() - MAX_PENDING + 1); index < stored.length(); index++) {
            updated.put(stored.getJSONObject(index));
        }
        updated.put(candidate);
        preferences(context).edit().putString(NotificationCaptureService.STORE_KEY, updated.toString()).apply();
        return true;
    }

    static synchronized void remove(Context context, String id) throws Exception {
        JSONArray stored = pending(context);
        JSONArray retained = new JSONArray();
        for (int index = 0; index < stored.length(); index++) {
            JSONObject item = stored.getJSONObject(index);
            if (!item.optString("id").equals(id)) {
                retained.put(item);
            }
        }
        preferences(context).edit().putString(NotificationCaptureService.STORE_KEY, retained.toString()).apply();
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(NotificationCaptureService.STORE_NAME, Context.MODE_PRIVATE);
    }
}
