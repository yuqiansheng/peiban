import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Coffee,
  HeartHandshake,
  Home,
  House,
  ListChecks,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { appConfig, energyOptions, quickEncouragements } from "./config";
import { getCabinClient, isCabinApiConfigured } from "./cabinClient";
import {
  buildEncouragement,
  buildSummaryPayload,
  buildTaskPayload,
  byNewestCreatedAt,
  countGuardedDays,
  getOtherOwner,
  getTodayKey,
  groupTasksByOwnerAndType,
  OWNER_KEYS,
  summarizeTasks,
  TASK_TYPES,
} from "./utils";

const SESSION_KEY = "side-by-side-cabin-session";

const tabs = [
  { key: "home", label: "首页", icon: Home },
  { key: "tasks", label: "任务", icon: ListChecks },
  { key: "encourage", label: "鼓劲", icon: HeartHandshake },
  { key: "night", label: "晚安", icon: Moon },
  { key: "cabin", label: "小屋", icon: House },
];

const emptyData = {
  tasks: [],
  encouragements: [],
  summaries: [],
  statuses: [],
  allSummaries: [],
};

function loadSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function personLabel(owner) {
  return appConfig.people[owner] || (owner === "me" ? "我" : "TA");
}

function relationLabel(owner, currentOwner) {
  if (owner === currentOwner) {
    return "我";
  }
  return personLabel(owner);
}

function App() {
  const savedSession = loadSavedSession();
  const [session, setSession] = useState(savedSession?.roomCode && savedSession?.owner ? savedSession : null);
  const [activeTab, setActiveTab] = useState("home");
  const [data, setData] = useState(emptyData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [taskDrawer, setTaskDrawer] = useState(null);
  const today = useMemo(() => getTodayKey(), []);

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { repository } = await getCabinClient();
      await repository.ensureRoom(session.roomCode, appConfig.people);
      const nextData = await repository.getTodayData(session.roomCode, today);
      setData(nextData);
    } catch (err) {
      setError(err.message || "小屋暂时没有连上云端");
    } finally {
      setIsLoading(false);
    }
  }, [session, today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      loadData();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadData, session]);

  const runCloudAction = useCallback(
    async (action) => {
      setIsSaving(true);
      setError("");

      try {
        const { repository } = await getCabinClient();
        await action(repository);
        await loadData();
      } catch (err) {
        setError(err.message || "刚才那一下没有存进去");
      } finally {
        setIsSaving(false);
      }
    },
    [loadData],
  );

  const enterCabin = (nextSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const leaveCabin = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setData(emptyData);
    setActiveTab("home");
  };

  if (!session) {
    return <EntryGate onEnter={enterCabin} />;
  }

  const currentStatus = data.statuses.find((status) => status.owner === session.owner);
  const otherOwner = getOtherOwner(session.owner);
  const visibleEncouragements = byNewestCreatedAt(data.encouragements).slice(0, 16);
  const groupedTasks = groupTasksByOwnerAndType(data.tasks);

  return (
    <div className="app-shell">
      <main className="app-main">
        <Header
          activeTab={activeTab}
          roomCode={session.roomCode}
          isLoading={isLoading}
          onRefresh={loadData}
        />

        {error ? <Notice message={error} /> : null}
        {!isCabinApiConfigured() ? <SetupNotice /> : null}

        {activeTab === "home" ? (
          <HomePage
            data={data}
            groupedTasks={groupedTasks}
            currentOwner={session.owner}
            currentStatus={currentStatus}
            isSaving={isSaving}
            onSaveEnergy={(mood) =>
              runCloudAction((repository) => {
                const timestamp = new Date().toISOString();
                return repository.saveDailyStatus({
                  roomCode: session.roomCode,
                  owner: session.owner,
                  date: today,
                  mood,
                  createdAt: timestamp,
                  updatedAt: timestamp,
                });
              })
            }
          />
        ) : null}

        {activeTab === "tasks" ? (
          <TasksPage
            groupedTasks={groupedTasks}
            currentOwner={session.owner}
            isSaving={isSaving}
            onAddTask={(owner, type) => setTaskDrawer({ owner, type })}
            onToggleDone={(task) =>
              runCloudAction((repository) =>
                repository.updateTask(task._id, {
                  status: task.status === "done" ? "open" : "done",
                  updatedAt: new Date().toISOString(),
                }),
              )
            }
            onToggleDowngrade={(task) =>
              runCloudAction((repository) =>
                repository.updateTask(task._id, {
                  downgradedToday: !task.downgradedToday,
                  updatedAt: new Date().toISOString(),
                }),
              )
            }
            onDelete={(task) => runCloudAction((repository) => repository.deleteTask(task._id))}
          />
        ) : null}

        {activeTab === "encourage" ? (
          <EncouragePage
            currentOwner={session.owner}
            encouragements={visibleEncouragements}
            isSaving={isSaving}
            onSend={(text) =>
              runCloudAction((repository) =>
                repository.addEncouragement(
                  buildEncouragement({
                    roomCode: session.roomCode,
                    from: session.owner,
                    to: otherOwner,
                    text,
                  }),
                ),
              )
            }
          />
        ) : null}

        {activeTab === "night" ? (
          <NightPage
            currentOwner={session.owner}
            summaries={data.summaries}
            isSaving={isSaving}
            onSave={(draft) =>
              runCloudAction((repository) =>
                repository.saveDailySummary(
                  buildSummaryPayload({
                    roomCode: session.roomCode,
                    owner: session.owner,
                    date: today,
                    ...draft,
                  }),
                ),
              )
            }
          />
        ) : null}

        {activeTab === "cabin" ? (
          <CabinPage
            data={data}
            currentOwner={session.owner}
            roomCode={session.roomCode}
            onLeave={leaveCabin}
          />
        ) : null}
      </main>

      <BottomTabs activeTab={activeTab} onChange={setActiveTab} />

      {taskDrawer ? (
        <TaskDrawer
          drawer={taskDrawer}
          isSaving={isSaving}
          onClose={() => setTaskDrawer(null)}
          onSave={(text) =>
            runCloudAction(async (repository) => {
              await repository.addTask(
                buildTaskPayload({
                  roomCode: session.roomCode,
                  owner: taskDrawer.owner,
                  type: taskDrawer.type,
                  text,
                  date: today,
                }),
              );
              setTaskDrawer(null);
            })
          }
        />
      ) : null}
    </div>
  );
}

function EntryGate({ onEnter }) {
  const [roomCode, setRoomCode] = useState(appConfig.defaultRoomCode);
  const [owner, setOwner] = useState("me");

  return (
    <main className="entry-screen">
      <section className="entry-card">
        <div className="cabin-badge">
          <House size={30} />
        </div>
        <p className="eyebrow">并肩小屋</p>
        <h1>刘子涵和小月月的专属小屋</h1>
        <p className="entry-copy">不用很厉害，慢慢来也可以。</p>

        <label className="field-label" htmlFor="roomCode">
          我们的小暗号
        </label>
        <input
          id="roomCode"
          className="soft-input"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
          autoComplete="off"
          inputMode="text"
        />
        <p className="entry-hint">你和 TA 输入同样的暗号，就能进到同一间小屋</p>

        <div className="choice-grid" role="radiogroup" aria-label="选择身份">
          {OWNER_KEYS.map((key) => (
            <button
              className={`choice-pill ${owner === key ? "is-selected" : ""}`}
              key={key}
              type="button"
              role="radio"
              aria-checked={owner === key}
              onClick={() => setOwner(key)}
            >
              {personLabel(key)}
            </button>
          ))}
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => onEnter({ roomCode: roomCode.trim() || appConfig.defaultRoomCode, owner })}
        >
          <Sparkles size={18} />
          进小屋
        </button>
      </section>
    </main>
  );
}

function Header({ activeTab, roomCode, isLoading, onRefresh }) {
  const active = tabs.find((tab) => tab.key === activeTab);

  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">{roomCode}</p>
        <h1>{active?.label || "并肩小屋"}</h1>
      </div>
      <button className="icon-button" type="button" onClick={onRefresh} aria-label="刷新小屋">
        <RefreshCw size={20} className={isLoading ? "spin" : ""} />
      </button>
    </header>
  );
}

function Notice({ message }) {
  return (
    <div className="notice">
      <Mail size={18} />
      <span>{message}</span>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="notice setup-notice">
      <Sparkles size={18} />
      <span>部署到 Cloudflare 并绑定 D1 后，小屋就能连到云端。</span>
    </div>
  );
}

function HomePage({ data, groupedTasks, currentOwner, currentStatus, isSaving, onSaveEnergy }) {
  const summaries = OWNER_KEYS.map((owner) => ({
    owner,
    label: relationLabel(owner, currentOwner),
    summary: summarizeTasks(Object.values(groupedTasks[owner]).flat()),
  }));

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">今天也来小屋啦</p>
          <h2>不用很厉害，慢慢来也可以。</h2>
        </div>
        <div className="mini-cabin" aria-hidden="true">
          <div className="mini-cabin-roof" />
          <div className="mini-cabin-body">
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="soft-card">
        <SectionTitle icon={Coffee} title="今日电量" />
        <div className="energy-grid">
          {energyOptions.map((option) => (
            <button
              type="button"
              key={option.key}
              disabled={isSaving}
              onClick={() => onSaveEnergy(option.key)}
              className={`energy-chip tone-${option.tone} ${
                currentStatus?.mood === option.key ? "is-selected" : ""
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="soft-card">
        <SectionTitle icon={Sparkles} title="今日并肩" />
        <div className="overview-grid">
          <OverviewTile label="小安排" value={data.tasks.length} />
          <OverviewTile
            label="已守住"
            value={data.tasks.filter((task) => task.status === "done").length}
          />
          <OverviewTile label="小纸条" value={data.encouragements.length} />
        </div>
      </section>

      <section className="two-card-grid">
        {summaries.map((item) => (
          <article className="person-summary" key={item.owner}>
            <p>{item.label}</p>
            <strong>{item.summary.done} 个已放进今天</strong>
            <span>
              还剩 {item.summary.open} 个，保底和降级都算在好好照顾自己。
            </span>
          </article>
        ))}
      </section>
    </div>
  );
}

function OverviewTile({ label, value }) {
  return (
    <div className="overview-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function TasksPage({
  groupedTasks,
  currentOwner,
  isSaving,
  onAddTask,
  onToggleDone,
  onToggleDowngrade,
  onDelete,
}) {
  return (
    <div className="task-layout">
      {OWNER_KEYS.map((owner) => (
        <section className="task-person" key={owner}>
          <div className="person-heading">
            <div>
              <p className="eyebrow">{owner === currentOwner ? "我的任务" : `${personLabel(owner)} 的任务`}</p>
              <h2>{owner === currentOwner ? "慢慢来清单" : "TA 的小安排"}</h2>
            </div>
          </div>

          {TASK_TYPES.map((type) => (
            <TaskTypeSection
              key={type.key}
              owner={owner}
              type={type}
              tasks={groupedTasks[owner][type.key]}
              isSaving={isSaving}
              onAddTask={onAddTask}
              onToggleDone={onToggleDone}
              onToggleDowngrade={onToggleDowngrade}
              onDelete={onDelete}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function TaskTypeSection({
  owner,
  type,
  tasks,
  isSaving,
  onAddTask,
  onToggleDone,
  onToggleDowngrade,
  onDelete,
}) {
  return (
    <div className="task-type-section">
      <div className="section-row">
        <div>
          <p className="eyebrow">{type.label}</p>
          <h3>{type.softLabel}</h3>
          <span>{type.hint}</span>
        </div>
        <button className="small-icon-button" type="button" onClick={() => onAddTask(owner, type.key)}>
          <Plus size={18} />
        </button>
      </div>

      <div className="task-list">
        {tasks.length ? (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              isSaving={isSaving}
              onToggleDone={onToggleDone}
              onToggleDowngrade={onToggleDowngrade}
              onDelete={onDelete}
            />
          ))
        ) : (
          <p className="empty-text">这里还空着，留一点呼吸也很好。</p>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, isSaving, onToggleDone, onToggleDowngrade, onDelete }) {
  const done = task.status === "done";

  return (
    <article className={`task-card ${done ? "is-done" : ""}`}>
      <button
        className="done-button"
        type="button"
        disabled={isSaving}
        onClick={() => onToggleDone(task)}
        aria-label={done ? "放回今天" : "写进今天"}
      >
        {done ? <Check size={18} /> : null}
      </button>
      <div className="task-body">
        <p>{task.text}</p>
        <div className="task-actions">
          <button type="button" disabled={isSaving} onClick={() => onToggleDowngrade(task)}>
            {task.downgradedToday ? "已降级" : "今日降级"}
          </button>
          <button type="button" disabled={isSaving} onClick={() => onDelete(task)}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function EncouragePage({ currentOwner, encouragements, isSaving, onSend }) {
  const [customText, setCustomText] = useState("");

  const submitCustom = async () => {
    if (!customText.trim()) {
      return;
    }
    await onSend(customText);
    setCustomText("");
  };

  return (
    <div className="page-stack">
      <section className="soft-card">
        <SectionTitle icon={HeartHandshake} title="给 TA 打个气" />
        <div className="quick-grid">
          {quickEncouragements.map((text) => (
            <button type="button" key={text} disabled={isSaving} onClick={() => onSend(text)}>
              {text}
            </button>
          ))}
        </div>
      </section>

      <section className="soft-card">
        <label className="field-label" htmlFor="encouragement">
          写张小纸条
        </label>
        <textarea
          id="encouragement"
          className="soft-input textarea"
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
          rows={3}
          placeholder="慢慢来，我也在"
        />
        <button className="primary-button" type="button" disabled={isSaving} onClick={submitCustom}>
          <Mail size={18} />
          存进小屋
        </button>
      </section>

      <section className="message-list">
        {encouragements.length ? (
          encouragements.map((item) => (
            <article className="message-card" key={item._id || item.createdAt}>
              <p>
                {relationLabel(item.from, currentOwner)} 给 {relationLabel(item.to, currentOwner)}
              </p>
              <strong>{item.text}</strong>
            </article>
          ))
        ) : (
          <div className="soft-card">
            <p className="empty-text">还没有小纸条，第一张可以很轻。</p>
          </div>
        )}
      </section>
    </div>
  );
}

function NightPage({ currentOwner, summaries, isSaving, onSave }) {
  const ownSummary = summaries.find((summary) => summary.owner === currentOwner);
  const otherSummary = summaries.find((summary) => summary.owner !== currentOwner);
  const [draft, setDraft] = useState({
    doneToday: "",
    annoyingThing: "",
    minimumTomorrow: "",
  });

  useEffect(() => {
    setDraft({
      doneToday: ownSummary?.doneToday || "",
      annoyingThing: ownSummary?.annoyingThing || "",
      minimumTomorrow: ownSummary?.minimumTomorrow || "",
    });
  }, [ownSummary?._id, ownSummary?.updatedAt]);

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="page-stack">
      <section className="soft-card">
        <SectionTitle icon={Moon} title="睡前碎碎念" />
        <p className="night-guidance">睡前写两句，让 TA 知道你今天怎么样了</p>
        <SummaryField
          id="doneToday"
          label="今天我做到了..."
          value={draft.doneToday}
          onChange={(value) => updateField("doneToday", value)}
        />
        <SummaryField
          id="annoyingThing"
          label="今天的小烦恼"
          value={draft.annoyingThing}
          onChange={(value) => updateField("annoyingThing", value)}
        />
        <SummaryField
          id="minimumTomorrow"
          label="明天至少要做的一件事"
          value={draft.minimumTomorrow}
          onChange={(value) => updateField("minimumTomorrow", value)}
        />
        <button className="primary-button" type="button" disabled={isSaving} onClick={() => onSave(draft)}>
          <Sparkles size={18} />
          说晚安 🌙
        </button>
      </section>

      {otherSummary ? (
        <section className="soft-card note-card">
          <p className="eyebrow">{personLabel(otherSummary.owner)} 的晚安</p>
          <strong>{otherSummary.doneToday || "今天先好好收尾"}</strong>
          <span>{otherSummary.minimumTomorrow ? `明天至少：${otherSummary.minimumTomorrow}` : ""}</span>
        </section>
      ) : null}
    </div>
  );
}

function SummaryField({ id, label, value, onChange }) {
  return (
    <div className="summary-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="soft-input textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
      />
    </div>
  );
}

function CabinPage({ data, currentOwner, roomCode, onLeave }) {
  const guardedDays = countGuardedDays(data.allSummaries);
  const latestMessages = byNewestCreatedAt(data.encouragements).slice(0, 3);
  const ownStatus = data.statuses.find((status) => status.owner === currentOwner);

  return (
    <div className="page-stack">
      <section className="cabin-scene soft-card">
        <div className="cabin-illustration" aria-hidden="true">
          <div className="roof" />
          <div className="home-body">
            <span className="window" />
            <span className="door" />
          </div>
        </div>
        <div>
          <p className="eyebrow">今日小屋状态</p>
          <h2>{ownStatus ? "灯还亮着" : "等一盏小灯"}</h2>
          <span>两个人已经一起守住 {guardedDays} 天。</span>
        </div>
      </section>

      <section className="soft-card">
        <SectionTitle icon={Mail} title="小纸条" />
        <div className="paper-stack">
          {latestMessages.length ? (
            latestMessages.map((message) => (
              <p key={message._id || message.createdAt}>{message.text}</p>
            ))
          ) : (
            <p className="empty-text">今天的小纸条还在路上。</p>
          )}
        </div>
      </section>

      <section className="soft-card room-card">
        <p className="eyebrow">小屋口令</p>
        <strong>{roomCode}</strong>
        <button className="ghost-button" type="button" onClick={onLeave}>
          切换身份
        </button>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="section-title">
      <Icon size={19} />
      <h2>{title}</h2>
    </div>
  );
}

function BottomTabs({ activeTab, onChange }) {
  return (
    <nav className="bottom-tabs" aria-label="小屋导航">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? "is-active" : ""}
            onClick={() => onChange(tab.key)}
          >
            <Icon size={21} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function TaskDrawer({ drawer, isSaving, onClose, onSave }) {
  const [text, setText] = useState("");
  const type = TASK_TYPES.find((item) => item.key === drawer.type);

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <section className="task-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-handle" />
        <div className="drawer-title">
          <div>
            <p className="eyebrow">{personLabel(drawer.owner)}</p>
            <h2>{type?.softLabel || "今天的小安排"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>
        <textarea
          className="soft-input textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          autoFocus
          placeholder="写一点今天可以做到的小事"
        />
        <button
          className="primary-button"
          type="button"
          disabled={isSaving || !text.trim()}
          onClick={() => onSave(text)}
        >
          <Plus size={18} />
          放进今天
        </button>
      </section>
    </div>
  );
}

export default App;
