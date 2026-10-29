import Foundation
import React
import UserNotifications

@objc(MemoaShortcutCapture)
final class MemoaShortcutCapture: RCTEventEmitter {
  private var observing = false
  private var observer: NSObjectProtocol?

  override init() {
    super.init()
    observer = NotificationCenter.default.addObserver(forName: ShortcutStore.changed, object: nil, queue: .main) { [weak self] _ in
      guard let self = self, self.observing else { return }
      self.sendEvent(withName: "MemoaNotificationCandidatesChanged", body: nil)
    }
  }

  deinit { if let observer = observer { NotificationCenter.default.removeObserver(observer) } }
  override static func requiresMainQueueSetup() -> Bool { true }
  override func supportedEvents() -> [String]! { ["MemoaNotificationCandidatesChanged"] }
  override func startObserving() { observing = true }
  override func stopObserving() { observing = false }

  @objc(getPending:rejecter:)
  func getPending(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    do {
      let data = try JSONEncoder().encode(ShortcutStore.shared.pending())
      resolve(try JSONSerialization.jsonObject(with: data))
    } catch { reject("SHORTCUT_READ", "단축어의 일정 후보를 읽지 못했어요.", error) }
  }

  @objc(removePending:resolver:rejecter:)
  func removePending(_ id: String, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    do {
      try ShortcutStore.shared.remove(id: id)
      UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["memoa-shortcut-" + id])
      resolve(nil)
    } catch { reject("SHORTCUT_REMOVE", "일정 후보를 삭제하지 못했어요.", error) }
  }

  @objc(alertPermission:rejecter:)
  func alertPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      resolve(settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional)
    }
  }

  @objc(requestAlertPermission:rejecter:)
  func requestAlertPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if let error = error { reject("SHORTCUT_PERMISSION", "알림 권한을 요청하지 못했어요.", error) }
      else { resolve(granted) }
    }
  }
}
