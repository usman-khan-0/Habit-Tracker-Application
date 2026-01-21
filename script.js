// Habit Tracker Application
// Main application state and functionality

document.addEventListener('DOMContentLoaded', () => {
    // Application state
    let habits = [];
    let currentView = 'weekly'; // 'weekly' or 'monthly'
    let currentDate = new Date();
    let habitToDelete = null;
    
    // DOM Elements
    const elements = {
        // Forms
        addHabitForm: document.getElementById('add-habit-form'),
        editHabitForm: document.getElementById('edit-habit-form'),
        
        // Inputs
        habitName: document.getElementById('habit-name'),
        habitGoal: document.getElementById('habit-goal'),
        habitCategory: document.getElementById('habit-category'),
        editHabitName: document.getElementById('edit-habit-name'),
        editHabitGoal: document.getElementById('edit-habit-goal'),
        editHabitCategory: document.getElementById('edit-habit-category'),
        editHabitId: document.getElementById('edit-habit-id'),
        
        // Containers
        habitsContainer: document.getElementById('habits-container'),
        emptyState: document.getElementById('empty-state'),
        breakdownList: document.getElementById('breakdown-list'),
        
        // Stats
        completedCount: document.getElementById('completed-count'),
        streakCount: document.getElementById('streak-count'),
        
        // View Controls
        currentPeriod: document.getElementById('current-period'),
        prevPeriod: document.getElementById('prev-period'),
        nextPeriod: document.getElementById('next-period'),
        viewButtons: document.querySelectorAll('.btn-view'),
        
        // Modals
        editModal: document.getElementById('edit-modal'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmAction: document.getElementById('confirm-action'),
        
        // Other
        clearStorage: document.getElementById('clear-storage')
    };
    
    // Initialize the application
    function init() {
        loadHabits();
        setupEventListeners();
        updateCharCounters();
        renderHabits();
        updateStats();
        updatePeriodDisplay();
    }
    
    // Load habits from localStorage
    function loadHabits() {
        try {
            const savedHabits = localStorage.getItem('habitTrackerHabits');
            if (savedHabits) {
                const parsedHabits = JSON.parse(savedHabits);
                
                // Convert date strings back to Date objects for tracking
                habits = parsedHabits.map(habit => ({
                    ...habit,
                    createdAt: new Date(habit.createdAt),
                    completedDates: habit.completedDates.map(dateStr => new Date(dateStr))
                }));
            }
        } catch (error) {
            console.error('Error loading habits from localStorage:', error);
            habits = [];
            // Clear corrupted data
            localStorage.removeItem('habitTrackerHabits');
        }
    }
    
    // Save habits to localStorage
    function saveHabits() {
        try {
            // Convert Date objects to strings for storage
            const habitsToSave = habits.map(habit => ({
                ...habit,
                createdAt: habit.createdAt.toISOString(),
                completedDates: habit.completedDates.map(date => date.toISOString())
            }));
            
            localStorage.setItem('habitTrackerHabits', JSON.stringify(habitToSave));
        } catch (error) {
            console.error('Error saving habits to localStorage:', error);
            showNotification('Error saving habits. Try clearing some data.', 'error');
        }
    }
    
    // Setup all event listeners
    function setupEventListeners() {
        // Form submissions
        elements.addHabitForm.addEventListener('submit', handleAddHabit);
        elements.editHabitForm.addEventListener('submit', handleEditHabit);
        
        // Input character counters
        elements.habitName.addEventListener('input', () => updateCharCounter('name', elements.habitName.value.length));
        elements.habitGoal.addEventListener('input', () => updateCharCounter('goal', elements.habitGoal.value.length));
        elements.editHabitName.addEventListener('input', () => updateCharCounter('edit-name', elements.editHabitName.value.length));
        elements.editHabitGoal.addEventListener('input', () => updateCharCounter('edit-goal', elements.editHabitGoal.value.length));
        
        // View controls
        elements.viewButtons.forEach(button => {
            button.addEventListener('click', () => handleViewChange(button.dataset.view));
        });
        
        // Date navigation
        elements.prevPeriod.addEventListener('click', navigateToPreviousPeriod);
        elements.nextPeriod.addEventListener('click', navigateToNextPeriod);
        
        // Modal controls
        document.querySelectorAll('.btn-close-modal').forEach(button => {
            button.addEventListener('click', () => elements.editModal.classList.remove('active'));
        });
        
        document.querySelectorAll('.btn-close-confirm').forEach(button => {
            button.addEventListener('click', () => elements.confirmModal.classList.remove('active'));
        });
        
        // Confirmation modal
        elements.confirmAction.addEventListener('click', handleConfirmDelete);
        
        // Clear storage button
        elements.clearStorage.addEventListener('click', handleClearStorage);
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === elements.editModal) {
                elements.editModal.classList.remove('active');
            }
            if (e.target === elements.confirmModal) {
                elements.confirmModal.classList.remove('active');
            }
        });
    }
    
    // Update character counters
    function updateCharCounters() {
        updateCharCounter('name', elements.habitName.value.length);
        updateCharCounter('goal', elements.habitGoal.value.length);
        updateCharCounter('edit-name', elements.editHabitName.value.length);
        updateCharCounter('edit-goal', elements.editHabitGoal.value.length);
    }
    
    function updateCharCounter(type, length) {
        const counters = {
            'name': elements.nameCharCount,
            'goal': elements.goalCharCount,
            'edit-name': elements.editNameCharCount,
            'edit-goal': elements.editGoalCharCount
        };
        
        if (counters[type]) {
            const maxLength = type.includes('name') ? 50 : 30;
            counters[type].textContent = `${length}/${maxLength}`;
            
            if (length > maxLength * 0.9) {
                counters[type].style.color = 'var(--warning-color)';
            } else if (length > maxLength) {
                counters[type].style.color = 'var(--danger-color)';
            } else {
                counters[type].style.color = 'var(--gray)';
            }
        }
    }
    
    // Handle adding a new habit
    function handleAddHabit(e) {
        e.preventDefault();
        
        const name = elements.habitName.value.trim();
        const goal = elements.habitGoal.value.trim();
        const category = elements.habitCategory.value;
        
        // Validate habit name
        if (!name) {
            showNotification('Please enter a habit name', 'error');
            elements.habitName.focus();
            return;
        }
        
        // Check for duplicate habit names (case insensitive)
        if (habits.some(habit => habit.name.toLowerCase() === name.toLowerCase())) {
            showNotification('A habit with this name already exists', 'error');
            elements.habitName.focus();
            return;
        }
        
        // Create new habit
        const newHabit = {
            id: generateId(),
            name,
            goal,
            category,
            createdAt: new Date(),
            completedDates: []
        };
        
        // Add to habits array
        habits.push(newHabit);
        
        // Save and update UI
        saveHabits();
        renderHabits();
        updateStats();
        
        // Reset form
        elements.addHabitForm.reset();
        updateCharCounters();
        
        // Show success message
        showNotification(`Habit "${name}" added successfully!`, 'success');
        
        // Focus back on name input
        elements.habitName.focus();
    }
    
    // Handle editing a habit
    function handleEditHabit(e) {
        e.preventDefault();
        
        const id = elements.editHabitId.value;
        const name = elements.editHabitName.value.trim();
        const goal = elements.editHabitGoal.value.trim();
        const category = elements.editHabitCategory.value;
        
        // Validate habit name
        if (!name) {
            showNotification('Please enter a habit name', 'error');
            return;
        }
        
        // Find the habit
        const habitIndex = habits.findIndex(habit => habit.id === id);
        
        if (habitIndex === -1) {
            showNotification('Habit not found', 'error');
            return;
        }
        
        // Check for duplicate habit names (excluding current habit)
        const duplicate = habits.find(habit => 
            habit.id !== id && habit.name.toLowerCase() === name.toLowerCase()
        );
        
        if (duplicate) {
            showNotification('A habit with this name already exists', 'error');
            return;
        }
        
        // Update the habit
        habits[habitIndex] = {
            ...habits[habitIndex],
            name,
            goal,
            category
        };
        
        // Save and update UI
        saveHabits();
        renderHabits();
        
        // Close modal
        elements.editModal.classList.remove('active');
        
        // Show success message
        showNotification(`Habit "${name}" updated successfully!`, 'success');
    }
    
    // Handle deleting a habit
    function handleDeleteHabit(id) {
        const habit = habits.find(h => h.id === id);
        
        if (!habit) return;
        
        habitToDelete = id;
        elements.confirmMessage.textContent = `Are you sure you want to delete "${habit.name}"?`;
        elements.confirmModal.classList.add('active');
    }
    
    // Handle confirmation of deletion
    function handleConfirmDelete() {
        if (!habitToDelete) return;
        
        // Remove the habit
        habits = habits.filter(habit => habit.id !== habitToDelete);
        
        // Save and update UI
        saveHabits();
        renderHabits();
        updateStats();
        
        // Close modal and reset
        elements.confirmModal.classList.remove('active');
        habitToDelete = null;
        
        // Show success message
        showNotification('Habit deleted successfully!', 'success');
    }
    
    // Handle toggling habit completion for a specific day
    function handleToggleCompletion(habitId, date) {
        const habit = habits.find(h => h.id === habitId);
        
        if (!habit) return;
        
        // Format dates to compare only date part (ignore time)
        const dateStr = date.toDateString();
        const existingIndex = habit.completedDates.findIndex(d => 
            d.toDateString() === dateStr
        );
        
        if (existingIndex !== -1) {
            // Remove from completed dates
            habit.completedDates.splice(existingIndex, 1);
        } else {
            // Add to completed dates
            habit.completedDates.push(date);
        }
        
        // Save and update UI
        saveHabits();
        renderHabits();
        updateStats();
    }
    
    // Handle changing view (weekly/monthly)
    function handleViewChange(view) {
        currentView = view;
        
        // Update active button
        elements.viewButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.view === view);
        });
        
        // Update display and render habits
        updatePeriodDisplay();
        renderHabits();
    }
    
    // Navigate to previous period
    function navigateToPreviousPeriod() {
        if (currentView === 'weekly') {
            currentDate.setDate(currentDate.getDate() - 7);
        } else {
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
        
        updatePeriodDisplay();
        renderHabits();
    }
    
    // Navigate to next period
    function navigateToNextPeriod() {
        if (currentView === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        updatePeriodDisplay();
        renderHabits();
    }
    
    // Update the period display (week/month)
    function updatePeriodDisplay() {
        if (currentView === 'weekly') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            const formatOptions = { month: 'short', day: 'numeric' };
            const startStr = weekStart.toLocaleDateString(undefined, formatOptions);
            const endStr = weekEnd.toLocaleDateString(undefined, formatOptions);
            
            elements.currentPeriod.textContent = `${startStr} - ${endStr}`;
        } else {
            const monthName = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            elements.currentPeriod.textContent = monthName;
        }
    }
    
    // Handle clearing all storage
    function handleClearStorage() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            habits = [];
            localStorage.removeItem('habitTrackerHabits');
            renderHabits();
            updateStats();
            showNotification('All data has been cleared', 'success');
        }
    }
    
    // Render all habits
    function renderHabits() {
        // Clear container
        elements.habitsContainer.innerHTML = '';
        
        // Show empty state if no habits
        if (habits.length === 0) {
            elements.emptyState.style.display = 'block';
            elements.habitsContainer.appendChild(elements.emptyState);
            return;
        }
        
        // Hide empty state
        elements.emptyState.style.display = 'none';
        
        // Render each habit
        habits.forEach(habit => {
            const habitElement = createHabitElement(habit);
            elements.habitsContainer.appendChild(habitElement);
        });
    }
    
    // Create a habit element
    function createHabitElement(habit) {
        const habitElement = document.createElement('div');
        habitElement.className = 'habit-card';
        
        // Calculate progress
        const progress = calculateHabitProgress(habit);
        
        // Get days for tracking grid
        const days = getDaysForTracking();
        
        // Create habit HTML
        habitElement.innerHTML = `
            <div class="habit-header">
                <div class="habit-info">
                    <div class="habit-title">
                        <h3 class="habit-name">${escapeHtml(habit.name)}</h3>
                        ${habit.category ? `
                            <span class="habit-category category-${habit.category}">
                                ${getCategoryDisplayName(habit.category)}
                            </span>
                        ` : ''}
                    </div>
                    ${habit.goal ? `
                        <p class="habit-goal">
                            <i class="fas fa-bullseye"></i>
                            Daily goal: ${escapeHtml(habit.goal)}
                        </p>
                    ` : ''}
                </div>
                <div class="habit-actions">
                    <button class="btn-action btn-edit" data-id="${habit.id}" title="Edit Habit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" data-id="${habit.id}" title="Delete Habit">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="habit-progress">
                <div class="progress-info">
                    <span class="progress-text">Progress this period</span>
                    <span class="progress-percentage">${progress.percentage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                </div>
            </div>
            
            <div class="habit-tracking">
                <div class="tracking-header">
                    <h4>Daily Tracking</h4>
                    <span class="progress-text">${progress.completed}/${progress.total} days</span>
                </div>
                <div class="days-grid" id="days-${habit.id}">
                    <!-- Days will be added dynamically -->
                </div>
            </div>
        `;
        
        // Add event listeners to action buttons
        const editBtn = habitElement.querySelector('.btn-edit');
        const deleteBtn = habitElement.querySelector('.btn-delete');
        
        editBtn.addEventListener('click', () => openEditModal(habit));
        deleteBtn.addEventListener('click', () => handleDeleteHabit(habit.id));
        
        // Add day cells
        const daysGrid = habitElement.querySelector(`#days-${habit.id}`);
        days.forEach(day => {
            const dayElement = createDayElement(habit, day);
            daysGrid.appendChild(dayElement);
        });
        
        return habitElement;
    }
    
    // Create a day element for tracking
    function createDayElement(habit, day) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day-cell';
        
        // Check if this day is completed
        const isCompleted = isDayCompleted(habit, day.date);
        
        if (isCompleted) {
            dayElement.classList.add('completed');
        }
        
        // Add day number and name
        dayElement.innerHTML = `
            <span class="day-number">${day.date.getDate()}</span>
            <span class="day-name">${day.name}</span>
        `;
        
        // Add click event for toggling completion
        dayElement.addEventListener('click', () => handleToggleCompletion(habit.id, day.date));
        
        return dayElement;
    }
    
    // Calculate habit progress for current period
    function calculateHabitProgress(habit) {
        const days = getDaysForTracking();
        const totalDays = days.length;
        
        let completedDays = 0;
        days.forEach(day => {
            if (isDayCompleted(habit, day.date)) {
                completedDays++;
            }
        });
        
        const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
        
        return {
            completed: completedDays,
            total: totalDays,
            percentage: percentage
        };
    }
    
    // Check if a specific day is completed for a habit
    function isDayCompleted(habit, date) {
        return habit.completedDates.some(completedDate => 
            completedDate.toDateString() === date.toDateString()
        );
    }
    
    // Get days for the current tracking period
    function getDaysForTracking() {
        const days = [];
        
        if (currentView === 'weekly') {
            // Get current week
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            
            // Create array of 7 days
            for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(weekStart.getDate() + i);
                
                days.push({
                    date: day,
                    name: day.toLocaleDateString(undefined, { weekday: 'short' })
                });
            }
        } else {
            // Get current month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Get number of days in month
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Create array of all days in month
            for (let i = 1; i <= daysInMonth; i++) {
                const day = new Date(year, month, i);
                
                days.push({
                    date: day,
                    name: day.toLocaleDateString(undefined, { weekday: 'short' })
                });
            }
        }
        
        return days;
    }
    
    // Open edit modal with habit data
    function openEditModal(habit) {
        elements.editHabitId.value = habit.id;
        elements.editHabitName.value = habit.name;
        elements.editHabitGoal.value = habit.goal || '';
        elements.editHabitCategory.value = habit.category || '';
        
        // Update character counters
        updateCharCounters();
        
        // Show modal
        elements.editModal.classList.add('active');
        
        // Focus on name input
        elements.editHabitName.focus();
    }
    
    // Update statistics display
    function updateStats() {
        // Calculate completed habits for today
        const today = new Date();
        const todayCompleted = habits.filter(habit => 
            habit.completedDates.some(date => date.toDateString() === today.toDateString())
        ).length;
        
        // Calculate current streak
        const streak = calculateCurrentStreak();
        
        // Update display
        elements.completedCount.textContent = todayCompleted;
        elements.streakCount.textContent = streak;
    }
    
    // Calculate current streak (consecutive days with at least one completed habit)
    function calculateCurrentStreak() {
        let streak = 0;
        const today = new Date();
        
        // Check consecutive days starting from today
        for (let i = 0; i < 365; i++) { // Limit to one year
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            
            // Check if any habit was completed on this day
            const hasCompletion = habits.some(habit => 
                habit.completedDates.some(date => date.toDateString() === checkDate.toDateString())
            );
            
            if (hasCompletion) {
                streak++;
            } else if (i === 0) {
                // Today has no completions yet, streak is 0
                return 0;
            } else {
                // Found a day with no completions, stop counting
                break;
            }
        }
        
        return streak;
    }
    
    // Get display name for category
    function getCategoryDisplayName(category) {
        const categoryNames = {
            'health': 'Health & Fitness',
            'learning': 'Learning',
            'productivity': 'Productivity',
            'mindfulness': 'Mindfulness',
            'social': 'Social',
            'finance': 'Finance',
            'other': 'Other'
        };
        
        return categoryNames[category] || category;
    }
    
    // Show notification message
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="btn-close-notification">&times;</button>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Add styles for notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
            color: white;
            padding: var(--spacing-md) var(--spacing-lg);
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            box-shadow: var(--shadow-lg);
            z-index: 2000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        // Add close button event
        notification.querySelector('.btn-close-notification').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        // Add keyframes for animations
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .btn-close-notification {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    margin-left: auto;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Utility functions
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize the application
    init();
});