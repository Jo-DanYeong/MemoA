package com.frontend;

import static org.junit.Assert.*;

import java.util.Arrays;
import java.util.Collections;

import org.junit.Test;

public class NotificationTextParserTest {
    @Test
    public void readsDmFromMessagingPayloadInsteadOfMessageCounter() {
        NotificationTextParser.Content content = NotificationTextParser.parse(
            "Instagram", null, "새 메시지 2개", null,
            Arrays.asList(
                new NotificationTextParser.Message("첫 발신자", "안녕", 100),
                new NotificationTextParser.Message("두 번째 발신자", "내일 오후 3시에 만나자", 200)
            ), false
        );
        assertEquals("두 번째 발신자", content.title);
        assertEquals("내일 오후 3시에 만나자", content.text);
        assertEquals(200, content.timestamp);
        assertTrue(NotificationTextParser.containsSchedule(content));
    }

    @Test
    public void doesNotReloadOldAppointmentWhenNewMessageIsCasual() {
        NotificationTextParser.Content content = NotificationTextParser.parse(
            "대화방", null, "내일 오후 3시 약속", null,
            Arrays.asList(
                new NotificationTextParser.Message("발신자", "내일 오후 3시 약속", 100),
                new NotificationTextParser.Message("발신자", "잘 지내?", 200)
            ), false
        );
        assertEquals("잘 지내?", content.text);
        assertFalse(NotificationTextParser.containsSchedule(content));
    }

    @Test
    public void selectsNewestTimestampEvenWhenPayloadOrderDiffers() {
        NotificationTextParser.Content content = NotificationTextParser.parse(
            "대화방", null, null, null,
            Arrays.asList(
                new NotificationTextParser.Message("발신자", "18:30에 보자", 200),
                new NotificationTextParser.Message("발신자", "안녕", 100)
            ), false
        );
        assertEquals("18:30에 보자", content.text);
        assertTrue(NotificationTextParser.containsSchedule(content));
    }

    @Test
    public void readsMessageLinesInGroupedInboxNotification() {
        NotificationTextParser.Content content = NotificationTextParser.parse(
            "Instagram", null, "새 메시지 2개",
            new CharSequence[]{"안녕", "낼 만나자"}, Collections.emptyList(), true
        );
        assertEquals("낼 만나자", content.text);
        assertTrue(NotificationTextParser.containsSchedule(content));
    }

    @Test
    public void ignoresGroupSummaryThatContainsOnlyCounter() {
        assertNull(NotificationTextParser.parse(
            "Instagram", null, "새 메시지 3개", null, Collections.emptyList(), true
        ));
    }

    @Test
    public void readsStructuredMessageInGroupSummary() {
        NotificationTextParser.Content content = NotificationTextParser.parse(
            "Instagram", null, "새 메시지 2개", null,
            Collections.singletonList(new NotificationTextParser.Message("발신자", "주말에 만나자", 200)), true
        );
        assertTrue(NotificationTextParser.containsSchedule(content));
    }

    @Test
    public void blankExpandedTextFallsBackToStandardBody() {
        NotificationTextParser.Content content = NotificationTextParser.parse(
            "발신자", "   ", "내일 과제 제출", null, Collections.emptyList(), false
        );
        assertEquals("내일 과제 제출", content.text);
        assertTrue(NotificationTextParser.containsSchedule(content));
    }

    @Test
    public void ordinaryExpandedTextStillWorks() {
        NotificationTextParser.Content content = NotificationTextParser.parse(
            "발신자", "내일 오후 3시 회의", "내일 오후…", null, Collections.emptyList(), false
        );
        assertEquals("내일 오후 3시 회의", content.text);
    }

    @Test
    public void ignoresAttachmentOnlyMessagesAndOwnReplies() {
        assertNull(NotificationTextParser.parse(
            "대화방", null, "내일 만나자", null,
            Collections.singletonList(new NotificationTextParser.Message("발신자", null, 200)), false
        ));
        assertNull(NotificationTextParser.parse(
            "대화방", null, "내일 만나자", null,
            Collections.singletonList(new NotificationTextParser.Message(null, "내일 만나자", 200)), false
        ));
    }

    @Test
    public void ordinaryNonScheduleDmIsNotACandidate() {
        assertFalse(NotificationTextParser.containsSchedule(NotificationTextParser.parse(
            "발신자", null, "사진을 보냈습니다", null, Collections.emptyList(), false
        )));
    }

    @Test
    public void missingFieldsDoNotCrash() {
        assertNull(NotificationTextParser.parse(null, null, null, null, null, false));
        assertFalse(NotificationTextParser.containsSchedule(null));
    }
}
