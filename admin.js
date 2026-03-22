/* DNHS ADMIN LOGIC - UPDATED
   Features: Search LRN, Dynamic Subject Labels, Semester Control
   Fix: Applied constraining properties to Constrain Sidebar Logo in CSS.
*/

// --- 1. MGA CONFIGURATION ---
const subjectIds = ['css', 'immersion', 'cpar', 'three_is', 'pr2', 'entrep', 'century21'];
let isEditMode = false;

// Mapping para sa mga columns sa database (Base sa iyong SQL at dating logic)
const dbColumnMap = {
    'css': 'CSS',
    'immersion': 'IMMERSION',
    'cpar': 'CPAR',
    'three_is': '3IS',
    'pr2': 'P.R-2',
    'entrep': 'ENTREP',
    'century21': '21ST CENTURY'
};

// --- 2. SIDEBAR & TAB NAVIGATION ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('hidden');
    if (overlay) overlay.classList.toggle('hidden');
}

function showSection(sectionId) {
    // Itago lahat ng tabs
    document.querySelectorAll('.clay-tab').forEach(tab => tab.classList.add('hidden'));
    // Ipakita ang napiling section
    const target = document.getElementById(sectionId + 'Section');
    if (target) target.classList.remove('hidden');
    
    // Update active state sa menu - handle both old and new structure
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.remove('active');
    });
    
    const activeLi = document.querySelector(`.nav-links li[data-section="${sectionId}"]`);
    if (activeLi) {
        activeLi.classList.add('active');
    }
    
    // Close sidebar sa mobile
    if (window.innerWidth < 1000) toggleSidebar();
}

// --- 3. SEARCH LRN (DATABASE FETCH) ---
async function searchToEdit() {
    const lrn = document.getElementById('searchLrn').value.trim();
    if (!lrn) return showToast("⚠️ Mangyaring ilagay ang LRN", "error");

    toggleLoading(true, "Hinahanap sa database...");

    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('access_code', lrn)
            .single();

        if (error || !data) {
            showToast("❌ Hindi mahanap ang LRN", "error");
            clearForm();
        } else {
            // I-fill ang basic info
            document.getElementById('studentName').value = data.student_name || "";
            document.getElementById('accessCode').value = data.access_code || "";
            
            // I-fill ang grades base sa database columns
            document.getElementById('css').value = data.CSS || "";
            document.getElementById('immersion').value = data.IMMERSION || "";
            document.getElementById('cpar').value = data.CPAR || "";
            document.getElementById('three_is').value = data['3IS'] || "";
            document.getElementById('pr2').value = data['P.R-2'] || "";
            document.getElementById('entrep').value = data.ENTREP || "";
            document.getElementById('century21').value = data['21ST CENTURY'] || "";
            
            computeAverage();
            isEditMode = true;
            document.getElementById('deleteBtn').classList.remove('hidden');
            document.getElementById('uploadBtn').innerText = "UPDATE STUDENT RECORD";
            showToast("✅ Record Loaded!");
        }
    } catch (err) {
        showToast("Connection Error", "error");
    } finally {
        toggleLoading(false);
    }
}

// --- 3B. SAVE/UPDATE STUDENT RECORD ---
async function handleUpload() {
    const studentName = document.getElementById('studentName').value.trim();
    const accessCode = document.getElementById('accessCode').value.trim();
    
    if (!studentName || !accessCode) {
        showToast("⚠️ Please fill in student name and LRN", "error");
        return;
    }
    
    toggleLoading(true, isEditMode ? "Updating record..." : "Saving record...");
    
    try {
        const gradeData = {
            student_name: studentName,
            access_code: accessCode,
            "CSS": parseFloat(document.getElementById('css').value) || null,
            "IMMERSION": parseFloat(document.getElementById('immersion').value) || null,
            "CPAR": parseFloat(document.getElementById('cpar').value) || null,
            "3IS": parseFloat(document.getElementById('three_is').value) || null,
            "P.R-2": parseFloat(document.getElementById('pr2').value) || null,
            "ENTREP": parseFloat(document.getElementById('entrep').value) || null,
            "21ST CENTURY": parseFloat(document.getElementById('century21').value) || null
        };
        
        let error;
        
        if (isEditMode) {
            // Update existing record
            const { error: updateError } = await supabase
                .from('students')
                .update(gradeData)
                .eq('access_code', accessCode);
            error = updateError;
        } else {
            // Insert new record
            const { error: insertError } = await supabase
                .from('students')
                .insert(gradeData);
            error = insertError;
        }
        
        if (error) {
            console.error("Database error:", error);
            showToast("❌ Error: " + error.message, "error");
        } else {
            showToast(isEditMode ? "✅ Record Updated!" : "✅ Record Saved!");
            clearForm();
        }
    } catch (err) {
        showToast("❌ Connection Error: " + err.message, "error");
    } finally {
        toggleLoading(false);
    }
}

// --- 3C. DELETE STUDENT RECORD ---
async function handleDelete() {
    const accessCode = document.getElementById('accessCode').value.trim();
    
    if (!accessCode) {
        showToast("⚠️ No student selected", "error");
        return;
    }
    
    const confirmDelete = confirm("Are you sure you want to delete this student record?\n\nLRN: " + accessCode);
    
    if (!confirmDelete) return;
    
    toggleLoading(true, "Deleting record...");
    
    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('access_code', accessCode);
        
        if (error) {
            console.error("Database error:", error);
            showToast("❌ Error: " + error.message, "error");
        } else {
            showToast("✅ Record Deleted!");
            clearForm();
        }
    } catch (err) {
        showToast("❌ Connection Error: " + err.message, "error");
    } finally {
        toggleLoading(false);
    }
}

// --- 4. SUBJECT NAMES LOGIC (ADMIN SETTINGS) ---
async function saveSubjectSettings() {
    toggleLoading(true, "Updating subject names...");
    
    const subjects = {};
    subjectIds.forEach(id => {
        subjects[id] = document.getElementById(`label-input-${id}`).value;
    });

    // First try to update, if not found then insert
    const { data: existing } = await supabase
        .from('app_config')
        .select('id')
        .eq('key', 'subject_names')
        .single();

    let error;
    if (existing && existing.id) {
        // Update existing record
        const { error: updateError } = await supabase
            .from('app_config')
            .update({ value: JSON.stringify(subjects) })
            .eq('key', 'subject_names');
        error = updateError;
    } else {
        // Insert new record
        const { error: insertError } = await supabase
            .from('app_config')
            .insert({ 
                key: 'subject_names', 
                value: JSON.stringify(subjects),
                description: 'Custom subject names',
                is_public: true,
                category: 'subjects'
            });
        error = insertError;
    }

    if (!error) {
        showToast("Subjects Updated!");
        // I-update agad ang mga labels sa UI
        subjectIds.forEach(id => {
            const lbl = document.getElementById(`lbl-${id}`);
            if (lbl) lbl.innerText = subjects[id];
        });
    } else {
        console.error("Failed to update subjects:", error);
        showToast("Failed to update: " + error.message, "error");
    }
    toggleLoading(false);
}

// --- 5. SEMESTER LOGIC ---
async function setActiveSem(sem) {
    toggleLoading(true, `Setting to ${sem}...`);
    
    // First check if record exists
    const { data: existing } = await supabase
        .from('app_config')
        .select('id')
        .eq('key', 'current_semester')
        .single();
    
    let error;
    if (existing) {
        // Update existing record
        const result = await supabase
            .from('app_config')
            .update({ value: sem })
            .eq('key', 'current_semester');
        error = result.error;
    } else {
        // Insert new record
        const result = await supabase
            .from('app_config')
            .insert({ key: 'current_semester', value: sem, is_public: true, category: 'semester' });
        error = result.error;
    }

    toggleLoading(false);
    if (!error) {
        document.querySelectorAll('.sem-opt').forEach(opt => opt.classList.remove('active'));
        if(sem === '1st Semester') document.getElementById('sem1').classList.add('active');
        else document.getElementById('sem2').classList.add('active');
        showToast(`Active: ${sem}`);
    } else {
        showToast("Error updating semester: " + error.message, "error");
    }
}

// --- 6. INITIAL LOAD & UI SETUP ---
document.addEventListener('DOMContentLoaded', async () => {
    const gradingGrid = document.getElementById('gradingInputs');
    const labelGrid = document.getElementById('subjectLabelInputs');

    // 1. Generate Inputs
    subjectIds.forEach(id => {
        if (gradingGrid) {
            gradingGrid.innerHTML += `
                <div class="field">
                    <label id="lbl-${id}">${id.toUpperCase()}</label>
                    <input type="number" id="${id}" oninput="computeAverage()" placeholder="0">
                </div>`;
        }
        if (labelGrid) {
            labelGrid.innerHTML += `
                <div class="field">
                    <input type="text" id="label-input-${id}" placeholder="Subject Name">
                </div>`;
        }
    });

    // 2. Load Config from Database
    const { data } = await supabase.from('app_config').select('*');
    if (data) {
        data.forEach(config => {
            if (config.key === 'current_semester') {
                const sem = config.value;
                if(sem === '1st Semester') document.getElementById('sem1')?.classList.add('active');
                else document.getElementById('sem2')?.classList.add('active');
            }
            if (config.key === 'subject_names') {
                const subs = JSON.parse(config.value);
                subjectIds.forEach(id => {
                    if (subs[id]) {
                        if (document.getElementById(`lbl-${id}`)) document.getElementById(`lbl-${id}`).innerText = subs[id];
                        if (document.getElementById(`label-input-${id}`)) document.getElementById(`label-input-${id}`).value = subs[id];
                    }
                });
            }
        });
    }

    // 3. Load Account Info
    loadAccountInfo();
    
    // 4. Check Dark Mode
    checkDarkMode();
});

// --- 7. UTILITIES (Compute, Toast, Clear) ---
function computeAverage() {
    let total = 0, count = 0;
    subjectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const val = parseFloat(el.value);
            if (!isNaN(val) && val > 0) { total += val; count++; }
        }
    });
    const avg = count > 0 ? Math.round(total / count) : 0;
    const el = document.getElementById('genAve');
    if (el) {
        el.value = avg || "";
        el.style.color = avg >= 75 ? "#10b981" : "#ef4444";
    }
}

function clearForm() {
    isEditMode = false;
    document.getElementById('studentName').value = "";
    document.getElementById('accessCode').value = "";
    subjectIds.forEach(id => document.getElementById(id).value = "");
    document.getElementById('genAve').value = "";
    document.getElementById('deleteBtn').classList.add('hidden');
    document.getElementById('uploadBtn').innerText = "SAVE STUDENT RECORD";
}

function toggleLoading(show, text = "Processing...") {
    const loader = document.getElementById('loadingOverlay');
    if (!loader) return;
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// 8. Toggle Password Visibility
function togglePasswordField(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// 9. Change Password Function
async function changePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const adminEmail = sessionStorage.getItem('admin_email');

    if (!newPassword || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    toggleLoading(true, 'Changing password...');

    try {
        // Call database function to update password
        const { data, error } = await supabase.rpc('change_admin_password', {
            p_email: adminEmail,
            p_new_password: newPassword
        });

        if (error) throw error;

        if (data === true) {
            showToast('Password changed successfully!');
            // Clear inputs
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            // Auto logout after 2 seconds
            setTimeout(() => {
                showToast('Logging out...');
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = window.location.pathname + '?t=' + Date.now();
            }, 2000);
        } else {
            showToast('Failed to change password', 'error');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        toggleLoading(false);
    }
}

// 10. Load Account Info
function loadAccountInfo() {
    const adminEmail = sessionStorage.getItem('admin_email');
    const emailDisplay = document.getElementById('adminEmailDisplay');
    if (emailDisplay && adminEmail) {
        emailDisplay.innerText = adminEmail;
    }
}

// 11. Dark Mode Toggle
function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById('darkModeIcon');
    const navText = document.querySelector('[data-section="darkmode"] .nav-text');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        if (navText) navText.innerText = 'Light Mode';
        localStorage.setItem('darkMode', 'enabled');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        if (navText) navText.innerText = 'Dark Mode';
        localStorage.setItem('darkMode', 'disabled');
    }
}

// 12. Check Dark Mode on Load
function checkDarkMode() {
    const darkMode = localStorage.getItem('darkMode');
    const body = document.body;
    const icon = document.getElementById('darkModeIcon');
    const navText = document.querySelector('[data-section="darkmode"] .nav-text');
    
    if (darkMode === 'enabled') {
        body.classList.add('dark-mode');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
        if (navText) navText.innerText = 'Light Mode';
    }
}

// --- 13. CSV IMPORT LOGIC ---
let csvData = [];
let csvHeaders = [];

// Initialize CSV upload handlers
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('csvFileInput');
    
    if (dropZone && fileInput) {
        // Click to browse
        dropZone.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });
    }
});

function handleFileSelect(file) {
    if (!file.name.endsWith('.csv')) {
        showToast('Please select a CSV file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseCSV(text);
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) {
        showToast('CSV file is empty or invalid', 'error');
        return;
    }
    
    // Parse headers - normalize to lowercase for matching
    csvHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate required columns
    const requiredCols = ['student_name', 'access_code'];
    const missingCols = requiredCols.filter(col => !csvHeaders.includes(col.toLowerCase()));
    if (missingCols.length > 0) {
        showToast('Missing required columns: ' + missingCols.join(', '), 'error');
        return;
    }
    
    // Parse data rows
    csvData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= 2) {
            const row = {};
            csvHeaders.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            csvData.push(row);
        }
    }
    
    if (csvData.length === 0) {
        showToast('No valid data found in CSV', 'error');
        return;
    }
    
    showPreview();
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function showPreview() {
    const preview = document.getElementById('importPreview');
    const previewCount = document.getElementById('previewCount');
    const previewTable = document.getElementById('previewTable');
    const importBtn = document.getElementById('importBtn');
    const cancelBtn = document.getElementById('cancelImportBtn');
    
    if (!preview || !previewTable) return;
    
    previewCount.innerText = csvData.length;
    
    // Build table headers
    const thead = previewTable.querySelector('thead');
    thead.innerHTML = '<tr>' + csvHeaders.map(h => '<th>' + h.toUpperCase() + '</th>').join('') + '</tr>';
    
    // Build table body (show first 10 rows max)
    const tbody = previewTable.querySelector('tbody');
    const displayData = csvData.slice(0, 10);
    tbody.innerHTML = displayData.map(row => {
        return '<tr>' + csvHeaders.map(h => '<td>' + (row[h] || '') + '</td>').join('') + '</tr>';
    }).join('');
    
    if (csvData.length > 10) {
        tbody.innerHTML += '<tr><td colspan="' + csvHeaders.length + '">... and ' + (csvData.length - 10) + ' more rows</td></tr>';
    }
    
    preview.classList.remove('hidden');
    if (importBtn) importBtn.classList.remove('hidden');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
}

function cancelImport() {
    csvData = [];
    csvHeaders = [];
    
    const preview = document.getElementById('importPreview');
    const importBtn = document.getElementById('importBtn');
    const cancelBtn = document.getElementById('cancelImportBtn');
    const fileInput = document.getElementById('csvFileInput');
    
    if (preview) preview.classList.add('hidden');
    if (importBtn) importBtn.classList.add('hidden');
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (fileInput) fileInput.value = '';
}

async function importGrades() {
    if (csvData.length === 0) {
        showToast('No data to import', 'error');
        return;
    }
    
    const progressDiv = document.getElementById('importProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const importBtn = document.getElementById('importBtn');
    const cancelBtn = document.getElementById('cancelImportBtn');
    
    if (importBtn) importBtn.classList.add('hidden');
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (progressDiv) progressDiv.classList.remove('hidden');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize);
        
        for (const row of batch) {
            try {
                const accessCode = row['access_code'] || row['access_code (lrn)'] || '';
                const studentName = row['student_name'] || row['name'] || '';
                
                if (!accessCode || !studentName) {
                    errorCount++;
                    errors.push('Missing access_code or student_name');
                    continue;
                }
                
                // Map CSV columns to database columns
                const gradeData = {
                    access_code: accessCode,
                    student_name: studentName
                };
                
                // Map grade columns
                const gradeColumns = ['css', 'immersion', 'cpar', '3is', 'p.r-2', 'entrep', '21st century'];
                const dbColumns = ['CSS', 'IMMERSION', 'CPAR', '3IS', 'P.R-2', 'ENTREP', '21ST CENTURY'];
                
                gradeColumns.forEach((col, idx) => {
                    if (row[col] !== undefined && row[col] !== '') {
                        const value = parseFloat(row[col]);
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                            gradeData[dbColumns[idx]] = value;
                        }
                    }
                });
                
                // Check if student exists
                const { data: existing } = await supabase
                    .from('students')
                    .select('id')
                    .eq('access_code', accessCode)
                    .single();
                
                if (existing && existing.id) {
                    // Update existing
                    const { error } = await supabase
                        .from('students')
                        .update(gradeData)
                        .eq('access_code', accessCode);
                    
                    if (error) {
                        errorCount++;
                        errors.push('Update error for ' + studentName);
                    } else {
                        successCount++;
                    }
                } else {
                    // Insert new
                    const { error } = await supabase
                        .from('students')
                        .insert(gradeData);
                    
                    if (error) {
                        errorCount++;
                        errors.push('Insert error for ' + studentName);
                    } else {
                        successCount++;
                    }
                }
            } catch (err) {
                errorCount++;
                errors.push(err.message);
            }
        }
        
        // Update progress
        const progress = Math.min(((i + batchSize) / csvData.length) * 100, 100);
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.innerText = 'Importing... ' + Math.min(i + batchSize, csvData.length) + ' / ' + csvData.length;
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Show result
    if (progressText) {
        progressText.innerText = 'Complete! ' + successCount + ' imported, ' + errorCount + ' errors';
    }
    
    if (successCount > 0) {
        showToast('Successfully imported ' + successCount + ' grades!');
        setTimeout(() => {
            cancelImport();
            if (progressDiv) progressDiv.classList.add('hidden');
            if (progressFill) progressFill.style.width = '0%';
        }, 2000);
    } else {
        showToast('Import failed: ' + errors.slice(0, 3).join(', '), 'error');
    }
}