document.addEventListener("DOMContentLoaded", () => {
    const isWorkspace = document.getElementById("matrix-render-target") !== null;
    let todoItems = JSON.parse(localStorage.getItem("edge_matrix_todos")) || [];

    function persist() {
        localStorage.setItem("edge_matrix_todos", JSON.stringify(todoItems));
    }

    // --- Active Listener Route (index.html) ---
    if (!isWorkspace) {
        const viewDashboardBtn = document.getElementById("view-dashboard-btn");
        
        if (todoItems.length > 0) {
            viewDashboardBtn.style.display = "block";
            viewDashboardBtn.addEventListener("click", () => {
                window.location.href = "workspace.html";
            });
        }

        window.addEventListener("message", (event) => {
            let payload = event.data;
            if (!payload) return;

            if (typeof payload === "string") {
                try {
                    // Defensive parsing parsing adjustment targeting model syntax wrapper leaks
                    payload = payload.replace(/```json/g, "").replace(/```/g, "").trim();
                    payload = JSON.parse(payload);
                } catch (err) {
                    console.error("Payload decoding halted due to syntax validation faults:", err);
                    return;
                }
            }

            if (payload && Array.isArray(payload.tasks)) {
                payload.tasks.forEach(task => {
                    todoItems.push({
                        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
                        title: task.title || "New Task",
                        date: task.date || "No date",
                        status: "Not Started"
                    });
                });
                persist();
                window.location.href = "workspace.html";
            }
        });
    }

    // --- Matrix Controller Dashboard Route (workspace.html) ---
    if (isWorkspace) {
        const renderTarget = document.getElementById("matrix-render-target");
        const statusState = document.getElementById("status-state");
        const backBtn = document.getElementById("back-to-listening");
        let activeFilter = "all";

        backBtn.addEventListener("click", () => {
            window.location.href = "index.html";
        });

        function populateList() {
            renderTarget.innerHTML = "";
            const filtered = todoItems.filter(t => activeFilter === "all" || t.status === activeFilter);

            if (filtered.length === 0) {
                statusState.style.display = "block";
                statusState.textContent = activeFilter === "all" ? "No items found." : `No items marked as "${activeFilter}"`;
                return;
            }
            statusState.style.display = "none";

            filtered.forEach(task => {
                const element = document.createElement("li");
                element.className = "todo-card";
                element.innerHTML = `
                    <div class="card-body">
                        <input type="text" class="card-input" value="${task.title}" data-id="${task.id}">
                        <span class="card-date">📅 ${task.date}</span>
                    </div>
                    <div class="card-actions">
                        <select class="card-select" data-id="${task.id}">
                            <option value="Not Started" ${task.status === "Not Started" ? "selected" : ""}>Not Started</option>
                            <option value="In Progress" ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
                            <option value="Completed" ${task.status === "Completed" ? "selected" : ""}>Completed</option>
                        </select>
                        <button class="card-del" data-id="${task.id}">✕</button>
                    </div>
                `;

                // Auto-save inline edits
                element.querySelector(".card-input").addEventListener("blur", (e) => {
                    const idx = todoItems.findIndex(t => t.id === e.target.dataset.id);
                    if (idx > -1) {
                        todoItems[idx].title = e.target.value.trim() || "Untitled Task";
                        persist();
                    }
                });

                // Status updates mutation pipeline
                element.querySelector(".card-select").addEventListener("change", (e) => {
                    const idx = todoItems.findIndex(t => t.id === e.target.dataset.id);
                    if (idx > -1) {
                        todoItems[idx].status = e.target.value;
                        persist();
                        populateList();
                    }
                });

                // Delete processing logic
                element.querySelector(".card-del").addEventListener("click", (e) => {
                    todoItems = todoItems.filter(t => t.id !== e.target.dataset.id);
                    persist();
                    populateList();
                });

                renderTarget.appendChild(element);
            });
        }

        document.querySelectorAll(".seg-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                document.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                activeFilter = e.target.dataset.status;
                populateList();
            });
        });

        populateList();
    }
});