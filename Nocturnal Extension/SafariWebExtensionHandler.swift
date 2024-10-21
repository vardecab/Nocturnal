import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems[0] as! NSExtensionItem
        let message = item.userInfo?[SFExtensionMessageKey]
        
        if let message = message as? [String: Any] {
            if let messageType = message["type"] as? String {
                if messageType == "saveSettings" {
                    if let settings = message["settings"] as? [String: Any] {
                        // Save settings to UserDefaults
                        UserDefaults.suite?.set(settings, forKey: "darkModeSettings")
                        UserDefaults.suite?.synchronize()
                        
                        // Return the saved settings as confirmation
                        let response = NSExtensionItem()
                        response.userInfo = [ SFExtensionMessageKey: settings ]
                        context.completeRequest(returningItems: [response], completionHandler: nil)
                        return
                    }
                } else if messageType == "getSettings" {
                    // Retrieve settings from UserDefaults
                    let settings = UserDefaults.suite?.dictionary(forKey: "darkModeSettings") ?? [
                        "mode": "auto_sunset",
                        "sunriseTime": "06:00",
                        "sunsetTime": "18:00"
                    ]
                    
                    let response = NSExtensionItem()
                    response.userInfo = [ SFExtensionMessageKey: settings ]
                    context.completeRequest(returningItems: [response], completionHandler: nil)
                    return
                }
            }
        }
        
        context.completeRequest(returningItems: [], completionHandler: nil)
    }
}

extension UserDefaults {
    static let suite = UserDefaults(suiteName: "group.your.app.identifier")
}
