const STORAGE_KEY = "return-os-mvp-v1";
const todayKey = toDateKey(new Date());
const PUBLIC_STATE_URL = "https://return-os.onrender.com/api/state";
const PROFILE_COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#b45309", "#dc2626", "#475569"];

const tabs = [
  { id: "home", label: "홈", icon: "⌂" },
  { id: "routine", label: "루틴", icon: "✓" },
  { id: "study", label: "공부", icon: "✎" },
  { id: "work", label: "업무", icon: "◫" },
  { id: "emotion", label: "감정", icon: "◔" },
  { id: "report", label: "리포트", icon: "▤" },
  { id: "ledger", label: "가계부", icon: "₩" },
  { id: "briefing", label: "브리핑", icon: "☰" },
  { id: "admin", label: "관리", icon: "⚙" },
  { id: "developer", label: "개발", icon: "⌘" },
];

let selectedTab = "home";
let selectedRoutineId = "r1";
let selectedWorkFocus = 3;
let selectedEmotion = { level: 3, emoji: "🙂" };
let selectedMistakeArea = "업무";
let selectedMistakeSeverity = 2;
let reportPeriod = "week";
let reportWeekOffset = 0;
let recoveryDismissedFor = sessionStorage.getItem("recovery-dismissed-for");
let appState = defaultAppState();
let activeProfileId = appState.activeProfileId;
let state = getActiveProfileState();
let storageMode = "local";
let syncLabel = "Loading";
let saveQueue = Promise.resolve();
let calendarModalOpen = false;
let studyTimerModalOpen = false;
let studyReviewModalOpen = false;
let activeStudyTimer = null;
let pendingStudyReview = null;
let timerIntervalId = null;
let selectedCalendarDate = todayKey;
let sleepPromptModalOpen = false;
let sleepPromptDismissedFor = "";
let sleepCheckinModalOpen = false;
let sleepCheckinState = { emotionLevel: 3, emotionEmoji: "🙂", fatigueLabel: "보통" };
let pomodoroInterruptModalOpen = false;
let pendingPomodoroInterrupt = { reasonTag: "연락" };
let editingTaskId = null;
let editingStudyId = null;
let editingBrainDumpId = null;
let selectedConditionSlot = "morning";
let emotionHistoryTab = "emotion";
let quickRecordModalOpen = false;
let quickRecordDismissedFor = sessionStorage.getItem("quick-record-dismissed-for");
let quickRecordPromptedFor = "";

const sleepPresets = {
  wakeTime: ["06:00", "06:10", "06:30", "07:00"],
  sleepTime: ["23:00", "23:30", "00:00", "00:30"],
};

const conditionSlots = [
  { key: "morning", label: "오전", sublabel: "집중 시작", time: "09:00", defaultScore: 90 },
  { key: "noon", label: "낮", sublabel: "점심 전후", time: "12:30", defaultScore: 75 },
  { key: "afternoon", label: "오후", sublabel: "2시 이후", time: "15:00", defaultScore: 60 },
  { key: "evening", label: "저녁", sublabel: "6-8시", time: "19:00", defaultScore: 85 },
];

const pomodoroPresets = [15, 25, 50];
const interruptionTags = ["지인 만남", "연락", "회사업무", "전화"];

const quickTags = {
  work: ["문서", "회의", "몰입", "방해", "마감", "정리"],
  emotion: ["피로", "마감", "비교", "불안", "회복", "안정"],
  mistake: ["누락", "지각", "확인부족", "과몰입", "우선순위", "미루기"],
  briefing: ["루틴", "습관", "몰입", "시간관리", "집중", "복귀"],
};

const root = document.querySelector("#app");
renderLoading();
bootstrap();

function createDefaultQuoteEntry() {
  return {
    id: crypto.randomUUID(),
    text: "새앙쥐 레이스 소득이 커지면 지출이 커져 일자리를 끊지 못하는 현상",
    shownCount: 0,
    lastShownAt: "",
  };
}

function defaultProfileData() {
  const days = lastNDays(7);
  const defaultQuote = createDefaultQuoteEntry();
  return {
    routines: [
      {
        id: "r1",
        name: "기상 후 물 마시기",
        category: "생활",
        checkedDateList: days.slice(0, 5).map((day) => day.key),
        streak: 0,
      },
      {
        id: "r2",
        name: "25분 공부 시작",
        category: "공부",
        checkedDateList: [days[2].key, days[3].key, days[4].key, days[5].key],
        streak: 0,
      },
      {
        id: "r3",
        name: "업무 시작 전 오늘 3개 정하기",
        category: "업무",
        checkedDateList: [days[1].key, days[3].key, days[5].key],
        streak: 0,
      },
    ],
    sleepLogs: [
      { date: days[5].key, wakeTime: "07:40", sleepTime: "00:30" },
      { date: days[6].key, wakeTime: "08:10", sleepTime: "01:00" },
    ],
    studySessions: [
      {
        id: crypto.randomUUID(),
        date: days[5].key,
        subject: "영어",
        startTime: "10:00",
        durationMinutes: 50,
        focusScore: 4,
        roundCount: 1,
        evaluationText: "시작은 늦었지만 끊기지 않았음",
      },
      {
        id: crypto.randomUUID(),
        date: days[6].key,
        subject: "자료구조",
        startTime: "15:00",
        durationMinutes: 70,
        focusScore: 3,
        roundCount: 1,
        evaluationText: "개념 정리가 좋고 문제 복습 필요",
      },
    ],
    workLogs: [
      { id: crypto.randomUUID(), date: days[5].key, focusScore: 4, memo: "회의 후 문서 정리", tags: ["문서", "회의"] },
      { id: crypto.randomUUID(), date: days[6].key, focusScore: 3, memo: "오후 집중도 흔들림", tags: ["집중", "오후"] },
    ],
    emotionLogs: [
      {
        id: crypto.randomUUID(),
        date: days[6].key,
        emotionLevel: 3,
        emotionEmoji: "🙂",
        memo: "해야 할 일이 많아서 머리가 복잡함",
        causeTags: ["마감", "피로"],
      },
    ],
    mistakeLogs: [
      {
        id: crypto.randomUUID(),
        date: days[6].key,
        count: 2,
        area: "업무",
        typeTags: ["누락", "확인부족"],
        severity: 3,
        memo: "작업 전 체크리스트가 필요함",
      },
    ],
    tasks: [
      { id: crypto.randomUUID(), date: todayKey, text: "가장 중요한 공부 25분", done: false, kind: "focus" },
      { id: crypto.randomUUID(), date: todayKey, text: "업무 메모 1개 정리", done: false, kind: "focus" },
      { id: crypto.randomUUID(), date: todayKey, text: "잠들기 전 회고 3줄", done: false, kind: "focus" },
    ],
    briefingKeywords: [
      { id: crypto.randomUUID(), keyword: "루틴" },
      { id: crypto.randomUUID(), keyword: "몰입" },
      { id: crypto.randomUUID(), keyword: "시간관리" },
    ],
    workBrainDumps: [],
    studySuppliesNote: "",
    studySuppliesByDate: {},
    conditionLogs: [],
    quoteEntries: [defaultQuote],
    currentQuoteId: defaultQuote.id,
    expenseLogs: [],
  };
}

function defaultAppState() {
  const profileId = crypto.randomUUID();
  return {
    activeProfileId: profileId,
    profiles: [
      {
        id: profileId,
        name: "나",
        color: PROFILE_COLORS[0],
      },
    ],
    profileData: {
      [profileId]: defaultProfileData(),
    },
  };
}

function loadLocalAppState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return normalizeAppState(defaultAppState());
  try {
    return normalizeAppState(JSON.parse(raw));
  } catch {
    return normalizeAppState(defaultAppState());
  }
}

function hasLocalAppState() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

function isLocalHostApp() {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

function normalizeAppState(data) {
  if (!data.profiles || !data.profileData) {
    const migratedId = crypto.randomUUID();
    return normalizeAppState({
      activeProfileId: migratedId,
      profiles: [{ id: migratedId, name: "나", color: PROFILE_COLORS[0] }],
      profileData: { [migratedId]: data },
    });
  }

  const base = defaultAppState();
  const profiles = (data.profiles || []).map((profile, index) => ({
    id: profile.id || crypto.randomUUID(),
    name: profile.name || `사람 ${index + 1}`,
    color: profile.color || PROFILE_COLORS[index % PROFILE_COLORS.length],
  }));

  const profileData = {};
  profiles.forEach((profile) => {
    const source = data.profileData?.[profile.id] || defaultProfileData();
    const merged = { ...defaultProfileData(), ...source };
    merged.routines = (merged.routines || []).map((routine) => ({
      ...routine,
      checkedDateList: routine.checkedDateList || [],
      streak: calculateStreak(routine.checkedDateList || []),
    }));
    merged.studySessions = (merged.studySessions || []).map((session) => ({
      ...session,
      date: session.date || todayKey,
      roundCount: Math.max(1, Number(session.roundCount || 1)),
    }));
    merged.tasks = (merged.tasks || []).map((task) => ({
      ...task,
      kind: task.kind || "focus",
    }));
    merged.workBrainDumps = (merged.workBrainDumps || []).map((item) => ({
      id: item.id || crypto.randomUUID(),
      text: item.text || "",
      createdDate: item.createdDate || todayKey,
      dueDate: item.dueDate || "",
      done: Boolean(item.done),
      doneDate: item.doneDate || "",
    }));
    merged.conditionLogs = (merged.conditionLogs || []).map((item) => ({
      id: item.id || crypto.randomUUID(),
      date: item.date || todayKey,
      slotKey: normalizeConditionSlotKey(item.slotKey || "morning"),
      time: item.time || "09:00",
      score: Number(item.score || 0),
    }));
    merged.quoteEntries = (merged.quoteEntries || []).map((item) => ({
      id: item.id || crypto.randomUUID(),
      text: item.text || "",
      shownCount: Number(item.shownCount || 0),
      lastShownAt: item.lastShownAt || "",
    }));
    merged.expenseLogs = (merged.expenseLogs || []).map((item) => ({
      id: item.id || crypto.randomUUID(),
      date: item.date || todayKey,
      text: item.text || "",
      amount: Number(item.amount || 0),
      memo: item.memo || "",
    }));
    merged.studySuppliesByDate = merged.studySuppliesByDate || {};
    if (!merged.studySuppliesByDate[todayKey] && String(merged.studySuppliesNote || "").trim()) {
      merged.studySuppliesByDate[todayKey] = { note: String(merged.studySuppliesNote || "").trim(), checked: {} };
    }
    if (!merged.quoteEntries.length) {
      const defaultQuote = createDefaultQuoteEntry();
      merged.quoteEntries = [defaultQuote];
      merged.currentQuoteId = defaultQuote.id;
    } else {
      merged.currentQuoteId = merged.quoteEntries.some((item) => item.id === merged.currentQuoteId)
        ? merged.currentQuoteId
        : merged.quoteEntries[0].id;
    }
    profileData[profile.id] = merged;
  });

  return {
    ...base,
    ...data,
    profiles,
    activeProfileId: profiles.some((profile) => profile.id === data.activeProfileId) ? data.activeProfileId : profiles[0].id,
    profileData,
  };
}

function persist() {
  state.routines = state.routines.map((routine) => ({
    ...routine,
    streak: calculateStreak(routine.checkedDateList),
  }));
  appState.profileData[activeProfileId] = structuredClone(state);
  appState.activeProfileId = activeProfileId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  if (storageMode === "server") {
    queueRemoteSave();
  } else {
    syncLabel = "Saved on this device";
  }
}

function getActiveProfileState() {
  return structuredClone(appState.profileData[activeProfileId]);
}

function getActiveProfileMeta() {
  return appState.profiles.find((profile) => profile.id === activeProfileId) || appState.profiles[0];
}

function renderApp() {
  root.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="brand">
          <span class="brand-mark">R</span>
          <div>
            <strong>Return OS</strong>
            <small>${escapeHtml(getActiveProfileMeta().name)}의 루틴이 끊겨도 다시 돌아오는 자기관리</small>
          </div>
        </div>
        <div class="header-actions">
          <span class="sync-badge">${escapeHtml(syncLabel)}</span>
          <button class="secondary-btn" data-action="import" type="button">Import</button>
          <button class="secondary-btn" data-action="export">Export</button>
          <button class="secondary-btn" data-action="export-gpt" type="button">GPT Pack</button>
          <button class="danger-btn" data-action="reset" type="button">Reset</button>
        </div>
      </header>

      <main class="page">
        ${renderPage()}
      </main>

      <input class="hidden" data-import-file type="file" accept=".json,application/json" />
      <input class="hidden" data-quote-file type="file" accept=".txt,text/plain" />

      <nav class="bottom-nav" aria-label="main tabs">
        ${tabs
          .map(
            (tab) => `
              <button class="nav-btn ${selectedTab === tab.id ? "active" : ""}" data-tab="${tab.id}" type="button">
                <strong>${tab.icon}</strong>
                <span>${tab.label}</span>
              </button>
            `,
          )
          .join("")}
      </nav>

      ${studyTimerModalOpen ? renderStudyTimerModal() : ""}
      ${studyReviewModalOpen ? renderStudyReviewModal() : ""}
      ${pomodoroInterruptModalOpen ? renderPomodoroInterruptModal() : ""}
      ${shouldShowSleepPromptModal() ? renderSleepPromptModal(getTodaySleepLog()) : ""}
      ${sleepCheckinModalOpen ? renderSleepCheckinModal() : ""}
      ${calendarModalOpen ? renderCalendarModal() : ""}
      ${shouldShowRecoveryModal() ? renderRecoveryModal() : ""}
      ${shouldShowQuickRecordModal() ? renderQuickRecordModal() : ""}
    </div>
  `;

  bindEvents();
}

function renderLoading() {
  root.innerHTML = `
    <div class="app-shell">
      <main class="page">
        <section class="card">
          <div class="section-head">
            <h2>Return OS</h2>
            <span>Loading</span>
          </div>
          <div class="empty">데이터를 불러오는 중입니다.</div>
        </section>
      </main>
    </div>
  `;
}

function renderPage() {
  const titleMap = {
    home: ["오늘", "오늘 다시 돌아오는 데 필요한 것만 보여줘요"],
    routine: ["루틴", "가볍게 체크하고 꾸준함을 쌓아가요"],
    study: ["공부", "과목별 세션과 집중 흐름을 쌓아가요"],
    work: ["업무", "집중도와 방해 요인을 함께 기록해요"],
    emotion: ["감정/실수", "감정과 컨디션, 실수를 같이 남겨요"],
    report: ["리포트", "이번 주 흐름을 숫자와 패턴으로 봐요"],
    ledger: ["가계부", "오늘 쓴 돈을 짧게 남겨요"],
    briefing: ["브리핑", "관심 키워드 기반 추천을 모아봐요"],
    admin: ["관리자 설정", "TXT 문장과 랜덤 카드 설정을 관리해요"],
    developer: ["개발자 탭", "문장별 노출 횟수와 기록을 확인해요"],
  };
  const [title, subtitle] = titleMap[selectedTab];

  return `
    <section class="page-title">
      <div>
        <p>${formatKoreanDate(new Date())}</p>
        <h1>${title}</h1>
      </div>
      <span class="pill">${subtitle}</span>
    </section>
    ${renderProfilePanel()}
    ${renderSelectedTab()}
  `;
}

function renderProfilePanel() {
  const active = getActiveProfileMeta();
  return `
    <section class="card" style="margin-bottom:14px">
      <div class="section-head">
        <h2>사람별 보기</h2>
        <div class="button-row">
          ${appState.profiles.length > 1 ? `<button class="danger-btn" data-action="delete-profile" data-id="${active.id}" type="button">현재 사람 삭제</button>` : ""}
          <span>프로필</span>
        </div>
      </div>
      <div class="profile-toolbar">
        <div class="profile-list">
          ${appState.profiles
            .map(
              (profile) => `
                <button
                  class="profile-chip ${profile.id === activeProfileId ? "active" : ""}"
                  data-action="switch-profile"
                  data-id="${profile.id}"
                  type="button"
                  style="--profile-color:${profile.color}"
                >
                  <span class="profile-dot"></span>
                  <strong>${escapeHtml(profile.name)}</strong>
                </button>
              `,
            )
            .join("")}
        </div>
        <form class="profile-add-form" data-form="add-profile">
          <input name="name" type="text" maxlength="20" placeholder="사람 이름 추가" required />
          <button class="primary-btn" type="submit">추가</button>
        </form>
      </div>
      <div class="profile-summary">
        <span class="pill">${escapeHtml(active.name)}</span>
        <span class="muted">오늘 루틴 ${getTodayRoutineRate()}%</span>
        <span class="muted">공부 ${state.studySessions.filter((item) => item.date === todayKey).length}회</span>
        <span class="muted">업무 ${state.workLogs.filter((item) => item.date === todayKey).length}회</span>
      </div>
      <div class="tag-help">사람을 바꾸면 루틴, 공부, 업무, 감정, 리포트, 브리핑 데이터가 완전히 분리됩니다.</div>
    </section>
  `;
}

function renderSelectedTab() {
  if (selectedTab === "home") return renderHome();
  if (selectedTab === "routine") return renderRoutine();
  if (selectedTab === "study") return renderStudy();
  if (selectedTab === "work") return renderWork();
  if (selectedTab === "emotion") return renderEmotionAndMistakes();
  if (selectedTab === "report") return renderReport();
  if (selectedTab === "ledger") return renderLedger();
  if (selectedTab === "admin") return renderAdminSettings();
  if (selectedTab === "developer") return renderDeveloperTab();
  return renderBriefing();
}

function renderHome() {
  const routineRate = getTodayRoutineRate();
  const tasks = getTodayTasks();
  const doneTasks = tasks.filter((task) => task.done).length;
  const taskRate = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const recovery = getRecoveryState();
  const currentQuote = getCurrentQuote();
  const todaySleepLog = getTodaySleepLog();
  const selectedDateDiaryItems = getTasksForDate(selectedCalendarDate, "diary", 12);
  const selectedDateTodoItems = getTasksForDate(selectedCalendarDate, "todo", 12);
  const selectedDateLabel = formatDateLabel(selectedCalendarDate);

  return `
    <div class="grid three">
      <article class="card">
        <div class="metric">
          <span>오늘 루틴 달성률</span>
          <strong>${routineRate}%</strong>
          <div class="progress"><span style="width:${routineRate}%"></span></div>
        </div>
      </article>
      <article class="card">
        <div class="metric">
          <span>핵심 3개 완료</span>
          <strong>${taskRate}%</strong>
          <span>${doneTasks}/${tasks.length || 3} 완료</span>
          <div class="progress"><span style="width:${taskRate}%"></span></div>
        </div>
      </article>
      <article class="card">
        <div class="metric">
          <span>오늘 기록 수</span>
          <strong>${countTodayRecords()}</strong>
          <span>공부/업무/감정/실수 기록 합계</span>
        </div>
      </article>
    </div>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>주간 캘린더</h2>
        <div class="button-row">
          <button class="secondary-btn" data-action="open-calendar-sync" type="button">캘린더 저장</button>
          <span>이번 주</span>
        </div>
      </div>
      ${renderWeekCalendar()}
    </section>

      <section class="card" style="margin-top:14px">
        <div class="section-head">
          <h2>${selectedDateLabel} 메모와 할 일</h2>
          <span>선택 날짜</span>
        </div>
        <div class="calendar-split-grid">
          <div class="calendar-subsection">
            <div class="subhead">
            <strong>오늘 한 줄 메모</strong>
            <span>${selectedDateDiaryItems.length}개</span>
          </div>
          <div class="stack">
            ${selectedDateDiaryItems.map((task) => renderDiaryItem(task)).join("") || '<div class="empty">오늘 남기고 싶은 한 줄 메모가 아직 없어요.</div>'}
            ${renderTaskInput(selectedCalendarDate, "diary", "예: 비타민 4,000 + 파워에이드 효과 좋았음", "+")}
          </div>
        </div>
        <div class="calendar-subsection">
          <div class="subhead">
            <strong>할 일 목록 추가</strong>
            <span>${selectedDateTodoItems.length}개</span>
          </div>
          <div class="stack">
            ${selectedDateTodoItems.map((task) => renderTaskItem(task)).join("") || '<div class="empty">아직 등록된 할 일이 없어요.</div>'}
            ${renderTaskInput(selectedCalendarDate, "todo", "예: 발표 자료 다듬기", "할 일 추가")}
          </div>
        </div>
      </div>
    </section>

    ${recovery.active ? renderRecoveryCard(recovery) : ""}

    <section class="card soft" style="margin-top:14px">
      <div class="section-head">
        <h2>오늘의 한 줄</h2>
        <span>${state.quoteEntries.length}문장</span>
      </div>
      <div class="quote-card">
        <strong>${escapeHtml(currentQuote?.text || "관리자 설정에서 txt 파일을 올리면 여기에서 한 줄 문장이 랜덤으로 보여요.")}</strong>
        <small>${currentQuote ? `랜덤 노출 ${currentQuote.shownCount}회` : "예: 영어 영작, 좋은 문장, 명언 txt를 한 줄씩 넣어둘 수 있어요."}</small>
      </div>
      <div class="button-row" style="margin-top:12px">
        <button class="primary-btn" data-action="draw-random-quote" type="button">한 줄 랜덤</button>
        <button class="secondary-btn" data-tab="admin" type="button">관리자 설정</button>
      </div>
    </section>

    <section class="card soft" style="margin-top:14px">
      <div class="section-head">
        <h2>시간대별 컨디션</h2>
        <span>${getTodayConditionAverageLabel()}</span>
      </div>
      <p class="muted">원 안의 4개 시간대 중 하나를 누르고, 아래에서 그 시간대 컨디션 %를 바로 저장해요.</p>
      ${renderConditionTracker()}
    </section>

    <section class="card" id="sleep-card" style="margin-top:14px">
      <div class="section-head">
        <h2>수면/시간</h2>
        <div class="button-row">
          <button class="secondary-btn" data-action="open-sleep-prompt" type="button">빠른 입력 팝업</button>
          <span>수면/기상</span>
        </div>
      </div>
      <form class="sleep-grid" data-form="sleep">
        <label>
          기상시간
          <input name="wakeTime" type="time" value="${todaySleepLog?.wakeTime || ""}" />
          <span class="tag-help">추천 시간</span>
          <div class="tag-chip-row">
            ${sleepPresets.wakeTime
              .map((time) => `<button class="choice ghost-active" data-action="set-sleep-preset" data-kind="wakeTime" data-time="${time}" type="button">${formatTimeMeridiem(time)}</button>`)
              .join("")}
          </div>
        </label>
        <label>
          취침시간
          <input name="sleepTime" type="time" value="${todaySleepLog?.sleepTime || ""}" />
          <span class="tag-help">추천 시간</span>
          <div class="tag-chip-row">
            ${sleepPresets.sleepTime
              .map((time) => `<button class="choice ghost-active" data-action="set-sleep-preset" data-kind="sleepTime" data-time="${time}" type="button">${formatTimeMeridiem(time)}</button>`)
              .join("")}
          </div>
        </label>
        <div class="sleep-summary">
          <span class="muted">예상 수면 시간</span>
          <strong>${getSleepDurationLabel()}</strong>
          <small>${formatTimeMeridiem(todaySleepLog?.sleepTime)} - ${formatTimeMeridiem(todaySleepLog?.wakeTime)}</small>
        </div>
        <button class="primary-btn sleep-save-btn" type="submit">시간 저장</button>
      </form>
    </section>
  `;
}

function renderSleepPromptModal(todaySleepLog) {
  return `
    <div class="modal-backdrop top-align">
      <section class="modal sleep-prompt-modal">
        <div class="section-head">
          <h2>오늘 기상/취침 먼저 적어둘까요?</h2>
          <span>빠른 입력</span>
        </div>
        <p>저장하기 전에는 여기서 가볍게 적고, 저장한 뒤에는 아래 수면/시간 카드에서 편하게 수정할 수 있어요.</p>
        <form class="sleep-grid sleep-prompt-grid" data-form="sleep-prompt">
          <label>
            기상시간
            <input name="wakeTime" type="time" value="${todaySleepLog?.wakeTime || ""}" />
            <span class="tag-help">자주 쓰는 시간</span>
            <div class="tag-chip-row">
              ${sleepPresets.wakeTime
                .map((time) => `<button class="choice ghost-active" data-action="set-sleep-prompt-preset" data-kind="wakeTime" data-time="${time}" type="button">${formatTimeMeridiem(time)}</button>`)
                .join("")}
            </div>
          </label>
          <label>
            취침시간
            <input name="sleepTime" type="time" value="${todaySleepLog?.sleepTime || ""}" />
            <span class="tag-help">자주 쓰는 시간</span>
            <div class="tag-chip-row">
              ${sleepPresets.sleepTime
                .map((time) => `<button class="choice ghost-active" data-action="set-sleep-prompt-preset" data-kind="sleepTime" data-time="${time}" type="button">${formatTimeMeridiem(time)}</button>`)
                .join("")}
            </div>
          </label>
          <div class="sleep-summary">
            <span class="muted">입력 후 바로 저장돼요</span>
            <strong>${todaySleepLog?.wakeTime || todaySleepLog?.sleepTime ? "거의 다 됐어요" : "먼저 한 번만 기록"}</strong>
            <small>오늘 저장이 끝나면 팝업은 자동으로 사라져요.</small>
          </div>
          <div class="button-row sleep-prompt-actions">
            <button class="primary-btn" type="submit">지금 저장</button>
            <button class="secondary-btn" data-action="jump-sleep-card" type="button">아래에서 수정하기</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderConditionTracker() {
  const activeSlot = conditionSlots.find((slot) => slot.key === selectedConditionSlot) || conditionSlots[0];
  const activeLog = getConditionLog(todayKey, activeSlot.key);
  const activeScore = activeLog?.score ?? activeSlot.defaultScore;
  return `
    <div class="condition-grid">
      <article class="condition-wheel-card">
        <div class="condition-wheel-wrap">
          <div class="condition-wheel" aria-label="시간대별 컨디션 선택">
            <div class="condition-wheel-center">
              <strong>${activeScore}%</strong>
              <small>${activeSlot.label}</small>
            </div>
            ${conditionSlots
              .map((slot, index) => {
                const slotLog = getConditionLog(todayKey, slot.key);
                const slotScore = slotLog?.score ?? slot.defaultScore;
                return `
                  <button
                    class="condition-segment segment-${index} ${selectedConditionSlot === slot.key ? "active" : ""}"
                    data-action="set-condition-slot"
                    data-slot="${slot.key}"
                    type="button"
                    aria-label="${slot.label} 시간대 선택"
                  >
                    <span>${slot.label}</span>
                    <small>${slotScore}%</small>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>

        <div class="condition-summary">
          <strong>${activeSlot.label} ${activeScore}%</strong>
          <small>${activeSlot.sublabel} · ${formatTimeMeridiem(activeSlot.time)}</small>
        </div>

        <div class="condition-current-row">
          ${conditionSlots
            .map((slot) => {
              const slotLog = getConditionLog(todayKey, slot.key);
              const slotScore = slotLog?.score ?? slot.defaultScore;
              return `
                <button
                  class="choice ${selectedConditionSlot === slot.key ? "active" : "ghost-active"}"
                  data-action="set-condition-slot"
                  data-slot="${slot.key}"
                  type="button"
                >
                  ${slot.label} ${slotScore}%
                </button>
              `;
            })
            .join("")}
        </div>

        <div class="condition-presets">
          ${[100, 85, 70, 55, 40]
            .map(
              (score) => `
                <button
                  class="choice ${activeScore === score ? "active" : "ghost-active"}"
                  data-action="save-condition-score"
                  data-slot="${activeSlot.key}"
                  data-score="${score}"
                  type="button"
                >
                  ${score}%
                </button>
              `,
            )
            .join("")}
        </div>
        <div class="tag-help">${activeSlot.label} 시간대 컨디션을 저장하면 감정 탭과 리포트에도 같이 반영돼요.</div>
      </article>
    </div>
  `;
}

function renderWeekCalendar() {
  const week = getCurrentWeekDays();
  return `
    <div class="week-calendar">
      ${week
        .map((day) => {
          const summary = getDaySummary(day.key);
          const isToday = day.key === todayKey;
          const isSelected = day.key === selectedCalendarDate;
          const taskCount = getTasksForDate(day.key).length;
          return `
            <article class="week-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" data-action="select-calendar-date" data-date="${day.key}">
              <span class="week-name">${day.weekday}</span>
              <strong class="week-date">${day.dayNumber}</strong>
              <span class="week-rate">${summary.routineRate}%</span>
              <span class="week-task-count">${taskCount ? `일정 ${taskCount}` : "일정 없음"}</span>
              <div class="week-dots">
                <span class="week-dot ${summary.hasStudy ? "active" : ""}"></span>
                <span class="week-dot ${summary.hasWork ? "active" : ""}"></span>
                <span class="week-dot ${summary.hasEmotion ? "active" : ""}"></span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTaskInput(dateKey = todayKey, kind = "focus", placeholder = "새 항목을 추가해보세요", buttonLabel = "추가") {
  return `
    <form class="task-item task-form" data-form="add-task" data-date="${dateKey}" data-kind="${kind}">
      <input name="text" type="text" maxlength="60" placeholder="${placeholder}" required />
      <button class="secondary-btn" type="submit">${buttonLabel}</button>
    </form>
  `;
}

function renderTaskItem(task) {
  if (editingTaskId === task.id) {
    return `
      <form class="task-item task-form editing" data-form="edit-task" data-id="${task.id}">
        <input name="text" type="text" maxlength="60" value="${escapeHtml(task.text)}" required />
        <div class="button-row">
          <button class="primary-btn" type="submit">저장</button>
          <button class="secondary-btn" data-action="cancel-task-edit" type="button">취소</button>
        </div>
      </form>
    `;
  }
  return `
    <div class="task-item">
      <label>
        <input type="checkbox" data-check="task" data-id="${task.id}" ${task.done ? "checked" : ""} />
        <span>${escapeHtml(task.text)}</span>
      </label>
      <div class="task-actions">
        <span class="pill">${task.done ? "완료" : task.kind === "schedule" ? "일정" : task.kind === "todo" ? "할 일" : "대기"}</span>
        <button class="icon-btn" data-action="edit-task" data-id="${task.id}" type="button" aria-label="핵심 일정 편집">편집</button>
        <button class="icon-btn danger" data-action="delete-task" data-id="${task.id}" type="button" aria-label="항목 삭제">삭제</button>
      </div>
    </div>
  `;
}

function renderDiaryItem(task) {
  if (editingTaskId === task.id) {
    return `
      <form class="task-item task-form editing" data-form="edit-task" data-id="${task.id}">
        <input name="text" type="text" maxlength="80" value="${escapeHtml(task.text)}" required />
        <div class="button-row">
          <button class="primary-btn" type="submit">저장</button>
          <button class="secondary-btn" data-action="cancel-task-edit" type="button">취소</button>
        </div>
      </form>
    `;
  }
  return `
    <div class="task-item">
      <div>
        <strong>한 줄 메모</strong>
        <small>${escapeHtml(task.text)}</small>
      </div>
      <div class="task-actions">
        <span class="pill">메모</span>
        <button class="icon-btn" data-action="edit-task" data-id="${task.id}" type="button" aria-label="한 줄 메모 편집">편집</button>
        <button class="icon-btn danger" data-action="delete-task" data-id="${task.id}" type="button" aria-label="한 줄 메모 삭제">삭제</button>
      </div>
    </div>
  `;
}

function renderRecoveryCard(recovery) {
  return `
    <section class="card recovery-card" style="margin-top:14px">
      <h2>복귀 카드</h2>
      <p>${recovery.message}</p>
      <div class="button-row">
        <button class="primary-btn" data-action="quick-restart" type="button">2분만 다시 시작</button>
        <button class="secondary-btn" data-action="split-task" type="button">오늘 할 일 쪼개기</button>
        <button class="secondary-btn" data-action="recovery-mode" type="button">회복 모드로 전환</button>
      </div>
    </section>
  `;
}

function renderRoutine() {
  const selected = state.routines.find((routine) => routine.id === selectedRoutineId) || state.routines[0];
  const chart = renderSevenDayRoutineChart();

  return `
    <section class="card">
      <div class="section-head">
        <h2>최근 7일 그래프</h2>
        <span>${selected ? `${selected.streak}일 연속` : "선택 없음"}</span>
      </div>
      ${chart || '<div class="empty">루틴을 체크하면 자동으로 수치가 쌓여요.</div>'}
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>습관 체크리스트</h2>
        <span>${getTodayRoutineRate()}%</span>
      </div>
      <div class="stack">
        ${state.routines.map(renderRoutineItem).join("")}
      </div>
      <form class="form-grid" data-form="add-routine" style="margin-top:12px">
        <input name="name" type="text" placeholder="새 루틴 이름" required />
        <input name="category" type="text" placeholder="카테고리" value="생활" />
        <button class="primary-btn" type="submit">루틴 추가</button>
      </form>
    </section>
  `;
}

function renderRoutineItem(routine) {
  const checked = routine.checkedDateList.includes(todayKey);
  return `
    <div class="routine-item ${selectedRoutineId === routine.id ? "selected" : ""}" data-action="select-routine" data-id="${routine.id}">
      <label>
        <input type="checkbox" data-check="routine" data-id="${routine.id}" ${checked ? "checked" : ""} />
        <span class="routine-main">
          <strong>${escapeHtml(routine.name)}</strong>
          <small>${escapeHtml(routine.category)} · ${routine.streak}일 연속</small>
        </span>
      </label>
      <span class="pill">${checked ? "완료" : "미완료"}</span>
    </div>
  `;
}

function renderSevenDayRoutineChart() {
  const days = getCurrentWeekDays().map((day) => ({ key: day.key, label: day.weekday }));
  return `
    <div class="mini-chart">
      ${days
        .map((day) => {
          const rate = getRoutineRateForDate(day.key);
          return `
            <div class="bar-wrap">
              <div class="bar-track">
                <div class="bar" title="${rate}%" style="height:${rate <= 0 ? 0 : Math.max(10, Math.round((rate / 100) * 94))}px; opacity:${rate ? 1 : 0.22}"></div>
              </div>
              <strong class="bar-value">${rate}%</strong>
              <span class="bar-label">${day.label}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStudy() {
  const weekSummary = summarizeStudyBySubject();
  const insight = getStudyInsight();
  const suppliesState = getTodayStudySuppliesState();
  return `
    <section class="card soft" style="margin-top:14px">
      <div class="section-head"><h2>공부 인사이트</h2><span>집중 패턴</span></div>
      <div class="stack">
        <div class="log-item"><div><strong>${highlightStudyTimeTitle(insight.bestTimeTitle)}</strong><small>${escapeHtml(insight.bestTimeBody)}</small></div></div>
        <div class="log-item"><div><strong>${highlightStudySubjectTitle(insight.bestSubjectTitle)}</strong><small>${escapeHtml(insight.bestSubjectBody)}</small></div></div>
      </div>
    </section>

      <section class="card" style="margin-top:14px">
        <div class="section-head">
          <h2>과목별 주간 요약</h2>
          <span>${getWeekStudyMinutes()}분</span>
        </div>
        <div class="tag-help" style="margin-bottom:12px">여기는 평균 요약이라 직접 수정되지 않아요. 아래 최근 공부 기록에서 날짜/집중도 편집 또는 삭제를 하면 바로 반영돼요.</div>
        ${renderStudySummaryChart(weekSummary)}
      </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>공부 세션 기록</h2>
        <span>여러 번 가능</span>
      </div>
      <form class="stack" data-form="study">
        <div class="form-grid">
          <label>날짜<input name="date" type="date" value="${todayKey}" required /></label>
          <label>과목<input name="subject" type="text" placeholder="예: 영어, 수학, 코딩" required /></label>
          <label>시작시간<input name="startTime" type="time" required /></label>
          <label>공부 시간(분)<input name="durationMinutes" type="number" min="1" value="25" required /></label>
          <label>집중도(1~5)<input name="focusScore" type="number" min="1" max="5" value="3" required /></label>
          <label>회독수<input name="roundCount" type="number" min="1" value="1" required /></label>
        </div>
        <div class="tag-chip-row">
          ${pomodoroPresets
            .map((minutes) => `<button class="choice ghost-active" data-action="start-pomodoro" data-minutes="${minutes}" type="button">${minutes}분 시작</button>`)
            .join("")}
        </div>
        <div class="tag-help">메인 버튼을 누르면 현재 입력값으로 공부가 시작돼요. 빠른 시작은 15분, 25분, 50분 버튼으로 바로 갈 수 있어요.</div>
        <label>평가<textarea name="evaluationText" rows="3" placeholder="잘 된 점, 막힌 점, 다음 행동"></textarea></label>
        <div class="button-row">
          <button class="primary-btn" type="submit">공부 시작</button>
          <button class="secondary-btn" data-action="save-study-manual" type="button">기록만 저장</button>
        </div>
      </form>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>최근 공부 기록</h2>
        <span>최근 세션</span>
      </div>
      <div class="horizontal-log-row study-fixed">${renderLogList(state.studySessions, renderStudyLog, 3)}</div>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>공부 준비물</h2>
        <span>준비 체크</span>
      </div>
      <form class="stack" data-form="study-supplies">
        <label>준비물 메모
          <textarea name="note" rows="3" placeholder="예: 충전기, 물, 노트북, 필기구, 교재">${escapeHtml(suppliesState.note || "")}</textarea>
        </label>
        <div class="button-row">
          <button class="primary-btn" type="submit">준비물 저장</button>
        </div>
      </form>
      ${renderStudySuppliesChecklist(suppliesState)}
    </section>
  `;
}

function renderSubjectSummary(item) {
  return `
    <div class="log-item">
      <div>
        <strong>${escapeHtml(item.subject)}</strong>
        <small>${item.minutes}분 · 평균 집중도 ${item.focus}</small>
      </div>
      <span class="pill">${item.count}회</span>
    </div>
  `;
}

function renderStudyLog(log) {
  if (editingStudyId === log.id) {
    return `
      <form class="log-item study-edit-form" data-form="edit-study" data-id="${log.id}">
        <div class="form-grid" style="width:100%">
          <label>날짜<input name="date" type="date" value="${log.date}" required /></label>
          <label>과목<input name="subject" type="text" value="${escapeHtml(log.subject)}" required /></label>
          <label>시작시간<input name="startTime" type="time" value="${log.startTime}" required /></label>
          <label>공부 시간(분)<input name="durationMinutes" type="number" min="1" value="${log.durationMinutes}" required /></label>
          <label>집중도(1~5)<input name="focusScore" type="number" min="1" max="5" value="${log.focusScore}" required /></label>
          <label>회독수<input name="roundCount" type="number" min="1" value="${Math.max(1, Number(log.roundCount || 1))}" required /></label>
        </div>
        <label style="width:100%">평가<textarea name="evaluationText" rows="2">${escapeHtml(log.evaluationText || "")}</textarea></label>
        <div class="button-row">
          <button class="primary-btn" type="submit">저장</button>
          <button class="secondary-btn" data-action="cancel-study-edit" type="button">취소</button>
        </div>
      </form>
    `;
  }
  return `
    <div class="log-item">
        <div>
          <strong>${escapeHtml(log.subject)} · ${log.durationMinutes}분</strong>
        <small>${log.date} ${formatTimeMeridiem(log.startTime)} · ${log.interrupted ? `중단 · ${escapeHtml(log.interruptionTag || "사유 없음")}` : `집중도 ${log.focusScore}${log.reviewScore ? ` · 별점 ${log.reviewScore}` : ""}`} · ${escapeHtml(log.evaluationText || "평가 없음")}</small>
        <div class="study-round-row">
          <span class="study-round-value">회독 ${Math.max(1, Number(log.roundCount || 1))}</span>
          <div class="button-row">
            <button class="icon-btn" data-action="adjust-study-round" data-id="${log.id}" data-delta="-1" type="button">-</button>
            <button class="icon-btn" data-action="adjust-study-round" data-id="${log.id}" data-delta="1" type="button">+</button>
          </div>
        </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-action="edit-study" data-id="${log.id}" type="button">편집</button>
          <button class="icon-btn danger" data-action="delete-study" data-id="${log.id}" type="button">삭제</button>
        </div>
      </div>
    `;
  }

function renderStudySummaryChart(summary) {
  if (!summary.length) return '<div class="empty">이번 주 공부 기록이 아직 없어요.</div>';
  const maxMinutes = Math.max(...summary.map((item) => Number(item.minutes || 0)), 60);
  return renderBars(
    summary.map((item) => ({
      label: item.subject.length > 4 ? item.subject.slice(0, 4) : item.subject,
      value: Number(item.minutes || 0),
    })),
    maxMinutes,
    "분",
  );
}

function renderWork() {
  return `
    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>주간 집중도 추이</h2>
        <span>주간 흐름</span>
      </div>
      ${renderWeeklyWorkChart()}
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>Brain Dump</h2><span>${getPendingBrainDumpCount()}개 대기</span></div>
      <form class="stack" data-form="brain-dump">
        <label>생각 적기
          <textarea name="text" rows="3" placeholder="예: 세금 처리 확인, 고객 메일 답장, 자료 초안 정리"></textarea>
        </label>
        <button class="primary-btn" type="submit">브레인 덤프 추가</button>
      </form>
      <div class="stack" style="margin-top:12px">${renderBrainDumpList()}</div>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>최근 업무 기록</h2><span>최근 기록</span></div>
      <div class="stack">${renderLogList(state.workLogs, renderWorkLog)}</div>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>업무 집중도 기록</h2>
        <span>1~5점</span>
      </div>
      <form class="stack" data-form="work">
        <div class="focus-scale">
          ${[1, 2, 3, 4, 5]
            .map((score) => `<button class="choice ${selectedWorkFocus === score ? "active" : ""}" data-action="set-work-focus" data-score="${score}" type="button">${score}</button>`)
            .join("")}
        </div>
        <div class="tag-chip-row">
          ${quickTags.work
            .map((tag) => `<button class="choice ghost-active" data-action="quick-work-tag" data-tag="${tag}" type="button">${tag}</button>`)
            .join("")}
        </div>
        <div class="tag-help">태그를 누르면 오늘 업무 기록이 빠르게 저장돼요.</div>
        <label>짧은 메모<textarea name="memo" rows="3" placeholder="무엇에 집중했고, 무엇이 방해였는지 적어봐요"></textarea></label>
        <label>태그<input name="tags" type="text" placeholder="예: 회의, 문서, 방해, 몰입" /></label>
        <button class="primary-btn" type="submit">업무 기록 저장</button>
      </form>
    </section>
  `;
}

function renderBrainDumpList() {
  if (!state.workBrainDumps.length) return '<div class="empty">아직 적어둔 브레인 덤프가 없어요.</div>';
  return state.workBrainDumps.map(renderBrainDumpItem).join("");
}

function renderBrainDumpItem(item) {
  if (editingBrainDumpId === item.id) {
    return `
      <form class="log-item study-edit-form" data-form="edit-brain-dump" data-id="${item.id}">
        <div class="form-grid" style="width:100%">
          <label>내용<input name="text" type="text" value="${escapeHtml(item.text)}" required /></label>
          <label>마감기한<input name="dueDate" type="date" value="${item.dueDate || ""}" /></label>
        </div>
        <div class="button-row">
          <button class="primary-btn" type="submit">저장</button>
          <button class="secondary-btn" data-action="cancel-brain-dump-edit" type="button">취소</button>
        </div>
      </form>
    `;
  }
  const pendingDays = getPendingDays(item.createdDate);
  const dueBadge = getBrainDumpDueBadge(item);
  return `
    <div class="log-item brain-dump-item ${item.done ? "done" : ""}">
      <div class="brain-dump-main">
        <button class="brain-check ${item.done ? "checked" : ""}" data-action="toggle-brain-dump" data-id="${item.id}" type="button" aria-label="브레인 덤프 체크"></button>
        <div>
          <strong>${escapeHtml(item.text)}</strong>
          <small>${item.createdDate} · ${item.done ? "체크 완료" : pendingDays > 0 ? `+${pendingDays}일 펜딩` : "아직 진행 전"}${item.dueDate ? ` · 마감 ${item.dueDate}` : ""}</small>
        </div>
      </div>
      <div class="task-actions">
        <span class="pill">${dueBadge}</span>
        <button class="icon-btn" data-action="edit-brain-dump" data-id="${item.id}" type="button">편집</button>
      </div>
    </div>
  `;
}

function renderWorkLog(log) {
  return `
    <div class="log-item">
      <div>
        <strong>집중도 ${log.focusScore}/5</strong>
        <small>${log.date} · ${escapeHtml(log.memo || "메모 없음")} · ${log.tags.map(escapeHtml).join(", ") || "태그 없음"}</small>
      </div>
    </div>
  `;
}

function renderEmotionAndMistakes() {
  const conditionInsight = getConditionInsight();
  const historyMap = {
    emotion: { label: "감정", count: Math.min(state.emotionLogs.length, 12), html: renderLogList(state.emotionLogs, renderEmotionLog, 12) },
    condition: { label: "컨디션", count: Math.min(state.conditionLogs.length, 12), html: renderLogList(state.conditionLogs, renderConditionLog, 12) },
    mistake: { label: "실수", count: Math.min(state.mistakeLogs.length, 12), html: renderLogList(state.mistakeLogs, renderMistakeLog, 12) },
  };
  const activeHistory = historyMap[emotionHistoryTab] || historyMap.emotion;
  return `
    <section class="card soft mini-popup-card" style="margin-top:14px">
      <div class="section-head"><h2>컨디션 인사이트</h2><span>미니 팝업</span></div>
      <div class="mini-insight-line">
        <strong>${escapeHtml(conditionInsight.title)}</strong>
        <small>${escapeHtml(conditionInsight.body)}</small>
      </div>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>컨디션 인사이트</h2><span>패턴</span></div>
      <div class="stack" style="margin-bottom:14px">
        <div class="log-item"><div><strong>${escapeHtml(conditionInsight.title)}</strong><small>${escapeHtml(conditionInsight.body)}</small></div></div>
      </div>
      <div class="section-head"><h2>감정 기록</h2><span>감정</span></div>
      <form class="stack" data-form="emotion">
        <div class="emoji-row">
          ${[
            [1, "😫"],
            [2, "😕"],
            [3, "🙂"],
            [4, "😊"],
            [5, "🤩"],
          ]
            .map(([level, emoji]) => `<button class="choice emoji-choice ${selectedEmotion.level === level ? "active" : ""}" data-action="set-emotion" data-level="${level}" data-emoji="${emoji}" type="button">${emoji}</button>`)
            .join("")}
        </div>
        <div class="tag-chip-row">
          ${quickTags.emotion
            .map((tag) => `<button class="choice ghost-active" data-action="quick-emotion-tag" data-tag="${tag}" type="button">${tag}</button>`)
            .join("")}
        </div>
        <div class="tag-help">원인 태그를 누르면 현재 감정 단계로 바로 기록할 수 있어요.</div>
        <label>메모<textarea name="memo" rows="3" placeholder="감정이 올라온 이유나 상황을 짧게 적어봐요"></textarea></label>
        <label>원인 태그<input name="causeTags" type="text" placeholder="예: 피로, 비교, 마감, 사람" /></label>
        <button class="primary-btn" type="submit">감정 저장</button>
      </form>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>컨디션 기록</h2><span>컨디션</span></div>
      <p class="muted">홈에서 저장한 시간대별 컨디션이 여기에 같이 쌓여요.</p>
      ${renderConditionTracker()}
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>실수 기록</h2><span>실수</span></div>
      <form class="stack" data-form="mistake">
        <div class="form-grid">
          <label>총 횟수<input name="count" type="number" min="0" value="1" required /></label>
          <label>영역<select name="area">${["업무", "공부", "생활"].map((area) => `<option ${selectedMistakeArea === area ? "selected" : ""}>${area}</option>`).join("")}</select></label>
          <label>영향도(1~5)<input name="severity" type="number" min="1" max="5" value="${selectedMistakeSeverity}" required /></label>
          <label>유형 태그<input name="typeTags" type="text" placeholder="예: 누락, 지각, 확인부족" /></label>
        </div>
        <div class="tag-chip-row">
          ${quickTags.mistake
            .map((tag) => `<button class="choice ghost-active" data-action="quick-mistake-tag" data-tag="${tag}" type="button">${tag}</button>`)
            .join("")}
        </div>
        <div class="tag-help">실수 유형 태그를 누르면 현재 영역과 영향도로 바로 저장돼요.</div>
        <label>메모<textarea name="memo" rows="3" placeholder="다음에 막을 수 있는 방법을 적어봐요"></textarea></label>
        <button class="primary-btn" type="submit">실수 저장</button>
      </form>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>최근 감정/컨디션/실수</h2><span>기록</span></div>
      <div class="period-tabs" style="margin-bottom:12px">
        <button class="choice ${emotionHistoryTab === "emotion" ? "active" : ""}" data-action="set-history-tab" data-tab-name="emotion" type="button">감정</button>
        <button class="choice ${emotionHistoryTab === "condition" ? "active" : ""}" data-action="set-history-tab" data-tab-name="condition" type="button">컨디션</button>
        <button class="choice ${emotionHistoryTab === "mistake" ? "active" : ""}" data-action="set-history-tab" data-tab-name="mistake" type="button">실수</button>
      </div>
      <div class="history-box">
        <div class="subhead">
          <strong>${activeHistory.label}</strong>
          <span>${activeHistory.count}개</span>
        </div>
        <div class="stack">${activeHistory.html}</div>
      </div>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>원인 태그 누적</h2><span>주요 원인</span></div>
      <div class="stack">${renderTagStats(getEmotionCauseStats())}</div>
    </section>
  `;
}

function renderEmotionLog(log) {
  const memo = sanitizeVisibleText(log.memo, "이전 감정 메모 정리 중");
  const tags = (log.causeTags || []).map((tag) => sanitizeVisibleText(tag, "")).filter(Boolean);
  return `
    <div class="log-item">
      <div>
        <strong>${log.emotionEmoji} 감정 ${log.emotionLevel}/5</strong>
        <small>${log.date} · ${escapeHtml(memo)} · ${tags.map(escapeHtml).join(", ") || "태그 없음"}</small>
      </div>
    </div>
  `;
}

function renderConditionLog(log) {
  const slot = conditionSlots.find((item) => item.key === log.slotKey);
  return `
    <div class="log-item">
      <div>
        <strong>${escapeHtml(slot?.label || log.slotKey)} 컨디션 ${log.score}%</strong>
        <small>${log.date} · ${formatTimeMeridiem(log.time)} · ${escapeHtml(slot?.sublabel || "컨디션 체크")}</small>
      </div>
    </div>
  `;
}

function renderMistakeLog(log) {
  return `
    <div class="log-item">
      <div>
        <strong>${escapeHtml(log.area)} 실수 ${log.count}회</strong>
        <small>${log.date} · 영향도 ${log.severity}/5 · ${log.typeTags.map(escapeHtml).join(", ") || "유형 없음"}</small>
      </div>
    </div>
  `;
}

function renderExpenseLog(log) {
  return `
    <div class="log-item">
      <div>
        <strong>${escapeHtml(log.text)} · ${Number(log.amount || 0).toLocaleString("ko-KR")}원</strong>
        <small>${log.date}${log.memo ? ` · ${escapeHtml(log.memo)}` : ""}</small>
      </div>
    </div>
  `;
}

function renderReport() {
  const report = buildReportData();
  const conditionInsight = getConditionInsightFromValues(report.conditionSlotAverages);
  const weekOptions = reportPeriod === "week" ? getReportWeekOptions() : [];
  return `
      <section class="card">
        <div class="section-head">
        <h2>기간 보기</h2>
        <div class="period-tabs">
          ${["week", "month", "year"]
            .map((period) => `<button class="choice ${reportPeriod === period ? "active" : ""}" data-action="set-period" data-period="${period}" type="button">${periodLabel(period)}</button>`)
            .join("")}
        </div>
      </div>
        <div class="button-row">
          ${reportPeriod === "week" ? `<button class="secondary-btn" data-action="move-report-week" data-step="-1" type="button">이전 주</button>` : ""}
          <span class="pill">${escapeHtml(report.periodLabel)}</span>
          ${reportPeriod === "week" ? `<button class="secondary-btn" data-action="move-report-week" data-step="1" type="button">다음 주</button>` : ""}
        </div>
        ${reportPeriod === "week" ? `<div class="period-tabs" style="margin-top:12px">${weekOptions
          .map(
            (item) => `<button class="choice ${item.active ? "active" : ""}" data-action="set-report-week" data-offset="${item.offset}" type="button">${escapeHtml(item.label)}</button>`,
          )
          .join("")}</div>` : ""}
      </section>

    <div class="grid four" style="margin-top:14px">
      <article class="card"><div class="metric"><span>${reportPeriod === "week" ? "주간 루틴" : reportPeriod === "month" ? "월간 루틴" : "연간 루틴"}</span><strong>${report.routineAvg}%</strong></div></article>
      <article class="card"><div class="metric"><span>공부 시간</span><strong>${report.studyMinutes}분</strong></div></article>
      <article class="card"><div class="metric"><span>컨디션 평균</span><strong>${report.conditionAverage}%</strong></div></article>
      <article class="card"><div class="metric"><span>평균 공부 시간</span><strong>${report.studyAverageMinutes}분</strong></div></article>
    </div>

    <section class="card soft" style="margin-top:14px">
      <div class="section-head"><h2>학습 리포트 요약</h2><span>요약</span></div>
      <div class="stack">
        <div class="log-item"><div><strong>${highlightStudyTimeTitle(report.studyInsight.bestTimeTitle)}</strong><small>${escapeHtml(report.studyInsight.bestTimeBody)}</small></div></div>
        <div class="log-item"><div><strong>${highlightStudySubjectTitle(report.studyInsight.bestSubjectTitle)}</strong><small>${escapeHtml(report.studyInsight.bestSubjectBody)}</small></div></div>
        <div class="log-item"><div><strong>${highlightConditionTitle(conditionInsight.title)}</strong><small>${escapeHtml(conditionInsight.body)}</small></div></div>
      </div>
    </section>

    <section class="card soft" style="margin-top:14px">
      <div class="section-head"><h2>주간 평균 인사이트</h2><span>한 줄 요약</span></div>
      <div class="stack">
        <div class="log-item"><div><strong>${highlightWeeklyEmotionTitle(report.weeklyEmotionInsight.title)}</strong><small>${escapeHtml(report.weeklyEmotionInsight.body)}</small></div></div>
        <div class="log-item"><div><strong>${highlightWeeklyConditionTitle(report.weeklyConditionInsight.title)}</strong><small>${escapeHtml(report.weeklyConditionInsight.body)}</small></div></div>
      </div>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>루틴 달성률</h2><span>${escapeHtml(report.periodLabel)}</span></div>
      ${renderMetricChart(report.days, "routineRate", "%")}
    </section>
    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>공부 시간</h2><span>${escapeHtml(report.periodLabel)}</span></div>
      ${renderMetricChart(report.days, "studyMinutes", "m")}
    </section>
    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>업무 집중도</h2><span>${escapeHtml(report.periodLabel)}</span></div>
      ${renderMetricChart(report.days, "workFocus", "")}
    </section>
    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>주간 컨디션 현황</h2><span>${escapeHtml(report.periodLabel)}</span></div>
      ${renderWeeklyConditionSnapshot(report.conditionSlotAverages)}
    </section>
    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>감정/실수</h2><span>상태</span></div>
      ${renderMetricChart(report.days, "emotionLevel", "")}
      <div style="height:10px"></div>
      ${renderMetricChart(report.days, "mistakeCount", "회")}
    </section>
  `;
}

function renderLedger() {
  const todayTotal = state.expenseLogs
    .filter((item) => item.date === todayKey)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return `
    <section class="card">
      <div class="section-head">
        <h2>오늘 지출</h2>
        <span>${todayTotal.toLocaleString("ko-KR")}원</span>
      </div>
      <form class="stack" data-form="expense">
        <div class="form-grid">
          <label>날짜<input name="date" type="date" value="${todayKey}" required /></label>
          <label>항목<input name="text" type="text" placeholder="예: 점심, 커피, 교통" required /></label>
          <label>금액<input name="amount" type="number" min="0" step="100" placeholder="예: 8500" required /></label>
        </div>
        <label>메모<textarea name="memo" rows="2" placeholder="짧은 메모"></textarea></label>
        <button class="primary-btn" type="submit">지출 저장</button>
      </form>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>최근 지출 기록</h2>
        <span>${Math.min(state.expenseLogs.length, 10)}개</span>
      </div>
      <div class="stack">${renderLogList(state.expenseLogs, renderExpenseLog, 10)}</div>
    </section>
  `;
}

function renderBriefing() {
  const keywords = state.briefingKeywords;
  return `
    <div class="grid side">
      <section class="card">
        <div class="section-head">
          <h2>관심 키워드</h2>
          <span>더미 소스</span>
        </div>
        <form class="task-item" data-form="keyword">
          <input name="keyword" type="text" placeholder="예: 루틴, 습관, 몰입, 시간관리" required />
          <button class="primary-btn" type="submit">저장</button>
        </form>
        <div class="tag-chip-row" style="margin-top:12px">
          ${quickTags.briefing
            .map((tag) => `<button class="choice ghost-active" data-action="quick-keyword" data-tag="${tag}" type="button">${tag}</button>`)
            .join("")}
        </div>
        <div class="button-row" style="margin-top:12px">
          ${keywords
            .map(
              (item) => `
                <span class="keyword-chip">
                  ${escapeHtml(item.keyword)}
                  <button class="danger-btn" data-action="delete-keyword" data-id="${item.id}" type="button">삭제</button>
                </span>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="card soft">
        <div class="section-head">
          <h2>확장 지점</h2>
          <span>나중에 연결</span>
        </div>
        <p class="muted">추후 OpenAI API, 다글로, 유튜브, 논문 요약이 붙으면 저장한 키워드를 기준으로 개인 브리핑을 만들 수 있어요.</p>
      </section>
    </div>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>더미 추천 카드</h2><span>미리보기</span></div>
      <div class="grid three">
        ${keywords.map(renderBriefingCard).join("") || '<div class="empty">키워드를 추가하면 추천 카드가 여기에 보여요.</div>'}
      </div>
    </section>
  `;
}

function renderAdminSettings() {
  const currentQuote = getCurrentQuote();
  return `
    <div class="grid side">
      <section class="card">
        <div class="section-head">
          <h2>문장 라이브러리</h2>
          <span>${state.quoteEntries.length}문장</span>
        </div>
        <div class="stack">
          <div class="quote-card">
            <strong>${escapeHtml(currentQuote?.text || "txt 파일을 올리면 여기에서 현재 랜덤 문장이 보여요.")}</strong>
            <small>${currentQuote ? `현재 문장 노출 ${currentQuote.shownCount}회` : "한 줄당 하나의 문장으로 정리된 txt 파일을 추천해요."}</small>
          </div>
          <div class="button-row">
            <button class="primary-btn" data-action="open-quote-file" type="button">TXT 업로드</button>
            <button class="secondary-btn" data-action="draw-random-quote" type="button">랜덤 뽑기</button>
            <button class="secondary-btn" data-action="reset-quote-stats" type="button">횟수 초기화</button>
          </div>
          <div class="tag-help">예: 영어 영작, 좋은 문장, 명언을 한 줄씩 넣은 txt 파일을 올려둘 수 있어요.</div>
        </div>
      </section>

      <section class="card soft">
        <div class="section-head">
          <h2>업로드 안내</h2>
          <span>TXT 전용</span>
        </div>
        <div class="stack">
          <div class="log-item">
            <div>
              <strong>한 줄 한 문장</strong>
              <small>txt 파일에서 줄바꿈 기준으로 문장을 나눠서 저장해요.</small>
            </div>
          </div>
          <div class="log-item">
            <div>
              <strong>중복 제거</strong>
              <small>같은 문장은 한 번만 저장해서 관리하기 쉽게 만들어요.</small>
            </div>
          </div>
          <div class="log-item">
            <div>
              <strong>개발자 탭 연결</strong>
              <small>문장별로 몇 번 나왔는지 개발자 탭에서 바로 확인할 수 있어요.</small>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>최근 문장 10개</h2>
        <span>미리보기</span>
      </div>
      <div class="stack">
        ${state.quoteEntries.slice(0, 10).map(renderQuotePreview).join("") || '<div class="empty">아직 업로드한 문장이 없어요.</div>'}
      </div>
    </section>
  `;
}

function renderDeveloperTab() {
  const stats = [...state.quoteEntries].sort((a, b) => b.shownCount - a.shownCount || a.text.localeCompare(b.text, "ko"));
  const totalShown = stats.reduce((sum, item) => sum + item.shownCount, 0);
  return `
    <div class="grid three">
      <article class="card"><div class="metric"><span>저장된 문장</span><strong>${state.quoteEntries.length}</strong></div></article>
      <article class="card"><div class="metric"><span>총 랜덤 노출</span><strong>${totalShown}</strong></div></article>
      <article class="card"><div class="metric"><span>현재 문장</span><strong>${getCurrentQuote() ? 1 : 0}</strong><span>${escapeHtml(getCurrentQuote()?.text || "없음")}</span></div></article>
    </div>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>문장 노출 카운트</h2>
        <span>개발자 보기</span>
      </div>
      <div class="stack">
        ${stats.map(renderQuoteStatItem).join("") || '<div class="empty">카운트를 볼 문장이 아직 없어요.</div>'}
      </div>
    </section>
  `;
}

function renderBriefingCard(item) {
  return `
    <article class="card brief-card">
      <span class="pill">${escapeHtml(item.keyword)}</span>
      <strong>${escapeHtml(item.keyword)}를 오늘 행동으로 바꾸기</strong>
      <small class="muted">더미 카드입니다. 나중에 YouTube/Daglo/OpenAI 요약 결과가 이 영역에 들어옵니다.</small>
    </article>
  `;
}

function renderQuotePreview(item) {
  return `
    <div class="log-item">
      <div>
        <strong>${escapeHtml(item.text)}</strong>
        <small>랜덤 노출 ${item.shownCount}회</small>
      </div>
    </div>
  `;
}

function renderQuoteStatItem(item, index) {
  return `
    <div class="log-item">
      <div>
        <strong>${index + 1}. ${escapeHtml(item.text)}</strong>
        <small>${item.lastShownAt ? `마지막 노출 ${item.lastShownAt}` : "아직 랜덤으로 나오지 않았음"}</small>
      </div>
      <span class="pill">${item.shownCount}회</span>
    </div>
  `;
}

function bindEvents() {
  root.querySelectorAll("[data-check]").forEach((input) => {
    input.addEventListener("change", (event) => {
      event.stopPropagation();
      if (input.dataset.check === "task") toggleTask(input.dataset.id);
      if (input.dataset.check === "routine") toggleRoutine(input.dataset.id);
    });
  });

  root.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      quickRecordModalOpen = false;
      selectedTab = button.dataset.tab;
      renderApp();
    });
  });

  root.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", (event) => {
      const action = el.dataset.action;
      if (action === "select-routine") {
        if (event.target.closest("input")) return;
        selectedRoutineId = el.dataset.id;
        renderApp();
      }
      if (action === "select-calendar-date") {
        selectedCalendarDate = el.dataset.date;
        renderApp();
      }
      if (action === "edit-task") {
        editingTaskId = el.dataset.id;
        renderApp();
      }
      if (action === "edit-study") {
        editingStudyId = el.dataset.id;
        renderApp();
      }
      if (action === "edit-brain-dump") {
        editingBrainDumpId = el.dataset.id;
        renderApp();
      }
      if (action === "cancel-task-edit") {
        editingTaskId = null;
        renderApp();
      }
      if (action === "cancel-study-edit") {
        editingStudyId = null;
        renderApp();
      }
        if (action === "cancel-brain-dump-edit") {
          editingBrainDumpId = null;
          renderApp();
        }
        if (action === "delete-task") deleteTask(el.dataset.id);
        if (action === "delete-study") deleteStudySession(el.dataset.id);
        if (action === "set-work-focus") {
          selectedWorkFocus = Number(el.dataset.score);
          renderApp();
        }
      if (action === "toggle-brain-dump") toggleBrainDump(el.dataset.id);
      if (action === "set-sleep-emotion") {
        sleepCheckinState.emotionLevel = Number(el.dataset.level);
        sleepCheckinState.emotionEmoji = el.dataset.emoji;
        renderApp();
      }
      if (action === "set-fatigue") {
        sleepCheckinState.fatigueLabel = el.dataset.fatigue;
        renderApp();
      }
      if (action === "set-interrupt-tag") {
        pendingPomodoroInterrupt.reasonTag = el.dataset.tag;
        renderApp();
      }
      if (action === "set-emotion") {
        selectedEmotion = { level: Number(el.dataset.level), emoji: el.dataset.emoji };
        renderApp();
      }
      if (action === "set-period") {
        reportPeriod = el.dataset.period;
        if (reportPeriod !== "week") reportWeekOffset = 0;
        renderApp();
      }
        if (action === "move-report-week") {
          reportWeekOffset += Number(el.dataset.step || 0);
          renderApp();
        }
        if (action === "set-report-week") {
          reportWeekOffset = Number(el.dataset.offset || 0);
          renderApp();
        }
        if (action === "set-history-tab") {
          emotionHistoryTab = el.dataset.tabName || "emotion";
          renderApp();
        }
      if (action === "switch-profile") switchProfile(el.dataset.id);
      if (action === "delete-profile") deleteProfile(el.dataset.id);
      if (action === "delete-keyword") deleteKeyword(el.dataset.id);
      if (action === "open-calendar-sync") {
        calendarModalOpen = true;
        renderApp();
      }
      if (action === "open-quick-record") {
        quickRecordModalOpen = true;
        renderApp();
      }
      if (action === "close-quick-record") {
        quickRecordModalOpen = false;
        quickRecordPromptedFor = todayKey;
        renderApp();
      }
      if (action === "dismiss-quick-record") dismissQuickRecordForToday();
      if (action === "open-sleep-prompt") openSleepPromptModal();
      if (action === "close-sleep-prompt") closeSleepPromptModal();
      if (action === "close-calendar-sync") {
        calendarModalOpen = false;
        renderApp();
      }
      if (action === "export-calendar") exportCalendar(el.dataset.provider);
      if (action === "set-sleep-preset") saveSleepPreset(el.dataset.kind, el.dataset.time);
      if (action === "set-sleep-prompt-preset") setSleepPromptPreset(el.dataset.kind, el.dataset.time);
      if (action === "jump-sleep-card") jumpToSleepCard();
      if (action === "start-pomodoro") startPomodoroFromForm(Number(el.dataset.minutes));
      if (action === "save-study-manual") saveStudyFormManually();
      if (action === "cancel-pomodoro") openPomodoroInterrupt();
      if (action === "set-review-score") setReviewScore(Number(el.dataset.score));
      if (action === "close-study-review") closeStudyReview();
      if (action === "close-pomodoro-interrupt") closePomodoroInterrupt();
      if (action === "close-sleep-checkin") closeSleepCheckin();
      if (action === "dismiss-recovery") dismissRecovery();
      if (action === "quick-restart") quickRestart();
      if (action === "split-task") splitTask();
      if (action === "recovery-mode") recoveryMode();
      if (action === "quick-work-tag") quickAddWorkTag(el.dataset.tag);
      if (action === "quick-emotion-tag") quickAddEmotionTag(el.dataset.tag);
      if (action === "quick-mistake-tag") quickAddMistakeTag(el.dataset.tag);
      if (action === "quick-keyword") quickAddKeyword(el.dataset.tag);
      if (action === "set-condition-slot") {
        selectedConditionSlot = normalizeConditionSlotKey(el.dataset.slot);
        renderApp();
      }
      if (action === "toggle-study-supply") toggleStudySupplyCheck(el.dataset.item);
      if (action === "save-condition-default") saveConditionLog(el.dataset.slot);
      if (action === "save-condition-score") saveConditionLog(el.dataset.slot, Number(el.dataset.score));
      if (action === "adjust-study-round") adjustStudyRound(el.dataset.id, Number(el.dataset.delta || 0));
      if (action === "export") exportData();
      if (action === "import") openImportPicker();
      if (action === "export-gpt") exportGptProjectPack();
      if (action === "open-quote-file") openQuotePicker();
      if (action === "draw-random-quote") drawRandomQuote();
      if (action === "reset-quote-stats") resetQuoteStats();
      if (action === "reset") resetData();
    });
  });

  root.querySelectorAll("[data-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const type = form.dataset.form;
      if (type === "add-task") addTask(data, form.dataset.date || todayKey, form.dataset.kind || "focus");
      if (type === "edit-task") updateTask(form.dataset.id, data);
      if (type === "add-routine") addRoutine(data);
      if (type === "study") startPomodoroFromStudyForm(data);
      if (type === "edit-study") updateStudySession(form.dataset.id, data);
      if (type === "edit-brain-dump") updateBrainDump(form.dataset.id, data);
      if (type === "study-supplies") saveStudySupplies(data);
      if (type === "work") addWorkLog(data);
      if (type === "brain-dump") addBrainDump(data);
      if (type === "expense") addExpenseLog(data);
      if (type === "emotion") addEmotionLog(data);
      if (type === "mistake") addMistakeLog(data);
      if (type === "keyword") addKeyword(data);
      if (type === "sleep") saveSleepLog(data);
      if (type === "sleep-prompt") saveSleepLog(data);
      if (type === "add-profile") addProfile(data);
      if (type === "study-review") submitStudyReview(data);
      if (type === "pomodoro-interrupt") submitPomodoroInterrupt(data);
      if (type === "sleep-checkin") submitSleepCheckin(data);
      if (type === "mistake") {
        selectedMistakeArea = data.area;
        selectedMistakeSeverity = Number(data.severity);
      }
    });
  });

  root.querySelectorAll('[data-form="mistake"] [name="area"]').forEach((select) => {
    select.addEventListener("change", () => {
      selectedMistakeArea = select.value;
    });
  });

  root.querySelectorAll('[data-form="mistake"] [name="severity"]').forEach((input) => {
    input.addEventListener("input", () => {
      selectedMistakeSeverity = Number(input.value || 2);
    });
  });

  root.querySelectorAll("[data-import-file]").forEach((input) => {
    input.addEventListener("change", async () => {
      const [file] = input.files || [];
      if (!file) return;
      await importDataFromFile(file);
      input.value = "";
    });
  });

  root.querySelectorAll("[data-quote-file]").forEach((input) => {
    input.addEventListener("change", async () => {
      const [file] = input.files || [];
      if (!file) return;
      await importQuotesFromTxt(file);
      input.value = "";
    });
  });

  root.querySelectorAll('[data-form="brain-dump"] textarea[name="text"]').forEach((textarea) => {
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        textarea.closest("form")?.requestSubmit();
      }
    });
  });
}

function toggleTask(id) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
  persist();
  renderApp();
}

function switchProfile(id) {
  if (!appState.profileData[id]) return;
  activeProfileId = id;
  appState.activeProfileId = id;
  state = getActiveProfileState();
  selectedRoutineId = state.routines[0]?.id || "";
  persist();
  renderApp();
}

function addProfile(data) {
  const name = data.name.trim();
  if (!name) return;
  if (appState.profiles.some((profile) => profile.name === name)) return;
  const id = crypto.randomUUID();
  appState.profiles.push({
    id,
    name,
    color: PROFILE_COLORS[appState.profiles.length % PROFILE_COLORS.length],
  });
  appState.profileData[id] = defaultProfileData();
  activeProfileId = id;
  state = getActiveProfileState();
  selectedRoutineId = state.routines[0]?.id || "";
  persist();
  renderApp();
}

function deleteProfile(id) {
  if (appState.profiles.length <= 1) return;
  const profile = appState.profiles.find((item) => item.id === id);
  if (!profile) return;
  if (!confirm(`${profile.name} 프로필을 삭제할까요? 이 사람의 기록도 함께 삭제돼요.`)) return;
  appState.profiles = appState.profiles.filter((item) => item.id !== id);
  delete appState.profileData[id];
  if (activeProfileId === id) {
    activeProfileId = appState.profiles[0].id;
    state = getActiveProfileState();
    selectedRoutineId = state.routines[0]?.id || "";
  }
  persist();
  renderApp();
}

function addTask(data, dateKey = todayKey, kind = "focus") {
  const tasksForDate = getTasksForDate(dateKey, kind, 50);
  if (kind === "focus" && tasksForDate.length >= 3) return;
  state.tasks.push({ id: crypto.randomUUID(), date: dateKey, text: data.text.trim(), done: false, kind });
  persist();
  renderApp();
}

function updateTask(id, data) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, text: data.text.trim() } : task));
  editingTaskId = null;
  persist();
  renderApp();
}

function updateStudySession(id, data) {
  state.studySessions = sortStudySessions(
    state.studySessions.map((session) =>
      session.id === id
        ? {
            ...session,
          date: data.date || session.date,
          subject: data.subject.trim(),
          startTime: data.startTime,
          durationMinutes: Number(data.durationMinutes),
          focusScore: Number(data.focusScore),
          roundCount: Math.max(1, Number(data.roundCount || session.roundCount || 1)),
          reviewScore: session.reviewScore ? Number(data.focusScore) : session.reviewScore,
            evaluationText: data.evaluationText.trim(),
          }
        : session,
    ),
  );
  editingStudyId = null;
  persist();
  renderApp();
}

function deleteStudySession(id) {
  state.studySessions = state.studySessions.filter((session) => session.id !== id);
  if (editingStudyId === id) editingStudyId = null;
  persist();
  renderApp();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  if (editingTaskId === id) editingTaskId = null;
  persist();
  renderApp();
}

function toggleRoutine(id) {
  state.routines = state.routines.map((routine) => {
    if (routine.id !== id) return routine;
    const set = new Set(routine.checkedDateList);
    if (set.has(todayKey)) set.delete(todayKey);
    else set.add(todayKey);
    return { ...routine, checkedDateList: [...set].sort() };
  });
  selectedRoutineId = id;
  persist();
  renderApp();
}

function addRoutine(data) {
  state.routines.push({
    id: crypto.randomUUID(),
    name: data.name.trim(),
    category: data.category.trim() || "생활",
    checkedDateList: [],
    streak: 0,
  });
  persist();
  renderApp();
}

function addStudySession(data) {
  state.studySessions = sortStudySessions([
    {
      id: crypto.randomUUID(),
      date: data.date || todayKey,
      subject: data.subject.trim(),
      startTime: data.startTime,
      durationMinutes: Number(data.durationMinutes),
      focusScore: Number(data.focusScore),
      roundCount: Math.max(1, Number(data.roundCount || 1)),
      reviewScore: Number(data.focusScore),
      evaluationText: data.evaluationText.trim(),
    },
    ...state.studySessions,
  ]);
  persist();
  renderApp();
}

function adjustStudyRound(id, delta) {
  state.studySessions = state.studySessions.map((session) =>
    session.id === id ? { ...session, roundCount: Math.max(1, Number(session.roundCount || 1) + delta) } : session,
  );
  persist();
  renderApp();
}

function updateBrainDump(id, data) {
  state.workBrainDumps = state.workBrainDumps.map((item) =>
    item.id === id
      ? {
          ...item,
          text: data.text?.trim() || item.text,
          dueDate: data.dueDate || "",
        }
      : item,
  );
  editingBrainDumpId = null;
  persist();
  renderApp();
}

function saveStudyFormManually() {
  const form = root.querySelector('[data-form="study"]');
  if (!form) return;
  const data = Object.fromEntries(new FormData(form).entries());
  if (!data.subject?.trim() || !data.startTime) {
    alert("과목과 시작시간을 먼저 입력해주세요.");
    return;
  }
  addStudySession(data);
}

function addWorkLog(data) {
  state.workLogs.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    focusScore: selectedWorkFocus,
    memo: data.memo.trim(),
    tags: parseTags(data.tags),
  });
  persist();
  renderApp();
}

function addBrainDump(data) {
  const text = data.text?.trim();
  if (!text) return;
  state.workBrainDumps.unshift({
    id: crypto.randomUUID(),
    text,
    createdDate: todayKey,
    dueDate: data.dueDate || "",
    done: false,
    doneDate: "",
  });
  persist();
  renderApp();
}

function addExpenseLog(data) {
  const text = String(data.text || "").trim();
  if (!text) return;
  state.expenseLogs.unshift({
    id: crypto.randomUUID(),
    date: data.date || todayKey,
    text,
    amount: Number(data.amount || 0),
    memo: String(data.memo || "").trim(),
  });
  persist();
  renderApp();
}

function toggleBrainDump(id) {
  state.workBrainDumps = state.workBrainDumps.map((item) =>
    item.id === id ? { ...item, done: !item.done, doneDate: item.done ? "" : todayKey } : item,
  );
  persist();
  renderApp();
}

function addEmotionLog(data) {
  state.emotionLogs.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    emotionLevel: selectedEmotion.level,
    emotionEmoji: selectedEmotion.emoji,
    memo: data.memo.trim(),
    causeTags: parseTags(data.causeTags),
  });
  persist();
  renderApp();
}

function saveConditionLog(slotKey, score) {
  const slot = conditionSlots.find((item) => item.key === slotKey);
  if (!slot) return;
  const nextScore = Number(score ?? slot.defaultScore);
  const existing = state.conditionLogs.find((item) => item.date === todayKey && item.slotKey === slotKey);
  if (existing) {
    existing.score = nextScore;
    existing.time = slot.time;
  } else {
    state.conditionLogs.unshift({
      id: crypto.randomUUID(),
      date: todayKey,
      slotKey,
      time: slot.time,
      score: nextScore,
    });
  }
  persist();
  renderApp();
}

function saveStudySupplies(data) {
  const note = String(data.note || "").trim();
  const previous = getTodayStudySuppliesState();
  const nextItems = new Set(parseStudySuppliesItems(note));
  const nextChecked = {};
  Object.entries(previous.checked || {}).forEach(([item, checked]) => {
    if (nextItems.has(item)) nextChecked[item] = checked;
  });
  state.studySuppliesByDate = state.studySuppliesByDate || {};
  state.studySuppliesByDate[todayKey] = { note, checked: nextChecked };
  state.studySuppliesNote = note;
  persist();
  renderApp();
}

function toggleStudySupplyCheck(item) {
  if (!item) return;
  const current = getTodayStudySuppliesState();
  state.studySuppliesByDate = state.studySuppliesByDate || {};
  state.studySuppliesByDate[todayKey] = {
    note: current.note,
    checked: {
      ...(current.checked || {}),
      [item]: !(current.checked || {})[item],
    },
  };
  persist();
  renderApp();
}

function addMistakeLog(data) {
  selectedMistakeArea = data.area;
  selectedMistakeSeverity = Number(data.severity);
  state.mistakeLogs.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    count: Number(data.count),
    area: data.area,
    typeTags: parseTags(data.typeTags),
    severity: Number(data.severity),
    memo: data.memo.trim(),
  });
  persist();
  renderApp();
}

function addKeyword(data) {
  const keyword = data.keyword.trim();
  if (!keyword || state.briefingKeywords.some((item) => item.keyword === keyword)) return;
  state.briefingKeywords.push({ id: crypto.randomUUID(), keyword });
  persist();
  renderApp();
}

function quickAddWorkTag(tag) {
  state.workLogs.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    focusScore: selectedWorkFocus,
    memo: `${tag} 태그 빠른 기록`,
    tags: [tag],
  });
  persist();
  renderApp();
}

function quickAddEmotionTag(tag) {
  state.emotionLogs.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    emotionLevel: selectedEmotion.level,
    emotionEmoji: selectedEmotion.emoji,
    memo: `${tag} 원인 빠른 기록`,
    causeTags: [tag],
  });
  persist();
  renderApp();
}

function quickAddMistakeTag(tag) {
  state.mistakeLogs.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    count: 1,
    area: selectedMistakeArea,
    typeTags: [tag],
    severity: selectedMistakeSeverity,
    memo: `${tag} 유형 빠른 기록`,
  });
  persist();
  renderApp();
}

function quickAddKeyword(tag) {
  addKeyword({ keyword: tag });
}

function saveSleepLog(data) {
  const existing = state.sleepLogs.find((log) => log.date === todayKey);
  if (existing) {
    existing.wakeTime = data.wakeTime;
    existing.sleepTime = data.sleepTime;
  } else {
    state.sleepLogs.push({ date: todayKey, wakeTime: data.wakeTime, sleepTime: data.sleepTime });
  }
  sleepPromptModalOpen = false;
  sleepPromptDismissedFor = "";
  persist();
  sleepCheckinModalOpen = true;
  renderApp();
}

function saveSleepPreset(kind, timeValue) {
  const current = getTodaySleepLog() || { date: todayKey, wakeTime: "", sleepTime: "" };
  saveSleepLog({
    wakeTime: kind === "wakeTime" ? timeValue : current.wakeTime,
    sleepTime: kind === "sleepTime" ? timeValue : current.sleepTime,
  });
}

function setSleepPromptPreset(kind, timeValue) {
  const form = root.querySelector('[data-form="sleep-prompt"]');
  const input = form?.querySelector(`[name="${kind}"]`);
  if (input) input.value = timeValue;
}

function jumpToSleepCard() {
  sleepPromptModalOpen = false;
  sleepPromptDismissedFor = todayKey;
  renderApp();
  requestAnimationFrame(() => {
    root.querySelector("#sleep-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function openSleepPromptModal() {
  sleepPromptModalOpen = true;
  renderApp();
}

function closeSleepPromptModal() {
  sleepPromptModalOpen = false;
  sleepPromptDismissedFor = todayKey;
  renderApp();
}

function closeSleepCheckin() {
  sleepCheckinModalOpen = false;
  renderApp();
}

function submitSleepCheckin(data) {
  state.emotionLogs.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    emotionLevel: sleepCheckinState.emotionLevel,
    emotionEmoji: sleepCheckinState.emotionEmoji,
    memo: data.memo.trim() || `수면 저장 후 컨디션 기록 · 피로도 ${sleepCheckinState.fatigueLabel}`,
    causeTags: [sleepCheckinState.fatigueLabel, "수면체크"],
  });
  selectedEmotion = {
    level: sleepCheckinState.emotionLevel,
    emoji: sleepCheckinState.emotionEmoji,
  };
  sleepCheckinModalOpen = false;
  persist();
  renderApp();
}

function deleteKeyword(id) {
  state.briefingKeywords = state.briefingKeywords.filter((item) => item.id !== id);
  persist();
  renderApp();
}

function quickRestart() {
  state.tasks.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    text: "2분만 시작하기",
    done: false,
    kind: "focus",
  });
  const todayFocus = state.tasks.filter((task) => task.date === todayKey && (task.kind || "focus") === "focus").slice(0, 3);
  const others = state.tasks.filter((task) => task.date !== todayKey || (task.kind || "focus") !== "focus");
  state.tasks = todayFocus.concat(others);
  dismissRecovery(false);
}

function splitTask() {
  const firstOpen = getTodayTasks().find((task) => !task.done);
  if (firstOpen) {
    firstOpen.text = `${firstOpen.text} - 첫 2분만`;
  } else {
    state.tasks.push({ id: crypto.randomUUID(), date: todayKey, text: "가장 작은 행동 1개", done: false, kind: "focus" });
  }
  persist();
  dismissRecovery(false);
}

function recoveryMode() {
  state.tasks = state.tasks.filter((task) => task.date !== todayKey);
  state.tasks.push(
    { id: crypto.randomUUID(), date: todayKey, text: "물 마시기", done: false, kind: "focus" },
    { id: crypto.randomUUID(), date: todayKey, text: "책상 위 한 가지만 치우기", done: false, kind: "focus" },
    { id: crypto.randomUUID(), date: todayKey, text: "내일 첫 행동 적기", done: false, kind: "focus" },
  );
  persist();
  dismissRecovery(false);
}

function dismissRecovery(onlyDismiss = true) {
  recoveryDismissedFor = todayKey;
  sessionStorage.setItem("recovery-dismissed-for", todayKey);
  if (onlyDismiss) renderApp();
  else {
    selectedTab = "home";
    renderApp();
  }
}

function getTodayTasks() {
  return state.tasks.filter((task) => task.date === todayKey && (task.kind || "focus") === "focus").slice(0, 3);
}

function getTasksForDate(dateKey, kind = "focus", limit = 3) {
  return state.tasks.filter((task) => task.date === dateKey && (task.kind || "focus") === kind).slice(0, limit);
}

function getFocusCompletionRateForDate(dateKey) {
  const tasks = getTasksForDate(dateKey, "focus", 3);
  if (!tasks.length) return 0;
  const done = tasks.filter((task) => task.done).length;
  return Math.round((done / tasks.length) * 100);
}

function getTodayRoutineRate() {
  if (!state.routines.length) return 0;
  const done = state.routines.filter((routine) => routine.checkedDateList.includes(todayKey)).length;
  return Math.round((done / state.routines.length) * 100);
}

function countTodayRecords() {
  return (
    state.studySessions.filter((item) => item.date === todayKey).length +
    state.workLogs.filter((item) => item.date === todayKey).length +
    state.conditionLogs.filter((item) => item.date === todayKey).length +
    state.emotionLogs.filter((item) => item.date === todayKey).length +
    state.mistakeLogs.filter((item) => item.date === todayKey).length
  );
}

function getTodaySleepLog() {
  return state.sleepLogs.find((log) => log.date === todayKey);
}

function normalizeConditionSlotKey(slotKey) {
  if (slotKey === "wake") return "morning";
  if (slotKey === "night") return "evening";
  return conditionSlots.some((slot) => slot.key === slotKey) ? slotKey : "morning";
}

function hasIncompleteSleepForToday() {
  const log = getTodaySleepLog();
  return !log?.wakeTime || !log?.sleepTime;
}

function shouldShowSleepPromptModal() {
  if (selectedTab !== "home") return false;
  if (!hasIncompleteSleepForToday()) return false;
  return sleepPromptModalOpen || sleepPromptDismissedFor !== todayKey;
}

function shouldShowQuickRecordModal() {
  if (quickRecordModalOpen) return true;
  return selectedTab === "home" && quickRecordDismissedFor !== todayKey && quickRecordPromptedFor !== todayKey;
}

function dismissQuickRecordForToday() {
  quickRecordModalOpen = false;
  quickRecordPromptedFor = todayKey;
  quickRecordDismissedFor = todayKey;
  sessionStorage.setItem("quick-record-dismissed-for", todayKey);
  renderApp();
}

function getConditionLog(dateKey, slotKey) {
  return state.conditionLogs.find((item) => item.date === dateKey && item.slotKey === slotKey);
}

function getConditionAverageForDate(dateKey) {
  const values = state.conditionLogs.filter((item) => item.date === dateKey).map((item) => Number(item.score));
  return values.length ? Math.round(average(values)) : 0;
}

function getRoutineRateForDate(dateKey) {
  if (!state.routines.length) return 0;
  const done = state.routines.filter((routine) => routine.checkedDateList.includes(dateKey)).length;
  return Math.round((done / state.routines.length) * 100);
}

function getTodayConditionAverageLabel() {
  const averageScore = getConditionAverageForDate(todayKey);
  return averageScore ? `${averageScore}% 평균` : "아직 미기록";
}

function getConditionInsight() {
  if (!state.conditionLogs.length) {
    return {
      title: "아직 컨디션 기록이 없어요.",
      body: "홈 탭의 시간대 버튼을 눌러두면 언제 가장 잘 되는지 자동으로 쌓여요.",
    };
  }

  const slotMap = new Map();
  state.conditionLogs.forEach((item) => {
    const current = slotMap.get(item.slotKey) || { total: 0, count: 0 };
    current.total += Number(item.score || 0);
    current.count += 1;
    slotMap.set(item.slotKey, current);
  });

  const [bestKey, bestEntry] = [...slotMap.entries()].sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0];
  const slot = conditionSlots.find((item) => item.key === bestKey);
  const averageScore = Math.round(bestEntry.total / bestEntry.count);
  return {
    title: `${slot?.label || bestKey} 시간대에 컨디션이 가장 좋아요.`,
    body: `${slot?.sublabel || "기록"} 구간 평균이 ${averageScore}%예요. 중요한 일은 이 시간대에 먼저 두는 쪽이 잘 맞아요.`,
  };
}

function getTodayStudySuppliesState() {
  const byDate = state.studySuppliesByDate || {};
  const todayEntry = byDate[todayKey];
  if (todayEntry) {
    return {
      note: String(todayEntry.note || "").trim(),
      checked: todayEntry.checked || {},
    };
  }
  return {
    note: String(state.studySuppliesNote || "").trim(),
    checked: {},
  };
}

function parseStudySuppliesItems(note) {
  return [...new Set(String(note || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

function renderStudySuppliesChecklist(suppliesState) {
  const items = parseStudySuppliesItems(suppliesState.note);
  if (!items.length) return '<div class="empty" style="margin-top:12px">콤마로 준비물을 적으면 아래에 체크포인트가 바로 생겨요.</div>';
  return `
    <div class="study-supplies-list">
      ${items
        .map((item) => {
          const checked = Boolean((suppliesState.checked || {})[item]);
          return `
            <button class="study-supply-chip ${checked ? "checked" : ""}" data-action="toggle-study-supply" data-item="${escapeHtml(item)}" type="button">
              <span>${checked ? "✓" : "○"}</span>
              <strong>${escapeHtml(item)}</strong>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function sanitizeVisibleText(value, fallback = "기록 없음") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const suspiciousCount = [...text].filter((char) => /[^\u0000-\u007F가-힣0-9\s.,!?:/%()\-[\]·~]/.test(char)).length;
  return suspiciousCount >= 3 ? fallback : text;
}

function getRecoveryState() {
  const routineRate = getTodayRoutineRate();
  const now = new Date();
  const afterNine = now.getHours() >= 21;
  const unfinishedTasks = getTodayTasks().filter((task) => !task.done).length;
  const lowRecords = countTodayRecords() <= 1;
  const active = routineRate <= 50 || (afterNine && unfinishedTasks >= 2) || lowRecords;
  return {
    active,
    message: "오늘은 망했다기보다, 잠깐 회복 타임일 수 있어요. 지금 다시 시작할 수 있는 가장 작은 행동 1개를 골라보세요.",
  };
}

function getCurrentWeekDays(baseDate = new Date()) {
  const today = new Date(baseDate);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: toDateKey(date),
      weekday: ["월", "화", "수", "목", "금", "토", "일"][index],
      dayNumber: date.getDate(),
    };
  });
}

function sortStudySessions(list) {
  return [...list].sort((a, b) => {
    const aKey = `${a.date || ""}T${a.startTime || "00:00"}`;
    const bKey = `${b.date || ""}T${b.startTime || "00:00"}`;
    return bKey.localeCompare(aKey);
  });
}

function getDaySummary(dateKey) {
  const routinesDone = state.routines.filter((routine) => routine.checkedDateList.includes(dateKey)).length;
  const focusRate = getFocusCompletionRateForDate(dateKey);
  return {
    routineRate: focusRate || (state.routines.length ? Math.round((routinesDone / state.routines.length) * 100) : 0),
    hasStudy: state.studySessions.some((item) => item.date === dateKey),
    hasWork: state.workLogs.some((item) => item.date === dateKey),
    hasEmotion: state.emotionLogs.some((item) => item.date === dateKey) || state.mistakeLogs.some((item) => item.date === dateKey),
  };
}

function shouldShowRecoveryModal() {
  return selectedTab === "home" && getRecoveryState().active && recoveryDismissedFor !== todayKey;
}

function renderRecoveryModal() {
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <h2>복귀 팝업</h2>
        <p>할 일을 더 쪼갤 수 있을 만큼 쪼개보고, 완벽하게 하려 하기보다 다시 체크인하는 데 집중해봐요.</p>
        <div class="button-row">
          <button class="primary-btn" data-action="quick-restart" type="button">2분만 다시 시작</button>
          <button class="secondary-btn" data-action="split-task" type="button">오늘 할 일 쪼개기</button>
          <button class="secondary-btn" data-action="dismiss-recovery" type="button">닫기</button>
        </div>
      </section>
    </div>
  `;
}

function renderQuickRecordModal() {
  quickRecordPromptedFor = todayKey;
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <h2>빠른 기록</h2>
        <p>지금 바로 남기고 싶은 기록으로 이동할 수 있어요. 하루 다시 보지 않기를 누르면 오늘 하루만 숨겨져요.</p>
        <div class="button-row">
          <button class="primary-btn" data-tab="study" type="button">공부 기록</button>
          <button class="primary-btn" data-tab="work" type="button">업무 기록</button>
          <button class="primary-btn" data-tab="emotion" type="button">감정/실수</button>
          <button class="secondary-btn" data-action="recovery-mode" type="button">복귀 버튼</button>
        </div>
        <div class="button-row" style="margin-top:12px">
          <button class="secondary-btn" data-action="close-quick-record" type="button">닫기</button>
          <button class="secondary-btn" data-action="dismiss-quick-record" type="button">하루 다시 보지 않기</button>
        </div>
      </section>
    </div>
  `;
}

function renderCalendarModal() {
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <h2>캘린더 연동</h2>
        <p>삼성 또는 네이버 캘린더와 동기화하시겠어요? 지금은 직접 계정 연동 대신 가져오기 가능한 캘린더 파일로 저장해드려요.</p>
        <div class="button-row">
          <button class="primary-btn" data-action="export-calendar" data-provider="samsung" type="button">삼성 캘린더 저장</button>
          <button class="secondary-btn" data-action="export-calendar" data-provider="naver" type="button">네이버 캘린더 저장</button>
          <button class="secondary-btn" data-action="export-calendar" data-provider="ics" type="button">.ics만 저장</button>
          <button class="secondary-btn" data-action="close-calendar-sync" type="button">닫기</button>
        </div>
      </section>
    </div>
  `;
}

function renderSleepCheckinModal() {
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <h2>오늘의 감정과 피로도는 어떤가요?</h2>
        <p>방금 저장한 수면/시간 기록과 함께 오늘 컨디션을 짧게 남기면 감정 탭에 바로 반영돼요.</p>
        <form class="stack" data-form="sleep-checkin">
          <div class="emoji-row">
            ${[
              [1, "😫"],
              [2, "😕"],
              [3, "🙂"],
              [4, "😊"],
              [5, "🤩"],
            ]
              .map(([level, emoji]) => `<button class="choice emoji-choice ${sleepCheckinState.emotionLevel === level ? "active" : ""}" data-action="set-sleep-emotion" data-level="${level}" data-emoji="${emoji}" type="button">${emoji}</button>`)
              .join("")}
          </div>
          <div class="tag-chip-row">
            ${["매우 피곤", "피곤", "보통", "괜찮음", "상쾌함"]
              .map((label) => `<button class="choice ${sleepCheckinState.fatigueLabel === label ? "active" : "ghost-active"}" data-action="set-fatigue" data-fatigue="${label}" type="button">${label}</button>`)
              .join("")}
          </div>
          <label>짧은 메모
            <textarea name="memo" rows="3" placeholder="예: 조금 피곤하지만 시작할 힘은 있어요 / 머리가 맑고 집중이 잘 될 것 같아요"></textarea>
          </label>
          <div class="button-row">
            <button class="primary-btn" type="submit">감정 탭에 저장</button>
            <button class="secondary-btn" data-action="close-sleep-checkin" type="button">건너뛰기</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderStudyTimerModal() {
  if (!activeStudyTimer) return "";
  const progress = Math.max(0, Math.min(100, ((activeStudyTimer.durationMinutes * 60 - activeStudyTimer.remainingSeconds) / (activeStudyTimer.durationMinutes * 60)) * 100));
  return `
    <div class="modal-backdrop top-align">
      <section class="modal timer-modal">
        <h2>${escapeHtml(activeStudyTimer.subject)} 집중 중</h2>
        <p>${activeStudyTimer.durationMinutes}분 뽀모도로를 진행하고 있어요. 끝나면 별점과 짧은 회고를 남기게 됩니다.</p>
        <div class="timer-clock">${formatCountdown(activeStudyTimer.remainingSeconds)}</div>
        <div class="progress"><span style="width:${progress}%"></span></div>
        <div class="button-row">
          <button class="secondary-btn" data-action="cancel-pomodoro" type="button">중단</button>
        </div>
      </section>
    </div>
  `;
}

function renderStudyReviewModal() {
  if (!pendingStudyReview) return "";
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <h2>공부 세션 완료</h2>
        <p>${escapeHtml(pendingStudyReview.subject)} ${pendingStudyReview.durationMinutes}분이 끝났어요. 별점과 짧은 이유를 남겨주세요.</p>
        <form class="stack" data-form="study-review">
          <div class="focus-scale">
            ${[1, 2, 3, 4, 5]
              .map((score) => `<button class="choice ${pendingStudyReview.reviewScore === score ? "active" : ""}" data-action="set-review-score" data-score="${score}" type="button">${score}</button>`)
              .join("")}
          </div>
          <label>짧게, 공부가 잘 된 이유는 무엇이라고 생각하나요?
            <textarea name="reviewReason" rows="3" placeholder="예: 조용해서 방해가 적었고, 지금 흐름이 맞는 과목이라 집중이 잘 됐어요."></textarea>
          </label>
          <div class="button-row">
            <button class="primary-btn" type="submit">회고 저장</button>
            <button class="secondary-btn" data-action="close-study-review" type="button">나중에</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderPomodoroInterruptModal() {
  if (!activeStudyTimer) return "";
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <h2>왜 중단했나요?</h2>
        <p>${escapeHtml(activeStudyTimer.subject)} 집중 세션을 멈춘 이유를 남기면, 자주 끊기는 방해 요인을 리포트에 연결할 수 있어요.</p>
        <form class="stack" data-form="pomodoro-interrupt">
          <div class="tag-chip-row">
            ${interruptionTags
              .map((tag) => `<button class="choice ${pendingPomodoroInterrupt.reasonTag === tag ? "active" : "ghost-active"}" data-action="set-interrupt-tag" data-tag="${tag}" type="button">${tag}</button>`)
              .join("")}
          </div>
          <label>짧은 이유
            <textarea name="memo" rows="3" placeholder="예: 갑자기 전화가 와서 끊겼어요 / 회사 업무 요청이 들어왔어요"></textarea>
          </label>
          <div class="button-row">
            <button class="primary-btn" type="submit">중단 기록 저장</button>
            <button class="secondary-btn" data-action="close-pomodoro-interrupt" type="button">취소</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function summarizeStudyBySubject() {
  const week = new Set(getCurrentWeekDays().map((day) => day.key));
  const map = new Map();
  state.studySessions
    .filter((session) => week.has(session.date))
    .forEach((session) => {
      const item = map.get(session.subject) || { subject: session.subject, minutes: 0, focusTotal: 0, count: 0 };
      item.minutes += Number(session.durationMinutes);
      item.focusTotal += Number(session.focusScore);
      item.count += 1;
      map.set(session.subject, item);
    });
  return [...map.values()].map((item) => ({ ...item, focus: (item.focusTotal / item.count).toFixed(1) }));
}

function getStudyInsight() {
  const completedSessions = state.studySessions.filter((session) => !session.interrupted);
  if (!completedSessions.length) {
    return {
      bestTimeTitle: "아직 충분한 공부 기록이 없어요.",
      bestTimeBody: "25분 세션을 몇 번만 쌓아도 어느 시간대가 잘 맞는지 흐름이 보이기 시작해요.",
      bestSubjectTitle: "과목 인사이트 대기 중",
      bestSubjectBody: "별점과 회고가 쌓이면 어떤 과목에서 특히 잘 되는지 더 또렷하게 보여줄게요.",
    };
  }

  const byBucket = new Map();
  const bySubject = new Map();
  completedSessions.forEach((session) => {
    const score = Number(session.reviewScore || session.focusScore || 0);
    const bucket = getTimeBucket(session.startTime);
    const bucketEntry = byBucket.get(bucket) || { total: 0, count: 0 };
    bucketEntry.total += score;
    bucketEntry.count += 1;
    byBucket.set(bucket, bucketEntry);

    const subjectEntry = bySubject.get(session.subject) || { total: 0, count: 0 };
    subjectEntry.total += score;
    subjectEntry.count += 1;
    bySubject.set(session.subject, subjectEntry);
  });

  const bestBucket = [...byBucket.entries()].sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0];
  const bestSubject = [...bySubject.entries()].sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0];

  return {
    bestTimeTitle: `당신은 ${bestBucket[0]}에 가장 잘 돼요.`,
    bestTimeBody: `이 시간대 평균 점수는 ${(bestBucket[1].total / bestBucket[1].count).toFixed(1)}점이에요. 중요한 공부는 이 시간대에 먼저 두는 편이 잘 맞아요.`,
    bestSubjectTitle: `가장 잘 맞는 과목은 ${bestSubject[0]}예요.`,
    bestSubjectBody: `${bestSubject[0]}의 평균 점수는 ${(bestSubject[1].total / bestSubject[1].count).toFixed(1)}점이에요. 지금 흐름을 이어가면 리포트가 더 또렷해져요.`,
  };
}

function getWeekStudyMinutes() {
  return summarizeStudyBySubject().reduce((sum, item) => sum + item.minutes, 0);
}

function getPendingBrainDumpCount() {
  return state.workBrainDumps.filter((item) => !item.done).length;
}

function getPendingDays(dateKey) {
  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${todayKey}T00:00:00`);
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function getBrainDumpDueBadge(item) {
  if (item.done) return "완료";
  if (!item.dueDate) {
    const pendingDays = getPendingDays(item.createdDate);
    return pendingDays > 0 ? `+${pendingDays}일` : "오늘";
  }
  const due = new Date(`${item.dueDate}T00:00:00`);
  const today = new Date(`${todayKey}T00:00:00`);
  const diff = Math.floor((due - today) / 86400000);
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return `+${Math.abs(diff)}일`;
}

function renderWeeklyWorkChart() {
  const days = getCurrentWeekDays().map((day) => ({ key: day.key, label: day.weekday }));
  const values = days.map((day) => {
    const logs = state.workLogs.filter((log) => log.date === day.key);
    const avg = logs.length ? logs.reduce((sum, log) => sum + log.focusScore, 0) / logs.length : 0;
    return { ...day, value: avg };
  });
  return renderBars(values, 5, "");
}

function getEmotionCauseStats() {
  const counts = {};
  state.emotionLogs.forEach((log) => {
    log.causeTags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));
}

function renderTagStats(stats) {
  if (!stats.length) return '<div class="empty">아직 원인 태그가 없어요.</div>';
  return stats
    .map(
      (item) => `
        <div class="log-item">
          <strong>${escapeHtml(item.tag)}</strong>
          <span class="pill">${item.count}회</span>
        </div>
      `,
    )
    .join("");
}

function buildWeeklyReport(baseDate = new Date()) {
  const weekBase = getCurrentWeekDays(baseDate).map((day) => ({ key: day.key, label: day.weekday }));
  const weekKeys = new Set(weekBase.map((day) => day.key));
  const days = weekBase.map((day) => {
    const routineRate = getRoutineRateForDate(day.key);
    const studyMinutes = state.studySessions.filter((item) => item.date === day.key).reduce((sum, item) => sum + Number(item.durationMinutes), 0);
    const workForDay = state.workLogs.filter((item) => item.date === day.key);
    const workFocus = workForDay.length ? average(workForDay.map((item) => item.focusScore)) : 0;
    const conditionScore = getConditionAverageForDate(day.key);
    const emotionForDay = state.emotionLogs.filter((item) => item.date === day.key);
    const emotionLevel = emotionForDay.length ? average(emotionForDay.map((item) => item.emotionLevel)) : 0;
    const mistakeCount = state.mistakeLogs.filter((item) => item.date === day.key).reduce((sum, item) => sum + Number(item.count), 0);
    const sleep = state.sleepLogs.find((item) => item.date === day.key);
    return {
      ...day,
      routineRate,
      studyMinutes,
      workFocus,
      conditionScore,
      emotionLevel,
      mistakeCount,
      wakeTime: sleep?.wakeTime || "",
      sleepTime: sleep?.sleepTime || "",
    };
  });

  const conditionSlotAverages = conditionSlots.map((slot) => {
    const values = state.conditionLogs
      .filter((item) => item.slotKey === slot.key && weekKeys.has(item.date))
      .map((item) => Number(item.score || 0))
      .filter((value) => value > 0);

    return {
      key: slot.key,
      label: slot.label,
      average: values.length ? Math.round(average(values)) : 0,
      sublabel: slot.sublabel,
    };
  });

  return {
    days,
    routineAvg: Math.round(average(days.map((day) => day.routineRate))),
    studyMinutes: days.reduce((sum, day) => sum + day.studyMinutes, 0),
    studyAverageMinutes: Math.round(days.reduce((sum, day) => sum + day.studyMinutes, 0) / Math.max(days.length, 1)),
    mistakeCount: days.reduce((sum, day) => sum + day.mistakeCount, 0),
    conditionAverage: Math.round(average(days.map((day) => day.conditionScore))),
    conditionSlotAverages,
    studyInsight: getStudyInsight(),
    weeklyEmotionInsight: getWeeklyEmotionInsight(days),
    weeklyConditionInsight: getWeeklyConditionInsight(days, conditionSlotAverages),
    periodLabel: getWeekOfMonthLabel(baseDate),
  };
}

function renderMetricChart(days, key, suffix) {
  const maxMap = { routineRate: 100, studyMinutes: Math.max(60, ...days.map((day) => day.studyMinutes)), workFocus: 5, conditionScore: 100, emotionLevel: 5, mistakeCount: Math.max(3, ...days.map((day) => day.mistakeCount)) };
  return renderBars(
    days.map((day) => ({ ...day, value: Number(day[key] || 0) })),
    maxMap[key],
    suffix,
  );
}

function renderBars(values, max, suffix) {
  return `
    <div class="mini-chart">
      ${values
        .map((item) => {
          const height = item.value <= 0 ? 0 : Math.max(10, Math.round((item.value / max) * 94));
          return `
            <div class="bar-wrap">
              <div class="bar-track">
                <div class="bar" title="${item.value}${suffix}" style="height:${height}px; opacity:${item.value ? 1 : 0.2}"></div>
              </div>
              <strong class="bar-value">${formatMetricValue(item.value, suffix)}</strong>
              <span class="bar-label">${item.label}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWeeklyConditionSnapshot(values) {
  return `
    <div class="grid two condition-report-grid">
      ${values
        .map(
          (item) => `
            <article class="card">
              <div class="metric">
                <span>${escapeHtml(item.label)}</span>
                <strong>${item.average}%</strong>
                <span>${escapeHtml(item.sublabel)}</span>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function formatMetricValue(value, suffix = "") {
  const numeric = Number(value || 0);
  const text = Number.isInteger(numeric) ? `${numeric}` : numeric.toFixed(1);
  return `${text}${suffix}`;
}

function highlightStudyTimeTitle(title) {
  const match = String(title || "").match(/^당신은 (.+)에 가장 잘 돼요\.$/);
  if (!match) return escapeHtml(title || "");
  return `당신은 <span class="soft-highlight">${escapeHtml(match[1])}</span>에 가장 잘 돼요.`;
}

function highlightStudySubjectTitle(title) {
  const match = String(title || "").match(/^가장 잘 맞는 과목은 (.+)예요\.$/);
  if (!match) return escapeHtml(title || "");
  return `가장 잘 맞는 과목은 <span class="soft-highlight">${escapeHtml(match[1])}</span>예요.`;
}

function highlightConditionTitle(title) {
  const match = String(title || "").match(/^(.+) 시간대에 컨디션이 가장 좋아요\.$/);
  if (!match) return escapeHtml(title || "");
  return `<span class="soft-highlight">${escapeHtml(match[1])}</span> 시간대에 컨디션이 가장 좋아요.`;
}

function highlightWeeklyEmotionTitle(title) {
  const match = String(title || "").match(/^주간 평균 감정은 (.+)예요\.$/);
  if (!match) return escapeHtml(title || "");
  return `주간 평균 감정은 <span class="soft-highlight">${escapeHtml(match[1])}</span>예요.`;
}

function highlightWeeklyConditionTitle(title) {
  const match = String(title || "").match(/^주간 평균 컨디션은 (.+)예요\.$/);
  if (!match) return escapeHtml(title || "");
  return `주간 평균 컨디션은 <span class="soft-highlight">${escapeHtml(match[1])}</span>예요.`;
}

function getConditionInsightFromValues(values) {
  const best = [...values].sort((a, b) => b.average - a.average)[0];
  if (!best || !best.average) {
    return {
      title: "컨디션 기록이 아직 적어요.",
      body: "오전·낮·오후·저녁 기록이 더 쌓이면 어떤 시간대가 잘 맞는지 보여드릴게요.",
    };
  }
  return {
    title: `${best.label} 시간대에 컨디션이 가장 좋아요.`,
    body: `${best.sublabel} 구간 평균이 ${best.average}%예요. 중요한 일은 이 시간대에 먼저 두는 편이 잘 맞아요.`,
  };
}

function buildReportData() {
  if (reportPeriod === "month") return buildMonthlyReport(new Date());
  if (reportPeriod === "year") return buildYearlyReport(new Date());
  return buildWeeklyReport(addDays(new Date(), reportWeekOffset * 7));
}

function getReportWeekOptions() {
  const activeDate = addDays(new Date(), reportWeekOffset * 7);
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const options = [];
  for (let day = 1; day <= lastDate; day += 1) {
    const date = new Date(year, month, day);
    const weekLabel = getWeekOfMonthLabel(date);
    if (!options.some((item) => item.label === weekLabel)) {
      const monday = getCurrentWeekDays(date)[0];
      const currentMonday = getCurrentWeekDays(new Date())[0];
      const mondayDate = new Date(`${monday.key}T00:00:00`);
      const currentDate = new Date(`${currentMonday.key}T00:00:00`);
      const offset = Math.round((mondayDate - currentDate) / 86400000 / 7);
      options.push({ label: weekLabel, offset, active: offset === reportWeekOffset });
    }
  }
  return options;
}

function buildMonthlyReport(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: lastDate }, (_, index) => {
    const date = new Date(year, month, index + 1);
    const key = toDateKey(date);
    const workForDay = state.workLogs.filter((item) => item.date === key);
    const emotionForDay = state.emotionLogs.filter((item) => item.date === key);
    return {
      key,
      label: `${index + 1}일`,
      routineRate: getRoutineRateForDate(key),
      studyMinutes: state.studySessions.filter((item) => item.date === key).reduce((sum, item) => sum + Number(item.durationMinutes), 0),
      workFocus: workForDay.length ? average(workForDay.map((item) => item.focusScore)) : 0,
      conditionScore: getConditionAverageForDate(key),
      emotionLevel: emotionForDay.length ? average(emotionForDay.map((item) => item.emotionLevel)) : 0,
      mistakeCount: state.mistakeLogs.filter((item) => item.date === key).reduce((sum, item) => sum + Number(item.count), 0),
    };
  });
  return buildRangeReport(days, `${month + 1}월 월간 평균`);
}

function buildYearlyReport(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const days = Array.from({ length: 12 }, (_, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
    const study = state.studySessions.filter((item) => item.date.startsWith(monthKey));
    const work = state.workLogs.filter((item) => item.date.startsWith(monthKey));
    const emotion = state.emotionLogs.filter((item) => item.date.startsWith(monthKey));
    const mistake = state.mistakeLogs.filter((item) => item.date.startsWith(monthKey));
    const condition = state.conditionLogs.filter((item) => item.date.startsWith(monthKey));
    const routineDates = getRoutineDatesForMonth(monthKey);
    return {
      key: monthKey,
      label: `${index + 1}월`,
      routineRate: routineDates.length ? Math.round(average(routineDates.map((key) => getRoutineRateForDate(key)))) : 0,
      studyMinutes: study.reduce((sum, item) => sum + Number(item.durationMinutes), 0),
      workFocus: work.length ? average(work.map((item) => item.focusScore)) : 0,
      conditionScore: condition.length ? average(condition.map((item) => Number(item.score || 0))) : 0,
      emotionLevel: emotion.length ? average(emotion.map((item) => item.emotionLevel)) : 0,
      mistakeCount: mistake.reduce((sum, item) => sum + Number(item.count), 0),
    };
  });
  return buildRangeReport(days, `${year}년 연간 평균`);
}

function buildRangeReport(days, periodLabel) {
  const conditionSlotAverages = conditionSlots.map((slot) => {
    const values = state.conditionLogs
      .filter((item) => days.some((day) => item.date === day.key || item.date.startsWith(day.key)))
      .filter((item) => item.slotKey === slot.key)
      .map((item) => Number(item.score || 0))
      .filter((value) => value > 0);
    return {
      key: slot.key,
      label: slot.label,
      average: values.length ? Math.round(average(values)) : 0,
      sublabel: slot.sublabel,
    };
  });
  return {
    days,
    routineAvg: Math.round(average(days.map((day) => day.routineRate))),
    studyMinutes: days.reduce((sum, day) => sum + day.studyMinutes, 0),
    studyAverageMinutes: Math.round(days.reduce((sum, day) => sum + day.studyMinutes, 0) / Math.max(days.length, 1)),
    mistakeCount: days.reduce((sum, day) => sum + day.mistakeCount, 0),
    conditionAverage: Math.round(average(days.map((day) => day.conditionScore))),
    conditionSlotAverages,
    studyInsight: getStudyInsight(),
    weeklyEmotionInsight: getWeeklyEmotionInsight(days),
    weeklyConditionInsight: getWeeklyConditionInsight(days, conditionSlotAverages),
    periodLabel,
  };
}

function getRoutineDatesForMonth(monthKey) {
  const days = new Set();
  state.routines.forEach((routine) => {
    (routine.checkedDateList || []).forEach((dateKey) => {
      if (dateKey.startsWith(monthKey)) days.add(dateKey);
    });
  });
  return [...days];
}

function getWeeklyEmotionInsight(days) {
  const values = days.map((day) => Number(day.emotionLevel || 0)).filter((value) => value > 0);
  if (!values.length) {
    return {
      title: "주간 감정 평균은 아직 비어 있어요.",
      body: "감정 기록을 몇 번만 더 남기면 이번 주 정서 흐름을 한 줄로 정리해드릴게요.",
    };
  }
  const avg = average(values);
  const tone = avg >= 4 ? "안정적인 편이에요." : avg >= 3 ? "보통 흐름이에요." : "조금 흔들린 한 주예요.";
  return {
    title: `주간 평균 감정은 ${avg.toFixed(1)}/5예요.`,
    body: `이번 주 감정 흐름은 ${tone}`,
  };
}

function getWeeklyConditionInsight(days, slotAverages) {
  const values = days.map((day) => Number(day.conditionScore || 0)).filter((value) => value > 0);
  if (!values.length) {
    return {
      title: "주간 컨디션 평균은 아직 비어 있어요.",
      body: "오전·낮·오후·저녁 컨디션을 남기면 이번 주 평균 흐름을 바로 보여줄게요.",
    };
  }
  const bestSlot = [...slotAverages].sort((a, b) => b.average - a.average)[0];
  return {
    title: `주간 평균 컨디션은 ${Math.round(average(values))}%예요.`,
    body: `${bestSlot?.label || "오전"} 시간대 평균이 가장 높아서 이 시간에 중요한 일을 두는 편이 잘 맞아요.`,
  };
}

function getWeekOfMonthLabel(baseDate = new Date()) {
  const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const week = Math.ceil((firstDay.getDay() + baseDate.getDate()) / 7);
  const korean = ["첫", "둘", "셋", "넷", "다섯", "여섯"][week - 1] || `${week}`;
  return `${baseDate.getMonth() + 1}월 ${korean}째주 주간 평균`;
}

function renderLogList(list, renderer, limit = 6) {
  const items = [...list].slice(0, limit);
  return items.length ? items.map(renderer).join("") : '<div class="empty">아직 기록이 없어요.</div>';
}

function exportData() {
  const backup = {
    type: "return-os-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    appState,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `return-os-backup-${todayKey}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openImportPicker() {
  root.querySelector("[data-import-file]")?.click();
}

function openQuotePicker() {
  root.querySelector("[data-quote-file]")?.click();
}

async function importDataFromFile(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const nextAppState = normalizeImportedState(parsed);
    appState = nextAppState;
    activeProfileId = appState.activeProfileId;
    state = getActiveProfileState();
    selectedRoutineId = state.routines[0]?.id || "";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    if (storageMode === "server") {
      await saveRemoteAppState(appState);
      syncLabel = "Restored to cloud";
    } else {
      syncLabel = "Restored on this device";
    }
    renderApp();
    alert("Backup imported.");
  } catch {
    alert("Could not read that backup file.");
  }
}

function normalizeImportedState(parsed) {
  if (parsed?.type === "return-os-backup" && parsed?.appState) {
    return normalizeAppState(parsed.appState);
  }

  if (parsed?.profiles && parsed?.profileData) {
    return normalizeAppState(parsed);
  }

  const profileId = crypto.randomUUID();
  return normalizeAppState({
    activeProfileId: profileId,
    profiles: [
      {
        id: profileId,
        name: getActiveProfileMeta()?.name || "Me",
        color: PROFILE_COLORS[0],
      },
    ],
    profileData: {
      [profileId]: {
        ...defaultProfileData(),
        ...parsed,
      },
    },
  });
}

async function importQuotesFromTxt(file) {
  try {
    const raw = await file.text();
    const lines = [...new Set(raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
    state.quoteEntries = lines.map((text) => ({
      id: crypto.randomUUID(),
      text,
      shownCount: 0,
      lastShownAt: "",
    }));
    state.currentQuoteId = "";
    persist();
    renderApp();
    alert(`${lines.length}개의 문장을 불러왔어요.`);
  } catch {
    alert("txt 파일을 읽지 못했어요.");
  }
}

function getCurrentQuote() {
  return state.quoteEntries.find((item) => item.id === state.currentQuoteId) || null;
}

function drawRandomQuote() {
  if (!state.quoteEntries.length) {
    selectedTab = "admin";
    renderApp();
    alert("먼저 관리자 설정에서 txt 파일을 올려주세요.");
    return;
  }

  const next = state.quoteEntries[Math.floor(Math.random() * state.quoteEntries.length)];
  state.quoteEntries = state.quoteEntries.map((item) =>
    item.id === next.id
      ? {
          ...item,
          shownCount: Number(item.shownCount || 0) + 1,
          lastShownAt: new Date().toLocaleString("ko-KR"),
        }
      : item,
  );
  state.currentQuoteId = next.id;
  persist();
  renderApp();
}

function resetQuoteStats() {
  state.quoteEntries = state.quoteEntries.map((item) => ({
    ...item,
    shownCount: 0,
    lastShownAt: "",
  }));
  persist();
  renderApp();
}

function exportGptProjectPack() {
  const active = getActiveProfileMeta();
  const week = buildWeeklyReport();
  const insight = getStudyInsight();
  const focusTasks = getTodayTasks();
  const todayEmotion = state.emotionLogs.find((item) => item.date === todayKey);
  const recentStudy = state.studySessions.slice(0, 5);
  const recentWork = state.workLogs.slice(0, 5);
  const recentMistakes = state.mistakeLogs.slice(0, 5);

  const markdown = [
    `# Return OS Project Pack`,
    ``,
    `- Profile: ${active.name}`,
    `- Date: ${todayKey}`,
    `- Routine completion today: ${getTodayRoutineRate()}%`,
    `- Study time this week: ${week.studyMinutes} min`,
    `- Mistakes this week: ${week.mistakeCount}`,
    ``,
    `## Today Focus`,
    ...(focusTasks.length ? focusTasks.map((task) => `- [${task.done ? "x" : " "}] ${task.text}`) : [`- No focus items`]),
    ``,
    `## Study Insight`,
    `- ${insight.bestTimeTitle}`,
    `- ${insight.bestTimeBody}`,
    `- ${insight.bestSubjectTitle}`,
    `- ${insight.bestSubjectBody}`,
    ``,
    `## Today Emotion`,
    todayEmotion
      ? `- ${todayEmotion.emotionEmoji} ${todayEmotion.emotionLevel}/5 | ${todayEmotion.memo || "No memo"} | ${todayEmotion.causeTags.join(", ")}`
      : `- No emotion log today`,
    ``,
    `## Recent Study`,
    ...(recentStudy.length
      ? recentStudy.map((item) => `- ${item.date} ${item.subject} ${item.durationMinutes} min | focus ${item.focusScore}${item.reviewScore ? ` | star ${item.reviewScore}` : ""} | ${item.evaluationText || "No memo"}`)
      : [`- No study logs`]),
    ``,
    `## Recent Work`,
    ...(recentWork.length
      ? recentWork.map((item) => `- ${item.date} focus ${item.focusScore}/5 | ${item.memo || "No memo"} | ${(item.tags || []).join(", ") || "No tags"}`)
      : [`- No work logs`]),
    ``,
    `## Recent Mistakes`,
    ...(recentMistakes.length
      ? recentMistakes.map((item) => `- ${item.date} ${item.area} ${item.count} times | severity ${item.severity}/5 | ${(item.typeTags || []).join(", ") || "No tags"} | ${item.memo || "No memo"}`)
      : [`- No mistake logs`]),
    ``,
    `## ChatGPT Project Prompt`,
    `Review this Return OS record and summarize what went well, what should improve, and the smallest next action to restart today. Also note any time-of-day, emotion, and mistake patterns.`,
    ``,
  ].join("\n");

  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `return-os-gpt-pack-${slugify(active.name)}-${todayKey}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  if (!confirm(`${getActiveProfileMeta().name}의 기록을 샘플 상태로 초기화할까요?`)) return;
  state = defaultProfileData();
  selectedRoutineId = state.routines[0]?.id || "";
  persist();
  renderApp();
}

function exportCalendar(provider) {
  const ics = buildCalendarIcs();
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(getActiveProfileMeta().name)}-${provider || "calendar"}-${todayKey}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
  calendarModalOpen = false;
  renderApp();
  const providerLabel = provider === "samsung" ? "삼성 캘린더" : provider === "naver" ? "네이버 캘린더" : "캘린더";
  alert(`${providerLabel}에서 가져올 수 있는 .ics 파일을 저장했어요.`);
}

function startPomodoroFromStudyForm(data) {
  if (!data.subject?.trim() || !data.startTime) {
    alert("과목과 시작시간을 먼저 입력해주세요.");
    return;
  }
  startPomodoro({
    date: data.date || todayKey,
    subject: data.subject.trim(),
    startTime: data.startTime,
    durationMinutes: Number(data.durationMinutes || 25),
    focusScore: Number(data.focusScore || 3),
    roundCount: Math.max(1, Number(data.roundCount || 1)),
    evaluationText: data.evaluationText?.trim() || "",
  });
}

function startPomodoroFromForm(minutes) {
  const form = root.querySelector('[data-form="study"]');
  const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
  if (!data.subject?.trim()) {
    alert("과목을 먼저 입력해주세요.");
    return;
  }
  startPomodoro({
    date: data.date || todayKey,
    subject: data.subject.trim(),
    startTime: data.startTime || toTimeValue(new Date()),
    durationMinutes: Number(minutes),
    focusScore: Number(data.focusScore || 3),
    roundCount: Math.max(1, Number(data.roundCount || 1)),
    evaluationText: data.evaluationText?.trim() || "",
  });
}

function startPomodoro(config) {
  activeStudyTimer = {
    id: crypto.randomUUID(),
    subject: config.subject,
    date: config.date || todayKey,
    startTime: config.startTime,
    durationMinutes: Number(config.durationMinutes),
    remainingSeconds: Number(config.durationMinutes) * 60,
    focusScore: Number(config.focusScore || 3),
    roundCount: Math.max(1, Number(config.roundCount || 1)),
    evaluationText: config.evaluationText || "",
  };
  studyTimerModalOpen = true;
  studyReviewModalOpen = false;
  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIntervalId = setInterval(() => {
    if (!activeStudyTimer) return;
    activeStudyTimer.remainingSeconds -= 1;
    if (activeStudyTimer.remainingSeconds <= 0) {
      finishPomodoro();
      return;
    }
    renderApp();
  }, 1000);
  renderApp();
}

function cancelPomodoro() {
  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIntervalId = null;
  activeStudyTimer = null;
  studyTimerModalOpen = false;
  renderApp();
}

function openPomodoroInterrupt() {
  pomodoroInterruptModalOpen = true;
  renderApp();
}

function closePomodoroInterrupt() {
  pomodoroInterruptModalOpen = false;
  renderApp();
}

function submitPomodoroInterrupt(data) {
  if (!activeStudyTimer) return;
  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIntervalId = null;
  state.studySessions = sortStudySessions([
    {
      id: activeStudyTimer.id,
      date: activeStudyTimer.date,
      subject: activeStudyTimer.subject,
      startTime: activeStudyTimer.startTime,
      durationMinutes: activeStudyTimer.durationMinutes - Math.floor(activeStudyTimer.remainingSeconds / 60),
      focusScore: activeStudyTimer.focusScore || 3,
      roundCount: activeStudyTimer.roundCount || 1,
      reviewScore: 0,
      evaluationText: data.memo.trim() || `${pendingPomodoroInterrupt.reasonTag} 때문에 중단`,
      interrupted: true,
      interruptionTag: pendingPomodoroInterrupt.reasonTag,
    },
    ...state.studySessions,
  ]);
  activeStudyTimer = null;
  studyTimerModalOpen = false;
  pomodoroInterruptModalOpen = false;
  persist();
  renderApp();
}

function finishPomodoro() {
  if (timerIntervalId) clearInterval(timerIntervalId);
  timerIntervalId = null;
  pendingStudyReview = {
    ...activeStudyTimer,
    reviewScore: 3,
  };
  activeStudyTimer = null;
  studyTimerModalOpen = false;
  studyReviewModalOpen = true;
  renderApp();
}

function setReviewScore(score) {
  if (!pendingStudyReview) return;
  pendingStudyReview.reviewScore = score;
  renderApp();
}

function closeStudyReview() {
  pendingStudyReview = null;
  studyReviewModalOpen = false;
  renderApp();
}

function submitStudyReview(data) {
  if (!pendingStudyReview) return;
  state.studySessions = sortStudySessions([
    {
      id: pendingStudyReview.id,
      date: pendingStudyReview.date,
      subject: pendingStudyReview.subject,
      startTime: pendingStudyReview.startTime,
      durationMinutes: pendingStudyReview.durationMinutes,
      focusScore: pendingStudyReview.focusScore || pendingStudyReview.reviewScore,
      roundCount: pendingStudyReview.roundCount || 1,
      reviewScore: pendingStudyReview.reviewScore,
      evaluationText: data.reviewReason.trim() || pendingStudyReview.evaluationText || "뽀모도로 회고 기록",
    },
    ...state.studySessions,
  ]);
  pendingStudyReview = null;
  studyReviewModalOpen = false;
  persist();
  renderApp();
}

function buildCalendarIcs() {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Return OS//Calendar Export//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  state.studySessions.forEach((session) => {
    const start = formatIcsDateTime(session.date, session.startTime);
    const end = formatIcsDateTime(session.date, addMinutes(session.startTime, session.durationMinutes));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${session.id}@return-os`,
      `DTSTAMP:${formatIcsNow()}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcsText(`${getActiveProfileMeta().name} 공부 - ${session.subject}`)}`,
      `DESCRIPTION:${escapeIcsText(session.evaluationText || "Return OS 공부 기록")}`,
      "END:VEVENT",
    );
  });

  getTodayTasks().forEach((task) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${task.id}@return-os`,
      `DTSTAMP:${formatIcsNow()}`,
      `DTSTART;VALUE=DATE:${todayKey.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${toDateKey(addDays(new Date(), 1)).replaceAll("-", "")}`,
      `SUMMARY:${escapeIcsText(`${getActiveProfileMeta().name} 핵심 일정 - ${task.text}`)}`,
      `DESCRIPTION:${escapeIcsText(task.done ? "완료된 핵심 일정입니다." : "오늘의 핵심 일정입니다.")}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function parseTags(text) {
  return String(text || "")
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function lastNDays(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return {
      key: toDateKey(date),
      label: new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date),
    };
  });
}

function calculateStreak(dateList) {
  const dates = new Set(dateList);
  let streak = 0;
  const date = new Date();
  while (dates.has(toDateKey(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatKoreanDate(date) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(date);
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function periodLabel(period) {
  return { week: "주간", month: "월간", year: "연간" }[period];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value) {
  return String(value || "profile")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-\u3131-\u318E\uAC00-\uD7A3]/g, "")
    .toLowerCase();
}

async function bootstrap() {
  let shouldSyncRemote = false;
  try {
    const remote = await loadRemoteAppState();
    const remoteHasProfiles = Array.isArray(remote?.profiles) && remote.profiles.length > 0;
    const shouldUseLocalFirst = isLocalHostApp() && hasLocalAppState();
    if (shouldUseLocalFirst) {
      appState = loadLocalAppState();
      shouldSyncRemote = true;
    } else {
      appState = normalizeAppState(remoteHasProfiles ? remote : loadLocalAppState());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      if (!remoteHasProfiles) {
        shouldSyncRemote = true;
      }
    }
    storageMode = "server";
    syncLabel = "Cloud connected";
  } catch {
    storageMode = "local";
    appState = loadLocalAppState();
    syncLabel = "Saved on this device";
  }

  activeProfileId = appState.activeProfileId;
  state = getActiveProfileState();
  selectedRoutineId = state.routines[0]?.id || "";
  renderApp();
  if (shouldSyncRemote && storageMode === "server") {
    queueRemoteSave();
  }
}

async function loadRemoteAppState() {
  const response = await fetch("./api/state", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load remote state");
  return response.json();
}

function queueRemoteSave() {
  const snapshot = structuredClone(appState);
  syncLabel = "Saving";
  renderApp();
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => saveRemoteAppState(snapshot))
    .then(() => {
      syncLabel = "Saved to cloud";
      renderApp();
    })
    .catch(() => {
      storageMode = "local";
      syncLabel = "Saved only on this device";
      renderApp();
    });
}

async function saveRemoteAppState(payload) {
  const body = JSON.stringify(payload);
  const urls = ["./api/state"];
  if (isLocalHostApp()) {
    urls.push(PUBLIC_STATE_URL);
  }
  const results = await Promise.allSettled(
    urls.map((url) =>
      fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      }),
    ),
  );
  if (!results.some((result) => result.status === "fulfilled" && result.value.ok)) {
    throw new Error("Failed to save remote state");
  }
}

function formatIcsDateTime(dateKey, timeValue) {
  return `${dateKey.replaceAll("-", "")}T${timeValue.replace(":", "")}00`;
}

function formatIcsNow() {
  const now = new Date();
  return `${toDateKey(now).replaceAll("-", "")}T${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}00`;
}

function addMinutes(timeValue, minutesToAdd) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const total = hours * 60 + minutes + Number(minutesToAdd || 0);
  const nextHours = Math.floor(total / 60) % 24;
  const nextMinutes = total % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function escapeIcsText(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function getSleepDurationLabel() {
  const log = getTodaySleepLog();
  if (!log?.wakeTime || !log?.sleepTime) return "아직 계산 전";
  const minutes = getSleepDurationMinutes(log.sleepTime, log.wakeTime);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}시간 ${rest}분`;
}

function getSleepDurationMinutes(sleepTime, wakeTime) {
  const sleep = toMinutes(sleepTime);
  let wake = toMinutes(wakeTime);
  if (wake <= sleep) wake += 24 * 60;
  return wake - sleep;
}

function toMinutes(timeValue) {
  const [hours, minutes] = String(timeValue || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeMeridiem(timeValue) {
  if (!timeValue) return "--:--";
  const [hours, minutes] = timeValue.split(":").map(Number);
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toTimeValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatCountdown(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getTimeBucket(timeValue) {
  const hour = Number(String(timeValue || "00:00").split(":")[0]);
  if (hour < 6) return "새벽";
  if (hour < 9) return "아침 초반";
  if (hour < 12) return "오전";
  if (hour < 18) return "오후";
  return "저녁";
}

function formatDateLabel(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // The app should keep running even if browser cache cleanup is blocked.
    }
  });
}

// Extension point: OpenAI API
// Later, add a client/server module that turns local logs into daily coaching prompts.

// Extension point: Daglo
// Later, import Daglo transcript exports and attach them to study/work/emotion records.

// Extension point: YouTube / papers
// Later, use briefingKeywords to fetch and summarize external content into briefing cards.


