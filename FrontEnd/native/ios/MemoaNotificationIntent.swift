import AppIntents
import Foundation
import UserNotifications

struct SaveMemoaNotificationIntent: AppIntent {
  static var title: LocalizedStringResource = "알림을 MemoA에 임시저장"
  static var description = IntentDescription("선택한 앱의 알림 내용을 분석하고 MemoA 홈에 일정 후보로 저장합니다.")
  static var openAppWhenRun = false
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

  @Parameter(title: "알림 내용") var message: String
  @Parameter(title: "앱 이름", default: "단축어") var appName: String
  @Parameter(title: "알림 제목", default: "") var notificationTitle: String

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let store = ShortcutStore.shared
    guard let candidate = try store.insert(message: message, appName: appName, title: notificationTitle) else {
      return .result(dialog: "일정 표현이 없거나 이미 처리한 알림입니다.")
    }
    // Persist before networking so an offline or interrupted execution cannot lose the input.
    let analysis = await analyze(candidate.text)
    let retained = try store.finish(id: candidate.id, analysis: analysis)
    if retained { await notify(candidate: candidate, analysis: analysis) }
    return .result(dialog: analysis == nil
      ? "메시지를 임시저장했어요. MemoA를 열면 분석을 다시 시도합니다."
      : "일정 후보를 임시저장했어요. MemoA 홈에서 확인해 주세요.")
  }

  private func analyze(_ message: String) async -> ShortcutAnalysis? {
    guard let base = Bundle.main.object(forInfoDictionaryKey: "MemoaApiBaseUrl") as? String,
      let url = URL(string: base.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/analysis"),
      ["http", "https"].contains(url.scheme?.lowercased() ?? "") else { return nil }
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.dateFormat = "yyyy-MM-dd"
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    // Source metadata stays out of the text sent to AI. No provider key is stored in this app.
    request.httpBody = try? JSONSerialization.data(withJSONObject: ["message": message, "sourceType": "SHARE", "referenceDate": formatter.string(from: Date())])
    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = 25
    configuration.timeoutIntervalForResource = 28
    let session = URLSession(configuration: configuration)
    defer { session.invalidateAndCancel() }
    do {
      let (data, response) = try await session.data(for: request)
      guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else { return nil }
      var result = try JSONDecoder().decode(ShortcutAnalysis.self, from: data)
      result.sourceType = "SHARE"
      return result.isValid ? result : nil
    } catch {
      // The queued candidate remains available; neither message content nor credentials are logged.
      return nil
    }
  }

  private func notify(candidate: ShortcutCandidate, analysis: ShortcutAnalysis?) async {
    let center = UNUserNotificationCenter.current()
    let settings = await center.notificationSettings()
    guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
    let content = UNMutableNotificationContent()
    content.title = "일정 후보를 임시저장했어요"
    content.body = analysis?.title ?? "MemoA 홈에서 메시지를 확인하고 분석해 주세요."
    content.sound = .default
    try? await center.add(UNNotificationRequest(identifier: "memoa-shortcut-" + candidate.id, content: content, trigger: nil))
  }
}

struct MemoaAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: SaveMemoaNotificationIntent(), phrases: ["\(.applicationName)에 알림 저장"], shortTitle: "알림 임시저장", systemImageName: "tray.and.arrow.down")
  }
}
