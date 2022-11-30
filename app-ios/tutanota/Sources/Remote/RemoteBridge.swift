import Foundation
import DictionaryCoding
import CryptoTokenKit

/// Gateway for communicating with Javascript code in WebView. Can send messages and handle requests.
class RemoteBridge : NSObject, NativeInterface {
  private let webView: WKWebView
  private let viewController: ViewController
  private let commonSystemFacade: IosCommonSystemFacade
  private var commonNativeFacade: CommonNativeFacade!
  private var mobileFacade: MobileFacade!
  private var globalDispatcher: IosGlobalDispatcher!

  private var requestId = 0
  private var requests = [String : CheckedContinuation<String, Error>]()

  init(
    webView: WKWebView,
    viewController: ViewController,
    commonSystemFacade: IosCommonSystemFacade,
    fileFacade: FileFacade,
    nativeCredentialsFacade: NativeCredentialsFacade,
    nativeCryptoFacade: NativeCryptoFacade,
    themeFacade: ThemeFacade,
    appDelegate: AppDelegate,
    alarmManager: AlarmManager,
    userPreferences: UserPreferenceFacade,
    keychainManager: KeychainManager
  ) {
    self.webView = webView
    self.viewController = viewController
    self.commonSystemFacade = commonSystemFacade
    self.mobileFacade = nil
    self.commonNativeFacade = nil
    self.globalDispatcher = nil
    
    
    super.init()
    self.commonNativeFacade = CommonNativeFacadeSendDispatcher(transport: self)
    let nativePushFacade = IosNativePushFacade(
      appDelegate: appDelegate,
      alarmManager: alarmManager,
      userPreferences: userPreferences,
      keychainManager: keychainManager,
      commonNativeFacade: self.commonNativeFacade
    )
    self.globalDispatcher = IosGlobalDispatcher(
      commonSystemFacade: commonSystemFacade,
      fileFacade: fileFacade,
      mobileSystemFacade: IosMobileSystemFacade(contactsSource: ContactsSource()),
      nativeCredentialsFacade: nativeCredentialsFacade,
      nativeCryptoFacade: nativeCryptoFacade,
      nativePushFacade: nativePushFacade,
      sqlCipherFacade: IosSqlCipherFacade(),
      themeFacade: themeFacade
    )
    self.mobileFacade = MobileFacadeSendDispatcher(transport: self)
    self.webView.configuration.userContentController.add(self, name: "nativeApp")
  }

  /** Part of the NativeInterface. Sends request to the web part. Should not be used directly but through the send dispatchers. */
  func sendRequest(requestType: String, args: [String]) async throws -> String {
    self.requestId = self.requestId + 1
    let requestId = "app\(self.requestId)"
    await self.commonSystemFacade.awaitForInit()
    
    return try await withCheckedThrowingContinuation { continuation in
      self.requests[requestId] = continuation
      let parts: [String] = ["request", requestId, requestType] + args
      self.postMessage(encodedMessage: parts.joined(separator: "\n"))
    }
  }


  private func sendResponse(requestId: String, value: String) {
    let parts: [String] = ["response", requestId, value]

    self.postMessage(encodedMessage: parts.joined(separator: "\n"))
  }

  private func sendErrorResponse(requestId: String, err: Error) {
    TUTSLog("Error: \(err)")

    let responseError: ResponseError
    var parts : [String] = ["requestError", requestId]
    if let err = err as? TutanotaError {
      responseError = ResponseError(name: err.name, message: err.message, stack: err.underlyingError.debugDescription)
    } else {
      let nsError = err as NSError
      let userInfo = nsError.userInfo
      let message = userInfo["message"] as? String ?? err.localizedDescription
      let underlyingError = nsError.userInfo[NSUnderlyingErrorKey] as! NSError?

      responseError = ResponseError(
        name: nsError.domain,
        message: message,
        stack:  underlyingError?.debugDescription ?? ""
      )
    }
    parts.append(toJson(responseError))

    let bridgeMessage = parts.joined(separator: "\n")
    self.postMessage(encodedMessage: bridgeMessage)
  }

  private func postMessage(encodedMessage: String) {
    DispatchQueue.main.async {
      let base64 = encodedMessage.data(using: .utf8)!.base64EncodedString()
      let js = "tutao.nativeApp.receiveMessageFromApp('\(base64)')"
      self.webView.evaluateJavaScript(js, completionHandler: nil)
    }
  }

  private func handleResponse(id: String, value: String) {
    if let request = self.requests[id] {
      self.requests.removeValue(forKey: id)
      request.resume(returning: value)
    }
  }

  private func handleRequest(type: String, requestId: String, args: String) {
    Task {
      do {
        let value: String = try await self.handleRequest(method: type, args: args)
        self.sendResponse(requestId: requestId, value: value)
      } catch {
        self.sendErrorResponse(requestId: requestId, err: error)
      }
    }
  }

  private func handleRequest(method: String, args encodedArgs: String) async throws -> String {
    assert(method == "ipc", "invalid remote request method \(method)")
      let ipcArgs = encodedArgs.split(separator: "\n").map { String($0) }
      let facade = try! JSONDecoder().decode(String.self, from: ipcArgs[0].data(using: .utf8)!)
      let method = try! JSONDecoder().decode(String.self, from: ipcArgs[1].data(using: .utf8)!)
      return try await self.globalDispatcher.dispatch(facadeName: facade, methodName: method, args: Array(ipcArgs[2..<ipcArgs.endIndex]))
  }
  
  private func handleRequestError(id: String, error: String) -> Void {
    TUTSLog("got error for req \(id): \(error)")
    
    if let request = self.requests[id] {
      self.requests.removeValue(forKey: id)
      request.resume(throwing: TUTErrorFactory.createError(error))
    }
  }
}

extension RemoteBridge : WKScriptMessageHandler {
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    let body = message.body as! String
    let parts = body.split(separator: "\n", maxSplits: 2, omittingEmptySubsequences: false)
    // type
    // requestId
    // ...rest
    let type = parts[0]
    let requestId = String(parts[1])

    switch type {
    case "response":
      let value = parts[2]
      self.handleResponse(id: requestId, value: String(value))
    case "errorResponse":
      TUTSLog("Request failed: \(type) \(requestId)")
      // We don't "reject" requests right now
      self.requests.removeValue(forKey: requestId)
    case "requestError":
      let errorJSON = String(parts[2])
      self.handleRequestError(id: requestId, error: errorJSON)
    case "request": 
      // requestType
      // arguments
      let requestParams = parts[2].split(separator: "\n", maxSplits: 1, omittingEmptySubsequences: false)
      let requestType = String(requestParams[0])
      let arguments = String(requestParams[1])
      self.handleRequest(type: requestType, requestId: requestId, args: arguments)
    default:
      fatalError("unknown message type \(type)")
    }
  }
}
