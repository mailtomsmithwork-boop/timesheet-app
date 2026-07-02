// Standard scheduled hours, used by the quick time check below.
const STANDARD_SCHEDULE = {
  Monday: { start: "09:00", end: "17:00" },
  Tuesday: { start: "09:00", end: "17:00" },
  Wednesday: { start: "09:00", end: "17:00" },
  Thursday: { start: "09:00", end: "17:00" },
  Friday: { start: "09:00", end: "15:30" },
};

function timeToMinutes_(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

async function renderNewEntry(app) {
  app.innerHTML = `
    <h1>New Entry</h1>

    <div class="quick-check">
      <h2>Quick Time Check</h2>
      <p class="hint">
        Enter your actual clock in/out and the day worked. If either time falls
        outside your standard hours for that day, they're transferred into the
        form below automatically.
      </p>
      <div class="quick-check-row">
        <label>Day
          <select id="qcDay">
            ${Object.keys(STANDARD_SCHEDULE)
              .map((day) => `<option value="${day}">${day}</option>`)
              .join("")}
          </select>
        </label>
        <label>Time In
          <input type="time" id="qcTimeIn" />
        </label>
        <label>Time Out
          <input type="time" id="qcTimeOut" />
        </label>
        <button type="button" id="qcCheckBtn" class="btn btn-secondary">Check</button>
      </div>
      <div id="qcResult" class="qc-result"></div>
    </div>

    <form id="newEntryForm" class="form">
      <label>Date
        <input type="date" name="Date" required />
      </label>
      <label>Time In
        <input type="time" name="TimeIn" required />
      </label>
      <label>Time Out
        <input type="time" name="TimeOut" required />
      </label>
      <label>Job Number
        <input type="text" name="JobNumber" required />
      </label>
      <label>Reason
        <textarea name="Reason" required></textarea>
      </label>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Add Entry</button>
      </div>
    </form>
  `;

  const form = document.getElementById("newEntryForm");

  document.getElementById("qcCheckBtn").addEventListener("click", () => {
    const day = document.getElementById("qcDay").value;
    const timeIn = document.getElementById("qcTimeIn").value;
    const timeOut = document.getElementById("qcTimeOut").value;
    const resultEl = document.getElementById("qcResult");

    if (!timeIn || !timeOut) {
      resultEl.textContent = "Enter both times to check.";
      resultEl.className = "qc-result qc-warn";
      return;
    }

    const schedule = STANDARD_SCHEDULE[day];
    const wentOver =
      timeToMinutes_(timeIn) < timeToMinutes_(schedule.start) ||
      timeToMinutes_(timeOut) > timeToMinutes_(schedule.end);

    if (wentOver) {
      form.elements["TimeIn"].value = timeIn;
      form.elements["TimeOut"].value = timeOut;
      resultEl.textContent = `Over your standard ${day} hours (${schedule.start}–${schedule.end}) — Time In/Out transferred below.`;
      resultEl.className = "qc-result qc-over";
    } else {
      resultEl.textContent = `Within your standard ${day} hours (${schedule.start}–${schedule.end}) — nothing transferred.`;
      resultEl.className = "qc-result qc-ok";
    }
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const params = Object.fromEntries(formData.entries());

    if (params.TimeIn === params.TimeOut) {
      showToast("Time In and Time Out cannot be the same.", "error");
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      await apiGet("addEntry", params);
      invalidateEntries();
      showToast("Entry added.", "success");
      window.location.hash = "#/recordings";
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
