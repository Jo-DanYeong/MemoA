package com.frontend;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public class NotificationCaptureService extends NotificationListenerService {
    public static final String STORE_NAME = "memoa_notification_candidates";
    public static final String STORE_KEY = "pending";
    public static final String SELECTED_PACKAGES_KEY = "selected_packages";
    public static final String SELECTION_INITIALIZED_KEY = "selected_packages_v2_initialized";

    private static final String DETECTION_CHANNEL_ID = "memoa_schedule_candidates";

    @Override
    public void onNotificationPosted(StatusBarNotification notification) {
        if (notification == null
            || getPackageName().equals(notification.getPackageName())
            || !isSelectedPackage(notification.getPackageName())) {
            return;
        }

        long installedAt;
        try {
            installedAt = NotificationCaptureStore.installedAt(this);
            if (notification.getPostTime() < installedAt) {
                return;
            }
        } catch (Exception ignored) {
            return;
        }

        Notification posted = notification.getNotification();
        if (posted == null || posted.extras == null) {
            return;
        }

        Bundle extras = posted.extras;
        String title = textOf(extras.getCharSequence(Notification.EXTRA_TITLE));
        if (title.isEmpty()) {
            title = textOf(extras.getCharSequence(Notification.EXTRA_TITLE_BIG));
        }
        NotificationTextParser.Content content = NotificationTextParser.parse(
            title,
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT),
            extras.getCharSequence(Notification.EXTRA_TEXT),
            extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES),
            messagesOf(posted),
            (posted.flags & Notification.FLAG_GROUP_SUMMARY) != 0
        );
        if (!NotificationTextParser.containsSchedule(content)
            || (content.timestamp > 0 && content.timestamp < installedAt)) {
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
            candidate.put("packageName", notification.getPackageName());
            candidate.put("appName", appName);
            candidate.put("title", content.title);
            candidate.put("text", content.text.substring(0, Math.min(content.text.length(), 2000)));
            candidate.put("receivedAt", content.timestamp > 0 ? content.timestamp : notification.getPostTime());
            if (NotificationCaptureStore.add(this, candidate)) {
                notifyCandidateSaved(appName, content.title);
            }
        } catch (Exception ignored) {
            // A malformed notification must not affect the listener service.
        }
    }

    private List<NotificationTextParser.Message> messagesOf(Notification notification) {
        try {
            List<Notification.MessagingStyle.Message> messages = Collections.emptyList();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                messages = Notification.MessagingStyle.Message.getMessagesFromBundleArray(
                    notification.extras.getParcelableArray(Notification.EXTRA_MESSAGES)
                );
            } else {
                Notification.Style style = Notification.Builder.recoverBuilder(this, notification).getStyle();
                if (style instanceof Notification.MessagingStyle) {
                    messages = ((Notification.MessagingStyle) style).getMessages();
                }
            }
            List<NotificationTextParser.Message> result = new ArrayList<>();
            for (Notification.MessagingStyle.Message message : messages) {
                result.add(new NotificationTextParser.Message(
                    message.getSender(), message.getText(), message.getTimestamp()
                ));
            }
            return result;
        } catch (RuntimeException ignored) {
            // Some apps provide malformed message bundles; still try their standard text fields.
            return Collections.emptyList();
        }
    }

    private String textOf(CharSequence value) {
        return value == null ? "" : value.toString().trim();
    }

    private boolean isSelectedPackage(String packageName) {
        return NotificationCaptureStore.selectedPackages(this).contains(packageName);
    }

    private void notifyCandidateSaved(String appName, String sourceTitle) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                DETECTION_CHANNEL_ID,
                "일정 후보 감지",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("선택한 앱에서 일정 후보를 발견했을 때 알려줍니다.");
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }

        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentIntent = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            contentIntent = PendingIntent.getActivity(
                this,
                (int) (System.currentTimeMillis() & 0x7fffffff),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        String source = sourceTitle == null || sourceTitle.isBlank()
            ? appName
            : appName + " · " + sourceTitle;
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, DETECTION_CHANNEL_ID)
            : new Notification.Builder(this);
        builder
            .setSmallIcon(com.frontend.R.mipmap.ic_launcher)
            .setContentTitle("일정 후보를 임시 저장했어요")
            .setContentText(source)
            .setAutoCancel(true)
            .setPriority(Notification.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE);
        if (contentIntent != null) {
            builder.setContentIntent(contentIntent);
        }
        manager.notify((int) (System.currentTimeMillis() & 0x7fffffff), builder.build());
    }

}
