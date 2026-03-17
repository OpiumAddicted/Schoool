const CLASS_TIMES = ["08:50", "09:50", "10:50", "11:50", "13:30", "14:30", "15:30"];
const CLASS_MIN = 50, DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const startTs = Date.now();

const getNow = () => {
    const debug = new URLSearchParams(location.search).get("time");
    if (!debug) return new Date();
    let base = new Date();
    if (debug.includes(":")) {
        const [h, m, s = 0] = debug.split(":").map(Number);
        base.setHours(h, m, s, 0);
    } else if (!isNaN(new Date(debug))) base = new Date(debug);
    return new Date(base.getTime() + (Date.now() - startTs));
};

const pad = n => String(n).padStart(2, "0");
const formatRemain = ms => `${pad(Math.floor(ms / 60000))}분 ${pad(Math.floor(ms / 1000) % 60)}초`;

async function loadTimetable(url) {
    const pw = window.getPipWindow?.();
    const container = document.getElementById("timetable-container") || pw?.document.getElementById("timetable-container");
    if (!container) return;
    try {
        const res = await fetch(url);
        const text = await res.text();
        const rows = text.trim().split("\n").filter(l => l.includes("|")).map(l => l.split("|").slice(1, -1).map(c => c.trim()));
        const todayIdx = rows[0].indexOf(DAYS[getNow().getDay()]);

        container.innerHTML =
        `<table class="timetable-table">
            <thead>
                <tr><th>교시</th>${rows[0].slice(1).map((h, i) => `<th class="${i+1 === todayIdx ? 'is-today' : ''}">${h}</th>`).join("")}</tr>
            </thead>
            <tbody>${rows.slice(2).map(r => `
                <tr class="timetable-row" data-period="${r[0].replace(/\D/g, "")}">
                    <th>${r[0]}</th>
                    ${r.slice(1).map((c, i) => `<td class="${i+1 === todayIdx ? 'is-today' : ''}">${c || " "}</td>`).join("")}
                </tr>`).join("")}
            </tbody>
        </table>`;
    } catch (e) { container.innerHTML = '<p>로딩 실패</p>'; }
}

function update() {
    const now = getNow();
    const pw = window.getPipWindow?.();
    const getEl = id => document.getElementById(id) || pw?.document.getElementById(id);
    const getAll = sel => [...document.querySelectorAll(sel), ...(pw ? pw.document.querySelectorAll(sel) : [])];

    const clock = getEl("current-time");
    if (clock) clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const periods = CLASS_TIMES.map((t, i) => {
        const st = new Date(now); st.setHours(...t.split(":").map(Number), 0, 0);
        return { n: i + 1, s: st, e: new Date(st.getTime() + CLASS_MIN * 60000) };
    });

    const label = getEl("countdown-label"), timer = getEl("countdown-timer");
    const curr = periods.find(p => now >= p.s && now < p.e), next = periods.find(p => now < p.s);
    let curIdx = null;

    if (label && timer) {
        if (curr) {
            curIdx = curr.n;
            label.textContent = `현재 ${curr.n}교시 수업 중`;
            timer.textContent = `종료까지 ${formatRemain(curr.e - now)}`;
        } else if (next) {
            label.textContent = (periods[3].e <= now && now < periods[4].s) ? "점심시간" : `${next.n - 1}교시 쉬는시간`;
            timer.textContent = `시작까지 ${formatRemain(next.s - now)}`;
        } else {
            label.textContent = "오늘 수업 종료"; timer.textContent = "00분 00초";
        }
    }
}

function init() {
    const select = document.getElementById("class-select");
    const onChange = () => {
        const option = select?.options[select.selectedIndex];
        if (option?.dataset.classId) {
            const url = new URL(location); url.searchParams.set("class", option.dataset.classId);
            history.replaceState(null, "", url);
        }
        loadTimetable(option.value);
    };

    if (select) {
        const urlClass = new URLSearchParams(location.search).get("class");
        const target = [...select.options].find(o => o.dataset.classId === urlClass);
        if (target) select.value = target.value;
        select.onchange = onChange;
    }
    onChange();
    setInterval(update, 500);

    if (window.innerWidth > 900) document.querySelectorAll(".desktop-window").forEach(win => {
        const bar = win.querySelector(".window-titlebar");
        if (!bar) return;
        let drag = false, off = { x: 0, y: 0 };
        bar.onpointerdown = e => {
            if (e.target.closest(".window-controls")) return;
            const r = win.getBoundingClientRect();
            win.style.left = r.left + "px"; win.style.top = r.top + "px";
            win.style.bottom = "auto"; win.style.right = "auto";
            win.style.transform = "none"; win.style.zIndex = 100;
            drag = true; off = { x: e.clientX - r.left, y: e.clientY - r.top };
            bar.setPointerCapture(e.pointerId);
        };
        bar.onpointermove = e => {
            if (!drag) return;
            win.style.left = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, e.clientX - off.x)) + "px";
            win.style.top = Math.max(0, Math.min(window.innerHeight - win.offsetHeight, e.clientY - off.y)) + "px";
        };
        bar.onpointerup = () => { drag = false; bar.releasePointerCapture(); };
    });
}

init();
