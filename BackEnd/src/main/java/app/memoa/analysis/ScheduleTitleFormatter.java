package app.memoa.analysis;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ScheduleTitleFormatter {
    private static final Pattern PREFIX = Pattern.compile("^\\[([^]]+)]\\s*");
    private static final Pattern EXPLICIT_CONTEXT = Pattern.compile(
        "(?:참석자|기관|발신자|대화방|알림\\s*출처)\\s*[:：]\\s*([^,.;\\n]+)"
    );

    private ScheduleTitleFormatter() {
    }

    static String format(String message, String title, String location) {
        String safeTitle = title == null ? "" : title.trim();
        Matcher prefix = PREFIX.matcher(safeTitle);
        String category = prefix.find() ? prefix.group(1).trim() : categoryFor(message);
        String core = PREFIX.matcher(safeTitle)
            .replaceFirst("")
            .replaceFirst("[.!?]+$", "")
            .trim();
        if (core.isBlank()) {
            core = "새로운 일정";
        }

        List<String> contexts = new ArrayList<>();
        Matcher explicitContext = EXPLICIT_CONTEXT.matcher(message == null ? "" : message);
        if (explicitContext.find()) {
            contexts.add(explicitContext.group(1).trim());
        }
        if (location != null && !location.isBlank() && !contexts.contains(location) && !core.contains(location)) {
            contexts.add(location);
        }

        String context = !core.contains("(") && !contexts.isEmpty()
            ? " (" + String.join(", ", contexts) + ")"
            : "";
        String formatted = "[" + category + "] " + core + context;
        return formatted.length() > 60 ? formatted.substring(0, 59) + "…" : formatted;
    }

    private static String categoryFor(String message) {
        String source = message == null ? "" : message;
        if (source.matches(".*주간\\s*회의.*")) return "주간회의";
        if (source.matches(".*(?:수행평가|과제).*")) return "과제";
        if (source.contains("설명회")) return "설명회";
        if (source.contains("세미나")) return "세미나";
        if (source.contains("회의")) return "회의";
        if (source.contains("미팅")) return "미팅";
        if (source.matches(".*보고(?!서).*")) return "보고";
        if (source.matches(".*(?:발표|프레젠테이션).*")) return "발표";
        if (source.contains("계약")) return "계약";
        if (source.matches(".*(?:협의|조율).*")) return "협의";
        if (source.matches(".*(?:상담|면접).*")) return "상담";
        if (source.contains("출장")) return "출장";
        if (source.contains("여행")) return "여행";
        if (source.matches(".*(?:전시|미술관).*")) return "전시";
        if (source.matches(".*(?:공연|뮤지컬|콘서트).*")) return "공연";
        if (source.contains("결혼식")) return "결혼식";
        if (source.matches(".*(?:생일|생신).*")) return "생일";
        if (source.matches(".*(?:치과|스케일링).*")) return "치과";
        if (source.matches(".*(?:병원|진료|검진).*")) return "병원";
        if (source.matches(".*(?:운동|PT|헬스).*")) return "운동";
        if (source.matches(".*(?:저녁|식사).*")) return "저녁";
        if (source.contains("동창")) return "동창회";
        if (source.matches(".*(?:마트|장보기).*")) return "마트";
        if (source.matches(".*(?:자동차|엔진오일|정비).*")) return "자동차";
        if (source.matches(".*(?:충전|완충).*")) return "충전";
        if (source.matches(".*(?:기획서|초안|집중\\s*업무).*")) return "개인업무";
        if (source.contains("제출")) return "제출";
        if (source.contains("접수")) return "접수";
        if (source.contains("신청")) return "신청";
        if (source.contains("예약")) return "예약";
        if (source.matches(".*(?:약속|만나).*")) return "약속";
        return "일정";
    }
}
