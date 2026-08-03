# Frontend ADR index

Open only the ADRs relevant to the change. Current code and tests remain the
source of executable truth.

| Concern                               | ADRs               | Status note                                                                             |
| ------------------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| Layering and feature boundaries       | 001, 009           | 009 supersedes 001's old physical layout                                                |
| Server state and dependency injection | 002, 003, 008      | Accepted; Catalog may directly delegate repository methods when no orchestration exists |
| OIDC/session behavior                 | 004, 006, 007, 015 | Accepted; 015 extends Result flow to Auth                                               |
| UI component system                   | 005                | Accepted                                                                                |
| PUT ids and runtime validation        | 010                | Accepted                                                                                |
| HTTP decoder boundary                 | 011                | Accepted                                                                                |
| Category routed editor                | 012, 013           | 013 supersedes 012's outlet-context detail                                              |
| Catalog Result flow                   | 014                | Accepted; its Auth-out-of-scope note is superseded by 015                               |
| Tags removal                          | 016                | Accepted; backend Tag API remains                                                       |

There is no separate decisions log. Durable choices belong in these ADRs;
working conventions belong in `AGENTS.md` or the canonical frontend skill;
current progress belongs in `docs/STATUS.md`.
