package com.frontend;

import android.app.Notification;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.UUID;
import java.util.regex.Pattern;

public class NotificationCaptureService extends NotificationListenerService {
    public static final String STORE_NAME = "memoa_notification_candidates";
    public static final String STORE_KEY = "pending";

    private static final int MAX_PENDING = 20;
    private static final Pattern SCHEDULE_SIGNAL = Pattern.compile(
        "(오늘|내일|모레|[월화수목금토일]요일|\\d{1,2}월\\s*\\d{1,2}일|오전|오후|\\d{1,2}시|까지|마감|제출|약속|회의|준비물|가져오|챙겨)"
    );

    @Override
    public void onNotificationPosted(StatusBarNotification notification) {
        if (notification == null
            || getPackageName().equals(notification.getPackageName())
            || (notification.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
            return;
        }

        Bundle extras = notification.getNotification().extras;
        String title = textOf(extras.getCharSequence(Notification.EXTRA_TITLE));
        CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        String text = textOf(
            bigText != null ? bigText : extras.getCharSequence(Notification.EXTRA_TEXT)
        );
        if (text.length() < 3 || !SCHEDULE_SIGNAL.matcher(title + " " + text).find()) {
            return;
        }

        String appName = notification.getPackageName();
        try {
            ApplicationInfo appInfo = getPackageManager().getApplicationInfo(
                notification.getPackageName(),
                0
            );
            appName = getPackageManager().getApplicationLabel(appInfo).toString();
        } catch (Exception ignored) {
            // Package name remains as a safe fallback.
        }

        try {
            JSONObject candidate = new JSONObject();
            candidate.put("id", UUID.randomUUID().toString());
            candidate.put("appName", appName);
            candidate.put("title", title);
            candidate.put("text", text.substring(0, Math.min(text.length(), 2000)));
            candidate.put("receivedAt", notification.getPostTime());
            storeCandidate(candidate);
        } catch (Exception ignored) {
            // A malformed notification must not affect the listener service.
        }
    }

    private String textOf(CharSequence value) {
        return value == null ? "" : value.toString().trim();
    }

    private synchronized void storeCandidate(JSONObject candidate) {
        SharedPreferences preferences = getSharedPreferences(STORE_NAME, 0);
        JSONArray current;
        try {
            current = new JSONArray(preferences.getString(STORE_KEY, "[]"));
        } catch (Exception ignored) {
            current = new JSONArray();
        }

        JSONArray updated = new JSONArray();
        int start = Math.max(0, current.length() - (MAX_PENDING - 1));
        for (int index = start; index < current.length(); index += 1) {
            try {
                updated.put(current.getJSONObject(index));
            } catch (Exception ignored) {
                // Skip an invalid existing item and retain valid candidates.
            }
        }
        updated.put(candidate);
        preferences.edit().putString(STORE_KEY, updated.toString()).apply();
    }
}
