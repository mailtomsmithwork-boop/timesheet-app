async function renderRemoveEntry(app) {
  const entries = await getEntriesCached();

  app.innerHTML = `
    <h1>Remove Entry</h1>
    <form id="removeEntryForm" class="form">
      <label>Entry
        <select name="EntryID" required>
          <option value="">Select an entry…</option>
          ${entries
            .map(
              (r) =>
                `<option value="${r.EntryID}">${r.Date} — Job ${r.JobNumber} — ${r.TotalTime}h (${r.EntryID})</option>`
            )
            .join("")}
        </select>
      </label>
      <div class="form-actions">
        <button type="submit" class="btn btn-danger" ${entries.length === 0 ? "disabled" : ""}>Delete Entry</button>
      </div>
    </form>
    ${entries.length === 0 ? '<p class="empty-cell">No entries to remove.</p>' : ""}
  `;

  const form = document.getElementById("removeEntryForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const entryId = new FormData(form).get("EntryID");
    if (!entryId) return;

    if (!window.confirm("Delete entry " + entryId + "?")) {
      return;
    }

    const deletedEntry = entries.find((r) => r.EntryID === entryId);

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      await apiGet("deleteEntry", { EntryID: entryId });
      invalidateEntries();
      showToast("Entry deleted.", "success", {
        actionLabel: "Undo",
        onAction: async () => {
          try {
            await apiGet("addEntry", {
              Date: deletedEntry.Date,
              TimeIn: deletedEntry.TimeIn,
              TimeOut: deletedEntry.TimeOut,
              JobNumber: deletedEntry.JobNumber,
              Reason: deletedEntry.Reason,
            });
            invalidateEntries();
            showToast("Entry restored.", "success");
          } catch (err) {
            showToast("Could not restore entry: " + err.message, "error");
          }
        },
      });
      window.location.hash = "#/recordings";
    } catch (err) {
      showToast(err.message, "error");
      submitBtn.disabled = false;
    }
  });
}
