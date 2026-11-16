
let subjects = JSON.parse(
    localStorage.getItem("studySyncSubjects") || "[]"
);

const subjectList = document.getElementById("subjectList");

// Save data
function saveData() {
    localStorage.setItem(
        "studySyncSubjects",
        JSON.stringify(subjects)
    );
}

// Calculate progress
function calculateProgress(topics) {
    if (topics.length === 0) return 0;

    const completed = topics.filter(
        topic => topic.completed
    ).length;

    return Math.round(
        completed / topics.length * 100
    );
}

// Update dashboard
function updateDashboard() {
    let totalTopics = 0;
    let completed = 0;

    subjects.forEach(subject => {
        subject.modules.forEach(module => {
            totalTopics += module.topics.length;

            completed += module.topics.filter(
                topic => topic.completed
            ).length;
        });
    });

    const percentage = totalTopics === 0
        ? 0
        : Math.round(completed / totalTopics * 100);

    document.getElementById("totalSubjects").textContent =
        subjects.length;

    document.getElementById("totalTopics").textContent =
        totalTopics;

    document.getElementById("completedTopics").textContent =
        completed;

    document.getElementById("overallProgress").textContent =
        percentage + "%";

    document.getElementById("reportProgress").textContent =
        percentage + "%";

    document.getElementById("reportBar").style.width =
        percentage + "%";
}

// Create action button
function createButton(text, className, action) {
    const button = document.createElement("button");

    button.textContent = text;
    button.className = className;
    button.onclick = action;

    return button;
}

// Add subject
document.getElementById("addSubjectBtn").onclick = function() {
    const name = prompt("Enter subject name:");

    if (!name || !name.trim()) return;

    subjects.push({
        id: Date.now() + Math.random(),
        name: name.trim(),
        modules: []
    });

    saveData();
    renderSubjects();
};

// Display subjects
function renderSubjects() {
    subjectList.innerHTML = "";

    subjects.forEach((subject, subjectIndex) => {

        const card = document.createElement("div");
        card.className = "card subject-card";

        const title = document.createElement("h3");
        title.textContent = "📚 " + subject.name;

        // Subject progress
        const allTopics = subject.modules.flatMap(
            module => module.topics
        );

        const progress = calculateProgress(allTopics);

        const progressBox = document.createElement("div");
        progressBox.className = "subject-progress";

        const progressText = document.createElement("p");
        progressText.textContent =
            "Subject Progress: " + progress + "%";

        const progressBg = document.createElement("div");
        progressBg.className = "progress-bg";

        const progressFill = document.createElement("div");
        progressFill.className = "progress-fill";
        progressFill.style.width = progress + "%";

        progressBg.appendChild(progressFill);
        progressBox.append(progressText, progressBg);

        // Subject actions
        const subjectActions = document.createElement("div");
        subjectActions.className = "action-buttons";

        subjectActions.append(
            createButton("✏️ Edit", "edit-btn", () => {
                const name = prompt(
                    "Edit subject name:",
                    subject.name
                );

                if (!name || !name.trim()) return;

                subject.name = name.trim();
                saveData();
                renderSubjects();
            }),

            createButton("🗑 Delete", "delete-btn", () => {
                if (confirm("Delete this subject and all its modules?")) {
                    subjects.splice(subjectIndex, 1);
                    saveData();
                    renderSubjects();
                }
            })
        );

        const addModuleBtn = createButton(
            "+ Add Module",
            "",
            () => {
                const name = prompt("Enter module name:");

                if (!name || !name.trim()) return;

                subject.modules.push({
                    id: Date.now() + Math.random(),
                    name: name.trim(),
                    topics: []
                });

                saveData();
                renderSubjects();
            }
        );

        card.append(
            title,
            progressBox,
            subjectActions,
            addModuleBtn
        );

        // Display modules
        subject.modules.forEach((module, moduleIndex) => {

            const moduleDiv = document.createElement("div");
            moduleDiv.className = "module";

            const moduleTitle = document.createElement("h4");
            moduleTitle.textContent = "📖 " + module.name;

            const moduleActions = document.createElement("div");
            moduleActions.className = "action-buttons";

            moduleActions.append(
                createButton("✏️ Edit", "edit-btn", () => {
                    const name = prompt(
                        "Edit module name:",
                        module.name
                    );

                    if (!name || !name.trim()) return;

                    module.name = name.trim();
                    saveData();
                    renderSubjects();
                }),

                createButton("🗑 Delete", "delete-btn", () => {
                    if (confirm("Delete this module and its topics?")) {
                        subject.modules.splice(moduleIndex, 1);
                        saveData();
                        renderSubjects();
                    }
                })
            );

            const addTopicBtn = createButton(
                "+ Add Topic",
                "",
                () => {
                    const name = prompt("Enter topic name:");

                    if (!name || !name.trim()) return;

                    module.topics.push({
                        id: Date.now() + Math.random(),
                        name: name.trim(),
                        completed: false
                    });

                    saveData();
                    renderSubjects();
                }
            );

            moduleDiv.append(
                moduleTitle,
                moduleActions,
                addTopicBtn
            );

            // Display topics
            module.topics.forEach((topic, topicIndex) => {

                const topicDiv = document.createElement("div");
                topicDiv.className = "topic";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = topic.completed;

                const topicName = document.createElement("span");
                topicName.textContent = topic.name;

                if (topic.completed) {
                    topicDiv.classList.add("done");
                }

                checkbox.onchange = function() {
                    topic.completed = checkbox.checked;

                    saveData();
                    renderSubjects();
                };

                const editTopic = createButton(
                    "✏️",
                    "edit-btn",
                    () => {
                        const name = prompt(
                            "Edit topic:",
                            topic.name
                        );

                        if (!name || !name.trim()) return;

                        topic.name = name.trim();
                        saveData();
                        renderSubjects();
                    }
                );

                const deleteTopic = createButton(
                    "✕",
                    "delete-btn",
                    () => {
                        if (confirm("Delete this topic?")) {
                            module.topics.splice(topicIndex, 1);
                            saveData();
                            renderSubjects();
                        }
                    }
                );

                topicDiv.append(
                    checkbox,
                    topicName,
                    editTopic,
                    deleteTopic
                );

                moduleDiv.appendChild(topicDiv);
            });

            card.appendChild(moduleDiv);
        });

        subjectList.appendChild(card);
    });

    updateDashboard();
}

// Dark / Light mode
document.getElementById("themeBtn").onclick = function() {
    document.body.classList.toggle("dark");
};

// Load saved subjects
renderSubjects();
