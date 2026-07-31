from dataclasses import dataclass
from datetime import UTC, date, datetime
from textwrap import dedent
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Category,
    Post,
    PostTag,
    Project,
    ProjectPost,
    ProjectTag,
    Tag,
    Timeline,
)


@dataclass(frozen=True)
class PostSeed:
    title: str
    slug: str
    summary: str
    category_slug: str
    tag_slugs: tuple[str, ...]
    content_md: str
    status: str = "draft"
    confidentiality_checked: bool = False
    published_at: datetime | None = None
    seo_title: str | None = None
    seo_description: str | None = None


@dataclass(frozen=True)
class ProjectSeed:
    title: str
    slug: str
    summary: str
    content_md: str
    background_md: str
    problem_md: str
    role_md: str
    architecture_md: str
    features_md: str
    challenges_md: str
    solutions_md: str
    outcomes_md: str
    next_steps_md: str
    confidentiality_note: str
    status: str
    tag_slugs: tuple[str, ...]
    related_post_slugs: tuple[str, ...]
    started_at: date | None
    ended_at: date | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    is_public: bool = True
    confidentiality_checked: bool = True
    featured: bool = True
    sort_order: int = 0


CATEGORIES = (
    ("通信协议与网络", "communication-networks", "网络传输、接口协议、报文边界与异常路径。", 10),
    ("测试工具开发", "test-tools", "测试平台、自动化工具与可追溯验证工作流。", 20),
    ("软件工程与部署", "software-delivery", "Web 架构、内容安全、部署、备份与回滚。", 30),
    ("FPGA 与数字系统", "fpga-digital-systems", "数字逻辑、时序约束、仿真与接口验证学习记录。", 40),
    ("AI 辅助工程", "ai-assisted-engineering", "AI 参与需求分析、用例设计和工程工具开发的边界。", 50),
)

TAGS = (
    ("Python", "python"),
    ("TCP", "tcp"),
    ("UDP", "udp"),
    ("pytest", "pytest"),
    ("状态机", "state-machine"),
    ("协议解析", "protocol-parsing"),
    ("可追溯性", "traceability"),
    ("FastAPI", "fastapi"),
    ("React", "react"),
    ("PostgreSQL", "postgresql"),
    ("Markdown", "markdown"),
    ("Docker", "docker"),
    ("FPGA", "fpga"),
    ("Verilog", "verilog"),
    ("AI 测试", "ai-testing"),
)


POSTS = (
    PostSeed(
        title="TCP 为什么没有消息边界：测试工具中的粘包与拆包处理",
        slug="tcp-message-boundaries",
        summary="从字节流语义出发，设计可增量解析、可观测且能覆盖异常路径的 TCP 接收循环。",
        category_slug="communication-networks",
        tag_slugs=("tcp", "python", "protocol-parsing"),
        status="published",
        confidentiality_checked=True,
        published_at=datetime(2026, 7, 28, 9, 0, tzinfo=UTC),
        seo_title="TCP 粘包与拆包：测试工具如何恢复消息边界",
        seo_description="解释 TCP 字节流中的消息边界问题，并给出长度字段协议的增量解析、异常处理和验证方法。",
        content_md=dedent(
            """
            ## 问题不是“粘包”，而是边界从未存在

            TCP 向应用提供有序字节流。一次 `send` 对应的数据，接收端可能分几次拿到；多次发送的数据，也可能在一次 `recv` 中返回。所谓粘包、拆包只是应用观察到的现象，不是 TCP 破坏了数据。测试工具如果把“调用一次接收”等同于“收到一帧”，在本机短报文场景可能看似正常，到了延迟、代理转发或高并发环境就会随机失败。

            本文讨论带固定头和长度字段的二进制协议。以分隔符结尾、固定长度或外层 TLS/WebSocket 封装的协议，需要采用对应的边界规则，不能直接照搬。

            ## 增量解析模型

            接收循环只负责读取字节并追加到缓冲区；解析器负责判断缓冲区中是否已经包含完整帧。两者分离后，同一个解析器可以用离线报文、分片数据和真实套接字重复验证。

            ```python
            HEADER_SIZE = 6
            MAX_BODY = 64 * 1024

            def extract_frames(buffer: bytearray) -> list[bytes]:
                frames: list[bytes] = []
                while len(buffer) >= HEADER_SIZE:
                    if buffer[:2] != b"\\xAA\\x55":
                        del buffer[0]
                        continue
                    body_size = int.from_bytes(buffer[2:4], "big")
                    if body_size > MAX_BODY:
                        raise ValueError("declared body is too large")
                    frame_size = HEADER_SIZE + body_size
                    if len(buffer) < frame_size:
                        break
                    frames.append(bytes(buffer[:frame_size]))
                    del buffer[:frame_size]
                return frames
            ```

            解析器必须允许“暂时不够”，但不能无限等待。最大帧长用于阻止损坏长度字段拖住内存；同步字处理用于从噪声或截断帧之后恢复。是否允许自动重同步需要依据协议风险决定：诊断工具可以记录错误后继续，严格一致性测试通常应立即失败。

            ## 正常路径与异常路径

            最小验证矩阵不应只包含一帧一次到达：

            | 输入方式 | 期望结果 |
            | --- | --- |
            | 完整单帧 | 立即输出一帧 |
            | 每次只输入一个字节 | 最后一个字节到达后输出 |
            | 两帧合并输入 | 连续输出两帧 |
            | 一帧加下一帧半个头 | 输出第一帧并保留尾部 |
            | 长度超过上限 | 明确报错且不分配巨量内存 |
            | 错误同步字后跟合法帧 | 按既定策略恢复或失败 |
            | 连接关闭但仍有半帧 | 报告截断，而不是静默丢弃 |

            分片测试应改变切分位置，而不仅是固定切成两段。对长度为 `n` 的报文，可遍历 `1..n-1` 的单切点，再补充多个随机切点。这样无需依赖网络抖动，也能稳定复现边界问题。

            ## 可观测性比“收到了”更重要

            日志应区分读取事件与解析事件：读取时间、字节数、缓冲区剩余量、解析帧序号和错误位置分别记录。原始字节可以保存为十六进制，但公开案例必须使用模拟数据，并限制日志长度，避免把真实协议或敏感负载带入报告。

            ## 取舍与结论

            `recv_exactly` 适合已知下一段长度的流程，但仍需处理提前断开；环形缓冲区适合高吞吐场景，普通测试工具先使用清晰的 `bytearray` 往往更易验证。关键不是选择最复杂的数据结构，而是把网络读取、边界恢复、字段校验和业务断言分成可独立测试的步骤。

            只要测试中系统覆盖任意分片、合并、截断和非法长度，就不会再把一次接收误当成一个消息。这个解析边界也是“可配置协议帧解析与回放工具”项目的基础。
            """
        ).strip(),
    ),
    PostSeed(
        title="UDP 测试不能只比较收到的数据",
        slug="udp-test-assertions",
        summary="梳理 UDP 测试中来源、时序、重复、丢失、长度和会话上下文等容易被遗漏的断言。",
        category_slug="communication-networks",
        tag_slugs=("udp", "python", "traceability"),
        content_md=dedent(
            """
            ## 相同负载不代表同一次交互

            UDP 保留数据报边界，却不保证到达、顺序或唯一性。测试脚本只写 `assert received == expected`，只能确认某段负载相同，无法说明报文来自预期端点、出现在规定时间窗、没有重复，也无法区分本轮响应与上一轮滞留的数据。

            本文适用于请求—响应式 UDP 协议和单机模拟环境。广播、组播、实时音视频等场景的容错模型不同，应先定义允许的丢包与乱序范围。

            ## 建立完整的观察对象

            接收结果至少应包含负载、来源地址、接收时间和本地套接字上下文。解析后再加入事务标识、消息类型、序列号和校验结果。断言不是直接散落在接收循环中，而是对这一观察对象执行。

            ```python
            from dataclasses import dataclass
            from time import monotonic

            @dataclass(frozen=True)
            class DatagramObservation:
                payload: bytes
                peer: tuple[str, int]
                received_at: float
                transaction_id: int | None

            started_at = monotonic()
            payload, peer = sock.recvfrom(4096)
            observed = DatagramObservation(payload, peer, monotonic(), parse_id(payload))

            assert observed.peer == expected_peer
            assert observed.received_at - started_at <= timeout_seconds
            assert observed.transaction_id == request_id
            assert validate_checksum(observed.payload)
            ```

            示例地址、端口和负载应在公开内容中使用模拟值。真实设备标识与内部网络信息不应进入代码片段或失败报告。

            ## 需要覆盖的行为

            正常路径包括正确端点在时间窗内返回一条合法响应。异常路径至少包含超时、错误来源、错误事务标识、重复响应、截断数据报、超长数据报、校验错误和先到达的旧响应。若协议允许乱序，应按序列号建立有界重排窗口，而不是简单放弃顺序断言。

            测试“没有额外响应”同样重要。收到预期报文后，可在一个短观察窗继续读取：若协议规定单请求单响应，第二条匹配报文就是重复；如果允许异步事件，则应把事件与响应按消息类型分流。

            ## 避免端口与队列污染

            复用同一个套接字执行多条用例时，上一条用例的延迟报文可能被下一条消费。可选策略包括每用例新建套接字、在用例开始前有界清空队列，或使用事务标识过滤。清空队列必须记录被丢弃报文的数量，不能把异常静默隐藏。

            多线程读取同一套接字会让响应归属变得不确定。更可靠的结构是由单一接收任务收集数据，再依据事务标识分发给等待者；超时后还要注销等待项，防止迟到响应误命中后续请求。

            ## 验证方法

            本地测试可以使用两个 UDP 套接字模拟服务端，主动注入重复、延迟、错误来源和错误序列号。使用单调时钟控制时间断言，避免系统时间校准造成跳变。对失败报告同时保存请求序号、接收序号、时间差和判定原因，原始负载只保留经过脱敏的必要片段。

            ## 结论

            UDP 的消息边界比 TCP 清晰，但交互正确性不只由负载决定。来源、事务、时序、数量和完整性共同构成一次可复核的测试结果。先把允许的丢失与乱序写进测试契约，再决定断言严格度，比简单增加重试更可靠。
            """
        ).strip(),
    ),
    PostSeed(
        title="用状态机组织连接、超时、断线与重连",
        slug="connection-state-machine",
        summary="把通信工具的连接生命周期显式建模，避免回调、计时器和重试逻辑互相覆盖。",
        category_slug="test-tools",
        tag_slugs=("state-machine", "tcp", "python"),
        content_md=dedent(
            """
            ## 为什么布尔变量会失控

            通信工具常从 `connected = True/False` 开始。加入连接中、主动关闭、远端断开、重试等待和永久失败后，一个布尔值已经无法表达真实状态。回调和计时器各自修改标志，容易出现重复连接、关闭后自动重连、旧连接事件覆盖新连接等竞态。

            状态机的价值不是画图，而是把允许发生的事件和副作用集中定义。本例面向单连接客户端；连接池和多设备并行需要为每个会话保留独立状态。

            ```mermaid
            stateDiagram-v2
              [*] --> Idle
              Idle --> Connecting: connect
              Connecting --> Online: connected
              Connecting --> Backoff: timeout / failed
              Online --> Backoff: remote_closed / io_error
              Online --> Closing: close
              Backoff --> Connecting: retry_due
              Backoff --> Idle: cancel
              Closing --> Idle: closed
            ```

            ## 事件驱动的转移

            每次转移接收“当前状态 + 事件”，输出“下一状态 + 要执行的动作”。网络 I/O 不应直接修改状态；它只产生事件。这样测试可以完全绕过真实网络，按顺序喂入事件并检查转移。

            ```python
            def reduce(state: State, event: Event) -> Transition:
                match state, event.kind:
                    case State.IDLE, "connect":
                        return Transition(State.CONNECTING, [OpenSocket(event.generation)])
                    case State.CONNECTING, "connected":
                        return Transition(State.ONLINE, [CancelTimer(), ResetBackoff()])
                    case State.ONLINE, "remote_closed" | "io_error":
                        return Transition(State.BACKOFF, [CloseSocket(), ScheduleRetry()])
                    case State.ONLINE, "close":
                        return Transition(State.CLOSING, [CloseSocket()])
                    case _:
                        return Transition(state, [RecordIgnored(event)])
            ```

            `generation` 用于识别过期事件。每次新建连接递增代次，旧套接字稍后返回的“连接成功”或“关闭”事件若代次不匹配，就只能记录，不能改变当前连接。

            ## 超时与重连不是一回事

            连接超时决定一次尝试何时失败；退避策略决定下一次何时尝试。二者使用独立计时器，并使用单调时钟。指数退避需要上限和抖动，避免多个客户端同时重连；测试环境则可注入确定性的等待序列，保证用例稳定。

            主动关闭必须取消连接超时和重试计时器。远端断开可以进入退避，用户主动关闭应回到空闲。若这两种事件共用同一处理函数，工具经常会在用户点击停止后再次连接。

            ## 验证矩阵

            - 连接成功前超时，只触发一次关闭和一次重试计划；
            - 超时事件之后又收到旧代次成功事件，状态保持不变；
            - 在线时远端断开，进入退避并清理资源；
            - 退避期间主动取消，不再产生后续连接动作；
            - 关闭过程中重复收到关闭事件，动作保持幂等；
            - 达到最大尝试次数后进入可诊断的停止状态，而不是无限循环。

            对每次转移记录原状态、事件、目标状态、代次和动作名称。日志不需要保存真实地址或业务报文，也能回答“为什么进行了这次重连”。

            ## 结论

            连接生命周期复杂时，显式状态机比增加更多标志更容易验证。纯转移函数、带代次的异步事件和可注入时钟，使正常连接、超时、断线和取消都能在毫秒级单元测试中复现。这种边界也方便后续把 TCP、串口或设备驱动适配到同一执行框架。
            """
        ).strip(),
    ),
    PostSeed(
        title="可配置协议帧解析器的设计方法",
        slug="configurable-frame-parser",
        summary="将帧格式描述、字节读取、校验规则和业务解释分层，讨论配置化能力的有效边界。",
        category_slug="test-tools",
        tag_slugs=("protocol-parsing", "python", "traceability"),
        content_md=dedent(
            """
            ## 配置化不等于把所有逻辑写进 JSON

            当测试工具需要支持多种二进制帧格式，复制多套解析函数会快速积累分支；把任意表达式塞进配置又会形成难以审计的脚本系统。可维护的做法是先找到稳定公共能力：字段偏移、长度、字节序、基础类型、长度关联、枚举和校验；协议特有语义仍由明确的扩展函数处理。

            本文针对固定头、可选变长体和常见校验算法。需要递归结构、压缩、加密或复杂位流语法时，应考虑成熟的格式描述工具，而不是继续扩张自定义 DSL。

            ## 三层结构

            第一层是帧切分，只回答缓冲区中是否有完整帧；第二层是结构解析，把字节映射为有类型的字段；第三层是语义校验，判断消息类型、状态组合和业务约束。分层后，长度错误不会被误报为业务字段异常。

            ```yaml
            name: demo_status_frame
            byte_order: big
            sync: "AA55"
            length:
              offset: 2
              size: 2
              includes_header: false
            fields:
              - {name: message_type, offset: 4, type: u8}
              - {name: sequence, offset: 5, type: u16}
              - {name: flags, offset: 7, type: u8}
            checksum:
              algorithm: crc16_demo
              range: [0, -2]
              field_offset: -2
            ```

            配置只允许枚举过的类型与算法名，不执行动态代码。加载时先验证字段是否重叠、偏移是否越界、长度字段是否可读取、校验范围是否合理，再生成不可变描述对象。错误配置应在启动阶段失败，而不是解析到某条数据时才报错。

            ## 解析结果要保留证据

            返回值不只是字段字典，还应包含原始帧、字段位置、解析警告和校验状态。失败时使用结构化错误，例如 `NeedMoreData`、`InvalidLength`、`ChecksumMismatch` 和 `UnsupportedMessageType`。调用方据此决定等待更多数据、记录异常帧还是终止用例。

            ```python
            @dataclass(frozen=True)
            class ParsedField:
                name: str
                value: int | bytes | str
                offset: int
                size: int

            @dataclass(frozen=True)
            class ParsedFrame:
                raw: bytes
                fields: tuple[ParsedField, ...]
                checksum_ok: bool
                warnings: tuple[str, ...]
            ```

            这种结构可以把报告中的字段值追溯回具体字节范围，也便于回放工具重新编码后进行逐字节比较。

            ## 验证方法

            为每个格式保存少量人工审查过的模拟向量：最小帧、最大合法帧、每种消息类型、校验错误和截断样本。再加入性质测试：编码后解析应保留字段；任意切分后增量解析结果应相同；修改受校验保护的任意字节应导致校验失败。

            错误同步字、声明长度小于头部、超大长度、未知枚举和字段重叠都要有独立用例。不能只依靠从真实设备抓取的“正常报文”，因为它无法证明异常处理有效。

            ## 取舍与结论

            配置化适合表达结构，不适合隐藏任意业务逻辑。字段模型稳定、扩展点显式、加载时严格校验，才能在增加协议时减少重复代码而不牺牲可读性。公开示例使用重新定义的同步字和模拟字段，不复制任何内部协议原文或真实数据。
            """
        ).strip(),
    ),
)

POSTS += (
    PostSeed(
        title="原始报文、解析结果、断言与报告如何建立追溯关系",
        slug="test-evidence-traceability",
        summary="为一次测试执行建立稳定标识和证据链，使失败结果能够从报告追到断言、字段与原始报文。",
        category_slug="test-tools",
        tag_slugs=("traceability", "python", "protocol-parsing"),
        content_md=dedent(
            """
            ## 一份报告为什么难以复核

            测试脚本打印“校验失败”并不等于留下了证据。复核人员通常还需要知道：哪条用例、哪一步操作、发送了什么模拟请求、收到哪一帧、哪个字段怎样解析、采用了哪条断言，以及当时使用的配置版本。如果这些信息散落在控制台、临时文件和截图里，失败很难稳定复现。

            追溯设计的目标不是无上限记录数据，而是建立最小、明确的关联。公开案例应使用模拟帧；生产系统还需根据保密要求决定哪些原始数据可以保存、保存多久以及谁能读取。

            ## 稳定标识贯穿执行过程

            一次运行生成 `run_id`，每条用例有稳定的 `case_id`，每次交互生成 `step_id`，发送与接收对象再分别拥有 `message_id`。日志、解析记录和断言结果只通过这些标识关联，不依赖容易变化的文件名或显示标题。

            ```mermaid
            flowchart LR
              R["Run / run_id"] --> C["Case / case_id"]
              C --> S["Step / step_id"]
              S --> TX["Request / message_id"]
              S --> RX["Observation / message_id"]
              RX --> P["Parsed fields"]
              P --> A["Assertions"]
              A --> RP["Report result"]
            ```

            标识应在创建对象时生成并保持不变。重试是同一步骤下的新一次 `attempt`，不能覆盖第一次失败记录，否则最终成功会隐藏系统曾发生超时的事实。

            ## 分离事实和判定

            原始报文与接收时间属于事实；字段解析是对事实的结构化解释；断言是规则对解释结果的判定；报告只是呈现。四层数据分开保存，后续修正解析器时可以对原始证据重新解析，而不必重新连接设备。

            ```python
            observation = {
                "message_id": "msg-demo-0042",
                "step_id": "step-query-status",
                "direction": "rx",
                "received_offset_ms": 18.4,
                "raw_sha256": sha256(raw).hexdigest(),
                "raw_length": len(raw),
            }
            assertion = {
                "assertion_id": "status-is-ready",
                "message_id": observation["message_id"],
                "path": "payload.status",
                "operator": "equals",
                "expected": "READY",
                "actual": parsed.status,
            }
            ```

            报告不必默认嵌入完整报文。可以保存长度、摘要、必要的脱敏片段和受控证据文件引用。摘要用于确认文件没有被替换，不用于恢复原文。

            ## 失败也要完成收尾

            执行器应在 `finally` 阶段写入结束时间、最终状态和未完成原因。进程异常退出时，下一次启动可识别仍处于 running 的记录并标记为 interrupted。报告生成失败不能改变测试判定，但必须产生独立的基础设施错误。

            验证追溯链时，可从报告中任选一个失败断言，反向查询到字段、接收消息、步骤、用例和运行；再从原始模拟报文重新解析，结果应一致。还要检查重复重试、并行用例和中途取消不会产生标识冲突。

            ## 结论

            可追溯性来自稳定标识、不可覆盖的尝试记录以及事实与判定分离，不来自更长的日志。先设计证据链，再设计报告样式，才能让“失败”变成可以定位和复核的工程信息。
            """
        ).strip(),
    ),
    PostSeed(
        title="使用 pytest 参数化组织协议测试矩阵",
        slug="pytest-protocol-matrix",
        summary="将字段组合、边界值和预期错误建模为可读测试数据，同时控制组合规模与失败定位成本。",
        category_slug="test-tools",
        tag_slugs=("pytest", "python", "protocol-parsing"),
        content_md=dedent(
            """
            ## 参数化不是复制用例的捷径

            协议字段常有消息类型、长度、标志位和校验状态等组合。把每种组合写成独立函数会重复准备步骤；直接对所有维度做笛卡尔积，又会生成大量没有新增信息的用例。参数化的重点是表达测试设计，而不只是减少代码行数。

            本文适合纯解析器、编码器和本地模拟服务。涉及真实硬件时，应把快速数据用例与慢速设备用例分层，避免每个字段组合都占用设备资源。

            ## 先定义测试维度

            对每个字段记录等价类、边界值、依赖关系和预期行为。例如长度字段可包含最小值、典型值、最大合法值、比最小值小一和比最大值大一；消息类型只挑选每类处理路径的代表值。有关联约束的字段作为一个场景整体定义，而不是独立相乘。

            ```python
            import pytest

            CASES = [
                pytest.param("status", 0, b"", "ok", id="status-empty-body"),
                pytest.param("data", 1, b"\\x00", "ok", id="data-min-body"),
                pytest.param("data", 1024, b"x" * 1024, "ok", id="data-max-body"),
                pytest.param("data", 1025, b"x" * 1025, "length_error", id="body-too-long"),
            ]

            @pytest.mark.parametrize("kind,length,body,expected", CASES)
            def test_frame_matrix(kind, length, body, expected):
                result = parse(build_demo_frame(kind, length, body))
                assert result.code == expected
            ```

            `id` 应描述输入特征，而不是写 `case-01`。CI 失败时，名称本身就能说明是哪条边界。

            ## 控制组合规模

            独立维度可以使用成对组合覆盖，而高风险约束使用人工场景补充。解析器的所有长度边界通常值得全覆盖；多个无关显示选项没有必要与每种消息类型交叉。测试计划中要写明裁剪依据，避免“用例少”变成没有说明的遗漏。

            数据工厂负责产生合法基础帧，变异函数只修改一个目标特征。若每个异常用例都手写十六进制字符串，很难确认除目标字段外是否还有其他差异。

            ```python
            @pytest.mark.parametrize(
                "mutate, error",
                [
                    pytest.param(break_sync, "sync", id="invalid-sync"),
                    pytest.param(increase_length, "length", id="declared-too-long"),
                    pytest.param(flip_checksum_bit, "checksum", id="checksum-mismatch"),
                ],
            )
            def test_rejected_frames(valid_frame, mutate, error):
                with pytest.raises(FrameError, match=error):
                    parse(mutate(valid_frame))
            ```

            ## Fixture 边界

            会话级 fixture 适合只读格式描述，不适合共享可变缓冲区。每条用例需要独立解析器状态，防止前一用例残留数据影响后一用例。真实套接字、临时文件和后台任务都必须在 fixture 收尾阶段关闭，即使用例断言失败也不能泄漏资源。

            ## 验证测试本身

            对测试矩阵做审查：每个边界是否至少被一个用例命中；每种错误码是否有直接触发用例；所有参数 ID 是否唯一；标记为设备测试的用例能否被单独选择。可在 CI 中分别运行纯单元、模拟集成和设备环境三组任务。

            ## 结论

            好的参数化数据是一份可执行测试设计。把等价类、边界、依赖关系和裁剪理由写进参数集合，可以同时提升覆盖表达、失败定位和评审效率，而不会用无意义组合拖慢流水线。
            """
        ).strip(),
    ),
    PostSeed(
        title="从零散脚本到可维护测试平台需要哪些边界",
        slug="script-to-test-platform-boundaries",
        summary="以执行模型、适配层、证据存储和报告边界为主线，说明脚本平台化时应先稳定什么。",
        category_slug="test-tools",
        tag_slugs=("python", "traceability", "state-machine"),
        content_md=dedent(
            """
            ## 平台化不是把脚本放进一个界面

            零散脚本通常同时打开连接、拼报文、等待响应、判断结果和输出文件。数量少时直观，复用到不同设备或协议后，配置、异常处理和报告格式开始互相耦合。给脚本加一个按钮只能统一入口，不能自动获得可维护性。

            平台化前应确认真实重复点。如果只有少量一次性任务，保持清晰脚本可能更合适；当执行流程相似、驱动和帧格式持续增加、结果需要复核时，分层才开始产生收益。

            ## 稳定的执行模型

            核心模型可以简化为：运行包含用例，用例包含步骤，步骤产生动作和断言。连接类型、协议格式和报告介质都不应改变这条主线。

            ```mermaid
            flowchart TD
              Plan["Test plan"] --> Runner["Execution engine"]
              Runner --> Action["Actions"]
              Action --> Adapter["Transport adapters"]
              Adapter --> Evidence["Observations"]
              Evidence --> Assert["Assertions"]
              Assert --> Report["Report projection"]
            ```

            执行引擎只依赖适配器接口，例如 `open`、`send`、`receive` 和 `close`。TCP、UDP、串口或模拟适配器分别处理资源生命周期。协议编码与传输分开后，同一帧解析器可以在在线接收和离线回放中复用。

            ## 配置、逻辑和秘密分开

            用例参数可以进入版本控制；环境地址、账号和密钥不能写入内容仓库；复杂业务判定应保留为可测试代码，而不是无限扩张配置表达式。配置加载阶段需要类型和范围校验，并在运行记录中保存配置摘要，确保报告能够说明使用了哪一版输入。

            ## 错误要有层次

            平台至少区分基础设施错误、协议错误、断言失败和用户取消。连接不上不应显示为“字段值不一致”；报告写入失败也不能篡改用例判定。每层定义清晰错误对象和是否允许重试，避免所有异常都落入一个 `except Exception` 后继续执行。

            资源收尾必须幂等。无论正常完成、断言失败还是用户取消，连接、后台任务和临时文件都能被关闭。重试产生新的尝试记录，不覆盖先前证据。

            ## 最小演进顺序

            先提取纯编码解析函数和模拟测试，再统一运行/用例/步骤模型；随后增加适配器、结构化日志和报告投影；只有执行边界稳定后再做图形界面、分布式调度或插件市场。过早加入动态插件会让接口尚未稳定时就承担兼容性成本。

            验收可以使用同一组模拟用例分别通过 TCP 模拟适配器和离线回放适配器执行，检查断言结果一致；主动注入超时、断连和报告失败，确认错误分类及收尾行为；连续运行多次，结果目录和运行标识不得冲突。

            ## 结论

            从脚本到平台的关键变化，是让执行、传输、协议、判定和呈现拥有明确边界。先形成可重复验证的内核，再增加界面与扩展机制，平台才能减少重复工作，而不是把零散脚本的复杂度集中到一个更大的程序里。
            """
        ).strip(),
    ),
    PostSeed(
        title="FastAPI 与 React 分离架构中的数据边界",
        slug="fastapi-react-data-boundaries",
        summary="结合 CTY Log 的公开仓库，说明服务端渲染、公开 API、管理 API 和数据库之间如何划分职责。",
        category_slug="software-delivery",
        tag_slugs=("fastapi", "react", "postgresql"),
        status="published",
        confidentiality_checked=True,
        published_at=datetime(2026, 7, 26, 9, 0, tzinfo=UTC),
        seo_title="FastAPI 与 React 分离架构：公开内容和管理写入的数据边界",
        seo_description="基于 CTY Log 公开实现，分析 React 服务端页面、FastAPI、PostgreSQL 与管理接口的职责划分。",
        content_md=dedent(
            """
            ## 为什么这个站点没有把文章写进前端文件

            CTY Log 同时需要公开阅读、搜索、管理编辑和长期迁移。如果文章与项目硬编码在 React 组件里，发布一次内容就要重新改页面，后台编辑也失去意义。当前公开仓库采用 React/Vinext 页面层、FastAPI 接口层、SQLAlchemy 数据访问和 PostgreSQL 持久化，前端的 `data` 目录只保留非敏感个人展示文案。

            本文描述这个仓库当前采用的边界，不主张所有个人站点都必须前后端分离。内容很少、没有后台和搜索需求时，纯静态 Markdown 更简单。

            ## 请求路径

            ```mermaid
            sequenceDiagram
              participant B as Browser
              participant W as React server page
              participant A as FastAPI
              participant D as PostgreSQL
              B->>W: GET /articles/slug
              W->>A: GET /api/v1/posts/slug
              A->>D: 查询已发布且未删除内容
              D-->>A: 文章、分类与标签
              A-->>W: 白名单字段 JSON
              W-->>B: SSR HTML + metadata
            ```

            公开页面不直接连接数据库。FastAPI 统一执行发布状态、时间、软删除和保密检查条件，并只返回前台需要的字段。React 服务端生成正文、Canonical、Open Graph 和结构化数据，浏览器首次访问不依赖客户端再请求一遍正文。

            ## 公开读取与管理写入分开

            公开 API 只允许读取已发布文章、公开项目、分类、标签和时间线。管理 API 依赖管理员会话与 CSRF 校验，负责草稿、发布、恢复、媒体和设置等写操作。即使前端误把草稿链接渲染出来，公开接口仍会返回不存在，安全边界不依赖按钮是否隐藏。

            写入模型使用明确字段、长度和格式约束。文章发布前必须确认保密检查；项目设为公开时数据库约束也要求完成检查。编辑带版本号，两个页面同时修改同一内容时，后提交者会收到冲突而不是静默覆盖。

            ## 数据库与仓储层

            路由负责参数和权限，仓储层负责查询、分页、关联与事务。文章、标签和项目之间使用关联表，修改 slug 时记录永久重定向。软删除让后台可以恢复内容，但所有公开查询都必须显式排除已删除记录。

            搜索目前使用 PostgreSQL 条件查询覆盖标题、摘要、分类和标签，适合当前内容规模。中文内容增多后再评估分词扩展或独立搜索服务，而不是提前增加新的数据源。

            ## 失败边界与验证

            API 使用统一错误结构，页面把 404 与永久重定向映射为对应导航行为。跨栈测试启动隔离数据库和短时 API 服务，验证真实接口数据可以进入服务端渲染；API 测试覆盖草稿隐藏、保密检查、版本冲突、软删除与关联内容。

            架构测试还应验证公开设置只返回白名单键，日志不记录正文、邮箱或凭据，生产环境的 API 与数据库端口不暴露到公网。

            ## 结论

            这个架构的核心不是“用了哪些框架”，而是只有一套正式内容数据源：PostgreSQL 保存状态，FastAPI执行规则，React负责可访问的服务端呈现。边界清楚后，后台、搜索、RSS 和站点地图都能围绕同一份内容工作。
            """
        ).strip(),
    ),
)


PROJECTS = (
    ProjectSeed(
        title="嵌入式通信协议自动化测试平台",
        slug="protocol-test-platform",
        summary="使用模拟协议描述多类通信接口的统一测试执行模型，覆盖连接、帧解析、断言、证据与报告。",
        status="持续迭代",
        tag_slugs=("python", "tcp", "udp", "pytest", "traceability"),
        related_post_slugs=(
            "tcp-message-boundaries",
            "udp-test-assertions",
            "connection-state-machine",
            "test-evidence-traceability",
            "pytest-protocol-matrix",
            "script-to-test-platform-boundaries",
        ),
        started_at=date(2025, 1, 1),
        sort_order=10,
        content_md=dedent(
            """
            该案例把重复的通信联调动作整理为可配置、可验证的执行流程。公开版本只描述通用架构与模拟协议，不包含真实产品、设备、接口文件、报文或测试数据。
            """
        ).strip(),
        background_md=dedent(
            """
            通信相关测试往往从若干独立脚本开始：一个脚本连接，一个脚本发送固定报文，另一个脚本整理日志。随着协议类型、异常场景和回归次数增加，准备方式、错误表达和结果格式逐渐不一致，失败也难以从报告追溯到原始观察。

            本项目以模拟 TCP/UDP 和可替换传输适配器为边界，研究如何形成统一执行内核。它不宣称覆盖所有总线，也不公开任何工作环境细节。
            """
        ).strip(),
        problem_md=dedent(
            """
            - 传输连接、协议编解码和业务断言相互耦合，难以单独测试；
            - 一次接收被误认为一帧，超时、截断和重连行为不稳定；
            - 重试覆盖首次失败，报告缺少从断言到原始报文的证据链；
            - 协议增加时复制整套执行逻辑，维护成本持续上升。
            """
        ).strip(),
        role_md=dedent(
            """
            个人负责问题拆解、分层架构、模拟协议设计、核心执行模型、自动化测试和公开案例脱敏。项目成果限定为可复用模型与验证方法，不使用未经确认的团队、业务或性能指标。
            """
        ).strip(),
        architecture_md=dedent(
            """
            ```mermaid
            flowchart LR
              UI["CLI / UI"] --> Runner["Execution engine"]
              Runner --> Steps["Actions and assertions"]
              Steps --> Codec["Frame codec"]
              Steps --> Adapter["Transport adapter"]
              Adapter --> TCP["TCP simulator"]
              Adapter --> UDP["UDP simulator"]
              Runner --> Evidence["Evidence store"]
              Evidence --> Report["Report projection"]
            ```

            执行器只依赖抽象动作和观察对象；适配器管理资源生命周期；编解码器处理消息边界与字段；报告从结构化证据生成，不反向影响判定。
            """
        ).strip(),
        features_md=dedent(
            """
            - 运行、用例、步骤和尝试的统一模型；
            - TCP 增量帧解析与 UDP 数据报观察；
            - 连接状态机、超时、取消和有界重试；
            - 原始证据、字段结果和断言的稳定标识关联；
            - pytest 参数矩阵、模拟服务和异常注入；
            - 从同一结构化结果生成简洁报告。
            """
        ).strip(),
        challenges_md=dedent(
            """
            难点集中在异步事件顺序、旧连接事件、半帧缓存、迟到 UDP 响应和重试证据保留。若所有异常都转成布尔失败，报告无法区分通信基础设施故障和被测行为不符合预期。
            """
        ).strip(),
        solutions_md=dedent(
            """
            使用带连接代次的显式状态机隔离旧事件；解析器接受任意分片输入；每次尝试创建不可覆盖的证据记录；错误分为连接、协议、断言、报告与取消。模拟适配器能够确定性注入超时、断连、重复和校验错误。
            """
        ).strip(),
        outcomes_md=dedent(
            """
            已形成可独立说明和测试的执行边界，并为网络读取、帧解析、状态转移和证据链整理了公开验证用例。这里不披露真实业务效率或质量数字；可验证结果以模拟测试与关联技术笔记为准。
            """
        ).strip(),
        next_steps_md="继续补充串口类适配器实验、取消语义和隔离环境中的完整报告回放；只有接口稳定后再评估插件机制。",
        confidentiality_note="公开内容使用模拟协议、泛化架构和重新编写的数据，不包含内部协议、设备信息或真实日志。",
    ),
    ProjectSeed(
        title="CTY Log 个人技术档案系统",
        slug="cty-log-technical-archive",
        summary="基于 React、FastAPI 与 PostgreSQL 的真实公开仓库，覆盖内容管理、搜索、安全发布、测试和单机生产部署。",
        status="持续维护",
        tag_slugs=("react", "fastapi", "postgresql", "markdown", "docker"),
        related_post_slugs=(
            "fastapi-react-data-boundaries",
            "markdown-publishing-security",
            "compose-release-backup-rollback",
        ),
        started_at=date(2026, 7, 1),
        repo_url="https://github.com/Coming-zll0722/CTY_Weblog",
        sort_order=20,
        content_md="这是当前网站本身的工程档案。所有实现说明都以公开仓库、自动化测试和发布文档为依据。",
        background_md=dedent(
            """
            技术笔记需要长期可维护的固定地址、分类、搜索和发布审查，个人项目也需要用结构化方式记录背景、决策与验证。项目从展示站点演进为带管理后台和正式数据库的数据系统。
            """
        ).strip(),
        problem_md=dedent(
            """
            内容不能同时散落在前端常量和数据库；公开读取与管理写入需要独立权限边界；Markdown、媒体和项目案例必须兼顾展示、安全与保密；生产发布还要保护数据库、上传和备份数据卷。
            """
        ).strip(),
        role_md="个人完成需求整理、前后端实现、数据建模、自动化测试、容器部署文档和内容维护，并使用公开仓库记录可复核变更。",
        architecture_md=dedent(
            """
            ```mermaid
            flowchart LR
              Browser --> Web["React / Vinext SSR"]
              Web --> API["FastAPI"]
              API --> DB["PostgreSQL"]
              API --> Media["Persistent uploads"]
              Nginx["Nginx HTTPS"] --> Web
              Nginx --> API
            ```

            PostgreSQL 是正式内容的唯一数据源；FastAPI 负责权限、发布规则和查询；React 负责服务端页面、SEO 与交互。Nginx 对外提供 HTTPS，Compose 保留数据库、上传和备份持久卷。
            """
        ).strip(),
        features_md=dedent(
            """
            - 文章、项目、分类、标签、时间线和媒体管理；
            - Markdown、代码高亮、KaTeX、Mermaid、目录和阅读进度；
            - 管理员会话、CSRF、角色、限流、软删除和版本冲突；
            - 统一搜索、RSS、Sitemap、Canonical 和结构化数据；
            - PostgreSQL 迁移、备份、隔离恢复和镜像回滚流程。
            """
        ).strip(),
        challenges_md="需要在动态内容与服务端渲染之间保持单一数据源，同时确保公开 API 不泄露草稿、私有设置或已删除内容；发布必须兼顾数据库迁移与应用镜像回滚。",
        solutions_md="通过仓储层集中公开查询条件，使用发布前保密确认和数据库约束；跨栈测试验证真实 API 进入 SSR；发布包采用唯一标签、摘要校验、迁移前备份和分层健康检查。",
        outcomes_md="公开仓库已具备完整前后台、内容安全、测试、部署与运维闭环。本档案只引用仓库中可检查的能力，不虚构访问量、性能收益或商业结果。",
        next_steps_md="持续完善真实内容，备案完成后复测公网 HTTPS，并根据内容规模评估中文搜索与异地加密备份。",
        confidentiality_note="内容来自公开仓库；服务器地址、凭据、环境变量、备份内容和用户数据不进入项目正文。",
    ),
    ProjectSeed(
        title="可配置协议帧解析与回放工具",
        slug="configurable-protocol-frame-tool",
        summary="使用完全模拟帧格式验证增量解析、字段映射、校验、异常变异和离线回放的个人原型。",
        status="原型验证",
        tag_slugs=("python", "protocol-parsing", "tcp", "pytest"),
        related_post_slugs=(
            "tcp-message-boundaries",
            "configurable-frame-parser",
            "pytest-protocol-matrix",
        ),
        started_at=date(2026, 6, 1),
        sort_order=30,
        content_md="个人原型使用自定义模拟同步字、字段和校验算法，重点验证解析边界而非复刻任何实际协议。",
        background_md="不同帧格式若各自实现接收、解析和显示，会重复处理长度、字节序、校验与错误定位。原型尝试用受限格式描述复用公共结构能力。",
        problem_md="需要同时处理任意 TCP 分片、多帧合并、非法长度、错误同步字、校验失败和回放时序；配置又不能演变为可执行任意代码的脚本系统。",
        role_md="个人完成模拟格式定义、增量解析器、结构化错误、离线回放和 pytest 异常矩阵。",
        architecture_md="格式加载器先验证配置并生成不可变描述；帧切分器恢复边界；字段解析器保留偏移证据；回放器按相对时间向模拟适配器输入记录。",
        features_md="支持固定头、长度字段、基础整数与字节字段、受限校验算法、十六进制证据、任意分片输入、异常帧变异和离线回放。",
        challenges_md="错误长度可能让缓冲区无限等待，自动重同步可能隐藏数据损坏，回放若使用系统时间会产生不稳定测试。",
        solutions_md="设置最大帧长和明确恢复策略；错误使用结构化分类；回放依赖可注入单调时钟；配置仅允许白名单类型与算法名。",
        outcomes_md="已整理可执行的设计与测试矩阵，当前定位为个人验证原型，不宣称已接入真实设备或生产协议。",
        next_steps_md="补充编码—解析往返性质测试、配置版本摘要和失败样本最小化；是否增加图形界面取决于真实使用频率。",
        confidentiality_note="全部帧结构、同步字、字段和值均为重新定义的模拟示例。",
    ),
    ProjectSeed(
        title="FPGA 时序与接口验证实验集",
        slug="fpga-timing-verification-lab",
        summary="围绕 Verilog、仿真、时钟约束、I/O 延迟和 CDC 建立可复现的个人学习实验。",
        status="持续学习",
        tag_slugs=("fpga", "verilog"),
        related_post_slugs=("fpga-clock-constraints-notes",),
        started_at=date(2026, 5, 1),
        sort_order=40,
        content_md="该项目明确属于个人学习记录，目标是保存假设、约束、波形和报告检查过程，而不是包装成商业交付。",
        background_md="仅通过 RTL 功能仿真无法证明器件实现满足时序。需要把时钟关系、外部延迟和跨时钟域结构纳入实验与检查。",
        problem_md="学习资料容易停留在语法和波形截图，缺少从设计假设到约束、报告和问题复现的完整记录。",
        role_md="个人设计小型 RTL 与 testbench、编写示例约束、检查综合/实现/CDC 报告并记录仍未解决的问题。",
        architecture_md="每个实验独立包含 RTL、testbench、约束、预期检查项和报告摘要；公共脚本只负责可重复运行，不隐藏工具警告。",
        features_md="包含单时钟计数器、组合路径、寄存器化 I/O、脉冲同步和异步 FIFO 等渐进实验计划。",
        challenges_md="约束错误可能让报告表面变好；异步信号仿真正常也可能存在亚稳态风险；工具与器件版本会影响命令和结果。",
        solutions_md="每条例外约束附带设计依据；同时检查未约束路径与 CDC；示例数字只用于语法演示，真实参数必须来自目标板级时序。",
        outcomes_md="当前完成的是学习框架和公开笔记，具体实验结果仍需随 RTL、约束和工具报告逐项补充。",
        next_steps_md="继续验证复位释放、派生时钟、多周期路径和异步 FIFO，并为每项结论保存可复现实验条件。",
        confidentiality_note="个人学习项目，不使用工作设备、内部接口、真实原理图或未经授权的截图。",
    ),
)


TIMELINES = (
    (date(2026, 7, 30), "建立可发布的全栈站点", "完成公开仓库、自动化检查与生产发布闭环，后续重点转向真实内容维护。", "milestone", True, 10),
    (date(2026, 7, 1), "系统化沉淀", "建立个人技术档案，持续整理 AI 辅助测试与 FPGA 学习记录。", "growth", True, 20),
    (date(2026, 6, 1), "协议解析原型", "使用模拟帧研究增量解析、异常变异、字段证据和离线回放。", "project", True, 30),
    (date(2026, 5, 1), "FPGA 时序实验计划", "从单时钟设计开始，逐步记录约束、仿真、实现报告和 CDC 检查。", "learning", True, 40),
    (date(2026, 3, 1), "AI 辅助测试探索", "研究需求切分、候选用例生成、规则校验和人工审核之间的追溯边界。", "learning", True, 50),
    (date(2025, 1, 1), "工具平台化", "将零散脚本组织为可配置、可追溯的通信测试工具。", "project", True, 60),
)


LEGACY_PROTOCOL_PROJECT = {
    "summary": "面向多类通信接口的可配置测试执行平台，统一用例、数据帧、设备适配、断言与报告。",
    "content_md": "# 嵌入式通信协议自动化测试平台",
    "background_md": "重复联调流程缺少统一执行入口和可追溯结果。",
    "problem_md": "不同协议和设备驱动的调用方式差异较大。",
    "role_md": "需求分析、架构设计、核心开发与测试验证。",
    "architecture_md": "交互层、应用层、领域层和基础设施层。",
    "outcomes_md": "建立统一执行模型。",
    "confidentiality_note": "示例使用模拟协议与脱敏数据。",
}


@dataclass(frozen=True)
class SeedResult:
    categories_created: int
    tags_created: int
    posts_created: int
    projects_created: int
    projects_upgraded: int
    timelines_created: int


async def seed_content_library(
    session: AsyncSession,
    owner_id: UUID,
) -> SeedResult:
    categories_created = 0
    tags_created = 0
    posts_created = 0
    projects_created = 0
    projects_upgraded = 0
    timelines_created = 0

    categories: dict[str, Category] = {}
    for name, slug, description, sort_order in CATEGORIES:
        category = await session.scalar(select(Category).where(Category.slug == slug))
        if category is None:
            category = Category(
                name=name,
                slug=slug,
                description=description,
                sort_order=sort_order,
            )
            session.add(category)
            categories_created += 1
        categories[slug] = category

    tags: dict[str, Tag] = {}
    for name, slug in TAGS:
        tag = await session.scalar(select(Tag).where(Tag.slug == slug))
        if tag is None:
            tag = Tag(name=name, slug=slug)
            session.add(tag)
            tags_created += 1
        tags[slug] = tag
    await session.flush()

    posts: dict[str, Post] = {}
    managed_post_slugs: set[str] = set()
    for item in POSTS:
        post = await session.scalar(select(Post).where(Post.slug == item.slug))
        if post is None:
            post = Post(
                title=item.title,
                slug=item.slug,
                summary=item.summary,
                content_md=item.content_md,
                status=item.status,
                author_id=owner_id,
                category_id=categories[item.category_slug].id,
                confidentiality_checked=item.confidentiality_checked,
                published_at=item.published_at,
                seo_title=item.seo_title,
                seo_description=item.seo_description,
            )
            session.add(post)
            await session.flush()
            posts_created += 1
            managed_post_slugs.add(item.slug)
        posts[item.slug] = post
        if item.slug in managed_post_slugs:
            session.add_all(
                [PostTag(post_id=post.id, tag_id=tags[slug].id) for slug in item.tag_slugs]
            )

    for item in PROJECTS:
        project = await session.scalar(select(Project).where(Project.slug == item.slug))
        managed = False
        if project is None:
            project = Project(
                title=item.title,
                slug=item.slug,
                owner_id=owner_id,
            )
            session.add(project)
            projects_created += 1
            managed = True
        elif item.slug == "protocol-test-platform" and all(
            getattr(project, field) == expected
            for field, expected in LEGACY_PROTOCOL_PROJECT.items()
        ):
            projects_upgraded += 1
            managed = True
        if managed:
            for field in (
                "title",
                "summary",
                "content_md",
                "background_md",
                "problem_md",
                "role_md",
                "architecture_md",
                "features_md",
                "challenges_md",
                "solutions_md",
                "outcomes_md",
                "next_steps_md",
                "confidentiality_note",
                "status",
                "started_at",
                "ended_at",
                "repo_url",
                "demo_url",
                "is_public",
                "confidentiality_checked",
                "featured",
                "sort_order",
            ):
                setattr(project, field, getattr(item, field))
            await session.flush()
            existing_tag_ids = set(
                await session.scalars(
                    select(ProjectTag.tag_id).where(ProjectTag.project_id == project.id)
                )
            )
            session.add_all(
                [
                    ProjectTag(project_id=project.id, tag_id=tags[slug].id)
                    for slug in item.tag_slugs
                    if tags[slug].id not in existing_tag_ids
                ]
            )
            existing_post_ids = set(
                await session.scalars(
                    select(ProjectPost.post_id).where(ProjectPost.project_id == project.id)
                )
            )
            session.add_all(
                [
                    ProjectPost(project_id=project.id, post_id=posts[slug].id)
                    for slug in item.related_post_slugs
                    if posts[slug].id not in existing_post_ids
                ]
            )

    for event_date, title, description, event_type, is_public, sort_order in TIMELINES:
        timeline = await session.scalar(
            select(Timeline).where(
                Timeline.event_date == event_date,
                Timeline.title == title,
            )
        )
        if timeline is None:
            session.add(
                Timeline(
                    event_date=event_date,
                    title=title,
                    description=description,
                    event_type=event_type,
                    is_public=is_public,
                    sort_order=sort_order,
                )
            )
            timelines_created += 1

    await session.commit()
    return SeedResult(
        categories_created=categories_created,
        tags_created=tags_created,
        posts_created=posts_created,
        projects_created=projects_created,
        projects_upgraded=projects_upgraded,
        timelines_created=timelines_created,
    )

POSTS += (
    PostSeed(
        title="Markdown 内容发布需要防范哪些安全问题",
        slug="markdown-publishing-security",
        summary="从渲染、链接、图片、代码块和 Mermaid 等入口梳理 Markdown 发布链路的安全边界。",
        category_slug="software-delivery",
        tag_slugs=("markdown", "react", "fastapi"),
        status="published",
        confidentiality_checked=True,
        published_at=datetime(2026, 7, 24, 9, 0, tzinfo=UTC),
        seo_title="Markdown 发布安全：从原始 HTML 到链接与图表渲染",
        seo_description="结合内容站点实践，说明 Markdown 渲染、链接、图片、代码高亮和 Mermaid 的安全控制与测试。",
        content_md=dedent(
            """
            ## Markdown 不是天然安全的纯文本

            Markdown 最终会转换成 HTML。若允许原始 HTML、危险链接或不受控图表脚本，编辑者粘贴的一段内容可能在读者浏览器执行代码、发起外部请求或伪造页面元素。即使站点只有一个管理员，也要考虑账号误用、复制不可信内容和未来多人编辑。

            CTY Log 的公开实现默认禁用原始 HTML，并对生成结果做白名单清洗。本文只讨论内容渲染链路；认证、上传存储和服务器安全仍需独立控制。

            ## 先确定允许的语法

            普通段落、标题、列表、表格、引用、受限链接、代码块、数学公式和 Mermaid 已能覆盖大部分技术写作。没有明确需求时不开放任意 `iframe`、事件属性、内联脚本或自定义 HTML。功能列表越小，审查和测试越明确。

            清洗必须发生在可信渲染边界，而不是依赖编辑器预览。浏览器端预览和服务端正式输出应使用相同规则，否则“预览正常”不能证明发布结果安全。

            ## 链接和图片

            链接协议只允许明确集合，例如站内相对路径、`https` 和必要时的 `mailto`。必须拒绝 `javascript:`、危险 `data:` 和经过大小写或编码混淆的变体。外部链接如果新窗口打开，需要同步设置 `noopener noreferrer`。

            图片来源应限制为站内媒体接口或配置允许的 HTTPS 地址。上传服务验证扩展名、MIME、文件头、大小和尺寸，使用随机存储名；Markdown 本身不能绕过上传接口引用服务器任意文件。替代文本既是可访问性信息，也不能被拼接为未经转义的属性。

            ## 代码、公式与图表

            代码高亮器应把代码当文本，不执行其中的 HTML。语言名要映射到支持列表，未知语言回退为纯文本。公式渲染同样需要禁用能访问外部资源或注入 HTML 的扩展。

            Mermaid 接受的是图表语言，不应把它视为普通图片。渲染器使用 strict 安全模式，禁止任意 HTML 标签、点击脚本和外部回调。图表失败时显示清晰错误或原始代码，不应通过放宽安全级别“修好”内容。

            ```mermaid
            flowchart LR
              MD["Markdown source"] --> Parse["Parser"]
              Parse --> Plugins["Approved plugins"]
              Plugins --> Clean["HTML allowlist sanitizer"]
              Clean --> Render["React output"]
            ```

            ## 必须有的回归测试

            测试样本至少包括脚本标签、事件属性、危险协议链接、编码混淆链接、图片错误处理、代码块中的 HTML、公式扩展和 Mermaid 点击指令。断言最终 HTML 中不存在脚本、事件属性和危险 URL，同时正常标题、表格、代码和公式仍能渲染。

            内容安全策略是第二道防线，不应替代清洗。当前框架若需要内联脚本，应记录这个边界，并在支持稳定 nonce 后继续收紧；图片和连接目标也根据真实依赖配置，而不是使用无限通配。

            ## 保密与 XSS 是两件事

            内容通过 XSS 检查并不代表可以公开。内部名称、真实报文、地址、日志和截图仍需发布前人工审查。技术清洗解决“内容会不会执行”，保密检查解决“内容应不应该出现”。

            ## 结论

            安全的 Markdown 发布链路从最小语法集合开始，经过协议校验、插件限制和最终 HTML 白名单清洗，再由 CSP 提供纵深防护。任何新增渲染能力都应同时增加恶意样本和正常样本测试，而不是只验证展示效果。
            """
        ).strip(),
    ),
    PostSeed(
        title="Docker Compose 发布中的迁移、健康检查、备份与回滚",
        slug="compose-release-backup-rollback",
        summary="基于 CTY Log 的公开发布流程，说明有状态应用上线时各步骤的顺序与回滚边界。",
        category_slug="software-delivery",
        tag_slugs=("docker", "postgresql", "fastapi"),
        status="published",
        confidentiality_checked=True,
        published_at=datetime(2026, 7, 22, 9, 0, tzinfo=UTC),
        seo_title="Docker Compose 生产发布：迁移、备份、健康检查与回滚",
        seo_description="分析有状态 Docker Compose 应用的发布顺序、镜像校验、数据库备份、正向迁移和应用回滚。",
        content_md=dedent(
            """
            ## 能启动不等于完成发布

            有数据库、上传文件和反向代理的应用，发布不能简化为拉取镜像后重启。镜像来源是否正确、迁移是否可执行、备份是否可恢复、容器是否健康、HTTPS 路径是否返回预期内容，都需要在切换过程中得到证据。

            CTY Log 的公开部署脚本使用唯一发布标识、离线镜像包和校验文件，发布前创建 PostgreSQL 自定义格式备份，再执行 Alembic 正向迁移。本文说明这种单机 Compose 架构的顺序；多副本和零停机集群需要不同的流量切换机制。

            ## 发布输入必须不可变

            每个发布标签只对应一次构建，不能移动或复用。发布包包含镜像归档、SHA-256 和描述镜像名称及源码版本的环境文件。目标机在加载前同时校验文件摘要和允许的镜像来源，避免把临时本地镜像误当成正式版本。

            环境秘密不进入发布包。生产 `.env`、证书、上传和备份保留在服务器受限目录或持久卷中，代码仓库和 Release 产物只携带非秘密发布元数据。

            ## 有状态发布顺序

            ```mermaid
            flowchart TD
              A["Verify artifact"] --> B["Load images"]
              B --> C["Pre-release database backup"]
              C --> D["Verify backup checksum"]
              D --> E["Run forward migration"]
              E --> F["Switch API and Web images"]
              F --> G["Container health checks"]
              G --> H["Nginx HTTPS check"]
              H --> I["Record current release"]
            ```

            备份在迁移之前，因为数据库结构改变后，旧应用未必能继续读取。迁移使用独立短任务，成功后才切换应用容器。API 健康检查不仅确认进程存在，还执行最小数据库查询；Web 检查确认服务端渲染能读取 API。

            ## 回滚边界

            应用镜像回滚和数据库回滚不是同一件事。发布脚本可以在新容器不健康时恢复上一版镜像，但迁移必须设计为向后兼容：先增加可空字段或新表，应用稳定后再在后续版本移除旧结构。生产数据库不能因为应用检查失败就自动恢复备份，这可能覆盖发布后产生的新数据。

            若迁移本身失败，事务型迁移应回滚并停止切换。若已经发生不可逆数据变化，必须进入人工处置和隔离恢复流程，而不是继续尝试旧镜像。备份恢复先在独立数据库验证，确认校验和、格式与迁移版本，再制定生产恢复窗口。

            ## 验证与演练

            发布前在 CI 构建前端、运行 API 测试并验证容器配置；发布后检查三个容器、当前发布记录、最新备份校验和以及站内健康端点。公网域名受备案或上游网络策略影响时，应把服务器内部健康与外部可达性分别报告，不能通过关闭 HTTPS规避合规问题。

            回滚能力需要演练。可以在隔离环境故意让新 API 健康检查失败，确认镜像回退；也可以把备份恢复到第二个数据库，核对 Alembic 版本和关键表数量。未经演练的备份只能证明文件存在。

            ## 结论

            可靠发布依靠不可变输入、迁移前备份、分层健康检查和明确的回滚边界。Compose 足以支撑单机有状态应用，但必须像对待正式发布系统一样记录版本、校验证据并保护持久卷。
            """
        ).strip(),
    ),
    PostSeed(
        title="FPGA 时序约束学习笔记：时钟不是写进代码就结束了",
        slug="fpga-clock-constraints-notes",
        summary="从学习实验角度整理时钟定义、输入输出延迟、跨时钟域和时序报告的基本检查顺序。",
        category_slug="fpga-digital-systems",
        tag_slugs=("fpga", "verilog"),
        content_md=dedent(
            """
            ## 这是一份学习项目记录

            HDL 仿真通过，只说明在给定激励和理想时序模型下逻辑行为符合预期。器件中的寄存器、组合路径、时钟树和外部接口都有时间要求；没有约束的路径即使工具显示“实现成功”，也不等于工作频率可被证明。

            本文用于整理个人 FPGA 基础实验的检查框架，不对应商业项目，也不提供特定器件的收敛结论。具体命令和数值应以目标器件、板卡原理图和 Vivado 版本文档为准。

            ## 从主时钟开始

            顶层输入时钟需要定义周期和波形。由 PLL/MMCM 等时钟资源产生的时钟应让工具正确识别生成关系，手工创建时必须保证源、倍频和分频一致。普通逻辑分频信号若被当作时钟使用，会增加时钟树和约束复杂度；学习实验中优先使用时钟使能保持单一时钟域。

            ```tcl
            create_clock -name sys_clk -period 10.000 [get_ports sys_clk]
            set_input_delay  -clock sys_clk 2.000 [get_ports data_in[*]]
            set_output_delay -clock sys_clk 2.500 [get_ports data_out[*]]
            ```

            示例数字只是演示语法，不能复制到真实板卡。输入输出延迟来自外部器件时序、板级传播和接口关系，需要说明参考边沿与最大最小值。

            ## 建立、保持与路径分组

            建立分析检查数据在捕获边沿前是否稳定，保持分析检查边沿后是否过早变化。修复建立违例常关注组合路径、扇出和流水级；保持问题不能简单通过降低频率解决。报告中除了最差裕量，还要查看未约束路径、时钟交互和高扇出网络。

            异步跨时钟域不能靠一条 false path 掩盖。单比特控制信号可使用同步器并标记属性；多比特数据需要握手、异步 FIFO 或保持协议，保证数据相关性。约束表达的是设计事实，不能用来“让报告变绿”。

            ## 最小实验矩阵

            1. 单时钟计数器：验证主时钟约束和寄存器路径；
            2. 组合链：逐步增加逻辑层级，观察建立裕量变化；
            3. 输入寄存器与输出寄存器：加入模拟外部延迟并检查端口路径；
            4. 双时钟脉冲同步：对比错误直连、双触发同步和握手结构；
            5. 异步 FIFO：检查指针同步、复位释放和 CDC 报告。

            每个实验保存 RTL、testbench、约束文件、工具版本和报告摘要。结论只陈述当前实验观察，不把一次实现结果泛化为所有器件或温度电压条件。

            ## 验证顺序

            先进行 RTL 仿真和必要断言，再综合并检查警告、锁存器和未连接信号；随后运行时序检查，确认所有主时钟与 I/O 路径已约束；实现后再次检查时序和 CDC。若修改约束导致裕量突然改善，应核实路径是否被错误排除，而不是直接接受结果。

            ## 后续问题

            仍需继续实验复位跨域、派生时钟、DDR 类接口和多周期路径。多周期约束必须同时考虑建立与保持关系，并用波形解释为何路径确实允许多个周期，不能作为普通违例的快捷修复。

            ## 结论

            时序约束是设计意图的一部分。先证明时钟关系和外部接口假设，再分析具体违例；同时把未约束路径和 CDC 当成验收项，才能让“仿真正确”逐步走向“实现可被验证”。
            """
        ).strip(),
    ),
    PostSeed(
        title="AI 生成测试用例时如何保持需求到用例的可追溯性",
        slug="ai-test-case-traceability",
        summary="把 AI 放在受约束的候选生成环节，通过需求标识、证据引用、规则校验和人工审核保留追溯链。",
        category_slug="ai-assisted-engineering",
        tag_slugs=("ai-testing", "traceability", "pytest"),
        content_md=dedent(
            """
            ## AI 输出不是需求证据

            大模型可以快速提出测试场景，但会补全缺失条件、混淆强制与建议、生成无法执行的步骤。如果直接把自然语言输出导入用例库，数量增加了，需求覆盖却无法复核。可靠流程应把模型定位为候选生成器，需求原文和已批准规则仍是判定依据。

            本文讨论公开、脱敏需求的实验流程。真实需求、日志和代码是否允许送入外部模型，需要单独的数据分级与供应商评估；没有授权时只能使用本地模型或重新编写的模拟材料。

            ## 先把需求切成可引用单元

            每条需求拥有稳定 ID、版本、来源位置和规范化文本。模型输入携带这些 ID，并要求每个候选用例声明覆盖哪些需求、依据哪些原句、有哪些无法确定的前置条件。模型不得自行创建看似真实的需求编号。

            ```json
            {
              "case_id": "candidate-17",
              "requirement_ids": ["REQ-DEMO-012"],
              "preconditions": ["device is in idle state"],
              "steps": ["send a simulated query", "wait within the stated window"],
              "expected": ["response type equals DEMO_STATUS"],
              "open_questions": ["timeout value is not specified"],
              "evidence_quotes": ["REQ-DEMO-012:L3-L5"]
            }
            ```

            输出采用严格结构化模式，字段长度、枚举和引用格式由程序校验。无法解析的结果直接拒绝，不通过字符串修补悄悄猜测。

            ## 规则校验与人工审核

            程序先检查引用的需求是否存在、版本是否一致、每个预期结果是否有依据、步骤是否包含未批准接口。随后进行去重和冲突检测：两个候选若前置条件与操作相同但预期相反，应提交人工判断，而不是自动选择更流畅的一条。

            审核者看到需求片段、候选用例、模型声明的不确定项和规则检查结果。批准动作记录审核人、时间和修改差异；批准后的用例获得正式 ID，模型原始输出只作为生成证据，不能继续覆盖正式版本。

            ## 覆盖率不能只数关联

            一条需求关联十条相似的正常路径，不代表边界和异常得到覆盖。需求可以预先标注行为维度：正常、边界、无效输入、超时、状态转换和恢复。覆盖矩阵按维度统计，并允许明确标记“不适用”及理由。

            还应检查反向孤儿：没有需求依据的正式用例。探索性测试可以存在，但必须标记为风险或经验来源，不能伪装成需求覆盖。

            ## 可重复性与评估

            保存提示模板版本、模型标识、推理参数、输入需求摘要和原始结构化输出。需求正文若敏感，可保存受控引用和哈希，不在普通日志复制全文。用固定模拟需求集做回归，评估引用准确率、无依据步骤比例、重复率和人工接受率，而不是只评价语言是否自然。

            对照实验可以比较人工基线、AI 候选和审核后结果。若模型漏掉边界，改进需求切分或检查规则；不能通过在提示中暗示具体答案来制造漂亮指标。

            ## 结论

            AI 辅助测试的安全边界是“生成候选，不替代依据”。稳定需求 ID、逐项证据引用、结构校验和带差异的人工批准共同保留了从需求到正式用例的链路。只有这条链可复核，生成速度才有工程价值。
            """
        ).strip(),
    ),
)
