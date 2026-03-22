/**
 * DNHS Grade Portal - AUTOMATIC UI SYNC (FIXED ORDER)
 * Programmer: James Riq Londonio
 */

// Global variable to store current semester
let currentSemester = '1st Semester';

// 1. KUKUHA NG SETTINGS MULA SA ADMIN (app_config table)
async function loadPortalSettings() {
    try {
        const { data, error } = await supabase.from('app_config').select('*');
        
        if (data) {
            data.forEach(item => {
                // I-update ang Semester Title habang pinapanatili ang Order
                if (item.key === 'current_semester') {
                    currentSemester = item.value;
                    const subTitle = document.getElementById('portalSubtitle');
                    if (subTitle) {
                        // ORDER: SY -> ONLINE GRADE VIEWER -> (new line) -> SEMESTER BADGE
                        subTitle.innerHTML = `
                            GRADE 12-TVL CSS SY 2025-2026<br>
                            <span class="static-label">ONLINE GRADE VIEWER</span><br>
                            <span class="viewer-tag">${item.value.toUpperCase()}</span>
                        `;
                    }
                }
                
                // I-update ang mga pangalan ng Subjects
                if (item.key === 'subject_names') {
                    const subjects = JSON.parse(item.value);
                    for (const id in subjects) {
                        // Update mobile labels
                        const labelEl = document.getElementById(`label-${id}`);
                        if (labelEl) {
                            labelEl.innerText = subjects[id].toUpperCase();
                        }
                        // Update desktop modal labels
                        const modalLabelEl = document.getElementById(`modal-label-${id}`);
                        if (modalLabelEl) {
                            modalLabelEl.innerText = subjects[id].toUpperCase();
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error("Config load failed:", err);
    }
}

// 2. REALTIME SUBSCRIPTION - Auto-update when admin changes settings
function setupRealtimeSubscription() {
    try {
        const channel = supabase
            .channel('app_config_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'app_config' },
                (payload) => {
                    console.log('Config changed:', payload);
                    // Reload settings when database changes
                    loadPortalSettings();
                    
                    // Show notification to user
                    if (payload.new && payload.new.key === 'current_semester') {
                        showToast(`Semester Updated: ${payload.new.value}`);
                    }
                }
            )
            .subscribe();
        
        return channel;
    } catch (err) {
        console.log('Realtime not available, using polling fallback');
        return null;
    }
}

// 3. POLLING FALLBACK - Check for updates every 30 seconds (backup for realtime)
let pollingInterval = null;
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        loadPortalSettings();
    }, 30000); // Check every 30 seconds
}

// Patakbuhin ang settings pagka-load ng page
document.addEventListener('DOMContentLoaded', () => {
    loadPortalSettings();
    setupRealtimeSubscription();
    startPolling(); // Start polling as backup
});

// 2. SEARCH LOGIC
async function handleSearch() {
    const lrnInput = document.getElementById('lrnInput');
    const lrn = lrnInput.value.trim();
    const btn = document.getElementById('searchBtn');

    if (lrn.length < 5) {
        showToast("ENTER A VALID LRN!");
        return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('access_code', lrn)
            .single();

        setTimeout(() => {
            btn.classList.remove('loading');
            btn.disabled = false;

            if (data) {
                showToast("Student Found!");
                showGrades(data);
            } else {
                showToast("LRN not found. Please double-check.");
            }
        }, 1200);

    } catch (err) {
        showToast("Database Connection Error");
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// Close modal and go back to search
function closeGradeModal() {
    const gradeModal = document.getElementById('gradeModal');
    const searchSection = document.getElementById('searchSection');
    
    if (gradeModal) {
        gradeModal.classList.add('hidden');
    }
    if (searchSection) {
        searchSection.classList.remove('hidden');
    }
    
    // Hide floating download button
    toggleDownloadButton(false);
    
    // Clear search input
    const lrnInput = document.getElementById('lrnInput');
    if (lrnInput) lrnInput.value = '';
}

// Download Grade as PDF
function downloadGradePDF() {
    // Use browser print which has Save as PDF option
    window.print();
}

// Close mobile result and go back to search
function closeMobileResult() {
    const resultSection = document.getElementById('resultSection');
    const searchSection = document.getElementById('searchSection');
    
    if (resultSection) {
        resultSection.classList.add('hidden');
    }
    if (searchSection) {
        searchSection.classList.remove('hidden');
    }
    
    // Hide floating button
    toggleDownloadButton(false);
    
    // Clear search input
    const lrnInput = document.getElementById('lrnInput');
    if (lrnInput) lrnInput.value = '';
}

// Show/hide floating download button
function toggleDownloadButton(show) {
    const btn = document.getElementById('downloadPdfBtn');
    if (btn) {
        if (show) {
            btn.style.display = 'flex';
        } else {
            btn.style.display = 'none';
        }
    }
}

// 3. DISPLAY GRADES LOGIC
function showGrades(student) {
    const searchSection = document.getElementById('searchSection');
    const resultSection = document.getElementById('resultSection');
    const gradeModal = document.getElementById('gradeModal');
    const nameEl = document.getElementById('studentName');
    const lrnEl = document.getElementById('studentLrn');
    const status = document.getElementById('statusBadge');

    const grades = [
        student.CSS, student.IMMERSION, student.CPAR, 
        student['3IS'], student['P.R-2'], student.ENTREP, student['21ST CENTURY']
    ];
    
    let total = 0, count = 0;
    grades.forEach(g => {
        const val = parseFloat(g);
        if(!isNaN(val) && val > 0) { total += val; count++; }
    });
    const finalGrade = count > 0 ? Math.round(total / count) : 0;
    const isPassed = finalGrade >= 75;

    // Check if desktop modal should be shown
    if (window.innerWidth >= 769 && gradeModal) {
        // Show desktop modal
        if (searchSection) searchSection.classList.add('hidden');
        
        // Show/hide pending overlay based on grades
        const pendingOverlay = document.getElementById('gradePendingOverlay');
        if (count === 0) {
            // No grades - show pending overlay
            if (pendingOverlay) pendingOverlay.classList.remove('hidden');
        } else {
            // Has grades - hide pending overlay
            if (pendingOverlay) pendingOverlay.classList.add('hidden');
        }
        
        // Populate modal
        document.getElementById('modalStudentName').innerText = student.student_name;
        document.getElementById('modalStudentLrn').innerText = student.access_code;
        document.getElementById('modalSemester').innerText = currentSemester;
        document.getElementById('modal-g-ave').innerText = finalGrade;
        document.getElementById('modal-final-status').innerHTML = isPassed ? 
            '<span class="grade-status passing">PASSED</span>' : 
            '<span class="grade-status failing">FAILED</span>';
        
        // Populate grades with status
        const gradeData = [
            { id: 'css', val: student.CSS },
            { id: 'immersion', val: student.IMMERSION },
            { id: 'cpar', val: student.CPAR },
            { id: 'three_is', val: student['3IS'] },
            { id: 'pr2', val: student['P.R-2'] },
            { id: 'entrep', val: student.ENTREP },
            { id: 'century21', val: student['21ST CENTURY'] }
        ];
        
        gradeData.forEach(g => {
            document.getElementById('modal-g-' + g.id).innerText = g.val || '--';
            const statusEl = document.getElementById('modal-status-' + g.id);
            if (g.val) {
                const gradeVal = parseFloat(g.val);
                statusEl.innerHTML = gradeVal >= 75 ? 
                    '<span class="grade-status passing">PASSED</span>' : 
                    '<span class="grade-status failing">FAILED</span>';
            } else {
                statusEl.innerHTML = '<span class="grade-status">--</span>';
            }
        });
        
        gradeModal.classList.remove('hidden');
    } else if (searchSection && resultSection) {
        // Show mobile result section
        searchSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        
        // Show/hide pending overlay for mobile
        const mobilePendingOverlay = document.getElementById('mobilePendingOverlay');
        if (count === 0) {
            // No grades - show pending overlay
            if (mobilePendingOverlay) mobilePendingOverlay.classList.remove('hidden');
        } else {
            // Has grades - hide pending overlay
            if (mobilePendingOverlay) mobilePendingOverlay.classList.add('hidden');
        }

        nameEl.innerText = student.student_name;
        lrnEl.innerText = "LRN: " + student.access_code;

        safeSetText('g-css', student.CSS);
        safeSetText('g-immersion', student.IMMERSION);
        safeSetText('g-cpar', student.CPAR);
        safeSetText('g-three_is', student['3IS']);
        safeSetText('g-pr2', student['P.R-2']);
        safeSetText('g-entrep', student.ENTREP);
        safeSetText('g-century21', student['21ST CENTURY']);
        safeSetText('g-ave', finalGrade);

        if(status) {
            status.innerText = isPassed ? "PASSED" : "FAILED";
            status.className = "badge-status " + (isPassed ? "passed" : "failed");
            status.style.background = isPassed ? "#10b981" : "#ef4444";
            nameEl.style.color = isPassed ? "#4A90E2" : "#ef4444";
        }
    }
}

function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = (value || value === 0) ? value : "--";
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
        toastMsg.innerText = msg;
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 3000);
    }
}