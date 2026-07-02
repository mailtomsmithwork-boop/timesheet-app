async function renderNewEntry(app) {
  app.innerHTML = `
    <h1>New Entry</h1>
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
