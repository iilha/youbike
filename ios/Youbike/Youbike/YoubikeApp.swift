import SwiftUI

@main
struct YoubikeApp: App {
    var body: some Scene {
        WindowGroup {
            WebViewScreen()
                .ignoresSafeArea()
        }
    }
}
