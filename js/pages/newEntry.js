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

function pad2_(n) {
  return String(n).padStart(2, "0");
}

// hour is 0-23 (or 0-12 with a meridiem). assumePmIfAmbiguous only applies
// when no am/pm was heard and the hour is in the 1-11 range.
function to24Hour_(hour, minute, meridiem, assumePmIfAmbiguous) {
  if (hour === 0 || hour >= 13) {
    return pad2_(hour) + ":" + pad2_(minute);
  }
  let h = hour % 12;
  if (meridiem === "pm" || (meridiem === null && assumePmIfAmbiguous)) {
    h += 12;
  }
  return pad2_(h) + ":" + pad2_(minute);
}

// Speech recognition (and most typed input) already renders spoken numbers
// as digits, but this covers common spelled-out cases too.
function wordsToDigits_(text) {
  const map = {
    zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  };
  return text.replace(
    /\b(zero|oh|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi,
    (m) => map[m.toLowerCase()]
  );
}

// Parses phrases like "Friday 9 to 5:30" or "Monday 8:45am to 4pm" into
// { day, timeIn, timeOut }. Returns nulls for anything it couldn't find.
function parseSpokenEntry_(rawText) {
  const normalized = wordsToDigits_(rawText.toLowerCase());
  const day = Object.keys(STANDARD_SCHEDULE).find((d) => normalized.includes(d.toLowerCase())) || null;

  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  const matches = [];
  let m;
  while ((m = timeRegex.exec(normalized)) !== null) {
    matches.push({
      hour: parseInt(m[1], 10),
      minute: m[2] ? parseInt(m[2], 10) : 0,
      meridiem: m[3] ? m[3].toLowerCase() : null,
    });
  }

  if (matches.length < 2) {
    return { day, timeIn: null, timeOut: null };
  }

  const [first, second] = matches;
  return {
    day,
    timeIn: to24Hour_(first.hour, first.minute, first.meridiem, false),
    timeOut: to24Hour_(second.hour, second.minute, second.meridiem, true),
  };
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

      <label class="voice-entry-label">Or type/say it — e.g. "Friday 9 to 5:30"
        <div class="quick-check-row">
          <input type="text" id="voiceText" class="input voice-input" placeholder="Friday 9 to 5:30" />
          <button type="button" id="voiceMicBtn" class="btn btn-icon" title="Speak" style="display:none;">🎤</button>
          <button type="button" id="voiceFillBtn" class="btn btn-secondary">Fill</button>
        </div>
      </label>
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

  function runQuickCheck_() {
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
  }

  document.getElementById("qcCheckBtn").addEventListener("click", runQuickCheck_);

  const voiceText = document.getElementById("voiceText");
  const voiceMicBtn = document.getElementById("voiceMicBtn");

  function applyVoiceEntry_() {
    const parsed = parseSpokenEntry_(voiceText.value);
    if (!parsed.day || !parsed.timeIn || !parsed.timeOut) {
      showToast('Could not understand that. Try "Friday 9 to 5:30".', "error");
      return;
    }
    document.getElementById("qcDay").value = parsed.day;
    document.getElementById("qcTimeIn").value = parsed.timeIn;
    document.getElementById("qcTimeOut").value = parsed.timeOut;
    runQuickCheck_();
  }

  document.getElementById("voiceFillBtn").addEventListener("click", applyVoiceEntry_);

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognitionCtor) {
    voiceMicBtn.style.display = "";
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceMicBtn.addEventListener("click", () => {
      voiceMicBtn.disabled = true;
      voiceMicBtn.textContent = "…";
      recognition.start();
    });
    recognition.addEventListener("result", (e) => {
      voiceText.value = e.results[0][0].transcript;
      applyVoiceEntry_();
    });
    recognition.addEventListener("end", () => {
      voiceMicBtn.disabled = false;
      voiceMicBtn.textContent = "🎤";
    });
    recognition.addEventListener("error", (e) => {
      voiceMicBtn.disabled = false;
      voiceMicBtn.textContent = "🎤";
      if (e.error === "network") {
        // Some browsers (Brave in particular) block the speech recognition
        // network service outright — retrying won't help, so stop offering it.
        voiceMicBtn.style.display = "none";
        showToast(
          "Voice input isn't available in this browser (common in Brave). Type into the box instead, or use Win+H for OS-level dictation.",
          "error"
        );
      } else {
        showToast("Voice input error: " + e.error, "error");
      }
    });
  }

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
