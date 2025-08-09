document.addEventListener('DOMContentLoaded', () => {

    // --- State Management & localStorage ---
    const STORAGE_KEYS = {
        USER_NAME: 'life-dashboard-userName',
        HABITS: 'life-dashboard-habits',
        GOALS: 'life-dashboard-goals',
        GRATITUDE: 'life-dashboard-gratitude',
        MOODS: 'life-dashboard-moods',
        THEME: 'life-dashboard-theme'
    };

    let state = {
        userName: '',
        habits: [],
        goals: [],
        gratitudeEntries: [],
        moods: []
    };

    const getStorageData = (key, defaultValue) => {
        try {
            const savedData = localStorage.getItem(key);
            return savedData ? JSON.parse(savedData) : defaultValue;
        } catch (error) {
            console.error(`Error reading from localStorage for key "${key}":`, error);
            return defaultValue;
        }
    };

    const setStorageData = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error writing to localStorage for key "${key}":`, error);
        }
    };
    
    // --- Date & Time Helpers ---
    const getTodayString = () => new Date().toISOString().split('T')[0];
    
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    };

    // --- DOM Element Selectors ---
    const selectors = {
        // App
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        userInitials: document.getElementById('user-initials'),
        todayDate: document.getElementById('today-date'),
        greetingMessage: document.getElementById('greeting-message'),
        userNamePrompt: document.getElementById('user-name-prompt'),
        settingsBtn: document.getElementById('settings-btn'),
        settingsModal: document.getElementById('settings-modal'),
        closeSettingsBtn: document.getElementById('close-settings-btn'),
        settingsNameInput: document.getElementById('settings-name-input'),
        saveNameSettingsBtn: document.getElementById('save-name-settings-btn'),
        exportDataBtn: document.getElementById('export-data-btn'),
        importDataBtn: document.getElementById('import-data-btn'),
        importFileInput: document.getElementById('import-file-input'),
        clearDataBtn: document.getElementById('clear-data-btn'),
        
        // Habits
        showAddHabitBtn: document.getElementById('show-add-habit-btn'),
        addHabitForm: document.getElementById('add-habit-form'),
        cancelAddHabitBtn: document.getElementById('cancel-add-habit-btn'),
        newHabitInput: document.getElementById('new-habit-input'),
        habitList: document.getElementById('habit-list'),
        habitsEmptyState: document.getElementById('habits-empty-state'),

        // Goals
        showAddGoalBtn: document.getElementById('show-add-goal-btn'),
        addGoalForm: document.getElementById('add-goal-form'),
        cancelAddGoalBtn: document.getElementById('cancel-add-goal-btn'),
        newGoalName: document.getElementById('new-goal-name'),
        newGoalDeadline: document.getElementById('new-goal-deadline'),
        newGoalPriority: document.getElementById('new-goal-priority'),
        goalList: document.getElementById('goal-list'),
        goalsEmptyState: document.getElementById('goals-empty-state'),

        // Gratitude
        gratitudeForm: document.getElementById('gratitude-form'),
        gratitudeInputs: [
            document.getElementById('gratitude-input-1'),
            document.getElementById('gratitude-input-2'),
            document.getElementById('gratitude-input-3')
        ],
        gratitudeList: document.getElementById('gratitude-list'),
        gratitudeEmptyState: document.getElementById('gratitude-empty-state'),
        viewAllGratitudeBtn: document.getElementById('view-all-gratitude-btn'),
        
        // Moods
        moodSelectionArea: document.getElementById('mood-selection-area'),
        moodRecordedArea: document.getElementById('mood-recorded-area'),
        moodStatsArea: document.getElementById('mood-stats-area'),
        toggleMoodChartBtn: document.getElementById('toggle-mood-chart-btn'),
        moodChartContainer: document.getElementById('mood-chart-container'),
        moodChartCanvas: document.getElementById('mood-chart'),
    };
    
    // --- Mood Constants & Chart ---
    const MOODS = [
      { emoji: '😍', label: 'Amazing', value: 5 },
      { emoji: '😊', label: 'Happy', value: 4 },
      { emoji: '😐', label: 'Neutral', value: 3 },
      { emoji: '😔', label: 'Sad', value: 2 },
      { emoji: '😠', label: 'Angry', value: 1 }
    ];
    let moodChartInstance = null;
    
    // ===================================================================
    // RENDER FUNCTIONS
    // ===================================================================

    // --- Render App Shell ---
    const renderApp = () => {
        // Theme
        const savedTheme = getStorageData(STORAGE_KEYS.THEME, 'light');
        document.documentElement.className = savedTheme;
        selectors.themeToggleBtn.innerHTML = savedTheme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';

        // Date
        selectors.todayDate.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });

        // Greeting
        const hour = new Date().getHours();
        let greeting = 'Good evening';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 17) greeting = 'Good afternoon';
        selectors.greetingMessage.innerHTML = `${greeting}${state.userName ? `, <span>${state.userName}</span>` : ''}!`;

        // User Name & Initials
        selectors.userInitials.textContent = state.userName ? state.userName.charAt(0).toUpperCase() : 'LD';
        renderUserNamePrompt();
        lucide.createIcons();
    };

    const renderUserNamePrompt = () => {
        if (state.userName) {
            selectors.userNamePrompt.innerHTML = '';
        } else {
            selectors.userNamePrompt.innerHTML = `
                <div class="input-group">
                    <input type="text" id="initial-name-input" placeholder="Add Your Name...">
                    <button id="initial-save-name-btn" class="btn btn-primary">Save</button>
                </div>
            `;
            document.getElementById('initial-save-name-btn').addEventListener('click', () => {
                const nameInput = document.getElementById('initial-name-input');
                if (nameInput.value.trim()) {
                    saveName(nameInput.value.trim());
                }
            });
        }
    };
    
    // --- Render Habits ---
    const renderHabits = () => {
        selectors.habitList.innerHTML = '';
        if (state.habits.length === 0) {
            selectors.habitsEmptyState.classList.remove('hidden');
            return;
        }
        
        selectors.habitsEmptyState.classList.add('hidden');
        state.habits.forEach(habit => {
            const isCompleted = habit.completedDates.includes(getTodayString());
            const streak = getStreakCount(habit.completedDates);
            const successRate = getSuccessRate(habit.completedDates, habit.createdAt);

            const li = document.createElement('div');
            li.className = `list-item ${isCompleted ? 'completed' : ''}`;
            li.dataset.id = habit.id;
            li.innerHTML = `
                <div class="item-content">
                    <input type="checkbox" class="habit-checkbox" ${isCompleted ? 'checked' : ''}>
                    <div class="flex-grow">
                        <p class="item-name">${habit.name}</p>
                        <div class="item-details">
                            ${streak > 0 ? `<span class="badge"><i class="icon" data-lucide="flame"></i>${streak} day streak</span>` : ''}
                            <span class="badge">${successRate}% success</span>
                        </div>
                    </div>
                    <button class="icon-btn delete-btn"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            selectors.habitList.appendChild(li);
        });
        lucide.createIcons();
    };

    // --- Render Goals ---
    const renderGoals = () => {
        selectors.goalList.innerHTML = '';
        if (state.goals.length === 0) {
            selectors.goalsEmptyState.classList.remove('hidden');
            return;
        }

        selectors.goalsEmptyState.classList.add('hidden');
        state.goals.forEach(goal => {
            const isCompleted = goal.status === 'done';
            const isOverdue = goal.deadline && new Date(goal.deadline) < new Date(getTodayString());
            
            const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

            const li = document.createElement('div');
            li.className = `list-item ${isCompleted ? 'completed' : ''}`;
            li.dataset.id = goal.id;
            li.innerHTML = `
                <div class="item-content">
                    <div class="flex-grow">
                        <div class="goal-header">
                            <span class="priority-dot" style="background-color: ${priorityColors[goal.priority]}"></span>
                            <p class="item-name">${goal.name}</p>
                            <button class="icon-btn delete-btn"><i data-lucide="trash-2"></i></button>
                        </div>
                        <div class="item-details">
                            <span class="badge">${goal.priority} priority</span>
                            ${goal.deadline ? `<span class="badge ${isOverdue && !isCompleted ? 'text-destructive' : ''}"><i class="icon" data-lucide="calendar"></i>${formatDate(goal.deadline)}${isOverdue && !isCompleted ? ' (Overdue)' : ''}</span>` : ''}
                        </div>
                        <div class="progress-container" style="margin-top: 1rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--muted-foreground);">
                               <span>Progress</span>
                               <span>${goal.progress}%</span>
                            </div>
                            <input type="range" min="0" max="100" value="${goal.progress}" class="progress-slider">
                        </div>
                    </div>
                </div>
            `;
            selectors.goalList.appendChild(li);
        });
        lucide.createIcons();
    };
    
    // --- Render Gratitude ---
    const renderGratitude = () => {
        // Today's entry
        const todayEntry = state.gratitudeEntries.find(e => e.date === getTodayString());
        selectors.gratitudeInputs.forEach((input, index) => {
            input.value = todayEntry ? (todayEntry.entries[index] || '') : '';
        });

        // Past entries
        selectors.gratitudeList.innerHTML = '';
        const pastEntries = state.gratitudeEntries.filter(e => e.date !== getTodayString());

        if (pastEntries.length === 0) {
            selectors.gratitudeEmptyState.classList.remove('hidden');
        } else {
            selectors.gratitudeEmptyState.classList.add('hidden');
        }
        
        pastEntries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'gratitude-entry';
            div.innerHTML = `
                <p class="date">${formatDate(entry.date)}</p>
                <ul>
                    ${entry.entries.map(item => `<li>${item}</li>`).join('')}
                </ul>
            `;
            selectors.gratitudeList.prepend(div);
        });

        selectors.viewAllGratitudeBtn.textContent = 'View All';
        selectors.gratitudeList.classList.add('scrollable');
    };
    
    // --- Render Moods ---
    const renderMoods = () => {
        const todayMood = state.moods.find(m => m.date === getTodayString());

        if (todayMood) {
            selectors.moodSelectionArea.classList.add('hidden');
            selectors.moodRecordedArea.classList.remove('hidden');
            const moodDetails = MOODS.find(m => m.value === todayMood.value);
            selectors.moodRecordedArea.innerHTML = `
                <span class="emoji">${moodDetails.emoji}</span>
                <p>Today's mood: <strong>${moodDetails.label}</strong></p>
                <button id="change-mood-btn" class="btn">Change</button>
            `;
            document.getElementById('change-mood-btn').addEventListener('click', () => {
                selectors.moodSelectionArea.classList.remove('hidden');
                selectors.moodRecordedArea.classList.add('hidden');
            });
        } else {
            selectors.moodSelectionArea.classList.remove('hidden');
            selectors.moodRecordedArea.classList.add('hidden');
            selectors.moodSelectionArea.innerHTML = MOODS.map(mood => `
                <button class="mood-option" data-value="${mood.value}">
                    <span>${mood.emoji}</span>
                    <span>${mood.label}</span>
                </button>
            `).join('');
        }

        // Stats
        if (state.moods.length > 0) {
            selectors.moodStatsArea.classList.remove('hidden');
            const avgMood = (state.moods.reduce((sum, m) => sum + m.value, 0) / state.moods.length).toFixed(1);
            selectors.moodStatsArea.innerHTML = `
                <div class="mood-stat-item">
                    <span class="label"><i class="icon" data-lucide="trending-up"></i>Avg Mood</span>
                    <p class="value">${avgMood}/5</p>
                </div>
                <div class="mood-stat-item">
                    <span class="label"><i class="icon" data-lucide="smile"></i>Entries</span>
                    <p class="value">${state.moods.length}</p>
                </div>
            `;
        } else {
            selectors.moodStatsArea.classList.add('hidden');
        }

        selectors.toggleMoodChartBtn.classList.toggle('hidden', state.moods.length < 2);
        lucide.createIcons();
    };

    const renderMoodChart = () => {
        if (moodChartInstance) {
            moodChartInstance.destroy();
        }

        const chartData = state.moods.slice(0, 30).reverse(); // last 30 entries
        const isDark = document.documentElement.classList.contains('dark');
        
        moodChartInstance = new Chart(selectors.moodChartCanvas, {
            type: 'line',
            data: {
                labels: chartData.map(m => formatDate(m.date)),
                datasets: [{
                    label: 'Mood',
                    data: chartData.map(m => m.value),
                    borderColor: 'var(--primary)',
                    backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
                    fill: true,
                    tension: 0.3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 1, max: 5, ticks: {
                            stepSize: 1,
                            color: 'var(--muted-foreground)'
                        },
                        grid: { color: 'var(--border)' }
                    },
                    x: {
                        ticks: { color: 'var(--muted-foreground)' },
                        grid: { color: 'transparent' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    };

    // ===================================================================
    // EVENT HANDLERS & LOGIC
    // ===================================================================

    // --- General App Logic ---
    const saveName = (name) => {
        state.userName = name;
        setStorageData(STORAGE_KEYS.USER_NAME, state.userName);
        renderApp();
    };
    
    const toggleTheme = () => {
        const currentTheme = document.documentElement.className;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.className = newTheme;
        setStorageData(STORAGE_KEYS.THEME, newTheme);
        renderApp();
        if (moodChartInstance && !selectors.moodChartContainer.classList.contains('hidden')) {
            renderMoodChart();
        }
    };
    
    // --- Habit Logic ---
    const getStreakCount = (dates) => {
        if (dates.length === 0) return 0;
        let streak = 0;
        const sortedDates = dates.map(d => new Date(d)).sort((a, b) => b - a);
        const today = new Date(getTodayString());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (sortedDates[0].getTime() !== today.getTime() && sortedDates[0].getTime() !== yesterday.getTime()) {
            return 0; // Streak is broken if not done today or yesterday
        }
        
        let currentDate = new Date(today);
        if(!dates.includes(getTodayString())) currentDate.setDate(currentDate.getDate() - 1);
        
        for (let i = 0; i < sortedDates.length; i++) {
            const date = new Date(sortedDates[i].toISOString().split('T')[0]);
            if (date.getTime() === currentDate.getTime()) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    };

    const getSuccessRate = (dates, startDate) => {
        const start = new Date(startDate);
        const today = new Date();
        const totalDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1;
        if (totalDays <= 0) return 0;
        return Math.round((dates.length / totalDays) * 100);
    };
    
    function handleHabitSubmit(e) {
        e.preventDefault();
        const name = selectors.newHabitInput.value.trim();
        if (name) {
            const newHabit = {
                id: Date.now().toString(),
                name,
                createdAt: getTodayString(),
                completedDates: []
            };
            state.habits.push(newHabit);
            setStorageData(STORAGE_KEYS.HABITS, state.habits);
            selectors.newHabitInput.value = '';
            selectors.addHabitForm.classList.add('hidden');
            selectors.showAddHabitBtn.classList.remove('hidden');
            renderHabits();
        }
    }

    function handleHabitListClick(e) {
        const id = e.target.closest('.list-item')?.dataset.id;
        if (!id) return;

        if (e.target.matches('.habit-checkbox')) {
            const habit = state.habits.find(h => h.id === id);
            const today = getTodayString();
            if (e.target.checked) {
                if (!habit.completedDates.includes(today)) {
                    habit.completedDates.push(today);
                }
            } else {
                habit.completedDates = habit.completedDates.filter(d => d !== today);
            }
            setStorageData(STORAGE_KEYS.HABITS, state.habits);
            renderHabits();
        }

        if (e.target.closest('.delete-btn')) {
            state.habits = state.habits.filter(h => h.id !== id);
            setStorageData(STORAGE_KEYS.HABITS, state.habits);
            renderHabits();
        }
    }

    // --- Goal Logic ---
    function handleGoalSubmit(e) {
        e.preventDefault();
        const name = selectors.newGoalName.value.trim();
        if (name) {
            const newGoal = {
                id: Date.now().toString(),
                name,
                deadline: selectors.newGoalDeadline.value || undefined,
                priority: selectors.newGoalPriority.value,
                status: 'not-started',
                progress: 0,
                createdAt: getTodayString(),
            };
            state.goals.push(newGoal);
            setStorageData(STORAGE_KEYS.GOALS, state.goals);
            selectors.addGoalForm.reset();
            selectors.addGoalForm.classList.add('hidden');
            selectors.showAddGoalBtn.classList.remove('hidden');
            renderGoals();
        }
    }

    function handleGoalListInput(e) {
        const id = e.target.closest('.list-item')?.dataset.id;
        if (!id || !e.target.matches('.progress-slider')) return;
        
        const goal = state.goals.find(g => g.id === id);
        const progress = parseInt(e.target.value, 10);
        goal.progress = progress;
        goal.status = progress === 100 ? 'done' : progress > 0 ? 'in-progress' : 'not-started';
        
        setStorageData(STORAGE_KEYS.GOALS, state.goals);
        renderGoals(); // Re-render to update status text, colors etc.
    }

    function handleGoalListClick(e) {
        const id = e.target.closest('.list-item')?.dataset.id;
        if (!id) return;

        if (e.target.closest('.delete-btn')) {
            state.goals = state.goals.filter(g => g.id !== id);
            setStorageData(STORAGE_KEYS.GOALS, state.goals);
            renderGoals();
        }
    }
    
    // --- Gratitude Logic ---
    function handleGratitudeSubmit(e) {
        e.preventDefault();
        const entries = selectors.gratitudeInputs.map(input => input.value.trim()).filter(Boolean);
        if (entries.length === 0) return;

        const today = getTodayString();
        const existingEntryIndex = state.gratitudeEntries.findIndex(e => e.date === today);

        if (existingEntryIndex > -1) {
            state.gratitudeEntries[existingEntryIndex].entries = entries;
        } else {
            state.gratitudeEntries.push({ id: Date.now().toString(), date: today, entries });
        }
        state.gratitudeEntries.sort((a,b) => new Date(b.date) - new Date(a.date));
        setStorageData(STORAGE_KEYS.GRATITUDE, state.gratitudeEntries);
        renderGratitude();
    }

    // --- Mood Logic ---
    function handleMoodSelection(e) {
        const value = e.target.closest('.mood-option')?.dataset.value;
        if (!value) return;

        const today = getTodayString();
        const moodValue = parseInt(value, 10);
        const existingMoodIndex = state.moods.findIndex(m => m.date === today);
        const moodDetails = MOODS.find(m => m.value === moodValue);

        const newEntry = { id: Date.now().toString(), date: today, value: moodValue, mood: moodDetails.emoji };

        if (existingMoodIndex > -1) {
            state.moods[existingMoodIndex] = newEntry;
        } else {
            state.moods.push(newEntry);
        }
        state.moods.sort((a,b) => new Date(b.date) - new Date(a.date));
        setStorageData(STORAGE_KEYS.MOODS, state.moods);
        renderMoods();
    }

    // --- Settings Logic ---
    const handleExport = () => {
        const dataToExport = {
            version: 1,
            exportDate: new Date().toISOString(),
            ...state
        };
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `life-dashboard-backup-${getTodayString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (confirm("This will overwrite all current data. Are you sure?")) {
                    state.userName = importedData.userName || '';
                    state.habits = importedData.habits || [];
                    state.goals = importedData.goals || [];
                    state.gratitudeEntries = importedData.gratitudeEntries || [];
                    state.moods = importedData.moods || [];
                    
                    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
                    
                    setStorageData(STORAGE_KEYS.USER_NAME, state.userName);
                    setStorageData(STORAGE_KEYS.HABITS, state.habits);
                    setStorageData(STORAGE_KEYS.GOALS, state.goals);
                    setStorageData(STORAGE_KEYS.GRATITUDE, state.gratitudeEntries);
                    setStorageData(STORAGE_KEYS.MOODS, state.moods);

                    init();
                    selectors.settingsModal.classList.add('hidden');
                }
            } catch (error) {
                alert('Invalid file format.');
                console.error("Import error:", error);
            }
        };
        reader.readAsText(file);
    };

    const handleClearData = () => {
        if (confirm("DANGER: This will delete ALL data from this application permanently. This cannot be undone. Are you sure?")) {
            Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
            init();
        }
    };
    
    // ===================================================================
    // INITIALIZATION
    // ===================================================================

    const init = () => {
        // Load data from storage
        state.userName = getStorageData(STORAGE_KEYS.USER_NAME, '');
        state.habits = getStorageData(STORAGE_KEYS.HABITS, []);
        state.goals = getStorageData(STORAGE_KEYS.GOALS, []);
        state.gratitudeEntries = getStorageData(STORAGE_KEYS.GRATITUDE, []);
        state.moods = getStorageData(STORAGE_KEYS.MOODS, []);

        // Initial Renders
        renderApp();
        renderHabits();
        renderGoals();
        renderGratitude();
        renderMoods();

        // Attach event listeners
        selectors.themeToggleBtn.addEventListener('click', toggleTheme);

        // Name
        selectors.userNamePrompt.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('initial-save-name-btn')?.click();
        });

        // Habits
        selectors.showAddHabitBtn.addEventListener('click', () => {
            selectors.showAddHabitBtn.classList.add('hidden');
            selectors.addHabitForm.classList.remove('hidden');
            selectors.newHabitInput.focus();
        });
        selectors.cancelAddHabitBtn.addEventListener('click', () => {
            selectors.addHabitForm.classList.add('hidden');
            selectors.showAddHabitBtn.classList.remove('hidden');
        });
        selectors.addHabitForm.addEventListener('submit', handleHabitSubmit);
        selectors.habitList.addEventListener('click', handleHabitListClick);

        // Goals
        selectors.showAddGoalBtn.addEventListener('click', () => {
            selectors.showAddGoalBtn.classList.add('hidden');
            selectors.addGoalForm.classList.remove('hidden');
            selectors.newGoalName.focus();
        });
        selectors.cancelAddGoalBtn.addEventListener('click', () => {
            selectors.addGoalForm.classList.add('hidden');
            selectors.showAddGoalBtn.classList.remove('hidden');
        });
        selectors.addGoalForm.addEventListener('submit', handleGoalSubmit);
        selectors.goalList.addEventListener('input', handleGoalListInput);
        selectors.goalList.addEventListener('click', handleGoalListClick);

        // Gratitude
        selectors.gratitudeForm.addEventListener('submit', handleGratitudeSubmit);
        selectors.viewAllGratitudeBtn.addEventListener('click', () => {
            const btn = selectors.viewAllGratitudeBtn;
            const list = selectors.gratitudeList;
            list.classList.toggle('scrollable');
            btn.textContent = list.classList.contains('scrollable') ? 'View All' : 'Collapse';
        });

        // Moods
        selectors.moodSelectionArea.addEventListener('click', handleMoodSelection);
        selectors.toggleMoodChartBtn.addEventListener('click', () => {
            const container = selectors.moodChartContainer;
            const btn = selectors.toggleMoodChartBtn;
            container.classList.toggle('hidden');
            if (!container.classList.contains('hidden')) {
                btn.innerHTML = '<i data-lucide="trending-up"></i> Hide Mood Trends';
                renderMoodChart();
            } else {
                btn.innerHTML = '<i data-lucide="trending-up"></i> Show Mood Trends';
            }
            lucide.createIcons();
        });
        
        // Settings Modal
        selectors.settingsBtn.addEventListener('click', () => {
            selectors.settingsNameInput.value = state.userName;
            selectors.settingsModal.classList.remove('hidden');
        });
        selectors.closeSettingsBtn.addEventListener('click', () => selectors.settingsModal.classList.add('hidden'));
        selectors.settingsModal.addEventListener('click', (e) => {
            if(e.target === selectors.settingsModal) selectors.settingsModal.classList.add('hidden');
        });
        selectors.saveNameSettingsBtn.addEventListener('click', () => {
            saveName(selectors.settingsNameInput.value.trim());
            selectors.settingsModal.classList.add('hidden');
        });
        selectors.exportDataBtn.addEventListener('click', handleExport);
        selectors.importDataBtn.addEventListener('click', () => selectors.importFileInput.click());
        selectors.importFileInput.addEventListener('change', handleImport);
        selectors.clearDataBtn.addEventListener('click', handleClearData);
    };

    init();
});
