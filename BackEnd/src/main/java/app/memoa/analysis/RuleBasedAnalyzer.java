package app.memoa.analysis;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import app.memoa.schedule.SourceType;
import org.springframework.stereotype.Component;

@Component
public class RuleBasedAnalyzer {
    private static final Pattern FULL_DATE = Pattern.compile(
        "(20\\d{2})[.\\-/년\\s]+(\\d{1,2})[.\\-/월\\s]+(\\d{1,2})일?"
    );
    private static final Pattern SHORT_DATE = Pattern.compile("(\\d{1,2})월\\s*(\\d{1,2})일");
    private static final Pattern COLON_TIME = Pattern.compile("(?:(오전|오후)\\s*)?(\\d{1,2}):(\\d{2})");
    private static final Pattern KOREAN_TIME = Pattern.compile("(?:(오전|오후)\\s*)?(\\d{1,2})시(?:\\s*(\\d{1,2})분)?");
    private static final Pattern DATE_SIGNAL = Pattern.compile(
        "오늘|내일|모레|\\d{1,2}월\\s*\\d{1,2}일|[월화수목금토일]요일|20\\d{2}"
    );
    private static final String STRUCTURED_LABELS =
        "장소|위치|준비\\s*사항|준비물|지참물|챙길 것|가져올 것";
    private static final Map<String, DayOfWeek> WEEKDAYS = createWeekdays();

    public AnalysisResponse analyze(AnalysisRequest request) {
        String message = request.message().trim();
        LocalDate referenceDate = request.referenceDate() == null ? LocalDate.now() : request.referenceDate();
        LocalTime time = parseTime(message);
        String location = parseValueAfterLabel(message, "장소", "위치");
        List<String> preparations = parseListAfterLabel(
            message,
            "준비 사항",
            "준비사항",
            "준비물",
            "지참물",
            "챙길 것",
            "가져올 것"
        );
        boolean hasDateSignal = DATE_SIGNAL.matcher(message).find();
        double confidence = Math.min(
            0.96,
            0.50
                + (hasDateSignal ? 0.22 : 0)
                + (time != null ? 0.12 : 0)
                + (location != null ? 0.04 : 0)
                + (!preparations.isEmpty() ? 0.08 : 0)
        );

        return new AnalysisResponse(
            parseTitle(message),
            interpretDetails(message),
            parseDate(message, referenceDate),
            time,
            location,
            preparations,
            request.sourceType() == null ? SourceType.DIRECT : request.sourceType(),
            confidence,
            confidence < 0.82
        );
    }

    private LocalDate parseDate(String message, LocalDate referenceDate) {
        Matcher full = FULL_DATE.matcher(message);
        if (full.find()) {
            return safeDate(
                Integer.parseInt(full.group(1)),
                Integer.parseInt(full.group(2)),
                Integer.parseInt(full.group(3)),
                referenceDate.plusDays(1)
            );
        }

        Matcher shortDate = SHORT_DATE.matcher(message);
        if (shortDate.find()) {
            int month = Integer.parseInt(shortDate.group(1));
            int day = Integer.parseInt(shortDate.group(2));
            LocalDate candidate = safeDate(referenceDate.getYear(), month, day, referenceDate.plusDays(1));
            if (candidate.isBefore(referenceDate)) {
                candidate = safeDate(referenceDate.getYear() + 1, month, day, referenceDate.plusDays(1));
            }
            return candidate;
        }

        if (message.contains("모레")) {
            return referenceDate.plusDays(2);
        }
        if (message.contains("내일")) {
            return referenceDate.plusDays(1);
        }
        if (message.contains("오늘")) {
            return referenceDate;
        }

        for (Map.Entry<String, DayOfWeek> entry : WEEKDAYS.entrySet()) {
            if (message.contains(entry.getKey())) {
                int distance = (entry.getValue().getValue() - referenceDate.getDayOfWeek().getValue() + 7) % 7;
                return referenceDate.plusDays(distance == 0 ? 7 : distance);
            }
        }
        return referenceDate.plusDays(1);
    }

    private LocalDate safeDate(int year, int month, int day, LocalDate fallback) {
        try {
            YearMonth yearMonth = YearMonth.of(year, month);
            return yearMonth.atDay(Math.min(day, yearMonth.lengthOfMonth()));
        } catch (RuntimeException ignored) {
            return fallback;
        }
    }

    private LocalTime parseTime(String message) {
        Matcher matcher = COLON_TIME.matcher(message);
        if (!matcher.find()) {
            matcher = KOREAN_TIME.matcher(message);
            if (!matcher.find()) {
                return null;
            }
        }
        int hour = Integer.parseInt(matcher.group(2));
        int minute = matcher.group(3) == null ? 0 : Integer.parseInt(matcher.group(3));
        String period = matcher.group(1);
        if ("오후".equals(period) && hour < 12) {
            hour += 12;
        }
        if ("오전".equals(period) && hour == 12) {
            hour = 0;
        }
        if (hour > 23 || minute > 59) {
            return null;
        }
        return LocalTime.of(hour, minute);
    }

    private List<String> parseListAfterLabel(String message, String... labels) {
        String value = parseValueAfterLabel(message, labels);
        if (value == null) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (String item : value.split("[,·،]")) {
            String trimmed = item.trim();
            if (!trimmed.isBlank() && !result.contains(trimmed)) {
                result.add(trimmed);
            }
        }
        return List.copyOf(result);
    }

    private String parseValueAfterLabel(String message, String... labels) {
        String alternatives = String.join("|", labels);
        Matcher matcher = Pattern.compile(
            "(?:" + alternatives + ")\\s*[:：]?\\s*(.+?)(?=\\s*(?:[,;]\\s*)?(?:"
                + STRUCTURED_LABELS
                + ")\\s*[:：]|[\\n.]|$)"
        ).matcher(message);
        return matcher.find() ? matcher.group(1).trim() : null;
    }

    private String parseTitle(String message) {
        String cleaned = message
            .replaceAll("(오늘|내일|모레|\\d{1,2}월\\s*\\d{1,2}일|[월화수목금토일]요일)", "")
            .replaceAll("(오전|오후)?\\s*\\d{1,2}(?::\\d{2}|시(?:\\s*\\d{1,2}분)?)", "")
            .replaceAll("(까지|부터)", " ")
            .replaceAll("(?:준비\\s*사항|준비물|지참물|챙길 것|가져올 것)\\s*[:：].*$", "")
            .replaceAll("(?:장소|위치)\\s*[:：].*$", "")
            .replaceAll("\\s+", " ")
            .trim();
        String firstSentence = cleaned.split("[.!?\\n]")[0].trim();
        if (firstSentence.isBlank()) {
            return "새로운 일정";
        }
        return firstSentence.length() > 28 ? firstSentence.substring(0, 28) + "…" : firstSentence;
    }

    private String interpretDetails(String message) {
        String interpreted = message
            .replaceAll("\\s*(?:준비\\s*사항|준비물|지참물|챙길 것|가져올 것)\\s*[:：]\\s*[^\\n.]+", "")
            .replaceAll("\\s*(?:장소|위치)\\s*[:：]\\s*[^\\n.]+", "")
            .replaceAll("\\s+", " ")
            .trim();
        if (interpreted.isBlank()) {
            return "";
        }
        if (!interpreted.matches(".*[.!?]$")) {
            interpreted += ".";
        }
        return interpreted.length() > 1000 ? interpreted.substring(0, 997) + "..." : interpreted;
    }

    private static Map<String, DayOfWeek> createWeekdays() {
        Map<String, DayOfWeek> weekdays = new LinkedHashMap<>();
        weekdays.put("월요일", DayOfWeek.MONDAY);
        weekdays.put("화요일", DayOfWeek.TUESDAY);
        weekdays.put("수요일", DayOfWeek.WEDNESDAY);
        weekdays.put("목요일", DayOfWeek.THURSDAY);
        weekdays.put("금요일", DayOfWeek.FRIDAY);
        weekdays.put("토요일", DayOfWeek.SATURDAY);
        weekdays.put("일요일", DayOfWeek.SUNDAY);
        return weekdays;
    }
}
