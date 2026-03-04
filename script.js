// State
let currentDate = new Date(); // Current month being viewed
let shiftStartDate = null; // String 'YYYY-MM-DD'
// Data structure for events: { 'YYYY-MM-DD': { overtime: 4, training: true } }
let events = JSON.parse(localStorage.getItem('plantaoEvents')) || {};

// DOM Elements
const shiftStartDateInput = document.getElementById('shift-start-date');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const currentMonthDisplay = document.getElementById('current-month-display');
const calendarGrid = document.getElementById('calendar-grid');
const monthlyOvertimeDisplay = document.getElementById('monthly-overtime');

// Modal Elements
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('close-modal');
const modalDateTitle = document.getElementById('modal-date-title');
const overtimeInput = document.getElementById('overtime-hours');
const trainingCheck = document.getElementById('training-check');
const shiftOverrideSelect = document.getElementById('shift-override');
const saveBtn = document.getElementById('save-btn');
const removeBtn = document.getElementById('remove-btn');

let selectedDateStr = null; // Currently selected date in modal

// Initialize
function init() {
    // Load saved shift start date if exists
    const savedStartDate = localStorage.getItem('plantaoStartDate');
    if (savedStartDate) {
        shiftStartDate = savedStartDate;
        shiftStartDateInput.value = shiftStartDate;
    }

    // Event Listeners
    shiftStartDateInput.addEventListener('change', (e) => {
        shiftStartDate = e.target.value;
        if (shiftStartDate) {
            localStorage.setItem('plantaoStartDate', shiftStartDate);
        } else {
            localStorage.removeItem('plantaoStartDate');
        }
        renderCalendar();
    });

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    closeModalBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveEvent);
    removeBtn.addEventListener('click', removeEvent);

    // Initial render
    renderCalendar();
}

// Render Calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Display Current Month
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;

    // Clear grid
    calendarGrid.innerHTML = '';

    // First day of month
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty cells for the start of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'day empty';
        calendarGrid.appendChild(emptyDiv);
    }

    // Calculate dates if shiftStartDate exists
    let startShiftTime = null;
    if (shiftStartDate) {
        // Parse "YYYY-MM-DD" as local time to avoid timezone offset issues 
        const [sy, sm, sd] = shiftStartDate.split('-');
        startShiftTime = new Date(sy, sm - 1, sd).getTime();
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // Generate days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        dayDiv.innerHTML = `<div class="day-number">${day}</div>`;

        // Check cycle if applicable
        if (startShiftTime !== null) {
            // Need to calculate days difference properly. Reset hours to strictly measure days.
            const currentTime = new Date(year, month, day).getTime();
            const diffTime = currentTime - startShiftTime;
            // Use Math.round to mitigate daylight saving time shifts affecting division slightly
            const diffDays = Math.round(diffTime / MS_PER_DAY);

            // Cycle formulation handling both negative and positive difference
            // In JavaScript, a % b for negative 'a' gives negative remainder. 
            // The formula ((a % b) + b) % b ensures positive remainder.
            const cyclePosition = ((diffDays % 4) + 4) % 4;

            if (cyclePosition === 0) {
                dayDiv.classList.add('shift'); // Plantão
            } else {
                dayDiv.classList.add('off'); // Folga 1, 2 e 3
            }
        }

        // Add events (badges)
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'badges';

        if (events[dateStr]) {
            const ev = events[dateStr];

            // Handle Overrides visually
            if (ev.override === 'off') {
                dayDiv.classList.remove('shift');
                dayDiv.classList.remove('off');
                dayDiv.classList.add('override-off');
                const badgeSwapOff = document.createElement('span');
                badgeSwapOff.className = 'badge swap-off';
                badgeSwapOff.textContent = `Troca`;
                badgesContainer.appendChild(badgeSwapOff);
            } else if (ev.override === 'shift') {
                dayDiv.classList.remove('shift');
                dayDiv.classList.remove('off');
                dayDiv.classList.add('override-shift');
                const badgeSwapShift = document.createElement('span');
                badgeSwapShift.className = 'badge swap-shift';
                badgeSwapShift.textContent = `A Pagar`;
                badgesContainer.appendChild(badgeSwapShift);
            }

            if (ev.overtime) {
                const badgeExtra = document.createElement('span');
                badgeExtra.className = 'badge overtime';
                badgeExtra.textContent = `${ev.overtime}h Extra`;
                badgesContainer.appendChild(badgeExtra);
            }
            if (ev.training) {
                const badgeTrain = document.createElement('span');
                badgeTrain.className = 'badge training';
                badgeTrain.textContent = `Formação`;
                badgesContainer.appendChild(badgeTrain);
            }
        }
        dayDiv.appendChild(badgesContainer);

        // Click event on day
        dayDiv.addEventListener('click', () => openModal(dateStr, day, monthNames[month], year));

        calendarGrid.appendChild(dayDiv);
    }

    updateSidebarStats(year, month);
}

// Modal Functions
function openModal(dateStr, day, monthName, year) {
    selectedDateStr = dateStr;
    modalDateTitle.textContent = `${day} de ${monthName} de ${year}`;

    // Load existing event data if any
    const ev = events[dateStr] || {};
    overtimeInput.value = ev.overtime || '';
    trainingCheck.checked = ev.training || false;
    shiftOverrideSelect.value = ev.override || 'none';

    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    selectedDateStr = null;
    overtimeInput.value = '';
    trainingCheck.checked = false;
    shiftOverrideSelect.value = 'none';
}

function saveEvent() {
    if (!selectedDateStr) return;

    const overtimeStr = overtimeInput.value.replace(',', '.');
    const overtime = parseFloat(overtimeStr);
    const training = trainingCheck.checked;
    const override = shiftOverrideSelect.value; // 'none', 'off', 'shift'

    if ((!isNaN(overtime) && overtime > 0) || training || override !== 'none') {
        events[selectedDateStr] = {};
        if (!isNaN(overtime) && overtime > 0) events[selectedDateStr].overtime = overtime;
        if (training) events[selectedDateStr].training = training;
        if (override !== 'none') events[selectedDateStr].override = override;
    } else {
        // If empty or zero, remove existing
        delete events[selectedDateStr];
    }

    saveToStorage();
    closeModal();
    renderCalendar();
}

function removeEvent() {
    if (!selectedDateStr) return;
    delete events[selectedDateStr];
    saveToStorage();
    closeModal();
    renderCalendar();
}

function saveToStorage() {
    localStorage.setItem('plantaoEvents', JSON.stringify(events));
}

// Sidebar Functions
function updateSidebarStats(year, month) {
    let totalOvertimeMonth = 0;

    // Loop through all days of the currently viewed month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (events[dateStr] && events[dateStr].overtime) {
            totalOvertimeMonth += events[dateStr].overtime;
        }
    }

    monthlyOvertimeDisplay.textContent = `${totalOvertimeMonth}h`;
}

// Close modal if clicked outside of content
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Start
document.addEventListener('DOMContentLoaded', init);
