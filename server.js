const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFT_TYPES = ['Morning', 'Afternoon', 'Evening'];
const MAX_SHIFTS_PER_EMPLOYEE_PER_DAY = 1;
const MAX_DAYS_PER_EMPLOYEE_PER_WEEK = 5;
const MIN_EMPLOYEES_PER_SHIFT = 2;

// In-memory store for employee preferences and final schedule.
let employeePreferences = []; // Stores { name: '...', preferences: { 'Monday': ['Morning', 'Evening'], ... } }
let currentSchedule = {};    // Stores the final generated schedule

/**
 * Endpoint to receive employee preferences from the frontend.
 * This is where the scheduling process would be triggered or updated.
 */
app.post('/api/preferences', (req, res) => {
    // Expected req.body: [{ name: '...', preferences: { 'Monday': ['Morning'], ... } }]
    const newPreferences = req.body;

    if (!Array.isArray(newPreferences)) {
        return res.status(400).send('Invalid input: Expected an array of employee preferences.');
    }

    employeePreferences = newPreferences; // Overwrite for simplicity; merge in a real app

    console.log('Received Employee Preferences:', employeePreferences);

    // Trigger the scheduling logic after receiving preferences
    const scheduleResult = generateSchedule(employeePreferences);

    if (scheduleResult.success) {
        currentSchedule = scheduleResult.schedule;
        res.json({ message: 'Preferences received and schedule generated successfully!', schedule: currentSchedule });
    } else {
        res.status(500).json({ message: 'Error generating schedule: ' + scheduleResult.error });
    }
});

/**
 * Endpoint to retrieve the current schedule.
 */
app.get('/api/schedule', (req, res) => {
    if (Object.keys(currentSchedule).length === 0) {
        return res.status(404).send('No schedule has been generated yet.');
    }
    res.json(currentSchedule);
});



function generateSchedule(preferences) {
    const schedule = {}; // { 'Monday': { 'Morning': ['Employee1', 'Employee2'], ... }, ... }
    const employeeWorkDays = {}; // { 'Employee1': 0, 'Employee2': 0, ... }
    const employeeDailyShifts = {}; // { 'Employee1': { 'Monday': 'Morning' }, ... }

    // Initialize schedule for all days and shifts to empty arrays
    DAYS_OF_WEEK.forEach(day => {
        schedule[day] = {};
        SHIFT_TYPES.forEach(shift => {
            schedule[day][shift] = [];
        });
    });

    // Initialize employee tracking
    preferences.forEach(emp => {
        employeeWorkDays[emp.name] = 0;
        employeeDailyShifts[emp.name] = {};
    });

    // --- Phase 1: Assign preferred shifts ---
    DAYS_OF_WEEK.forEach(day => {
        SHIFT_TYPES.forEach(shift => {
            preferences.forEach(emp => {
                const empName = emp.name;
                const preferredShiftsForDay = emp.preferences[day] || [];

                // Check if employee prefers this shift on this day AND
                // has not worked max days AND
                // has not worked a shift on this day yet AND
                // this shift isn't already full with 2 preferred employees (prioritize 2 preferred)
                if (preferredShiftsForDay.includes(shift) &&
                    employeeWorkDays[empName] < MAX_DAYS_PER_EMPLOYEE_PER_WEEK &&
                    !employeeDailyShifts[empName][day] &&
                    schedule[day][shift].length < MIN_EMPLOYEES_PER_SHIFT)
                {
                    schedule[day][shift].push(empName);
                    employeeWorkDays[empName]++;
                    employeeDailyShifts[empName][day] = shift;
                }
            });
        });
    });


    let madeChanges;
    do {
        madeChanges = false;
        DAYS_OF_WEEK.forEach(day => {
            SHIFT_TYPES.forEach(shift => {
                while (schedule[day][shift].length < MIN_EMPLOYEES_PER_SHIFT) {
                    // Find an unassigned employee who can work
                    let assigned = false;
                    for (const emp of preferences) {
                        const empName = emp.name;

                        if (employeeWorkDays[empName] < MAX_DAYS_PER_EMPLOYEE_PER_WEEK && // Less than 5 days worked
                            !employeeDailyShifts[empName][day] && // Not assigned to this day
                            !schedule[day][shift].includes(empName) // Not already in this shift
                        ) {
                            // Assign this employee
                            schedule[day][shift].push(empName);
                            employeeWorkDays[empName]++;
                            employeeDailyShifts[empName][day] = shift;
                            madeChanges = true;
                            assigned = true;
                            break; 
                        }
                    }
                    if (!assigned) {
                        console.warn(`Could not fill ${shift} on ${day}. Understaffed.`);
                        break;
                    }
                }
            });
        });
    } while (madeChanges); 

    return { success: true, schedule: schedule };
}


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Frontend accessible at http://localhost:${port}/index.html`);
});