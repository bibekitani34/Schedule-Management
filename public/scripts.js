const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFT_TYPES = ['Morning', 'Afternoon', 'Evening']; 

const employeeInputsDiv = document.getElementById('employee-inputs');
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const submitPreferencesBtn = document.getElementById('submitPreferencesBtn');
const scheduleOutputDiv = document.getElementById('scheduleOutput');
const fetchScheduleBtn = document.getElementById('fetchScheduleBtn');

let employeeCount = 0; // To keep track of employees for dynamic ID generation

// Function to display error messages in the UI
function displayError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.textContent = message;
  }

// Function to add a new employee input block
function addEmployeeInput() {
    employeeCount++;
    const employeeEntryDiv = document.createElement('div');
    employeeEntryDiv.classList.add('employee-entry');
    employeeEntryDiv.dataset.employeeId = employeeCount;

    let html = `
        <div id="error-container" style="color: red;"></div>
        <h3>Employee ${employeeCount}</h3>
        <label for="employeeName${employeeCount}">Name:</label>
        <input type="text" id="employeeName${employeeCount}" placeholder="Enter employee name" required>
    `;

    DAYS_OF_WEEK.forEach(day => {
        html += `
            <label for="pref-${employeeCount}-${day}">${day} Preferred Shift:</label>
            <select id="pref-${employeeCount}-${day}" data-day="${day}">
                <option value="">-- No Preference --</option>
        `;
        SHIFT_TYPES.forEach(shift => {
            html += `<option value="${shift}">${shift}</option>`;
        });
        html += `</select>`;
    });

    employeeEntryDiv.innerHTML = html;
    employeeInputsDiv.appendChild(employeeEntryDiv);
}

// Initial employee input
addEmployeeInput();

addEmployeeBtn.addEventListener('click', addEmployeeInput);

submitPreferencesBtn.addEventListener('click', async () => {
    const employeesData = [];
    const employeeEntries = document.querySelectorAll('.employee-entry');
    let hasError = false;

    employeeEntries.forEach(entry => {
        const employeeId = entry.dataset.employeeId;
        const employeeNameInput = entry.querySelector(`#employeeName${employeeId}`);
        const employeeName = employeeNameInput.value.trim();

        if (!employeeName) {
            // alert('Please enter a name for all employees.');
            displayError('Please enter a name for all employees.');
            employeeNameInput.focus();
            hasError = true;
            return;
        }

        const preferences = {};
        DAYS_OF_WEEK.forEach(day => {
            const selectElement = entry.querySelector(`#pref-${employeeId}-${day}`);
            const selectedShift = selectElement.value;
            // Store as an array, even if it's one shift, to match backend expectation
            preferences[day] = selectedShift ? [selectedShift] : [];
        });
        employeesData.push({ name: employeeName, preferences: preferences });
    });

    if (hasError) return;

    try {
        const response = await fetch('/api/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(employeesData),
        });

        const result = await response.json();

        if (response.ok) {
            displaySchedule(result.schedule);
            fetchScheduleBtn.style.display = 'block'; // Show refresh button
        } else {
            scheduleOutputDiv.innerHTML = `<p class="error-message">Error: ${result.message || 'Failed to generate schedule.'}</p>`;
        }
    } catch (error) {
        console.error('Error submitting preferences:', error);
        scheduleOutputDiv.innerHTML = `<p class="error-message">Network error or server unavailable: ${error.message}</p>`;
    }
});

fetchScheduleBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/schedule');
        const result = await response.json();

        if (response.ok) {
            displaySchedule(result);
        } else {
            scheduleOutputDiv.innerHTML = `<p class="error-message">Error fetching schedule: ${result.message || 'No schedule found.'}</p>`;
        }
    } catch (error) {
        console.error('Error fetching schedule:', error);
        scheduleOutputDiv.innerHTML = `<p class="error-message">Network error or server unavailable: ${error.message}</p>`;
    }
});


// Function to display the schedule 
function displaySchedule(schedule) {
    if (!schedule || Object.keys(schedule).length === 0) {
        scheduleOutputDiv.innerHTML = '<p>No schedule available.</p>';
        return;
    }

    let tableHtml = '<table><thead><tr><th>Day/Shift</th>';
    SHIFT_TYPES.forEach(shift => {
        tableHtml += `<th>${shift}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    DAYS_OF_WEEK.forEach(day => {
        tableHtml += `<tr><td><strong>${day}</strong></td>`;
        SHIFT_TYPES.forEach(shift => {
            const employees = schedule[day] && schedule[day][shift] ? schedule[day][shift].join(', ') : 'N/A';
            tableHtml += `<td>${employees || '-'}</td>`;
        });
        tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    scheduleOutputDiv.innerHTML = tableHtml;
}