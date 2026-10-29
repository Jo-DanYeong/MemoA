import Foundation

@main
enum ShortcutStoreTests {
  static func check(_ condition: @autoclosure () throws -> Bool) rethrows {
    let passed = try condition()
    precondition(passed)
  }

  static func main() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent("memoa-shortcut-tests-" + UUID().uuidString, isDirectory: true)
    defer { try? FileManager.default.removeItem(at: directory) }
    let store = ShortcutStore(directory: directory)
    let now = Date().timeIntervalSince1970 * 1000
    let first = try store.insert(message: "팀방: 내일 오후 2시 회의, 노트북 지참", appName: "메신저", title: "팀방", now: now)!
    precondition(first.text == "내일 오후 2시 회의, 노트북 지참")
    precondition(first.sourceType == "SHARE" && first.analysisPending)
    let reopened = ShortcutStore(directory: directory)
    try check(try reopened.pending(now: now).map(\.id) == [first.id])
    try check(try store.insert(message: "팀방: 내일 오후 2시 회의, 노트북 지참", appName: "메신저", title: "팀방", now: now + 1) == nil)
    try store.remove(id: first.id)
    try check(try !store.finish(id: first.id, analysis: nil))
    try check(try store.pending(now: now).isEmpty)
    try check(try store.insert(message: first.text, appName: "메신저", title: "팀방", now: now + 2) == nil)
    try check(try store.insert(message: "안녕 잘 지내?", appName: "메신저", title: "내일 회의") == nil)
    try check(try store.insert(message: "내일 회의", appName: "MemoA", title: "") == nil)
    let offline = try store.insert(message: "내일 서류 제출", appName: "메신저", title: "", now: now)!
    try check(try store.finish(id: offline.id, analysis: nil))
    try check(try store.pending(now: now).first?.analysisPending == false)
    let interrupted = try store.insert(message: "모레 면접 참석", appName: "문자", title: "", now: now)!
    try check(try store.pending(now: now + 60_001).first(where: { $0.id == interrupted.id })?.analysisPending == false)
    for index in 0..<70 {
      _ = try store.insert(message: "내일 \(index)번 회의 준비", appName: "메신저", title: "", now: now)
    }
    let pending = try store.pending(now: now)
    precondition(pending.count == 50 && pending[0].text == "내일 69번 회의 준비")
    try Data("broken json".utf8).write(to: directory.appendingPathComponent("shortcut-candidates.json"))
    do { _ = try store.pending(); fatalError("Corrupt storage must not be silently overwritten") }
    catch { /* Expected; retain the original file for recovery. */ }
    print("ShortcutStore: persistence, sender stripping, filtering, deduplication, deletion, offline recovery and queue limit passed")
  }
}
