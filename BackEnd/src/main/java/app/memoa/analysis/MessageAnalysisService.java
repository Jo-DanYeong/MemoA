package app.memoa.analysis;

import org.springframework.stereotype.Service;

@Service
public class MessageAnalysisService {
    private final RemoteAiAnalyzer remoteAiAnalyzer;
    private final RuleBasedAnalyzer ruleBasedAnalyzer;

    public MessageAnalysisService(RemoteAiAnalyzer remoteAiAnalyzer, RuleBasedAnalyzer ruleBasedAnalyzer) {
        this.remoteAiAnalyzer = remoteAiAnalyzer;
        this.ruleBasedAnalyzer = ruleBasedAnalyzer;
    }

    public AnalysisResponse analyze(AnalysisRequest request) {
        return remoteAiAnalyzer.analyze(request).orElseGet(() -> ruleBasedAnalyzer.analyze(request));
    }
}
