import Foundation
import CryptoKit

struct ShortcutAnalysis: Codable {
  var title: String
  var details: String
  var dueDate: String
  var dueTime: String?
  var location: String?
  var preparations: [String]
  var sourceType: String
  var confidence: Double
  var needsReview: Bool
  var analysisMethod: String?

  var isValid: Bool {
    !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      && dueDate.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil
      && (dueTime == nil || dueTime?.range(of: #"^([01]\d|2[0-3]):[0-5]\d$"#, options: .regularExpression) != nil)
      && confidence.isFinite && (0...1).contains(confidence)
  }
}

struct ShortcutCandidate: Codable {
  var id: String
  var appName: String
  var title: String
  var text: String
  var receivedAt: Double
  var sourceType = "SHARE"
  var analysisPending = true
  var analysis: ShortcutAnalysis?
}

final class ShortcutStore {
  static let changed = Notification.Name("MemoaShortcutCandidatesChanged")
  static let shared = ShortcutStore(directory: FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("MemoA", isDirectory: true))
  private static let lock = NSLock()
  private let directory: URL
  private var file: URL { directory.appendingPathComponent("shortcut-candidates.json") }

  private struct Recent: Codable { let fingerprint: String; let time: Double }
  private struct State: Codable {
    var pending: [ShortcutCandidate] = []
    var recent: [Recent] = []
  }

  init(directory: URL) { self.directory = directory }

  // The source app and sender are metadata; only message content determines a candidate.
  static func hasScheduleSignal(_ text: String) -> Bool {
    text.range(of: #"오늘|내일|모레|글피|낼|이번\s*주|다음\s*주|주말|[월화수목금토일]요일|\d{1,2}월\s*\d{1,2}일|오전|오후|(?:[01]?\d|2[0-3]):[0-5]\d|\d{1,2}시(?!간)|까지|마감|제출|약속|회의|미팅|면접|예약|방문|신청|접수|참석|만나|보자|준비\s*사항|준비물|가져오|챙겨|충전"#, options: .regularExpression) != nil
  }

  func insert(message: String, appName: String, title: String, now: Double = Date().timeIntervalSince1970 * 1000) throws -> ShortcutCandidate? {
    var content = message.trimmingCharacters(in: .whitespacesAndNewlines)
    let sender = title.trimmingCharacters(in: .whitespacesAndNewlines)
    for separator in [":", "："] where !sender.isEmpty && content.hasPrefix(sender + separator) {
      content = String(content.dropFirst(sender.count + 1)).trimmingCharacters(in: .whitespacesAndNewlines)
      break
    }
    content = content.replacingOccurrences(of: #"(?m)^\s*(?:알림\s*출처|발신자|대화방|보낸\s*앱|앱\s*이름)\s*[:：]\s*[^\r\n]+"#, with: "", options: .regularExpression)
    let body = String(content.trimmingCharacters(in: .whitespacesAndNewlines).prefix(2000))
    let source = String(appName.trimmingCharacters(in: .whitespacesAndNewlines).prefix(100))
    guard body.count >= 3, Self.hasScheduleSignal(body), source.lowercased() != "memoa", source != "app.memoa.sideload" else { return nil }
    let heading = String(title.trimmingCharacters(in: .whitespacesAndNewlines).prefix(300))
    let fingerprint = SHA256.hash(data: try JSONEncoder().encode([source, heading, body])).map { String(format: "%02x", $0) }.joined()
    Self.lock.lock()
    defer { Self.lock.unlock() }
    var state = try read()
    state.recent.removeAll { now - $0.time > 90_000 }
    guard !state.recent.contains(where: { $0.fingerprint == fingerprint }) else { return nil }
    let candidate = ShortcutCandidate(id: UUID().uuidString, appName: source.isEmpty ? "단축어" : source, title: heading, text: body, receivedAt: now)
    state.pending.insert(candidate, at: 0)
    state.pending = Array(state.pending.prefix(50))
    state.recent.append(Recent(fingerprint: fingerprint, time: now))
    state.recent = Array(state.recent.suffix(100))
    try write(state)
    return candidate
  }

  func pending(now: Double = Date().timeIntervalSince1970 * 1000) throws -> [ShortcutCandidate] {
    Self.lock.lock()
    defer { Self.lock.unlock() }
    var state = try read()
    var recovered = false
    for index in state.pending.indices where state.pending[index].analysisPending && now - state.pending[index].receivedAt > 60_000 {
      state.pending[index].analysisPending = false
      recovered = true
    }
    if recovered { try write(state) }
    return state.pending
  }

  @discardableResult
  func finish(id: String, analysis: ShortcutAnalysis?) throws -> Bool {
    Self.lock.lock()
    defer { Self.lock.unlock() }
    var state = try read()
    // A late network response must never recreate a deleted candidate.
    guard let index = state.pending.firstIndex(where: { $0.id == id }) else { return false }
    state.pending[index].analysis = analysis
    state.pending[index].analysisPending = false
    try write(state)
    return true
  }

  func remove(id: String) throws {
    Self.lock.lock()
    defer { Self.lock.unlock() }
    var state = try read()
    state.pending.removeAll { $0.id == id }
    try write(state)
  }

  private func read() throws -> State {
    guard FileManager.default.fileExists(atPath: file.path) else { return State() }
    return try JSONDecoder().decode(State.self, from: Data(contentsOf: file))
  }

  private func write(_ state: State) throws {
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let data = try JSONEncoder().encode(state)
    #if os(iOS)
    try data.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    #else
    try data.write(to: file, options: .atomic)
    #endif
    DispatchQueue.main.async { NotificationCenter.default.post(name: Self.changed, object: nil) }
  }
}
