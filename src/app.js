const STORAGE_KEY = "return-os-mvp-v1";
const todayKey = toDateKey(new Date());
const PROFILE_COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#b45309", "#dc2626", "#475569"];

const tabs = [
  { id: "home", label: "홈", icon: "⌂" },
  { id: "routine", label: "루틴", icon: "✓" },
  { id: "study", label: "공부", icon: "▣" },
  { id: "work", label: "업무", icon: "◆" },
  { id: "emotion", label: "감정", icon: "●" },
  { id: "report", label: "리포트", icon: "▥" },
  { id: "briefing", label: "브리핑", icon: "◇" },
];

let selectedTab = "home";
let selectedRoutineId = "r1";
let selectedWorkFocus = 3;
let selectedEmotion = { level: 3, emoji: "😐" };
let selectedMistakeArea = "업무";
let selectedMistakeSeverity = 2;
let reportPeriod = "week";
let recoveryDismissedFor = sessionStorage.getItem("recovery-dismissed-for");
let appState = defaultAppState();
let activeProfileId = appState.activeProfileId;
let state = getActiveProfileState();
let syncLabel = "불러오는 중";
let saveQueue = Promise.resolve();
let calendarModalOpen = false;
let studyTimerModalOpen = false;
let studyReviewModalOpen = false;
let activeStudyTimer = null;
let pendingStudyReview = null;
let timerIntervalId = null;
let selectedCalendarDate = todayKey;
let sleepCheckinModalOpen = false;
let sleepCheckinState = { emotionLevel: 3, emotionEmoji: "😐", fatigueLabel: "보통" };
let pomodoroInterruptModalOpen = false;
let pendingPomodoroInterrupt = { reasonTag: "연락" };
let editingTaskId = null;

const sleepPresets = {
  wakeTime: ["06:00", "06:10", "06:30", "07:00"],
  sleepTime: ["23:00", "23:30", "00:00", "00:30"],
};

const pomodoroPresets = [15, 25, 50];
const interruptionTags = ["지인 만남", "연락", "회사업무", "전화"];

const quickTags = {
  work: ["문서", "회의", "몰입", "방해", "마감", "정리"],
  emotion: ["피로", "마감", "비교", "불안", "회복", "사람"],
  mistake: ["누락", "지각", "확인부족", "과몰입", "우선순위", "미루기"],
  briefing: ["루틴", "습관", "몰입", "시간관리", "집중", "복귀"],
};

const root = document.querySelector("#app");
renderLoading();
bootstrap();

function defaultProfileData() {
  const days = lastNDays(7);
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
        evaluationText: "시작은 늦었지만 끊기지 않음",
      },
      {
        id: crypto.randomUUID(),
        date: days[6].key,
        subject: "자료구조",
        startTime: "15:00",
        durationMinutes: 70,
        focusScore: 3,
        evaluationText: "개념 정리는 됐고 문제 풀이 필요",
      },
    ],
    workLogs: [
      { id: crypto.randomUUID(), date: days[5].key, focusScore: 4, memo: "회의 전 문서 정리", tags: ["문서", "회의"] },
      { id: crypto.randomUUID(), date: days[6].key, focusScore: 3, memo: "오후 집중력 하락", tags: ["집중", "오후"] },
    ],
    emotionLogs: [
      {
        id: crypto.randomUUID(),
        date: days[6].key,
        emotionLevel: 3,
        emotionEmoji: "😐",
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
        memo: "작업 전 체크리스트 필요",
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
    merged.tasks = (merged.tasks || []).map((task) => ({
      ...task,
      kind: task.kind || "focus",
    }));
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
  queueRemoteSave();
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
            <small>${escapeHtml(getActiveProfileMeta().name)}의 루틴이 끊겨도 돌아오는 자기관리</small>
          </div>
        </div>
        <div class="header-actions">
          <span class="sync-badge">${escapeHtml(syncLabel)}</span>
          <button class="secondary-btn" data-action="export">내보내기</button>
          <button class="danger-btn" data-action="reset">초기화</button>
        </div>
      </header>

      <main class="page">
        ${renderPage()}
      </main>

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
      ${sleepCheckinModalOpen ? renderSleepCheckinModal() : ""}
      ${calendarModalOpen ? renderCalendarModal() : ""}
      ${shouldShowRecoveryModal() ? renderRecoveryModal() : ""}
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
    home: ["오늘", "오늘 다시 돌아오는 데 필요한 것만"],
    routine: ["루틴", "작게 체크하고 연속성을 회복하기"],
    study: ["공부", "과목별 세션을 빠르게 남기기"],
    work: ["업무", "집중도와 방해 요인을 기록하기"],
    emotion: ["감정/실수", "감정과 실수를 탓하지 않고 구조화하기"],
    report: ["리포트", "이번 주 흐름을 숫자로 보기"],
    briefing: ["브리핑", "관심 키워드 기반 추천 준비"],
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
          <span>Profiles</span>
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
      <div class="tag-help">사람을 바꾸면 홈, 루틴, 공부, 업무, 감정, 리포트, 브리핑 데이터가 완전히 분리됩니다.</div>
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
  return renderBriefing();
}

function renderHome() {
  const routineRate = getTodayRoutineRate();
  const tasks = getTodayTasks();
  const doneTasks = tasks.filter((task) => task.done).length;
  const recovery = getRecoveryState();
  const selectedDateFocusTasks = getTasksForDate(selectedCalendarDate, "focus");
  const selectedDateScheduleItems = getTasksForDate(selectedCalendarDate, "schedule", 12);
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
          <strong>${doneTasks}/${tasks.length || 3}</strong>
          <div class="progress"><span style="width:${tasks.length ? (doneTasks / tasks.length) * 100 : 0}%"></span></div>
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
          <span>This week</span>
        </div>
      </div>
      ${renderWeekCalendar()}
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>${selectedDateLabel} 핵심 일정 3개</h2>
        <span>Calendar focus</span>
      </div>
      <div class="stack">
        ${selectedDateFocusTasks.map((task) => renderTaskItem(task)).join("")}
        ${selectedDateFocusTasks.length < 3 ? renderTaskInput(selectedCalendarDate, "focus", "핵심 일정 추가", "추가") : ""}
      </div>
      <div class="calendar-split-grid">
        <div class="calendar-subsection">
          <div class="subhead">
            <strong>일정 추가</strong>
            <span>${selectedDateScheduleItems.length}개</span>
          </div>
          <div class="stack">
            ${selectedDateScheduleItems.map((task) => renderTaskItem(task)).join("") || '<div class="empty">아직 등록한 일정이 없어요.</div>'}
            ${renderTaskInput(selectedCalendarDate, "schedule", "예: 14:00 팀 미팅", "일정 추가")}
          </div>
        </div>
        <div class="calendar-subsection">
          <div class="subhead">
            <strong>할 일 목록 추가</strong>
            <span>${selectedDateTodoItems.length}개</span>
          </div>
          <div class="stack">
            ${selectedDateTodoItems.map((task) => renderTaskItem(task)).join("") || '<div class="empty">아직 등록한 할 일이 없어요.</div>'}
            ${renderTaskInput(selectedCalendarDate, "todo", "예: 발표 자료 다듬기", "할 일 추가")}
          </div>
        </div>
      </div>
    </section>

    ${recovery.active ? renderRecoveryCard(recovery) : ""}

    <div class="grid side" style="margin-top:14px">
      <section class="card">
        <div class="section-head">
          <h2>오늘 해야 할 핵심 3개</h2>
          <span>Top 3</span>
        </div>
        <div class="stack">
          ${tasks.map(renderTaskItem).join("")}
          ${tasks.length < 3 ? renderTaskInput(todayKey, "focus", "핵심 할 일 추가", "추가") : ""}
        </div>
      </section>

      <section class="card soft">
        <div class="section-head">
          <h2>빠른 기록</h2>
          <span>2 taps</span>
        </div>
        <div class="button-row">
          <button class="primary-btn" data-tab="study" type="button">공부 기록</button>
          <button class="primary-btn" data-tab="work" type="button">업무 기록</button>
          <button class="primary-btn" data-tab="emotion" type="button">감정/실수</button>
          <button class="secondary-btn" data-action="recovery-mode" type="button">복귀 버튼</button>
        </div>
      </section>
    </div>

    <section class="card" style="margin-top:14px">
      <div class="section-head">
        <h2>수면/시간</h2>
        <span>Wake & Sleep</span>
      </div>
      <form class="sleep-grid" data-form="sleep">
        <label>
          기상시간
          <input name="wakeTime" type="time" value="${getTodaySleepLog()?.wakeTime || ""}" />
          <span class="tag-help">추천 시간</span>
          <div class="tag-chip-row">
            ${sleepPresets.wakeTime
              .map((time) => `<button class="choice ghost-active" data-action="set-sleep-preset" data-kind="wakeTime" data-time="${time}" type="button">${formatTimeMeridiem(time)}</button>`)
              .join("")}
          </div>
        </label>
        <label>
          취침시간
          <input name="sleepTime" type="time" value="${getTodaySleepLog()?.sleepTime || ""}" />
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
          <small>${formatTimeMeridiem(getTodaySleepLog()?.sleepTime)} - ${formatTimeMeridiem(getTodaySleepLog()?.wakeTime)}</small>
        </div>
        <button class="primary-btn sleep-save-btn" type="submit">시간 저장</button>
      </form>
    </section>
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
              <span class="week-task-count">${taskCount ? `핵심 ${taskCount}` : "일정 없음"}</span>
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

function renderTaskInput(dateKey = todayKey, kind = "focus", placeholder = "핵심 할 일 추가", buttonLabel = "추가") {
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
  const chart = selected ? renderSevenDayRoutineChart(selected) : "";

  return `
    <div class="grid side">
      <section class="card">
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

      <section class="card">
        <div class="section-head">
          <h2>최근 7일 그래프</h2>
          <span>${selected ? `${selected.streak}일 연속` : "선택 없음"}</span>
        </div>
        ${chart || '<div class="empty">루틴을 선택하세요.</div>'}
      </section>
    </div>
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
      <span class="pill">${checked ? "오늘 완료" : "미완료"}</span>
    </div>
  `;
}

function renderSevenDayRoutineChart(routine) {
  const days = lastNDays(7);
  return `
    <div class="mini-chart">
      ${days
        .map((day) => {
          const done = routine.checkedDateList.includes(day.key);
          return `
            <div class="bar-wrap">
              <div class="bar" style="height:${done ? 94 : 8}px; opacity:${done ? 1 : 0.22}"></div>
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
  return `
    <div class="grid side">
      <section class="card">
        <div class="section-head">
          <h2>공부 세션 기록</h2>
          <span>여러 번 가능</span>
        </div>
        <form class="stack" data-form="study">
          <div class="form-grid">
            <label>과목<input name="subject" type="text" placeholder="예: 영어, 수학, 코딩" required /></label>
            <label>시작시간<input name="startTime" type="time" required /></label>
            <label>공부 시간(분)<input name="durationMinutes" type="number" min="1" value="25" required /></label>
            <label>집중도(1~5)<input name="focusScore" type="number" min="1" max="5" value="3" required /></label>
          </div>
          <div class="tag-chip-row">
            ${pomodoroPresets
              .map((minutes) => `<button class="choice ghost-active" data-action="start-pomodoro" data-minutes="${minutes}" type="button">${minutes}분 시작</button>`)
              .join("")}
          </div>
          <div class="tag-help">메인 버튼을 누르면 현재 입력값으로 공부가 시작됩니다. 빠른 시작은 15분/25분/50분 버튼으로 바로 가능합니다.</div>
          <label>평가<textarea name="evaluationText" rows="3" placeholder="잘 된 점, 막힌 점, 다음 행동"></textarea></label>
          <div class="button-row">
            <button class="primary-btn" type="submit">공부 시작</button>
            <button class="secondary-btn" data-action="save-study-manual" type="button">기록만 저장</button>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="section-head">
          <h2>과목별 주간 요약</h2>
          <span>${getWeekStudyMinutes()}분</span>
        </div>
        <div class="stack">
          ${weekSummary.length ? weekSummary.map(renderSubjectSummary).join("") : '<div class="empty">이번 주 공부 기록이 없습니다.</div>'}
        </div>
      </section>
    </div>

    <section class="card soft" style="margin-top:14px">
      <div class="section-head"><h2>공부 인사이트</h2><span>Focus pattern</span></div>
      <div class="stack">
        <div class="log-item"><div><strong>${escapeHtml(insight.bestTimeTitle)}</strong><small>${escapeHtml(insight.bestTimeBody)}</small></div></div>
        <div class="log-item"><div><strong>${escapeHtml(insight.bestSubjectTitle)}</strong><small>${escapeHtml(insight.bestSubjectBody)}</small></div></div>
      </div>
    </section>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>최근 공부 기록</h2><span>Sessions</span></div>
      <div class="stack">${renderLogList(state.studySessions, renderStudyLog)}</div>
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
  return `
    <div class="log-item">
      <div>
        <strong>${escapeHtml(log.subject)} · ${log.durationMinutes}분</strong>
        <small>${log.date} ${formatTimeMeridiem(log.startTime)} · ${log.interrupted ? `중단 · ${escapeHtml(log.interruptionTag || "사유 없음")}` : `집중도 ${log.focusScore}${log.reviewScore ? ` · 별점 ${log.reviewScore}` : ""}`} · ${escapeHtml(log.evaluationText || "평가 없음")}</small>
      </div>
    </div>
  `;
}

function renderWork() {
  return `
    <div class="grid side">
      <section class="card">
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
          <div class="tag-help">태그를 누르면 오늘 업무 기록이 바로 저장됩니다.</div>
          <label>짧은 메모<textarea name="memo" rows="3" placeholder="무엇이 집중을 돕거나 방해했나요?"></textarea></label>
          <label>태그<input name="tags" type="text" placeholder="예: 회의, 문서, 방해, 몰입" /></label>
          <button class="primary-btn" type="submit">업무 기록 저장</button>
        </form>
      </section>

      <section class="card">
        <div class="section-head">
          <h2>주간 집중도 추이</h2>
          <span>Work focus</span>
        </div>
        ${renderWeeklyWorkChart()}
      </section>
    </div>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>최근 업무 기록</h2><span>Logs</span></div>
      <div class="stack">${renderLogList(state.workLogs, renderWorkLog)}</div>
    </section>
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
  return `
    <div class="grid two">
      <section class="card">
        <div class="section-head"><h2>감정 기록</h2><span>Emotion</span></div>
        <form class="stack" data-form="emotion">
          <div class="emoji-row">
            ${[
              [1, "😣"],
              [2, "😕"],
              [3, "😐"],
              [4, "🙂"],
              [5, "😄"],
            ]
              .map(([level, emoji]) => `<button class="choice emoji-choice ${selectedEmotion.level === level ? "active" : ""}" data-action="set-emotion" data-level="${level}" data-emoji="${emoji}" type="button">${emoji}</button>`)
              .join("")}
          </div>
          <div class="tag-chip-row">
            ${quickTags.emotion
              .map((tag) => `<button class="choice ghost-active" data-action="quick-emotion-tag" data-tag="${tag}" type="button">${tag}</button>`)
              .join("")}
          </div>
          <div class="tag-help">원인 태그를 누르면 현재 감정 단계로 바로 기록됩니다.</div>
          <label>메모<textarea name="memo" rows="3" placeholder="감정이 생긴 상황을 짧게"></textarea></label>
          <label>원인 태그<input name="causeTags" type="text" placeholder="예: 피로, 비교, 마감, 사람" /></label>
          <button class="primary-btn" type="submit">감정 저장</button>
        </form>
      </section>

      <section class="card">
        <div class="section-head"><h2>실수 기록</h2><span>Mistake</span></div>
        <form class="stack" data-form="mistake">
          <div class="form-grid">
            <label>총횟수<input name="count" type="number" min="0" value="1" required /></label>
            <label>영역<select name="area">${["업무", "공부", "생활"].map((area) => `<option ${selectedMistakeArea === area ? "selected" : ""}>${area}</option>`).join("")}</select></label>
            <label>영향도(1~5)<input name="severity" type="number" min="1" max="5" value="${selectedMistakeSeverity}" required /></label>
            <label>유형 태그<input name="typeTags" type="text" placeholder="예: 누락, 지각, 확인부족" /></label>
          </div>
          <div class="tag-chip-row">
            ${quickTags.mistake
              .map((tag) => `<button class="choice ghost-active" data-action="quick-mistake-tag" data-tag="${tag}" type="button">${tag}</button>`)
              .join("")}
          </div>
          <div class="tag-help">실수 유형 태그를 누르면 현재 영역과 영향도로 바로 저장됩니다.</div>
          <label>메모<textarea name="memo" rows="3" placeholder="다음에 막을 수 있는 장치"></textarea></label>
          <button class="primary-btn" type="submit">실수 저장</button>
        </form>
      </section>
    </div>

    <div class="grid two" style="margin-top:14px">
      <section class="card">
        <div class="section-head"><h2>원인 태그 누적</h2><span>Top causes</span></div>
        <div class="stack">${renderTagStats(getEmotionCauseStats())}</div>
      </section>
      <section class="card">
        <div class="section-head"><h2>최근 감정/실수</h2><span>History</span></div>
        <div class="stack">
          ${renderLogList(state.emotionLogs, renderEmotionLog, 3)}
          ${renderLogList(state.mistakeLogs, renderMistakeLog, 3)}
        </div>
      </section>
    </div>
  `;
}

function renderEmotionLog(log) {
  return `
    <div class="log-item">
      <div>
        <strong>${log.emotionEmoji} 감정 ${log.emotionLevel}/5</strong>
        <small>${log.date} · ${escapeHtml(log.memo || "메모 없음")} · ${log.causeTags.map(escapeHtml).join(", ") || "태그 없음"}</small>
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

function renderReport() {
  const weekly = buildWeeklyReport();
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
      <p class="muted">현재 MVP는 주간 그래프를 실제 구현했고, 월간/연간은 같은 데이터 구조로 확장할 수 있게 탭만 열어두었습니다.</p>
    </section>

    <div class="grid three" style="margin-top:14px">
      <article class="card"><div class="metric"><span>주간 루틴</span><strong>${weekly.routineAvg}%</strong></div></article>
      <article class="card"><div class="metric"><span>공부시간</span><strong>${weekly.studyMinutes}분</strong></div></article>
      <article class="card"><div class="metric"><span>실수 횟수</span><strong>${weekly.mistakeCount}</strong></div></article>
    </div>

    <section class="card soft" style="margin-top:14px">
      <div class="section-head"><h2>학습 리포트 요약</h2><span>Insight</span></div>
      <div class="stack">
        <div class="log-item"><div><strong>${escapeHtml(weekly.studyInsight.bestTimeTitle)}</strong><small>${escapeHtml(weekly.studyInsight.bestTimeBody)}</small></div></div>
        <div class="log-item"><div><strong>${escapeHtml(weekly.studyInsight.bestSubjectTitle)}</strong><small>${escapeHtml(weekly.studyInsight.bestSubjectBody)}</small></div></div>
      </div>
    </section>

    <div class="grid two" style="margin-top:14px">
      <section class="card">
        <div class="section-head"><h2>루틴 달성률</h2><span>Weekly</span></div>
        ${renderMetricChart(weekly.days, "routineRate", "%")}
      </section>
      <section class="card">
        <div class="section-head"><h2>공부시간</h2><span>Minutes</span></div>
        ${renderMetricChart(weekly.days, "studyMinutes", "m")}
      </section>
      <section class="card">
        <div class="section-head"><h2>업무집중도</h2><span>1~5</span></div>
        ${renderMetricChart(weekly.days, "workFocus", "")}
      </section>
      <section class="card">
        <div class="section-head"><h2>감정/실수</h2><span>State</span></div>
        ${renderMetricChart(weekly.days, "emotionLevel", "")}
        <div style="height:10px"></div>
        ${renderMetricChart(weekly.days, "mistakeCount", "회")}
      </section>
    </div>
  `;
}

function renderBriefing() {
  const keywords = state.briefingKeywords;
  return `
    <div class="grid side">
      <section class="card">
        <div class="section-head">
          <h2>관심 키워드</h2>
          <span>Dummy source</span>
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
          <span>Later</span>
        </div>
        <p class="muted">추후 OpenAI API, 다글로, 유튜브, 논문 요약을 붙이면 저장된 키워드를 기준으로 개인 브리핑을 만들 수 있습니다.</p>
      </section>
    </div>

    <section class="card" style="margin-top:14px">
      <div class="section-head"><h2>더미 추천 카드</h2><span>Preview</span></div>
      <div class="grid three">
        ${keywords.map(renderBriefingCard).join("") || '<div class="empty">키워드를 추가하면 추천 카드가 나타납니다.</div>'}
      </div>
    </section>
  `;
}

function renderBriefingCard(item) {
  return `
    <article class="card brief-card">
      <span class="pill">${escapeHtml(item.keyword)}</span>
      <strong>${escapeHtml(item.keyword)}을 오늘 행동으로 바꾸기</strong>
      <small class="muted">더미 카드입니다. 나중에 YouTube/Daglo/OpenAI 요약 결과가 이 영역에 들어옵니다.</small>
    </article>
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
      if (action === "cancel-task-edit") {
        editingTaskId = null;
        renderApp();
      }
      if (action === "delete-task") deleteTask(el.dataset.id);
      if (action === "set-work-focus") {
        selectedWorkFocus = Number(el.dataset.score);
        renderApp();
      }
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
        renderApp();
      }
      if (action === "switch-profile") switchProfile(el.dataset.id);
      if (action === "delete-profile") deleteProfile(el.dataset.id);
      if (action === "delete-keyword") deleteKeyword(el.dataset.id);
      if (action === "open-calendar-sync") {
        calendarModalOpen = true;
        renderApp();
      }
      if (action === "close-calendar-sync") {
        calendarModalOpen = false;
        renderApp();
      }
      if (action === "export-calendar") exportCalendar(el.dataset.provider);
      if (action === "set-sleep-preset") saveSleepPreset(el.dataset.kind, el.dataset.time);
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
      if (action === "export") exportData();
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
      if (type === "work") addWorkLog(data);
      if (type === "emotion") addEmotionLog(data);
      if (type === "mistake") addMistakeLog(data);
      if (type === "keyword") addKeyword(data);
      if (type === "sleep") saveSleepLog(data);
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
  if (!confirm(`${profile.name} 프로필을 삭제할까요? 이 사람의 기록이 함께 삭제됩니다.`)) return;
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
  state.studySessions.unshift({
    id: crypto.randomUUID(),
    date: todayKey,
    subject: data.subject.trim(),
    startTime: data.startTime,
    durationMinutes: Number(data.durationMinutes),
    focusScore: Number(data.focusScore),
    reviewScore: Number(data.focusScore),
    evaluationText: data.evaluationText.trim(),
  });
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

function getTodayRoutineRate() {
  if (!state.routines.length) return 0;
  const done = state.routines.filter((routine) => routine.checkedDateList.includes(todayKey)).length;
  return Math.round((done / state.routines.length) * 100);
}

function countTodayRecords() {
  return (
    state.studySessions.filter((item) => item.date === todayKey).length +
    state.workLogs.filter((item) => item.date === todayKey).length +
    state.emotionLogs.filter((item) => item.date === todayKey).length +
    state.mistakeLogs.filter((item) => item.date === todayKey).length
  );
}

function getTodaySleepLog() {
  return state.sleepLogs.find((log) => log.date === todayKey);
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

function getCurrentWeekDays() {
  const today = new Date();
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

function getDaySummary(dateKey) {
  const routinesDone = state.routines.filter((routine) => routine.checkedDateList.includes(dateKey)).length;
  return {
    routineRate: state.routines.length ? Math.round((routinesDone / state.routines.length) * 100) : 0,
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
        <h2>복귀 타이밍</h2>
        <p>할 일을 더 쪼갤 수 있을 만큼 쪼개보세요. 지금은 완벽한 하루보다 다시 켜지는 하루가 중요합니다.</p>
        <div class="button-row">
          <button class="primary-btn" data-action="quick-restart" type="button">2분만 다시 시작</button>
          <button class="secondary-btn" data-action="split-task" type="button">오늘 할 일 쪼개기</button>
          <button class="secondary-btn" data-action="dismiss-recovery" type="button">닫기</button>
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
        <p>삼성 또는 네이버 캘린더와 동기화하시겠어요? 현재는 직접 계정 연동 대신, 가져오기 가능한 캘린더 파일로 저장합니다.</p>
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
        <p>방금 저장한 수면/시간 기록과 함께 오늘 컨디션을 남겨둘게요. 저장하면 감정 탭에 바로 반영됩니다.</p>
        <form class="stack" data-form="sleep-checkin">
          <div class="emoji-row">
            ${[
              [1, "😣"],
              [2, "😕"],
              [3, "😐"],
              [4, "🙂"],
              [5, "😄"],
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
            <textarea name="memo" rows="3" placeholder="예: 조금 피곤하지만 시작은 할 수 있어요. / 머리가 맑고 집중이 잘 될 것 같아요."></textarea>
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
          <label>짧게, 공부가 잘된 이유는 무엇이라고 생각하나요?
            <textarea name="reviewReason" rows="3" placeholder="예: 아침이라 방해가 적었고, 영어 단어처럼 짧게 끝낼 수 있는 과목이라 집중이 잘 됨"></textarea>
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
        <p>${escapeHtml(activeStudyTimer.subject)} 집중 세션을 멈춘 이유를 남겨두면, 나중에 방해 패턴 리포트에 연결할 수 있어요.</p>
        <form class="stack" data-form="pomodoro-interrupt">
          <div class="tag-chip-row">
            ${interruptionTags
              .map((tag) => `<button class="choice ${pendingPomodoroInterrupt.reasonTag === tag ? "active" : "ghost-active"}" data-action="set-interrupt-tag" data-tag="${tag}" type="button">${tag}</button>`)
              .join("")}
          </div>
          <label>짧은 이유
            <textarea name="memo" rows="3" placeholder="예: 갑자기 전화가 와서 끊겼어요. / 회사업무 급한 요청이 들어왔어요."></textarea>
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
  const week = new Set(lastNDays(7).map((day) => day.key));
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
      bestTimeTitle: "아직 충분한 공부 기록이 없습니다.",
      bestTimeBody: "25분 세션을 몇 번만 쌓아도 어느 시간대가 잘 맞는지 보여드릴 수 있어요.",
      bestSubjectTitle: "과목 인사이트 대기 중",
      bestSubjectBody: "별점과 짧은 이유가 쌓이면 어떤 과목이 언제 잘 되는지 알려드릴게요.",
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
    bestTimeTitle: `당신은 ${bestBucket[0]}에 가장 잘 됩니다.`,
    bestTimeBody: `이 시간대 평균 점수는 ${(bestBucket[1].total / bestBucket[1].count).toFixed(1)}점이에요. 중요한 공부는 이때 먼저 배치하는 편이 좋아요.`,
    bestSubjectTitle: `가장 잘 맞는 과목은 ${bestSubject[0]}입니다.`,
    bestSubjectBody: `${bestSubject[0]}의 평균 점수는 ${(bestSubject[1].total / bestSubject[1].count).toFixed(1)}점이에요. 리포트 탭에서도 이 흐름을 이어서 보여줍니다.`,
  };
}

function getWeekStudyMinutes() {
  return summarizeStudyBySubject().reduce((sum, item) => sum + item.minutes, 0);
}

function renderWeeklyWorkChart() {
  const days = lastNDays(7);
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
  if (!stats.length) return '<div class="empty">아직 원인 태그가 없습니다.</div>';
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

function buildWeeklyReport() {
  const days = lastNDays(7).map((day) => {
    const routinesDone = state.routines.filter((routine) => routine.checkedDateList.includes(day.key)).length;
    const routineRate = state.routines.length ? Math.round((routinesDone / state.routines.length) * 100) : 0;
    const studyMinutes = state.studySessions.filter((item) => item.date === day.key).reduce((sum, item) => sum + Number(item.durationMinutes), 0);
    const workForDay = state.workLogs.filter((item) => item.date === day.key);
    const workFocus = workForDay.length ? average(workForDay.map((item) => item.focusScore)) : 0;
    const emotionForDay = state.emotionLogs.filter((item) => item.date === day.key);
    const emotionLevel = emotionForDay.length ? average(emotionForDay.map((item) => item.emotionLevel)) : 0;
    const mistakeCount = state.mistakeLogs.filter((item) => item.date === day.key).reduce((sum, item) => sum + Number(item.count), 0);
    const sleep = state.sleepLogs.find((item) => item.date === day.key);
    return {
      ...day,
      routineRate,
      studyMinutes,
      workFocus,
      emotionLevel,
      mistakeCount,
      wakeTime: sleep?.wakeTime || "",
      sleepTime: sleep?.sleepTime || "",
    };
  });

  return {
    days,
    routineAvg: Math.round(average(days.map((day) => day.routineRate))),
    studyMinutes: days.reduce((sum, day) => sum + day.studyMinutes, 0),
    mistakeCount: days.reduce((sum, day) => sum + day.mistakeCount, 0),
    studyInsight: getStudyInsight(),
  };
}

function renderMetricChart(days, key, suffix) {
  const maxMap = { routineRate: 100, studyMinutes: Math.max(60, ...days.map((day) => day.studyMinutes)), workFocus: 5, emotionLevel: 5, mistakeCount: Math.max(3, ...days.map((day) => day.mistakeCount)) };
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
          const height = Math.max(6, Math.round((item.value / max) * 94));
          return `
            <div class="bar-wrap">
              <div class="bar" title="${item.value}${suffix}" style="height:${height}px; opacity:${item.value ? 1 : 0.2}"></div>
              <span class="bar-label">${item.label}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderLogList(list, renderer, limit = 6) {
  const items = [...list].slice(0, limit);
  return items.length ? items.map(renderer).join("") : '<div class="empty">아직 기록이 없습니다.</div>';
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `return-os-${slugify(getActiveProfileMeta().name)}-${todayKey}.json`;
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
  alert(`${providerLabel} 가져오기용 .ics 파일을 저장했어요.`);
}

function startPomodoroFromStudyForm(data) {
  if (!data.subject?.trim() || !data.startTime) {
    alert("과목과 시작시간을 먼저 입력해주세요.");
    return;
  }
  startPomodoro({
    subject: data.subject.trim(),
    startTime: data.startTime,
    durationMinutes: Number(data.durationMinutes || 25),
    focusScore: Number(data.focusScore || 3),
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
    subject: data.subject.trim(),
    startTime: data.startTime || toTimeValue(new Date()),
    durationMinutes: Number(minutes),
    focusScore: Number(data.focusScore || 3),
    evaluationText: data.evaluationText?.trim() || "",
  });
}

function startPomodoro(config) {
  activeStudyTimer = {
    id: crypto.randomUUID(),
    subject: config.subject,
    date: todayKey,
    startTime: config.startTime,
    durationMinutes: Number(config.durationMinutes),
    remainingSeconds: Number(config.durationMinutes) * 60,
    focusScore: Number(config.focusScore || 3),
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
  state.studySessions.unshift({
    id: activeStudyTimer.id,
    date: activeStudyTimer.date,
    subject: activeStudyTimer.subject,
    startTime: activeStudyTimer.startTime,
    durationMinutes: activeStudyTimer.durationMinutes - Math.floor(activeStudyTimer.remainingSeconds / 60),
    focusScore: activeStudyTimer.focusScore || 3,
    reviewScore: 0,
    evaluationText: data.memo.trim() || `${pendingPomodoroInterrupt.reasonTag} 때문에 중단`,
    interrupted: true,
    interruptionTag: pendingPomodoroInterrupt.reasonTag,
  });
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
  state.studySessions.unshift({
    id: pendingStudyReview.id,
    date: pendingStudyReview.date,
    subject: pendingStudyReview.subject,
    startTime: pendingStudyReview.startTime,
    durationMinutes: pendingStudyReview.durationMinutes,
    focusScore: pendingStudyReview.focusScore || pendingStudyReview.reviewScore,
    reviewScore: pendingStudyReview.reviewScore,
    evaluationText: data.reviewReason.trim() || pendingStudyReview.evaluationText || "뽀모도로 회고 기록",
  });
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
      `SUMMARY:${escapeIcsText(`${getActiveProfileMeta().name} 할 일 - ${task.text}`)}`,
      `DESCRIPTION:${escapeIcsText(task.done ? "완료된 핵심 할 일" : "오늘의 핵심 할 일")}`,
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
    .replace(/[^\w\-가-힣]/g, "")
    .toLowerCase();
}

async function bootstrap() {
  try {
    const remote = await loadRemoteAppState();
    const remoteHasProfiles = Array.isArray(remote?.profiles) && remote.profiles.length > 0;
    appState = normalizeAppState(remoteHasProfiles ? remote : loadLocalAppState());
    if (!remoteHasProfiles) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      await saveRemoteAppState(appState);
    }
    syncLabel = "클라우드 연결됨";
  } catch {
    appState = loadLocalAppState();
    syncLabel = "로컬 저장 모드";
  }

  activeProfileId = appState.activeProfileId;
  state = getActiveProfileState();
  selectedRoutineId = state.routines[0]?.id || "";
  renderApp();
}

async function loadRemoteAppState() {
  const response = await fetch("./api/state", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load remote state");
  return response.json();
}

function queueRemoteSave() {
  const snapshot = structuredClone(appState);
  syncLabel = "저장 중";
  renderApp();
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => saveRemoteAppState(snapshot))
    .then(() => {
      syncLabel = "클라우드 저장됨";
      renderApp();
    })
    .catch(() => {
      syncLabel = "로컬에만 저장됨";
      renderApp();
    });
}

async function saveRemoteAppState(payload) {
  const response = await fetch("./api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Failed to save remote state");
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
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// Extension point: OpenAI API
// Later, add a client/server module that turns local logs into daily coaching prompts.

// Extension point: Daglo
// Later, import Daglo transcript exports and attach them to study/work/emotion records.

// Extension point: YouTube / papers
// Later, use briefingKeywords to fetch and summarize external content into briefing cards.
