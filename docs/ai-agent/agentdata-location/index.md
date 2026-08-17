所有主流 AI 编程助手（OpenCode、Codex、Cursor 等）都将对话历史保存在本地磁盘，但 CLI 默认只显示当前目录的会话。要查看全部历史，需直接访问这些本地存储文件。

---

## 各工具存储路径与格式 ##

| 工具 | 存储路径（默认） | 格式 | 
| --- | --- | --- |
| OpenCode | ~/.local/share/opencode/opencode.db | SQLite |
| OpenAI Codex | \~/.codex/state_*.sqlite（索引）<br>\~/.codex/sessions/YYYY/MM/DD/*.jsonl（内容） | SQLite + JSONL |
| Cursor | macOS: ~/Library/Application Support/Cursor/User/globalStorage/state.vscdb<br>Windows: ~/AppData/Roaming/Cursor/User/globalStorage/state.vscdb | SQLite (VS Code 风格) |
| Claude Code | ~/.claude/projects/project-slug/session-id.jsonl | JSONL |
| CodeArts | \~/.codeartsdoer/codearts-data/opencode.db（Windows独有IDE）<br> \~/.codeartsdoer/cli-data/opencode.db（CLI）| SQLite |

> 注：~ 表示用户主目录，Windows 下对应 %USERPROFILE%。<br>
> 注：Codex 的存储路径可能因版本不同而有所变化。

---

对于SQLite数据库，可以使用我分享的 [SQLite Browser](https://xiao-blog.top/share/?type=software&name=db-browser-sqlite) 工具查看。