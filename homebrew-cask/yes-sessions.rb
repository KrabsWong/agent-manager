cask "yes-sessions" do
  version "5.6.0"
  sha256 :no_check # 请替换为实际的 SHA256 校验值

  url "https://github.com/KrabsWong/agent-manager/releases/download/v#{version}/Yes-Sessions-#{version}-arm64.dmg"
  name "Yes Sessions"
  desc "AI Session Manager - Browse and resume your AI conversations"
  homepage "https://github.com/KrabsWong/agent-manager"

  # 支持 Apple Silicon 和 Intel
  on_arm do
    url "https://github.com/KrabsWong/agent-manager/releases/download/v#{version}/Yes-Sessions-#{version}-arm64.dmg"
  end
  on_intel do
    url "https://github.com/KrabsWong/agent-manager/releases/download/v#{version}/Yes-Sessions-#{version}-x64.dmg"
  end

  # 自动检测架构
  auto_updates true

  app "Yes-Sessions.app"

  zap trash: [
    "~/Library/Application Support/yes-sessions",
    "~/Library/Preferences/com.yes-sessions.plist",
    "~/Library/Logs/yes-sessions",
    "~/Library/Saved Application State/com.yes-sessions.savedState",
  ]
end
