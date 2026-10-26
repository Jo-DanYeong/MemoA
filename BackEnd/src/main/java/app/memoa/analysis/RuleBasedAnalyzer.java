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
    private static final Pattern KOREAN_TIME = Pattern.compile("(?:(오전|오후)\\s*)?(\\d{1,2})시(?!간)(?:\\s*(\\d{1,2})분)?");
    private static final String CHARGE_DURATION = "(?:(?:\\d+\\s*시간\\s*)?(?:\\d+\\s*분))";
    private static final Pattern CHARGE_TARGET = Pattern.compile(
        "(\\d{1,3})\\s*%\\s*(?:충전\\s*)?까지\\s*(" + CHARGE_DURATION + ")"
    );
    private static final Pattern FULL_CHARGE_TARGET = Pattern.compile(
        "(?:완충|완전\\s*충전)\\s*까지\\s*(" + CHARGE_DURATION + ")"
    );
    private static final Pattern CHARGING_REMAINING = Pattern.compile(
        "^(?:충전량\\s*)?\\d{1,3}\\s*%\\s*\\(\\s*((?:\\d+\\s*시간)?\\s*(?:\\d+\\s*분)?)\\s*후\\s*(?:충전\\s*완료|완충)\\s*\\)$"
    );
    private static final Pattern DATE_SIGNAL = Pattern.compile(
        "오늘|내일|모레|글피|\\d{1,2}월\\s*\\d{1,2}일|[월화수목금토일]요일|20\\d{2}"
    );
    private static final Pattern NATURAL_LOCATION = Pattern.compile(
        "(?:^|[\\s,])((?:\\d+층\\s*)?(?:\\d+호\\s*)?[가-힣A-Za-z0-9]+(?:실|관|역|점|센터|대학교|학교|학원|회사|카페|식당|병원|도서관|체육관|운동장|공원|매장|집))에서(?:\\s|$)"
    );
    private static final Pattern DESTINATION_LOCATION = Pattern.compile(
        "(?:^|[\\s,])((?:\\d+층\\s*)?(?:\\d+호\\s*)?[가-힣A-Za-z0-9]+(?:실|관|역|점|센터|대학교|학교|학원|회사|카페|식당|병원|도서관|체육관|운동장|공원|매장|집))(?:으)?로(?=\\s|$)"
    );
    private static final Pattern SHORTHAND_LOCATION = Pattern.compile(
        "(?:^|\\s)([가-힣A-Za-z0-9]+(?:초등학교|중학교|고등학교|대학교|학교|학원|병원|도서관|센터|카페|역|점|대))(?=\\s|$)"
    );
    private static final Pattern PREPARATION_ACTION = Pattern.compile(
        "(?:챙겨\\s*(?:와|오|오기|주세요)?|가져\\s*(?:와|오|오기|주세요)?|들고|지참(?:해서|하여|하세요|하기|해)?|준비(?:해서|하여|하세요|하기|해)?)"
    );
    private static final Pattern REQUIRED_ITEMS = Pattern.compile(
        "((?:[가-힣A-Za-z0-9]+(?:와|과|,|·)\\s*)*[가-힣A-Za-z0-9]+)(?:은|는|이|가|을|를)?\\s*(?:필참|필수(?:임|입니다)?|필요(?:함|합니다|해요)?)"
    );
    private static final Pattern PREPARATION_CONTEXT = Pattern.compile(
        "^.*(?:설명회|세미나|회의|상담|면접|행사|수업|강의|모임|시험|평가|접수|방문)\\s+"
    );
    private static final Pattern EVENT_ATTENDANCE = Pattern.compile(
        "((?:[가-힣A-Za-z0-9]+\\s+){0,5}[가-힣A-Za-z0-9]*(?:설명회|세미나|회의|상담|면접|행사|수업|강의|모임))(?:\\s*(?:에\\s*)?(?:참석(?:하기|해|하세요)?|가(?:기|세요)?|방문(?:하기|해|하세요)?))?"
    );
    private static final Pattern TASK_ACTION = Pattern.compile(
        "([가-힣A-Za-z0-9]+(?:\\s+[가-힣A-Za-z0-9]+){0,2})\\s*(제출|접수|신청|예약|작성|확인|구매|반납|납부|연락|정리|공부)(?:하(?:기|세요|고)?|하기|해)?(?=[.!?\\s]|$)"
    );
    private static final String STRUCTURED_LABELS =
        "장소|위치|준비\\s*사항|준비물|지참물|챙길 것|가져올 것";
    private static final Map<String, DayOfWeek> WEEKDAYS = createWeekdays();

    public AnalysisResponse analyze(AnalysisRequest request) {
        String message = request.message().trim();
        LocalDate referenceDate = request.referenceDate() == null ? LocalDate.now() : request.referenceDate();
        LocalTime time = parseTime(message);
        String location = parseLocation(message);
        List<String> preparations = parsePreparations(message);
        boolean hasDateSignal = DATE_SIGNAL.matcher(message).find();
        double confidence = Math.round(Math.min(
                0.92,
                0.42
                    + (hasDateSignal ? 0.18 : 0)
                    + (time != null ? 0.12 : 0)
                    + (location != null ? 0.10 : 0)
                    + (!preparations.isEmpty() ? 0.10 : 0)
            ) * 100.0) / 100.0;

        return new AnalysisResponse(
            ScheduleTitleFormatter.format(message, parseTitle(message, location, preparations), location),
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
        return parsePreparationItems(value);
    }

    private List<String> parsePreparationItems(String value) {
        String normalized = value
            .replaceAll("([가-힣A-Za-z0-9]+)(?:와|과)\\s+(?=[가-힣A-Za-z0-9])", "$1,")
            .replaceAll("\\s+(?:및|그리고)\\s+", ",");
        List<String> result = new ArrayList<>();
        for (String item : normalized.split("[,·،]")) {
            String trimmed = item.trim().replaceFirst("[을를]$", "").trim();
            if (!trimmed.isBlank() && !result.contains(trimmed)) {
                result.add(trimmed);
            }
        }
        return List.copyOf(result);
    }

    private String parseLocation(String message) {
        String labeled = parseValueAfterLabel(message, "장소", "위치");
        if (labeled != null) {
            return labeled;
        }
        Matcher matcher = DESTINATION_LOCATION.matcher(message);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        matcher = NATURAL_LOCATION.matcher(message);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        matcher = SHORTHAND_LOCATION.matcher(message);
        return matcher.find() ? matcher.group(1).trim() : null;
    }

    private List<String> parsePreparations(String message) {
        List<String> labeled = parseListAfterLabel(
            message,
            "준비 사항",
            "준비사항",
            "준비물",
            "지참물",
            "챙길 것",
            "가져올 것"
        );
        if (!labeled.isEmpty()) {
            return labeled;
        }

        Matcher requiredItems = REQUIRED_ITEMS.matcher(message);
        if (requiredItems.find()) {
            return parsePreparationItems(requiredItems.group(1));
        }

        Matcher action = PREPARATION_ACTION.matcher(message);
        if (!action.find()) {
            return List.of();
        }
        String beforeAction = message.substring(0, action.start());
        String[] clauses = beforeAction.split(
            "(?:[.!?\\n,;]|(?:제출|완료|확인|작성|끝내)하고|그리고)\\s*"
        );
        String candidate = clauses[clauses.length - 1]
            .replaceFirst("^.*(?:에서|에|(?:으)?로)\\s+", "")
            .replaceFirst(PREPARATION_CONTEXT.pattern(), "")
            .replaceFirst("^(?:오늘|내일|모레|[월화수목금토일]요일)\\s*", "")
            .trim();
        return parsePreparationItems(candidate);
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

    private String parseTitle(String message, String location, List<String> preparations) {
        String chargingTitle = chargingEstimateTitle(message);
        if (chargingTitle != null) {
            return chargingTitle;
        }

        String cleaned = message
            .replaceAll("(오늘|내일|모레|\\d{1,2}월\\s*\\d{1,2}일|[월화수목금토일]요일)", "")
            .replaceAll("(오전|오후)?\\s*\\d{1,2}(?::\\d{2}|시(?:\\s*\\d{1,2}분)?)(?:까지|에|부터)?", "")
            .replaceAll("(까지|부터)", " ")
            .replaceAll("(?:준비\\s*사항|준비물|지참물|챙길 것|가져올 것)\\s*[:：].*$", "")
            .replaceAll("(?:장소|위치)\\s*[:：].*$", "")
            .replaceAll("((?:[가-힣A-Za-z0-9]+(?:와|과|,|·)\\s*)*[가-힣A-Za-z0-9]+)(?:은|는|이|가|을|를)?\\s*(?:필참|필수(?:임|입니다)?|필요(?:함|합니다|해요)?)", "")
            .replaceAll("(?:[가-힣A-Za-z0-9]+(?:와|과|,|·)\\s*)*[가-힣A-Za-z0-9]+(?:은|는|이|가|을|를)?\\s*들고", "")
            .replaceAll("\\s*하고\\s+[^.!?\\n]+?(?:을|를)\\s*(?:챙겨|가져|지참|준비).*$", "")
            .replaceAll("\\s+", " ")
            .trim();
        if (location != null) {
            cleaned = cleaned
                .replace(location + "에서", " ")
                .replace(location + "으로", " ")
                .replace(location + "로", " ")
                .replace(location, " ")
                .replaceAll("\\s+", " ")
                .trim();
        }
        for (String preparation : preparations) {
            cleaned = cleaned.replace(preparation, " ");
        }
        cleaned = PREPARATION_ACTION.matcher(cleaned).replaceAll(" ").replaceAll("\\s+", " ").trim();

        Matcher event = EVENT_ATTENDANCE.matcher(cleaned);
        if (event.find()) {
            return compactTitle(event.group(1).trim() + " 참석");
        }

        Matcher task = TASK_ACTION.matcher(cleaned);
        String taskTitle = null;
        while (task.find()) {
            String[] objectTokens = task.group(1).trim().split("\\s+");
            int objectStart = 0;
            for (int index = 0; index < objectTokens.length; index++) {
                if (objectTokens[index].matches(".*(?:해서|하고|후|뒤)$")) {
                    objectStart = index + 1;
                }
            }
            String object = String.join(" ", java.util.Arrays.copyOfRange(objectTokens, objectStart, objectTokens.length))
                .replaceFirst("[은는이가을를]$", "");
            taskTitle = (object + " " + task.group(2)).replaceAll("\\s+", " ").trim();
        }
        if (taskTitle != null) {
            return compactTitle(taskTitle);
        }

        cleaned = cleaned.replaceFirst("(?:방문해서\\s*)?(?:가|오)기\\s*$", "").trim();
        String firstSentence = cleaned.split("[.!?\\n]")[0].trim();
        if (firstSentence.isBlank()) {
            return "새로운 일정";
        }
        return compactTitle(firstSentence);
    }

    private String compactTitle(String title) {
        return title.length() > 28 ? title.substring(0, 28) + "…" : title;
    }

    private String chargingEstimateTitle(String message) {
        String targetTitle = null;
        String fullTitle = null;
        Matcher target = CHARGE_TARGET.matcher(message);
        while (target.find()) {
            int percentage = Math.min(100, Integer.parseInt(target.group(1)));
            String duration = target.group(2).trim().replaceAll("\\s+", " ");
            if (percentage == 100) {
                fullTitle = "완충까지 " + duration;
            } else if (targetTitle == null) {
                targetTitle = percentage + "%까지 " + duration;
            }
        }

        Matcher full = FULL_CHARGE_TARGET.matcher(message);
        if (full.find()) {
            fullTitle = "완충까지 " + full.group(1).trim().replaceAll("\\s+", " ");
        }
        if (targetTitle != null && fullTitle != null) {
            return targetTitle + " · " + fullTitle;
        }
        if (targetTitle != null || fullTitle != null) {
            return targetTitle != null ? targetTitle : fullTitle;
        }

        Matcher remaining = CHARGING_REMAINING.matcher(message);
        if (!remaining.matches() || remaining.group(1).isBlank()) {
            return null;
        }
        return "완충까지 " + remaining.group(1).trim().replaceAll("\\s+", " ");
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
