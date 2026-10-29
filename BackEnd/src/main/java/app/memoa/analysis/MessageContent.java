package app.memoa.analysis;

import java.util.List;
import java.util.regex.Pattern;

final class MessageContent {
    private static final Pattern SOURCE_LABEL = Pattern.compile(
        "(?m)^\\h*(?:알림\\s*출처|발신자|대화방|보낸\\s*앱|앱\\s*이름)\\h*[:：]\\h*([^\\r\\n]+)"
    );

    private MessageContent() {
    }

    static String body(String message) {
        return SOURCE_LABEL.matcher(message == null ? "" : message).replaceAll("").trim();
    }

    static List<String> sources(String message) {
        return SOURCE_LABEL.matcher(message == null ? "" : message).results()
            .map(match -> match.group(1).trim()).filter(value -> !value.isBlank()).toList();
    }
}
