/* ==========================================
   SUPABASE CORE CONFIGURATION (supabase.js)
   ========================================== */

// 1. API CONFIGURATION
const SUPABASE_URL = "https://imneikhmatqsbyytuusl.supabase.co";
const SUPABASE_KEY = "sb_publishable_C3KrBNMBWq5bpOgNAc6eTQ_p3BB1KAu"; 

// 2. INITIALIZE SUPABASE CLIENT
// Ito ang gagamitin natin sa lahat ng files (auth.js, admin.js, app.js)
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 3. Make available globally for all files
window.supabase = _supabase;
window._supabase = _supabase;

/**
 * HIGH-END WRAPPER: supabaseFetch
 * Ginagamit pa rin natin ito bilang fallback o para sa custom REST calls
 */
async function supabaseFetch(endpoint, options = {}) {
    const defaultHeaders = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal' // Efficient response handling
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Supabase REST Error:", errorData);
            throw new Error(errorData.message || "Database request failed");
        }

        return response;
    } catch (error) {
        console.error("Network/Fetch Error:", error);
        throw error;
    }
}

/**
 * AUTH CHECKER
 * High-end feature para malaman kung logged in pa ang admin
 */
async function checkAuthState() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Kung nasa admin.html tayo at walang session, pilitin bumalik sa login state
    const isLoginPage = document.getElementById('adminLoginSection');
    const isEncoderPage = document.getElementById('encoderSection');

    if (session) {
        console.log("Admin is authenticated.");
        if (isLoginPage) isLoginPage.classList.add('hidden');
        if (isEncoderPage) isEncoderPage.classList.remove('hidden');
    } else {
        console.log("No active session.");
        if (isLoginPage) isLoginPage.classList.remove('hidden');
        if (isEncoderPage) isEncoderPage.classList.add('hidden');
    }
}

// Patakbuhin ang auth check pagka-load ng page
document.addEventListener('DOMContentLoaded', checkAuthState);
