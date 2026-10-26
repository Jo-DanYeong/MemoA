package com.frontend;

import java.util.List;
import java.util.regex.Pattern;

/** Content selection is independent of Android so notification formats can be regression tested. */
final class NotificationTextParser {
    private static final Pattern SCHEDULE_SIGNAL = Pattern.compile(
        "오늘|내일|모레|글피|낼|이번\\s*주|다음\\s*주|주말|[월화수목금토일]요일"
            + "|\\d{1,2}월\\s*\\d{1,2}일|오전|오후|(?:[01]?\\d|2[0-3]):[0-5]\\d"
            + "|\\d{1,2}시(?!간)|까지|마감|제출|약속|회의|미팅|면접|예약|방문|신청|접수"
            + "|참석|만나|보자|준비\\s*사항|준비물|가져오|챙겨|충전"
    );

    private NotificationTextParser() {
    }

    static Content parse(String title, CharSequence bigText, CharSequence plainText,
                         CharSequence[] lines, List<Message> messages, boolean groupSummary) {
        String sourceTitle = textOf(title);
        if (messages != null && !messages.isEmpty()) {
            Message latest = null;
            for (Message message : messages) {
                if (message != null && (latest == null || message.timestamp >= latest.timestamp)) {
                    latest = message;
                }
            }
            // Never resurface an older appointment when the newest message is a reply or attachment.
            if (latest != null) {
                if (latest.sender == null || textOf(latest.text).isEmpty()) {
                    return null;
                }
                String sender = textOf(latest.sender);
                return new Content(sender.isEmpty() ? sourceTitle : sender, textOf(latest.text), latest.timestamp);
            }
        }

        if (lines != null && lines.length > 0) {
            for (int index = lines.length - 1; index >= 0; index--) {
                if (!textOf(lines[index]).isEmpty()) {
                    return new Content(sourceTitle, textOf(lines[index]), 0);
                }
            }
        }
        // An unstructured group summary is only a counter, not an individual message.
        if (groupSummary) {
            return null;
        }
        String body = textOf(bigText);
        if (body.isEmpty()) {
            body = textOf(plainText);
        }
        return body.isEmpty() ? null : new Content(sourceTitle, body, 0);
    }

    static boolean containsSchedule(Content content) {
        return content != null && content.text.length() >= 3
            && SCHEDULE_SIGNAL.matcher(content.title + " " + content.text).find();
    }

    private static String textOf(CharSequence value) {
        return value == null ? "" : value.toString().trim();
    }

    static final class Content {
        final String title;
        final String text;
        final long timestamp;

        Content(String title, String text, long timestamp) {
            this.title = title;
            this.text = text;
            this.timestamp = timestamp;
        }
    }

    static final class Message {
        final CharSequence sender;
        final CharSequence text;
        final long timestamp;

        Message(CharSequence sender, CharSequence text, long timestamp) {
            this.sender = sender;
            this.text = text;
            this.timestamp = timestamp;
        }
    }
}
