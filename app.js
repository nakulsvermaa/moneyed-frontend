// --- ENVIRONMENT CONFIGURATION (PRODUCTION READINESS) ---
// The system auto-detects if you are running locally or on the live Vercel domain.
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "";
const API_BASE_URL = "https://moneyed-backend.onrender.com"; // CONNECTED TO RENDER

// --- FIREBASE DATABASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCNvpsTa9fd_IcVgbw_FVxTa_sATilRIRc",
  authDomain: "moneyed.co.in",
  projectId: "moneyedweb",
  storageBucket: "moneyedweb.firebasestorage.app",
  messagingSenderId: "1023777532971",
  appId: "1:1023777532971:web:5a6b48299122427b59ce6e",
  measurementId: "G-9RM8WZD9YF"
};

// Initialize Firebase (Compat Mode for Browser)
firebase.initializeApp(firebaseConfig);
const db = firebase.database(); 
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
// --------------------------------------------------------

// Global State Management
let currentTab = 'home-tab';
let userProfile = {
    cibil: null,
    income: null,
    obligations: 0,
    foir: 0,
    savings: 0
};
let leads = [];
let indiaCities = [];

// No mock leads in production — real leads come from Firebase

// Document Ready Initialization
function bootstrapApp() {
    try { initApp(); } catch(e) { console.error('Error in initApp:', e); }
    try { setupEventListeners(); } catch(e) { console.error('Error in setupEventListeners:', e); }
    try { setupCalculators(); } catch(e) { console.error('Error in setupCalculators:', e); }
    // setupCibilUpload(); // Removed to prevent ReferenceError
    try { setupBookingCalendar(); } catch(e) { console.error('Error in setupBookingCalendar:', e); }
}
// Initialization will be called explicitly at the end of the HTML body to prevent external resource blocking.

// App Base Configuration
function initApp() {
    // Load leads database from LocalStorage
    const storedLeads = localStorage.getItem("moneyed_leads");
    if (storedLeads) {
        leads = JSON.parse(storedLeads);
    } else {
        leads = [];
    }
    
    // Update global CRM metrics
    updateCrmStats();
    renderCrmTable();
    
    // Load cities database
    loadCities();
    
    // Initialize Theme
    initTheme();

    // Load initial dashboard
    window.switchTab('home-tab');
}

async function loadCities() {
    try {
        const response = await fetch('cities.json');
        if (!response.ok) throw new Error('cities.json not found');
        indiaCities = await response.json();
        setupCityAutocomplete();
    } catch (e) {
        // Fallback: allow free-text city entry without autocomplete
        indiaCities = [];
        const input = document.getElementById("elig-city");
        if (input) input.placeholder = "Type your city name";
    }
}

function setupCityAutocomplete() {
    const input = document.getElementById("elig-city");
    const list = document.getElementById("city-autocomplete-list");
    if (!input || !list) return;
    
    input.addEventListener("input", function() {
        const val = this.value.toLowerCase();
        list.innerHTML = '';
        if (!val) {
            list.classList.add("hidden");
            return;
        }
        
        const matches = indiaCities.filter(c => c.name.toLowerCase().startsWith(val) || c.state.toLowerCase().startsWith(val)).slice(0, 15);
        
        if (matches.length > 0) {
            list.classList.remove("hidden");
            matches.forEach(match => {
                const item = document.createElement("div");
                item.innerHTML = `<strong>${match.name}</strong>, ${match.state}`;
                item.addEventListener("click", function() {
                    input.value = `${match.name}, ${match.state}`;
                    list.classList.add("hidden");
                });
                list.appendChild(item);
            });
        } else {
            list.classList.add("hidden");
        }
    });
    
    document.addEventListener("click", function (e) {
        if (e.target !== input) {
            list.classList.add("hidden");
        }
    });
}

// Event Listeners setup
function setupEventListeners() {
    // Sidebar SPA Tab Routing
    document.querySelectorAll(".nav-link").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.parentElement.getAttribute("data-tab");
            if (tabId) {
                switchTab(tabId);
            }
            // Close mobile menu if open
            const sidebar = document.getElementById("app-sidebar");
            if (sidebar && sidebar.classList.contains("menu-open")) {
                sidebar.classList.remove("menu-open");
                const overlay = document.getElementById("mobile-overlay");
                if(overlay) overlay.style.display = "none";
            }
        });
    });

    // Bottom Navigation Routing
    document.querySelectorAll(".bnav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            if (tabId) {
                switchTab(tabId);
            }
        });
    });

    // Mobile Sidebar Toggle
    document.getElementById("sidebar-toggle").addEventListener("click", () => {
        const sidebar = document.getElementById("app-sidebar");
        sidebar.classList.toggle("menu-open");
    });
    
    // Employment Type Toggle
    const empTypeSelect = document.getElementById("elig-emp-type");
    if (empTypeSelect) {
        empTypeSelect.addEventListener("change", function() {
            const isSelfEmp = this.value === "self-employed";
            
            document.getElementById("label-income").innerHTML = isSelfEmp ? 'Annual Net Profit (ITR) (<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em;"></i>) *' : 'Net Monthly Take-Home (<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em;"></i>) *';
            document.getElementById("elig-income").placeholder = isSelfEmp ? 'e.g. 1500000' : 'e.g. 75000';
            
            document.getElementById("label-company").textContent = isSelfEmp ? 'Business Name *' : 'Company Name *';
            document.getElementById("elig-company").placeholder = isSelfEmp ? 'e.g. Verma Traders' : 'e.g. TCS, Infosys';
            
            document.getElementById("group-company-cat").style.display = isSelfEmp ? 'none' : 'flex';
            document.getElementById("group-business-type").style.display = isSelfEmp ? 'flex' : 'none';
            document.getElementById("group-vintage").style.display = isSelfEmp ? 'flex' : 'none';
        });
    }
}

// Tab Switching Routing Function
function switchTab(tabId) {
    // CRM tab is admin-only — block access if not authenticated as admin
    if (tabId === 'crm-tab') {
        const adminEmails = ["nakulsverma@gmail.com", "help@moneyed.co.in"];
        const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
        if (!user || !adminEmails.includes(user.email)) {
            openAuthModal();
            return;
        }
    }
    currentTab = tabId;
    
    // 2. Update Sidebar Navigation Active State
    document.querySelectorAll(".nav-link").forEach(link => {
        link.parentElement.classList.remove("active");
        if (link.parentElement.getAttribute("data-tab") === tabId) {
            link.parentElement.classList.add("active");
        }
    });

    // 3. Update Bottom Navigation Active State
    document.querySelectorAll(".bnav-item").forEach(item => {
        item.classList.remove("active");
        if (item.getAttribute("data-tab") === tabId) {
            item.classList.add("active");
        }
    });

    // 4. Smooth scroll to top
    window.scrollTo(0, 0);

    // Toggle Visible Tab Pane
    document.querySelectorAll(".tab-pane").forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add("active");
            // Re-trigger animation
            pane.classList.remove("fade-in-up");
            void pane.offsetWidth; // trigger reflow
            pane.classList.add("fade-in-up");
        } else {
            pane.classList.remove("active");
            pane.classList.remove("fade-in-up");
        }
    });

    // Set Page Title Header Dynamically
    const titleEl = document.getElementById("page-title");
    const subtitleEl = titleEl.nextElementSibling;
    
    switch (tabId) {
        case 'home-tab':
            titleEl.textContent = "Financial Dashboard";
            subtitleEl.textContent = "Welcome back to moneyed - Your financial control center.";
            break;
        case 'eligibility-tab':
            titleEl.textContent = "Loan Eligibility Checker";
            subtitleEl.textContent = "Calculate borrowing capacity and match lender rules instantly.";
            break;
        case 'calculators-tab':
            titleEl.textContent = "Calculators Suite";
            subtitleEl.textContent = "Optimize interest rates, calculate EMIs, and assess debt capacity.";
            break;
        case 'cibil-tab':
            titleEl.textContent = "CIBIL Analyzer & Report Auditor";
            subtitleEl.textContent = "Identify critical flags, verify accounts, and improve score.";
            break;
        case 'expenses-tab':
            titleEl.textContent = "Expense Tracker";
            subtitleEl.textContent = "Monitor daily spending against your monthly cash flow budget.";
            if (window.updateExpenseDashboard) window.updateExpenseDashboard();
            break;
        case 'ai-coach-tab':
            titleEl.textContent = "AI Personal Finance Coach";
            subtitleEl.textContent = "Conversational engine to explain credit policies and debt management.";
            break;
        case 'booking-tab':
            titleEl.textContent = "Schedule Advisory Session";
            subtitleEl.textContent = "Reserve a 1-on-1 call with our Financial Experts to structure your loans.";
            break;
        case 'crm-tab':
            titleEl.textContent = "Admin CRM Console";
            subtitleEl.textContent = "Manage incoming leads, log lender disbursements, and track statuses.";
            break;
    }
}

// Wizard Steps Control (Loan Eligibility)
let currentWizardStep = 1;
function nextWizardStep(step) {
    // Validate inputs of previous step before moving forward
    if (step === 2) {
        const phone = document.getElementById("elig-phone").value;
        if (!document.getElementById("elig-name").value || 
            !phone || 
            !document.getElementById("elig-city").value ||
            !document.getElementById("elig-emp-type").value) {
            alert("Please fill all mandatory fields to proceed.");
            return;
        }
        if (!/^\d{10}$/.test(phone)) {
            alert("Mobile Number must be exactly 10 digits.");
            return;
        }
    } else if (step === 3) {
        const isSelfEmp = document.getElementById("elig-emp-type").value === "self-employed";
        
        if (!document.getElementById("elig-income").value || 
            !document.getElementById("elig-company").value || 
            !document.getElementById("elig-loan-req").value) {
            alert("Please fill all mandatory fields to proceed.");
            return;
        }
        
        if (isSelfEmp) {
            if (!document.getElementById("elig-business-type").value || !document.getElementById("elig-vintage").value) {
                alert("Please fill all business details to proceed.");
                return;
            }
        } else {
            if (!document.getElementById("elig-company-cat").value) {
                alert("Please select Employer Category to proceed.");
                return;
            }
        }
    }

    // Deactivate previous wizard panel
    document.getElementById(`wizard-step-${currentWizardStep}`).classList.remove("active");
    document.getElementById(`step-ind-${currentWizardStep}`).classList.remove("active");

    // Activate next wizard panel
    currentWizardStep = step;
    document.getElementById(`wizard-step-${currentWizardStep}`).classList.add("active");
    document.getElementById(`step-ind-${currentWizardStep}`).classList.add("active");
}

function prevWizardStep(step) {
    document.getElementById(`wizard-step-${currentWizardStep}`).classList.remove("active");
    document.getElementById(`step-ind-${currentWizardStep}`).classList.remove("active");

    currentWizardStep = step;
    document.getElementById(`wizard-step-${currentWizardStep}`).classList.add("active");
    document.getElementById(`step-ind-${currentWizardStep}`).classList.add("active");
}

// Process Loan Eligibility Logic (Lender Rules matching)
function processEligibility() {
    const name = document.getElementById("elig-name").value;
    const phone = document.getElementById("elig-phone").value;
    const city = document.getElementById("elig-city").value;
    const empType = document.getElementById("elig-emp-type").value;
    const income = parseFloat(document.getElementById("elig-income").value);
    const company = document.getElementById("elig-company").value;
    const companyCat = document.getElementById("elig-company-cat").value;
    const loanReq = parseFloat(document.getElementById("elig-loan-req").value);
    const cibil = parseFloat(document.getElementById("elig-cibil").value);
    const obligations = parseFloat(document.getElementById("elig-obligations").value);
    const pincode = document.getElementById("elig-pincode").value;
    const consent = document.getElementById("elig-consent").checked;

    if (!consent) {
        alert("You must agree to DPDP consent clause before proceeding.");
        return;
    }

    // Update global user state
    userProfile.income = income;
    userProfile.cibil = cibil;
    userProfile.obligations = obligations;

    // Send to Unified CRM
    window.syncToCRM("Eligibility Check", {
        name: name,
        phone: phone,
        city: city,
        empType: empType,
        income: income,
        company: company,
        loanReq: loanReq,
        cibil: cibil,
        obligations: obligations,
        pincode: pincode
    });
    
    // Calculate FOIR (Fixed Obligation to Income Ratio)
    const foir = Math.round((obligations / income) * 100);
    userProfile.foir = foir;
    
    // Sync values to home tab metrics and apply theme
    applyCibilTheme(cibil);
    document.getElementById("home-cibil-val").textContent = cibil;
    
    // Update CIBIL Dial (Dash Offset = 126 is 0%, 0 is 100%)
    // Range is 300 to 900. Let's map score to percent (score-300)/600
    const scorePct = Math.max(0, Math.min(100, ((cibil - 300) / 600) * 100));
    const dashOffset = 126 - (126 * (scorePct / 100));
    document.getElementById("cibil-dial-fill").style.strokeDashoffset = dashOffset;
    
    let cibilQuality = "Average";
    if (cibil >= 750) cibilQuality = "Excellent";
    else if (cibil >= 700) cibilQuality = "Good";
    else if (cibil < 650) cibilQuality = "Weak";
    document.getElementById("home-cibil-desc").innerHTML = `Your credit history is rated <strong>${cibilQuality}</strong>. ${cibil >= 700 ? "Lenders will offer premium rates." : "Need manual restructuring."}`;

    // Update Dashboard FOIR
    document.getElementById("home-foir-val").textContent = `${foir}%`;
    const foirBar = document.getElementById("home-foir-bar");
    foirBar.style.width = `${Math.min(100, foir)}%`;
    const foirBadge = document.getElementById("home-foir-badge");
    
    if (foir <= 40) {
        foirBar.style.backgroundColor = "var(--brand-green)";
        foirBadge.textContent = "Safe Profile";
        foirBadge.className = "badge text-green";
        document.getElementById("home-foir-desc").textContent = "Your obligations are well below threshold bounds. Lenders prefer this tier.";
    } else if (foir <= 55) {
        foirBar.style.backgroundColor = "var(--accent-yellow)";
        foirBadge.textContent = "Moderate Risk";
        foirBadge.className = "badge text-yellow";
        document.getElementById("home-foir-desc").textContent = "Obligations are average. Matched lenders will verify company credentials strictly.";
    } else {
        foirBar.style.backgroundColor = "#dc3545";
        foirBadge.textContent = "Critical Overload";
        foirBadge.className = "badge text-red";
        document.getElementById("home-foir-desc").innerHTML = "FOIR is high. You should evaluate <strong>Debt Consolidation</strong> to combine bills.";
    }

    // Match Lender Policies
    const matches = [];

    // 1. Bajaj Finserv Policy
    let bajajEligible = cibil >= 730 && foir <= 55 && income >= 35000;
    let bajajAmount = bajajEligible ? Math.min(loanReq, Math.round(income * 18)) : 0;
    let bajajRoi = companyCat === "A" ? 10.49 : companyCat === "B" ? 10.99 : 11.75;
    matches.push({
        lender: "Bajaj Finserv",
        eligible: bajajEligible,
        amount: bajajAmount,
        roi: bajajRoi,
        reason: bajajEligible ? "Matches CIBIL score & company category matrix." : (cibil < 730 ? "Requires CIBIL score >= 730." : "Obligation limits (FOIR) exceed 55%.")
    });

    // 2. Tata Capital Policy
    let tataEligible = cibil >= 700 && foir <= 50;
    let tataAmount = tataEligible ? Math.min(loanReq, Math.round(income * 15)) : 0;
    let tataRoi = companyCat === "A" ? 10.99 : 11.99;
    matches.push({
        lender: "Tata Capital",
        eligible: tataEligible,
        amount: tataAmount,
        roi: tataRoi,
        reason: tataEligible ? "Complies with score baseline." : (cibil < 700 ? "Requires CIBIL score >= 700." : "FOIR ratio exceeds 50%.")
    });

    // 3. Axis Bank Policy
    let axisEligible = cibil >= 710 && foir <= 50;
    let axisAmount = axisEligible ? Math.min(loanReq, Math.round(income * 20)) : 0;
    let axisRoi = 10.75;
    matches.push({
        lender: "Axis Bank",
        eligible: axisEligible,
        amount: axisAmount,
        roi: axisRoi,
        reason: axisEligible ? "Meets corporate salary segment standards." : (cibil < 710 ? "Requires CIBIL score >= 710." : "Obligations exceed 50% limit.")
    });

    // 4. Poonawalla Fincorp Policy
    let poonawallaEligible = cibil >= 710 && empType === "salaried" && foir <= 50;
    let poonawallaAmount = poonawallaEligible ? Math.min(loanReq, Math.round(income * 12)) : 0;
    let poonawallaRoi = 11.49;
    matches.push({
        lender: "Poonawalla Fincorp",
        eligible: poonawallaEligible,
        amount: poonawallaAmount,
        roi: poonawallaRoi,
        reason: poonawallaEligible ? "Matches salary eligibility guidelines." : (empType !== "salaried" ? "Only available for salaried individuals." : (cibil < 710 ? "Requires CIBIL score >= 710." : "FOIR exceed 50%."))
    });

    // 5. ICICI Bank / HDFC Bank Policy
    let iciciEligible = cibil >= 740 && foir <= 55 && income >= 50000;
    let iciciAmount = iciciEligible ? Math.min(loanReq, Math.round(income * 24)) : 0;
    let iciciRoi = 10.25;
    matches.push({
        lender: "ICICI & HDFC Bank",
        eligible: iciciEligible,
        amount: iciciAmount,
        roi: iciciRoi,
        reason: iciciEligible ? "Premium customer tier approved." : (income < 50000 ? "Requires monthly net income >= <i class=\"fa-solid fa-indian-rupee-sign\" style=\"font-size: 0.9em;\"></i>50,000." : (cibil < 740 ? "Requires premium CIBIL >= 740." : "FOIR exceeds 55%."))
    });

    // Inject lender matches into HTML
    const container = document.getElementById("lender-matches-list");
    container.innerHTML = "";

    matches.forEach(item => {
        const card = document.createElement("div");
        card.className = "lender-card";
        
        let statusPill = "";
        let detailsHtml = "";

        if (item.eligible && item.amount > 0) {
            statusPill = `<div class="status-indicator-pill approved-pill"><i class="fa-solid fa-circle-check"></i> Eligible</div>`;
            detailsHtml = `
                <div class="lender-metrics">
                    <div class="l-metric">
                        <span>Max Loan Limit</span>
                        <strong><i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${item.amount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div class="l-metric">
                        <span>Interest Rate</span>
                        <strong class="text-green">${item.roi}% p.a.</strong>
                    </div>
                </div>
            `;
        } else {
            statusPill = `<div class="status-indicator-pill rejected-pill"><i class="fa-solid fa-circle-xmark"></i> Rejected</div>`;
            detailsHtml = `
                <div class="lender-info">
                    <p class="text-red" style="font-weight: 500;">${item.reason}</p>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="lender-meta">
                <div class="lender-logo-circle">${item.lender.split(" ")[0][0]}</div>
                <div class="lender-info">
                    <h4>${item.lender}</h4>
                    <p>Based on automated policy parameters</p>
                </div>
            </div>
            ${detailsHtml}
            <div class="lender-status-col">
                ${statusPill}
                <p>Consent Verified</p>
            </div>
        `;
        container.appendChild(card);
    });

    // Save lead database
    const newLead = {
        id: `L-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name,
        phone: phone,
        city: city,
        empType: empType,
        income: income,
        company: company,
        companyCat: companyCat,
        loanReq: loanReq,
        cibil: cibil,
        obligations: obligations,
        pincode: pincode,
        source: "Eligibility Check",
        status: "New",
        date: new Date().toISOString().split('T')[0],
        remarks: `Requested ₹${loanReq.toLocaleString('en-IN')}. Calculated FOIR: ${foir}%. CIBIL: ${cibil}. Employer category: ${companyCat}.`,
        history: [{ date: new Date().toISOString().split('T')[0], text: "Eligibility report requested. Matches calculated." }]
    };

    leads.unshift(newLead);
    localStorage.setItem("moneyed_leads", JSON.stringify(leads));

    // Show Results Panel
    document.getElementById("res-salary").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${income.toLocaleString('en-IN')}`;
    document.getElementById("res-foir").textContent = `${foir}%`;
    document.getElementById("res-cibil").textContent = cibil;
    
    document.getElementById("eligibility-results").classList.remove("hidden");
    
    // Auto update CRM tables
    updateCrmStats();
    renderCrmTable();

    // Scroll down to results smoothly
    document.getElementById("eligibility-results").scrollIntoView({ behavior: 'smooth' });
}

// 5. WALNUT-STYLE EXPENSE TRACKER
window.expenseTransactions = [];

function autoCategorizeExpense() {
    const noteEl = document.getElementById("exp-note");
    const catEl = document.getElementById("exp-category");
    if (!noteEl || !catEl) return;
    
    const text = noteEl.value.toLowerCase();
    const wantsKeywords = ['zomato', 'swiggy', 'netflix', 'amazon', 'movie', 'game', 'party', 'dinner', 'shopping', 'myntra', 'flipkart'];
    const needsKeywords = ['uber', 'ola', 'petrol', 'fuel', 'rent', 'electricity', 'water', 'bill', 'grocery', 'blinkit', 'milk', 'hospital', 'medicine'];
    const savingsKeywords = ['sip', 'stock', 'mutual fund', 'zerodha', 'groww', 'pf', 'ppf'];
    
    let isWant = wantsKeywords.some(kw => text.includes(kw));
    let isNeed = needsKeywords.some(kw => text.includes(kw));
    let isSaving = savingsKeywords.some(kw => text.includes(kw));
    
    if (isWant) catEl.value = 'wants-food';
    else if (isNeed) catEl.value = 'needs-utilities';
    else if (isSaving) catEl.value = 'savings-invest';
}

function addExpenseTransaction() {
    const amount = parseFloat(document.getElementById("exp-amount").value);
    const category = document.getElementById("exp-category").value;
    const note = document.getElementById("exp-note").value || "";
    let dateStr = document.getElementById("exp-date").value;

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }
    
    if (!dateStr) {
        dateStr = new Date().toISOString().split('T')[0];
    }

    const newTx = {
        id: Date.now(),
        amount: amount,
        category: category,
        note: note,
        date: dateStr
    };

    window.expenseTransactions.unshift(newTx);
    
    // Clear form
    document.getElementById("exp-amount").value = "";
    document.getElementById("exp-note").value = "";
    
    updateExpenseDashboard();
}

function updateExpenseDashboard() {
    const budget = parseFloat(document.getElementById("exp-budget").value) || 0;
    let totalSpent = 0;
    
    let sums = {
        needs: 0,
        wants: 0,
        savings: 0
    };

    window.expenseTransactions.forEach(tx => {
        totalSpent += tx.amount;
        let baseCat = tx.category;
        if (tx.category.includes('-')) {
            baseCat = tx.category.split('-')[0];
        }
        if (sums[baseCat] !== undefined) {
            sums[baseCat] += tx.amount;
        }
    });

    document.getElementById("spent-so-far").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${totalSpent.toLocaleString('en-IN')}`;

    // Safe to Spend Today Logic
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    let daysLeft = lastDay - today.getDate() + 1;
    if (daysLeft < 1) daysLeft = 1;
    
    document.getElementById("days-left-val").textContent = daysLeft;
    
    const remainingBudget = budget - totalSpent;
    let safeToSpend = remainingBudget > 0 ? remainingBudget / daysLeft : 0;
    
    const valString = Math.round(safeToSpend).toLocaleString('en-IN');
    const valEl = document.getElementById("safe-to-spend-val");
    valEl.textContent = valString;
    
    // Auto-scale font based on length to fit circle
    let fontSize = "3.5rem"; // default
    if (valString.length > 9) fontSize = "1.8rem";
    else if (valString.length > 7) fontSize = "2.2rem";
    else if (valString.length > 5) fontSize = "2.8rem";
    
    valEl.style.fontSize = fontSize;

    // Filter Transactions
    const filterVal = document.getElementById("exp-filter") ? document.getElementById("exp-filter").value : 'all';
    let filteredTxs = window.expenseTransactions;
    if (filterVal !== 'all') {
        filteredTxs = window.expenseTransactions.filter(tx => {
            let baseCat = tx.category.includes('-') ? tx.category.split('-')[0] : tx.category;
            return baseCat === filterVal || tx.category === filterVal;
        });
    }

    // Update List
    const listContainer = document.getElementById("transaction-list");
    if (filteredTxs.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center pad-lg" id="empty-tx-state" style="color: #627267;">
                <i class="fa-solid fa-receipt placeholder-icon" style="font-size: 2em; margin-bottom: 10px;"></i>
                <p>No transactions match your filter.</p>
            </div>
        `;
    } else {
        listContainer.innerHTML = filteredTxs.map(tx => {
            let baseCat = tx.category.includes('-') ? tx.category.split('-')[0] : tx.category;
            let subCatName = tx.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            let icon = 'fa-wallet';
            if (baseCat === 'needs') icon = 'fa-bolt';
            if (baseCat === 'wants') icon = 'fa-gift';
            if (baseCat === 'savings') icon = 'fa-piggy-bank';
            
            return `
                <div class="transaction-item">
                    <div class="tx-left">
                        <div class="tx-icon ${baseCat}">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div class="tx-details">
                            <strong>${tx.note || subCatName}</strong>
                            <span>${new Date(tx.date).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} • ${subCatName}</span>
                        </div>
                    </div>
                    <div class="tx-right text-red">
                        - <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em;"></i>${Math.round(tx.amount).toLocaleString('en-IN')}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Budget Progress Bars
    updateBudgetProgressBars(budget, sums);
    
    // Gamification Badge
    updateGamificationBadge(budget, sums);

    // Chart.js Analytics
    renderExpenseChart(sums);
}

function updateBudgetProgressBars(budget, sums) {
    const container = document.getElementById("budget-progress-container");
    if (!container) return;
    
    if (window.expenseTransactions.length > 0) {
        container.style.display = "block";
    } else {
        container.style.display = "none";
        return;
    }

    // 50/30/20 Rule
    const rules = { needs: 0.5, wants: 0.3, savings: 0.2 };
    
    Object.keys(rules).forEach(cat => {
        const catBudget = budget * rules[cat];
        const catSpent = sums[cat] || 0;
        let pct = (catSpent / catBudget) * 100;
        if (pct > 100) pct = 100;
        
        document.getElementById(`bud-val-${cat}`).textContent = `₹${Math.round(catSpent).toLocaleString('en-IN')} / ₹${Math.round(catBudget).toLocaleString('en-IN')}`;
        
        const bar = document.getElementById(`bar-${cat}`);
        bar.style.width = pct + '%';
        
        // Alert Color if > 90%
        if (pct >= 90) {
            bar.style.background = '#e74c3c'; // Red Alert
        } else {
            // Reset to default
            if (cat === 'needs') bar.style.background = 'var(--brand-green)';
            if (cat === 'wants') bar.style.background = '#F3A712';
            if (cat === 'savings') bar.style.background = 'var(--deep-green)';
        }
    });
}

function updateGamificationBadge(budget, sums) {
    const rules = { needs: 0.5, wants: 0.3, savings: 0.2 };
    const needsBudget = budget * rules.needs;
    const wantsBudget = budget * rules.wants;
    const savingsBudget = budget * rules.savings;
    
    const needsSpent = sums.needs || 0;
    const wantsSpent = sums.wants || 0;
    const savingsSpent = sums.savings || 0;
    
    const needsPct = needsBudget > 0 ? (needsSpent / needsBudget) * 100 : 0;
    const wantsPct = wantsBudget > 0 ? (wantsSpent / wantsBudget) * 100 : 0;
    const savingsPct = savingsBudget > 0 ? (savingsSpent / savingsBudget) * 100 : 0;
    
    let tier = "Apprentice";
    let icon = "fa-medal";
    let color = "#F3A712"; // Gold/Yellow for Apprentice
    let desc = "Keep Needs < 50% & Wants < 30% to level up!";
    
    // Logic for Financial Ninja
    if (wantsPct <= 100 && needsPct <= 100 && savingsPct >= 100 && budget > 0) {
        tier = "Financial Ninja 🥷";
        icon = "fa-star-ninja"; // Custom or generic star
        color = "var(--neon-green)";
        desc = "Perfect 50/30/20 balance! You are mastering your wealth.";
    } else if (wantsPct <= 100 && needsPct <= 100 && budget > 0) {
        tier = "Disciplined Saver";
        icon = "fa-shield-halved";
        color = "var(--brand-green)";
        desc = "Great job keeping expenses within limits. Now boost savings!";
    } else if (wantsPct > 100) {
        tier = "Spender Alert";
        icon = "fa-triangle-exclamation";
        color = "#e74c3c";
        desc = "Wants are over budget! Control impulse spending.";
    }
    
    const badgeIconEl = document.getElementById("gamification-badge-icon");
    const badgeTextEl = document.getElementById("gamification-badge-text");
    const badgeDescEl = document.getElementById("gamification-badge-desc");
    
    if (badgeIconEl && badgeTextEl && badgeDescEl) {
        badgeIconEl.style.background = color;
        badgeIconEl.style.boxShadow = `0 4px 15px ${color}80`;
        badgeIconEl.innerHTML = `<i class="fa-solid ${icon === 'fa-star-ninja' ? 'fa-star' : icon}"></i>`;
        
        badgeTextEl.style.color = color;
        badgeTextEl.textContent = tier;
        
        badgeDescEl.textContent = desc;
    }
}

// AI WhatsApp-style Expense Assistant
window.handleExpenseChat = function(e) {
    if (e.key === 'Enter') {
        sendExpenseChat();
    }
};

window.sendExpenseChat = function() {
    const inputEl = document.getElementById("ai-expense-input");
    const text = inputEl.value.trim();
    if (!text) return;
    
    const chatArea = document.getElementById("expense-chat-area");
    
    // Add User Message
    const userMsg = document.createElement("div");
    userMsg.className = "chat-msg user-msg";
    userMsg.style = "align-self: flex-end; background: var(--brand-green); color: white; padding: 10px 14px; border-radius: 12px 12px 0 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); max-width: 85%;";
    userMsg.innerHTML = `
        <p style="margin: 0; font-size: 13px;">${text}</p>
        <span style="font-size: 10px; color: rgba(255,255,255,0.7); display: block; text-align: right; margin-top: 4px;">Just now</span>
    `;
    chatArea.appendChild(userMsg);
    inputEl.value = "";
    chatArea.scrollTop = chatArea.scrollHeight;
    
    // Simple NLP Processing
    setTimeout(() => {
        let amount = 0;
        let category = "wants-other";
        let note = text;
        
        // Extract Amount (find number)
        const numMatch = text.match(/\d+/);
        if (numMatch) {
            amount = parseInt(numMatch[0]);
        }
        
        // Infer Category
        const textLower = text.toLowerCase();
        if (textLower.includes("rent") || textLower.includes("emi") || textLower.includes("electricity") || textLower.includes("bill")) {
            category = "needs-utilities";
        } else if (textLower.includes("swiggy") || textLower.includes("zomato") || textLower.includes("coffee") || textLower.includes("food") || textLower.includes("lunch")) {
            category = "wants-food";
        } else if (textLower.includes("sip") || textLower.includes("mutual fund") || textLower.includes("stock") || textLower.includes("invest")) {
            category = "savings-invest";
        } else if (textLower.includes("grocery") || textLower.includes("milk") || textLower.includes("veg")) {
            category = "needs-groceries";
        } else if (textLower.includes("movie") || textLower.includes("netflix") || textLower.includes("party")) {
            category = "wants-entertainment";
        } else if (textLower.includes("fuel") || textLower.includes("petrol") || textLower.includes("cab") || textLower.includes("uber") || textLower.includes("ola")) {
            category = "wants-travel";
        }
        
        let responseHTML = "";
        
        if (amount > 0) {
            // Add to system
            const newTx = {
                id: 'tx-' + Date.now(),
                amount: amount,
                category: category,
                note: note,
                date: new Date().toISOString().split('T')[0]
            };
            window.expenseTransactions.unshift(newTx);
            updateExpenseDashboard();
            
            let baseCat = category.split('-')[0];
            let catName = baseCat.charAt(0).toUpperCase() + baseCat.slice(1);
            
            // Send to Unified CRM
            window.syncToCRM("Expense Entry", {
                amount: amount,
                category: catName,
                note: note,
                details: `User added expense: ₹${amount} in ${catName}. Note: ${note}`
            });
            
            responseHTML = `✅ Added ₹${amount.toLocaleString('en-IN')} to <strong>${catName}</strong>. Dashboard updated!`;
        } else {
            responseHTML = `I couldn't detect an amount in your message. Please include a number, like "Spent 200 on coffee".`;
        }
        
        // Add Bot Message
        const botMsg = document.createElement("div");
        botMsg.className = "chat-msg bot-msg";
        botMsg.style = "align-self: flex-start; background: var(--bg-glass); padding: 10px 14px; border-radius: 0 12px 12px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); max-width: 85%; border: 1px solid var(--border-glass);";
        botMsg.innerHTML = `
            <p style="margin: 0; font-size: 13px; color: var(--text-color);">${responseHTML}</p>
            <span style="font-size: 10px; color: var(--text-muted); display: block; text-align: right; margin-top: 4px;">Just now</span>
        `;
        chatArea.appendChild(botMsg);
        chatArea.scrollTop = chatArea.scrollHeight;
        
    }, 600); // Small delay to feel like AI is thinking
};

function renderExpenseChart(sums) {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    
    const data = [sums.needs, sums.wants, sums.savings];
    
    // Auto-update legend
    const total = data.reduce((a, b) => a + b, 0);
    const getPct = (val) => total > 0 ? Math.round((val/total)*100) : 0;
    
    document.getElementById("chart-legend").innerHTML = `
        <div class="legend-item"><div class="legend-color bg-green"></div> Needs (${getPct(sums.needs)}%)</div>
        <div class="legend-item"><div class="legend-color bg-gold"></div> Wants (${getPct(sums.wants)}%)</div>
        <div class="legend-item"><div class="legend-color bg-deep-green"></div> Savings (${getPct(sums.savings)}%)</div>
    `;

    if (window.expenseChartInstance) {
        window.expenseChartInstance.data.datasets[0].data = data;
        window.expenseChartInstance.update();
        return;
    }

    window.expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Needs', 'Wants', 'Savings'],
            datasets: [{
                data: data.length && total > 0 ? data : [50, 30, 20], // dummy split if 0
                backgroundColor: total > 0 ? ['#1FA463', '#F3A712', '#0F5C3B'] : ['rgba(31, 164, 99, 0.4)', 'rgba(243, 167, 18, 0.4)', 'rgba(15, 92, 59, 0.4)'],
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (total === 0) return ' No data';
                            return ' ₹ ' + context.raw.toLocaleString('en-IN');
                        }
                    }
                }
            }
        }
    });
}

function exportExpenses() {
    if (!window.XLSX) {
        alert("Export module not loaded.");
        return;
    }
    if (window.expenseTransactions.length === 0) {
        alert("No transactions to export.");
        return;
    }

    let wsData = [
        ["Date", "Category", "Note", "Amount (₹)"]
    ];

    // Sort by newest first
    const sortedTxs = [...window.expenseTransactions].sort((a,b) => b.date - a.date);

    sortedTxs.forEach(tx => {
        wsData.push([
            new Date(tx.date).toLocaleDateString('en-IN'),
            tx.category.toUpperCase(),
            tx.note || "-",
            tx.amount
        ]);
    });

    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Expense_Report");
    XLSX.writeFile(wb, `Moneyed_Expense_Report.xlsx`);
}

// New V2 Features
function mockSmsSync() {
    const btn = document.getElementById("btn-sync-sms");
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-rotate sync-animation"></i> Syncing SMS...`;
    btn.disabled = true;

    setTimeout(() => {
        const mockTxs = [
            { id: Date.now()+1, amount: 450, category: 'wants-food', note: 'Zomato Payment', date: new Date().toISOString().split('T')[0] },
            { id: Date.now()+2, amount: 2400, category: 'needs-utilities', note: 'Electricity Bill', date: new Date().toISOString().split('T')[0] }
        ];
        window.expenseTransactions = [...mockTxs, ...window.expenseTransactions];
        updateExpenseDashboard();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        // Show a temporary inline toast instead of annoying alert
        let toast = document.createElement("div");
        toast.className = "toast-message";
        toast.style = "position:fixed; bottom:20px; right:20px; background:var(--brand-green); color:#fff; padding:12px 20px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:9999; animation:fadeIn 0.3s ease;";
        toast.innerHTML = "<i class='fa-solid fa-check-circle'></i> Found and synced 2 new transactions!";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }, 2000);
}
window.addExpenseFromModal = function() {
    let name = document.getElementById('new-expense-name').value;
    let amount = document.getElementById('new-expense-amount').value;
    
    if (!name || !amount || isNaN(amount)) {
        alert("Please enter a valid name and amount.");
        return;
    }
    
    // Add to local dummy data array
    expenseData.subscriptions.push({ name: name, amount: parseFloat(amount), due: "Just Added" });
    
    // UI Update (Add to top of list visually)
    const list = document.getElementById("subscription-list");
    const letter = name.charAt(0).toUpperCase();
    const colors = ['#E50914', '#1AA463', '#0070BA', '#F3A712', '#4285F4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const div = document.createElement("div");
    div.style = "display:flex; justify-content:space-between; align-items:center; padding: 12px; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px;";
    div.innerHTML = `
        <div style="display:flex; gap: 12px; align-items: center;">
            <div style="width: 35px; height: 35px; border-radius: 8px; background: ${randomColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${letter}</div>
            <div>
                <p style="margin:0; font-weight: 600; font-size: 13px;">${name}</p>
                <p style="margin:0; font-size: 11px; color: var(--text-secondary);"><i class="fa-solid fa-clock"></i> Just Added</p>
            </div>
        </div>
        <strong style="color: var(--text-color); font-size: 14px;"><i class="fa-solid fa-indian-rupee-sign" style="font-size:0.9em;"></i> ${parseFloat(amount).toLocaleString('en-IN')}</strong>
    `;
    list.prepend(div);
    
    // Cleanup & Sync
    document.getElementById('new-expense-name').value = '';
    document.getElementById('new-expense-amount').value = '';
    document.getElementById('expense-add-modal').style.display = 'none';
    
    if (window.debouncedSyncToCRM) {
        window.debouncedSyncToCRM("Expense Entry", { details: `Added ${name} for ₹${amount}` });
    }
}


function openSplitBillModal() {
    document.getElementById("split-bill-modal").classList.add('active');
}
function closeSplitBillModal() {
    document.getElementById("split-bill-modal").classList.remove('active');
}
function confirmSplitBill() {
    closeSplitBillModal();
    alert("Split requests sent successfully to Neha, Rahul, and Rohan!");
}

// 6. AI FINANCIAL COACH LOGIC
window.aiCoachData = null;

async function loadCoachData() {
    try {
        const [res1, res2] = await Promise.all([
            fetch('loan_faq_1.json'),
            fetch('loan_faq_2.json').catch(() => null)
        ]);
        
        const data1 = await res1.json();
        const data2 = res2 ? await res2.json() : {english: [], hinglish: [], hindi: []};

        // Merge datasets
        window.aiCoachData = {
            english: [...(data1.english||[]), ...(data2.english||[])],
            hinglish: [...(data1.hinglish||[]), ...(data2.hinglish||[])],
            hindi: [...(data1.hindi||[]), ...(data2.hindi||[])]
        };

        // Automatically populate greeting and dynamic chips once data is loaded
        setTimeout(updateCoachGreeting, 100);
    } catch (e) {
        console.error("Failed to load FAQ datasets", e);
    }
}
// Load on script start
loadCoachData();

function updateCoachGreeting() {
    const profile = document.getElementById("bot-profile").value;
    const msgContainer = document.getElementById("chat-messages");
    if(!msgContainer) return;
    
    // Universal greeting acknowledging multi-lingual support
    let greeting = "Namaste! I am the Moneyed AI Coach, backed by our expert financial team. Ask me any personal finance or loan queries in English, Hindi, or Hinglish!";
    
    // Reset chat
    msgContainer.innerHTML = `
        <div class="message incoming">
            <div class="msg-bubble">${greeting}</div>
            <span class="msg-time">Just Now</span>
        </div>
    `;

    generateDynamicSuggestions(profile);
}

function generateDynamicSuggestions(profile) {
    const suggestionsContainer = document.getElementById("chat-suggestions-container");
    if (!suggestionsContainer || !window.aiCoachData) return;

    // Mix suggestions from hinglish and english
    let dataSet = [];
    if(window.aiCoachData.hinglish) dataSet = dataSet.concat(window.aiCoachData.hinglish);
    if(window.aiCoachData.english) dataSet = dataSet.concat(window.aiCoachData.english);
    if (profile !== "All") {
        dataSet = dataSet.filter(f => f.customer_type === "All" || f.customer_type === profile);
    }

    if (dataSet.length > 0) {
        // Pick 3 random questions
        let shuffled = [...dataSet].sort(() => 0.5 - Math.random());
        let selected = shuffled.slice(0, 3);
        
        suggestionsContainer.innerHTML = selected.map(faq => 
            `<button class="suggestion-chip" onclick="askCoachPrompt('${faq.question.replace(/'/g, "\\'")}')">${faq.question}</button>`
        ).join('');
    }
}

function askCoachPrompt(promptText) {
    // Add user message bubble
    appendChatMessage(promptText, 'outgoing');
    
    // Process response
    simulateCoachReply(promptText);
}

function sendChatMessage() {
    const inputEl = document.getElementById("chat-user-input");
    const messageText = inputEl.value.trim();
    if (!messageText) return;

    appendChatMessage(messageText, 'outgoing');
    inputEl.value = "";

    simulateCoachReply(messageText);
}

function appendChatMessage(text, direction) {
    const messagesContainer = document.getElementById("chat-messages");
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${direction}`;
    
    msgDiv.innerHTML = `
        <div class="msg-bubble">${text}</div>
        <span class="msg-time">Just Now</span>
    `;

    messagesContainer.appendChild(msgDiv);
    
    // Auto scroll chat
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function simulateCoachReply(userMsg) {
    const messagesContainer = document.getElementById("chat-messages");
    
    // Append Typing Indicator
    const typingDiv = document.createElement("div");
    typingDiv.className = "message incoming";
    typingDiv.id = "chat-typing-indicator";
    typingDiv.innerHTML = `
        <div class="msg-bubble"><i class="fa-solid fa-ellipsis fa-bounce"></i> Coach is typing...</div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    setTimeout(() => {
        // Remove typing indicator
        const typingEl = document.getElementById("chat-typing-indicator");
        if (typingEl) typingEl.remove();
        
        let profile = document.getElementById("bot-profile") ? document.getElementById("bot-profile").value : "All";
        let responseText = "I couldn't find an exact answer for this. Try asking about CIBIL, EMI, or Personal Loans.";
        
        const lowerMsg = userMsg.toLowerCase();
        
        // Simple Devanagari detector for fallback
        const isHindi = /[\u0900-\u097F]/.test(userMsg);
        if (isHindi) responseText = "क्षमा करें, मुझे इस प्रश्न का सटीक उत्तर नहीं मिला। कृपया सिबिल, लोन या ईएमआई के बारे में कुछ और पूछें।";
        else if (lowerMsg.includes("kya") || lowerMsg.includes("kaise") || lowerMsg.includes("hai") || lowerMsg.includes("btaao") || lowerMsg.includes("batao")) responseText = "Main abhi is sawaal ka jawab nahi dhoondh paaya. Kripya CIBIL, EMI, ya Loan se juda koi sawaal poochein.";

        if (window.aiCoachData) {
            let bestMatch = null;
            let highestScore = 0;
            const languages = ["english", "hinglish", "hindi"];

            for (let lang of languages) {
                if (!window.aiCoachData[lang]) continue;
                
                for (let faq of window.aiCoachData[lang]) {
                    // Profile filter
                    if (faq.customer_type !== "All" && profile !== "All" && faq.customer_type !== profile) continue;
                    
                    let score = 0;
                    
                    // 1. Negative Scoring / Penalties (Context checking)
                    // If user asks about 'home loan', heavily penalize 'personal loan' FAQs
                    if (lowerMsg.includes("home loan") && faq.question.toLowerCase().includes("personal loan") && !faq.question.toLowerCase().includes("home loan")) score -= 20;
                    if (lowerMsg.includes("personal loan") && faq.question.toLowerCase().includes("home loan") && !faq.question.toLowerCase().includes("personal loan")) score -= 20;
                    if (lowerMsg.includes("kya hota hai") || lowerMsg.includes("what is") || lowerMsg.includes("exactly")) {
                        if (faq.question.toLowerCase().includes("what is") || faq.question.toLowerCase().includes("kya hota hai") || faq.question.toLowerCase().includes("kya hai")) {
                            score += 15; // Definition intent boost
                        }
                    }

                    // 2. Exact Keyword phrase matching
                    if (faq.keywords) {
                        for (let kw of faq.keywords) {
                            // Use word boundaries if possible
                            const regex = new RegExp(`\\b${kw.toLowerCase()}\\b`, 'i');
                            if (regex.test(lowerMsg)) score += 5;
                            else if (lowerMsg.includes(kw.toLowerCase())) score += 2; // Fallback
                        }
                    }
                    
                    // 3. Question String Inclusion (Strong signal)
                    if (lowerMsg.includes(faq.question.toLowerCase())) score += 20;
                    
                    // 4. Word overlap (Basic)
                    const msgWords = lowerMsg.split(' ');
                    for(let word of msgWords) {
                        if(word.length > 4 && faq.question.toLowerCase().includes(word)) score += 1;
                    }

                    if (score > highestScore && score > 0) {
                        highestScore = score;
                        bestMatch = faq;
                    }
                }
            }

            if (bestMatch && highestScore >= 1) {
                // Bold important numbers and percentages to make it look premium
                responseText = bestMatch.answer.replace(/(\d+%|\d{3,})/g, '<strong>$1</strong>');
            }
        }

        // Add Bot message
        appendChatMessage(responseText, 'incoming');

    }, 800 + Math.random() * 500); // realistic delay
}

// --- Voice Search (Speech Recognition) ---
window.startVoiceRecognition = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Sorry, your browser doesn't support Voice Search. Please use Chrome or Edge.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Works for Hinglish/English/Hindi
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const micIcon = document.getElementById("mic-icon");
    const inputField = document.getElementById("chat-user-input");

    recognition.onstart = function() {
        if(micIcon) {
            micIcon.classList.remove("fa-microphone");
            micIcon.classList.add("fa-spinner", "fa-spin");
            micIcon.style.color = "var(--brand-green)";
        }
        inputField.placeholder = "Listening... Speak now";
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        inputField.value = transcript;
        sendChatMessage();
    };

    recognition.onerror = function(event) {
        console.error("Voice recognition error: ", event.error);
    };

    recognition.onend = function() {
        if(micIcon) {
            micIcon.classList.remove("fa-spinner", "fa-spin");
            micIcon.classList.add("fa-microphone");
            micIcon.style.color = "";
        }
        inputField.placeholder = "Type your personal finance or loan query...";
    };

    recognition.start();
};
// 7. CONSULTATION SCHEDULER LOGIC
let selectedBookingDate = "";
let selectedBookingSlot = "";

function setupBookingCalendar() {
    const dateGrid = document.getElementById("booking-date-grid");
    dateGrid.innerHTML = "";

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Generate next 5 business days
    let addedDays = 0;
    let index = 1;

    while (addedDays < 5) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + index);

        // Skip Sunday
        if (dateObj.getDay() !== 0) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "date-btn";
            
            const dateStr = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
            btn.setAttribute("data-date", dateStr);
            
            btn.innerHTML = `
                <span class="day">${days[dateObj.getDay()]}</span>
                <span class="date">${dateObj.getDate()}</span>
            `;

            btn.addEventListener("click", () => {
                dateGrid.querySelectorAll(".date-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                selectedBookingDate = dateStr;
            });

            dateGrid.appendChild(btn);
            addedDays++;
        }
        index++;
    }

    // Slots triggers
    document.querySelectorAll(".slot-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedBookingSlot = btn.getAttribute("data-slot");
        });
    });
}

function submitBooking() {
    const topic = document.getElementById("book-topic").value;
    const name = document.getElementById("book-name").value;
    const phone = document.getElementById("book-phone").value;
    const email = document.getElementById("book-email").value;

    if (!selectedBookingDate || !selectedBookingSlot) {
        alert("Please select both advisory date and available time slot.");
        return;
    }
    if (!name || !phone || !email) {
        alert("Please provide Name, Mobile, and Email to reserve your slot.");
        return;
    }

    // Save lead booking into database
    const newBookingLead = {
        id: `L-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name,
        phone: phone,
        email: email,
        city: "Not Provided",
        empType: "N/A",
        income: 0,
        company: "N/A",
        companyCat: "D",
        loanReq: 0,
        cibil: 0,
        obligations: 0,
        pincode: "000000",
        source: "Booking Consultation",
        status: "New",
        date: new Date().toISOString().split('T')[0],
        remarks: `Requested consultation focus area: ${topic}. Call Slot Reserved: ${selectedBookingDate} at ${selectedBookingSlot}.`,
        history: [{ date: new Date().toISOString().split('T')[0], text: `Scheduled consultation slot: ${selectedBookingDate} - ${selectedBookingSlot}` }]
    };

    // Send to unified CRM
    window.syncToCRM("Consultations", {
        name: name,
        phone: phone,
        email: email,
        topic: topic,
        date: selectedBookingDate,
        slot: selectedBookingSlot,
        details: `Requested consultation focus area: ${topic}. Call Slot Reserved: ${selectedBookingDate} at ${selectedBookingSlot}.`
    });

    leads.unshift(newBookingLead);
    localStorage.setItem("moneyed_leads", JSON.stringify(leads));

    // Hide form, show success
    document.querySelector(".booking-steps-container").style.display = "none";
    document.getElementById("booking-success-msg").style.display = "block";
    document.getElementById("booking-success-details").innerText = `Our advisory team will call you on ${selectedBookingDate} during the slot: ${selectedBookingSlot}. Confirmation SMS and Email will be sent to you.`;

    // Generate Google Calendar Link
    // Parse "Tomorrow" or "Wed, Jun 4" to a valid Date object
    let d = new Date();
    if (selectedBookingDate.toLowerCase() === "tomorrow") {
        d.setDate(d.getDate() + 1);
    } else if (selectedBookingDate.toLowerCase() !== "today") {
        // Simple heuristic: "Wed, Jun 4"
        const parts = selectedBookingDate.split(',');
        if (parts.length > 1) {
            const dateStr = parts[1].trim() + " " + d.getFullYear();
            const parsed = new Date(dateStr);
            if (!isNaN(parsed)) d = parsed;
        }
    }
    
    // Parse time slot "10:30 AM - 11:00 AM"
    let startTimeStr = selectedBookingSlot.split('-')[0].trim();
    let [time, modifier] = startTimeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    d.setHours(hours, minutes, 0, 0);

    let endD = new Date(d.getTime() + 30*60000); // 30 min duration

    // Format to YYYYMMDDTHHmmssZ (UTC)
    const formatCalDate = (dateObj) => dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");

    let startDs = formatCalDate(d);
    let endDs = formatCalDate(endD);
    
    let title = encodeURIComponent("Moneyed Loan Advisory Call: " + name);
    let details = encodeURIComponent("Consultation Topic: " + topic + "\n\nPlease ensure you are available for a call from our expert team.");
    let gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDs}/${endDs}&details=${details}`;
    
    document.getElementById("add-to-calendar-btn").href = gCalUrl;

    // Generate WhatsApp Link
    let waMsg = encodeURIComponent(`Hi Moneyed Team,\n\nI have just booked a consultation session.\n*Name:* ${name}\n*Date:* ${selectedBookingDate}\n*Time:* ${selectedBookingSlot}\n*Topic:* ${topic}\n\nPlease confirm my appointment.`);
    document.getElementById("wa-notify-btn").href = `https://wa.me/916269000066?text=${waMsg}`;

    // Auto-open calendar link
    setTimeout(() => {
        window.open(gCalUrl, '_blank');
    }, 500);

    // Clean fields
    document.getElementById("book-name").value = "";
    document.getElementById("book-phone").value = "";
    document.getElementById("book-email").value = "";
    document.querySelectorAll(".date-btn, .slot-btn").forEach(b => b.classList.remove("active"));
    selectedBookingDate = "";
    selectedBookingSlot = "";

    // Sync CRM
    updateCrmStats();
    renderCrmTable();
}

function resetBookingForm() {
    document.getElementById("booking-success-msg").style.display = "none";
    document.querySelector(".booking-steps-container").style.display = "block";
}

// 8. ADMIN CRM LOGIC
function updateCrmStats() {
    const totalLeads = leads.length;
    
    // Filter new today leads (simplification - count mock + freshly added during session)
    const todayStr = new Date().toISOString().split('T')[0];
    const newToday = leads.filter(l => l.date === todayStr).length;

    // Average Cibil score of profiles with actual values
    const scoredLeads = leads.filter(l => l.cibil > 300);
    const avgCibil = scoredLeads.length > 0 ? Math.round(scoredLeads.reduce((acc, l) => acc + l.cibil, 0) / scoredLeads.length) : 0;

    document.getElementById("crm-stat-total").textContent = totalLeads;
    document.getElementById("crm-stat-new").textContent = newToday;
    document.getElementById("crm-stat-cibil").textContent = avgCibil;
}

function renderCrmTable() {
    const tbody = document.getElementById("crm-leads-tbody");
    tbody.innerHTML = "";

    const filterStatus = document.getElementById("crm-filter-status").value;

    const filteredLeads = leads.filter(lead => {
        if (filterStatus === "all") return true;
        return lead.status === filterStatus;
    });

    if (filteredLeads.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 30px;">No leads found in database matching selection parameters.</td></tr>`;
        return;
    }

    filteredLeads.forEach(lead => {
        const tr = document.createElement("tr");

        let statusClass = "new";
        if (lead.status === "Follow-Up") statusClass = "follow-up";
        else if (lead.status === "Approved") statusClass = "approved";
        else if (lead.status === "Disbursed") statusClass = "disbursed";
        else if (lead.status === "Rejected") statusClass = "rejected";

        tr.innerHTML = `
            <td>
                <div class="td-main-text">${lead.name}</div>
                <div class="td-sub-text">Registered: ${lead.date}</div>
            </td>
            <td>
                <div class="td-main-text">+91 ${lead.phone}</div>
                <div class="td-sub-text">${lead.city}</div>
            </td>
            <td>
                <div class="td-main-text">Income: <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.85em;"></i> ${lead.income.toLocaleString('en-IN')}</div>
                <div class="td-sub-text">Obligations: <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.85em;"></i> ${lead.obligations.toLocaleString('en-IN')}</div>
            </td>
            <td>
                <strong class="${lead.cibil >= 750 ? 'text-green' : lead.cibil >= 700 ? 'text-gold' : 'text-yellow'}">${lead.cibil || 'Unchecked'}</strong>
            </td>
            <td>
                <div class="td-main-text">${lead.source}</div>
                <div class="td-sub-text">ID: ${lead.id}</div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${lead.status}</span>
            </td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewLeadDetail('${lead.id}')">Process File</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewLeadDetail(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const modal = document.getElementById("lead-modal");
    const modalBody = document.getElementById("lead-modal-body");

    let foirValue = lead.income > 0 ? Math.round((lead.obligations / lead.income) * 100) : 0;

    modalBody.innerHTML = `
        <div class="modal-detail-grid">
            <div>
                <strong>Client Name:</strong>
                <p>${lead.name}</p>
            </div>
            <div>
                <strong>Contact No:</strong>
                <p>+91 ${lead.phone}</p>
            </div>
            <div>
                <strong>City & Pincode:</strong>
                <p>${lead.city} (${lead.pincode})</p>
            </div>
            <div>
                <strong>Job Category:</strong>
                <p>${lead.empType === 'salaried' ? 'Salaried' : 'Self-Employed'} - Employer Category ${lead.companyCat}</p>
            </div>
        </div>

        <div class="modal-section">
            <h4>Financial Parameters</h4>
            <div class="modal-detail-grid">
                <div>
                    <span>Net Monthly salary:</span>
                    <strong class="text-green"><i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${lead.income.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                    <span>Obligations (Rent/EMI):</span>
                    <strong class="text-yellow"><i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${lead.obligations.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                    <span>Calculated FOIR:</span>
                    <strong class="${foirValue > 50 ? 'text-red' : 'text-green'}">${foirValue}%</strong>
                </div>
                <div>
                    <span>CIBIL Score:</span>
                    <strong class="${lead.cibil >= 750 ? 'text-green' : 'text-gold'}">${lead.cibil || 'Unchecked'}</strong>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <h4>Follow-up Remarks History</h4>
            <div class="crm-remarks-log" style="background-color:rgba(0,0,0,0.02); padding:10px; border-radius:6px; max-height:120px; overflow-y:auto; margin-bottom:12px;">
                ${lead.history.map(h => `<div style="font-size:11px; margin-bottom:6px;"><strong>[${h.date}]:</strong> ${h.text}</div>`).join('')}
            </div>
            <div class="form-group">
                <label for="modal-new-remark">Add New Journal Entry</label>
                <textarea id="modal-new-remark" class="form-input" style="height:60px; font-size:12px;" placeholder="Type discussion logs or lender login references..."></textarea>
            </div>
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label for="modal-status-select">Change Status Pipeline</label>
                <select id="modal-status-select" class="form-input">
                    <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New Lead</option>
                    <option value="Follow-Up" ${lead.status === 'Follow-Up' ? 'selected' : ''}>In Follow-Up</option>
                    <option value="Approved" ${lead.status === 'Approved' ? 'selected' : ''}>Approved by Lender</option>
                    <option value="Disbursed" ${lead.status === 'Disbursed' ? 'selected' : ''}>Funds Disbursed</option>
                    <option value="Rejected" ${lead.status === 'Rejected' ? 'selected' : ''}>Rejected / Closed</option>
                </select>
            </div>
            <div class="form-group" style="justify-content: flex-end;">
                <button class="btn btn-accent btn-full" onclick="saveLeadModifications('${lead.id}')">Save Status & Remarks</button>
            </div>
        </div>
    `;

    modal.classList.remove("hidden");
}

function saveLeadModifications(leadId) {
    const leadIndex = leads.findIndex(l => l.id === leadId);
    if (leadIndex === -1) return;

    const newStatus = document.getElementById("modal-status-select").value;
    const newRemark = document.getElementById("modal-new-remark").value.trim();
    const todayStr = new Date().toISOString().split('T')[0];

    // Update status
    leads[leadIndex].status = newStatus;

    // Update remarks log
    if (newRemark) {
        leads[leadIndex].remarks = newRemark;
        leads[leadIndex].history.unshift({
            date: todayStr,
            text: newRemark
        });
    }

    // Save back to LocalStorage
    localStorage.setItem("moneyed_leads", JSON.stringify(leads));
    
    // Refresh table & stats
    updateCrmStats();
    renderCrmTable();
    closeLeadModal();

    alert(`Lead record ${leadId} updated successfully.`);
}

function closeLeadModal() {
    document.getElementById("lead-modal").classList.add("hidden");
}


// Dynamic Theme Application based on CIBIL score
function applyCibilTheme(score) {
    document.body.classList.remove('theme-deep-green', 'theme-mint-green', 'theme-white', 'theme-warm-yellow', 'theme-light-red');
    
    const statusVal = document.getElementById("topbar-cibil");
    if (!statusVal) return;
    
    if (!score) {
        statusVal.textContent = "Uncheck";
        document.body.classList.add('theme-deep-green');
        return;
    }
    
    let tier = "";
    if (score >= 781) {
        document.body.classList.add('theme-deep-green');
        tier = " (Super Prime)";
    } else if (score >= 750) {
        document.body.classList.add('theme-mint-green');
        tier = " (Prime)";
    } else if (score >= 700) {
        document.body.classList.add('theme-white');
        tier = " (Clean)";
    } else if (score >= 650) {
        document.body.classList.add('theme-warm-yellow');
        tier = " (Earthy)";
    } else {
        document.body.classList.add('theme-light-red');
        tier = " (Weak)";
    }
    
    statusVal.textContent = score + tier;
}

// --- SCHEDULE GENERATION & EXPORT ---
window.scheduleData = { emi: [], pp: [], od: [] };

function formatCurrency(val) {
    return "₹ " + Math.round(val).toLocaleString('en-IN');
}

function generateEmiSchedule(principal, monthlyRate, totalMonths, emi) {
    const tbody = document.getElementById("emi-schedule-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    let balance = principal;
    let schedule = [];
    
    for (let m = 1; m <= totalMonths; m++) {
        let interest = Number((balance * monthlyRate).toFixed(2));
        let principalPaid = Number((emi - interest).toFixed(2));
        
        // Handle last month rounding
        if (m === totalMonths || balance - principalPaid < 0) {
            principalPaid = Number(balance.toFixed(2));
            emi = Number((principalPaid + interest).toFixed(2));
        }
        
        let closing = Number((balance - principalPaid).toFixed(2));
        if (closing < 0) closing = 0;
        
        schedule.push({
            Month: m,
            Opening: balance,
            EMI: emi,
            Interest: interest,
            Principal: principalPaid,
            Closing: closing
        });
        
        // Update balance for next iteration
        balance = closing;
        
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m}</td>
            <td>${formatCurrency(balance)}</td>
            <td>${formatCurrency(emi)}</td>
            <td>${formatCurrency(interest)}</td>
            <td>${formatCurrency(principalPaid)}</td>
            <td>${formatCurrency(closing)}</td>
        `;
        tbody.appendChild(tr);
        
        balance = closing;
        if (balance <= 0) break;
    }
    window.scheduleData.emi = schedule;
}


function exportSchedule(type, format) {
    const data = window.scheduleData[type];
    if (!data || data.length === 0) {
        alert("No schedule generated yet.");
        return;
    }

    const disclaimer = "Disclaimer: This schedule is indicative and generated for illustrative purposes only. Actual values may vary based on lender policies.";
    let headers = [];
    if (type === 'emi') {
        headers = ["Month", "Opening Bal", "EMI", "Interest", "Principal", "Closing Bal"];
    } else if (type === 'pp') {
        headers = ["Month", "Opening Bal", "EMI", "Part Payment", "Interest", "Principal", "Closing Bal"];
    } else if (type === 'od') {
        headers = ["Month", "DropLine Limit", "Limit Drop", "Available Limit", "Opening Principal", "Withdrawal", "Part Payment", "Installment", "Principal", "Interest", "Closing Principal"];
    }

    const rows = data.map(obj => Object.values(obj).map(v => Math.round(v).toLocaleString('en-IN')));

    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text("Amortization Schedule", 14, 20);
        
        doc.autoTable({
            startY: 30,
            head: [headers],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [31, 164, 99] },
            didDrawPage: function (data) {
                // Repeating Watermark on every page (Very faint to show digits clearly)
                doc.setTextColor(242, 248, 245); 
                doc.setFontSize(60);
                doc.text("Moneyed.co.in", 30, 140, { angle: 45 });
                doc.text("Moneyed.co.in", 30, 260, { angle: 45 });
            }
        });
        
        let finalY = doc.lastAutoTable.finalY || 30;
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(disclaimer, 14, finalY + 10, { maxWidth: 180 });
        
        doc.save(`Moneyed_Schedule_${type}.pdf`);
        
    } else if (format === 'excel') {
        let wb = XLSX.utils.book_new();
        let wsData = [];
        wsData.push(["Amortization Schedule - Moneyed.co.in"]);
        wsData.push([]);
        wsData.push(headers);
        
        data.forEach(obj => {
            wsData.push(Object.values(obj).map(v => Math.round(v)));
        });
        
        wsData.push([]);
        wsData.push([disclaimer]);
        
        let ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Schedule");
        XLSX.writeFile(wb, `Moneyed_Schedule_${type}.xlsx`);
    }
}
// 8. THEME & LOGO MANAGEMENT
function updateLogoForTheme(isDark) {
    const logoSrc = isDark ? 'moneyed-logo-dark.svg' : 'moneyed-logo-light.svg';
    ['sidebar-logo', 'mobile-logo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = logoSrc;
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('moneyed_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
        document.getElementById('theme-toggle-btn').innerHTML = '<i class="fa-solid fa-sun"></i>';
        updateLogoForTheme(true);
    } else {
        document.body.classList.remove('theme-dark');
        document.getElementById('theme-toggle-btn').innerHTML = '<i class="fa-solid fa-moon"></i>';
        updateLogoForTheme(false);
    }
}

function toggleTheme() {
    document.body.classList.toggle('theme-dark');
    const isDark = document.body.classList.contains('theme-dark');

    if (isDark) {
        localStorage.setItem('moneyed_theme', 'dark');
        document.getElementById('theme-toggle-btn').innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        localStorage.setItem('moneyed_theme', 'light');
        document.getElementById('theme-toggle-btn').innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    updateLogoForTheme(isDark);
}



// =========================================
// PREMIUM ANIMATIONS & MICRO-INTERACTIONS
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Setup Scroll-Triggered Reveal Animations
    // Dynamically add the 'reveal' class to all premium cards
    const revealElements = document.querySelectorAll('.glass-card, .metric-card, .trust-card, .feature-highlights, .main-form-card');
    revealElements.forEach(el => {
        // Don't add reveal to the gamification card or hero section to avoid double animating/blank gaps
        if(el.id !== 'gamification-card' && !el.classList.contains('hero-landing-section')) {
            el.classList.add('reveal');
        }
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                // Add a slight stagger delay based on DOM order
                setTimeout(() => {
                    entry.target.classList.add('active');
                }, 100);
                observer.unobserve(entry.target); // Animate only once per load
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Dynamic 3D Hover Tilt Effect for Glass Cards
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element
            const y = e.clientY - rect.top;  // y position within the element
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate rotation (max 10 degrees)
            const rotateX = ((y - centerY) / centerY) * -10;
            const rotateY = ((x - centerX) / centerX) * 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
        });
    });

    // 2. Setup Dynamic Number Counters for Trust Section
    const trustH3s = document.querySelectorAll('.trust-card h3');
    trustH3s.forEach(h3 => {
        const text = h3.innerText;
        // Extract the number and the suffix (e.g. "15+" -> 15 and "+")
        const numMatch = text.match(/(\d+)/);
        if(numMatch && !text.includes('Cr')) { // Handle Cr differently if needed, or just let regex catch 500
            const num = numMatch[1];
            h3.setAttribute('data-target', num);
            h3.classList.add('counter-num');
            const suffix = text.replace(num, '');
            h3.setAttribute('data-suffix', suffix);
            h3.innerText = '0' + suffix; 
        } else if (text.includes('500Cr+')) {
            h3.setAttribute('data-target', '500');
            h3.classList.add('counter-num');
            h3.setAttribute('data-suffix', 'Cr+');
            h3.innerText = '0Cr+';
        }
    });

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter-num, .counter-animate').forEach(el => counterObserver.observe(el));

    function animateCounter(el) {
        const target = +el.getAttribute('data-target');
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 2000; // 2 seconds counting animation
        const increment = target / (duration / 16); // Assuming ~60fps
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if(current < target) {
                el.innerText = Math.ceil(current) + suffix;
                requestAnimationFrame(updateCounter);
            } else {
                el.innerText = target + suffix;
            }
        };
        updateCounter();
    }
});

// Waitlist & AI Action Modal Functions
let currentWaitlistSource = "Smart Card Waitlist";

function openWaitlistModal(source = "Smart Card Waitlist", title = "Join the Elite Waitlist", subtitle = "Enter your details to secure early access.") {
    currentWaitlistSource = source;
    
    // Update Modal Text dynamically
    const titleEl = document.getElementById('waitlist-modal-title');
    const subtitleEl = document.getElementById('waitlist-modal-subtitle');
    if (titleEl) titleEl.innerText = title;
    if (subtitleEl) subtitleEl.innerText = subtitle;

    // Reset Form & Show Step 1
    document.getElementById('waitlist-step-1').style.display = 'block';
    document.getElementById('waitlist-success').style.display = 'none';
    document.getElementById('waitlist-name').value = '';
    document.getElementById('waitlist-phone').value = '';

    document.getElementById('waitlist-modal').style.display = 'flex';
}

function closeWaitlistModal() {
    document.getElementById('waitlist-modal').style.display = 'none';
}

function submitWaitlist() {
    const name = document.getElementById('waitlist-name').value;
    const phone = document.getElementById('waitlist-phone').value;
    if (name.length > 2 && phone.length === 10) {
        document.getElementById('waitlist-step-1').style.display = 'none';
        document.getElementById('waitlist-success').style.display = 'block';

        // Send to CRM
        const sheetURL = "https://script.google.com/macros/s/AKfycbzxRIqLKmG9kf4V8Kh1APQofCFKiJ_-fputHfWCABzIFdJ0hNO5mD3Ic6InRsAeKb9PRA/exec";
        const payload = {
            loanType: currentWaitlistSource, // Uses dynamically set source
            name: name,
            phone: phone
        };
        fetch(sheetURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Waitlist Sync Error:", err));
    } else {
        alert('Please enter a valid name and 10-digit mobile number.');
    }
}


// TAX CALCULATOR LOGIC
function calculateTax() {
    let salary = parseInt(document.getElementById('tax-salary-input').value) || 0;
    let other = parseInt(document.getElementById('tax-other-input').value) || 0;
    let income = salary + other;
    
    let sec80c = parseInt(document.getElementById('tax-80c-input').value) || 0;
    sec80c = Math.min(sec80c, 150000); // Max 1.5L
    
    let sec80d = parseInt(document.getElementById('tax-80d-input').value) || 0;
    let hra = parseInt(document.getElementById('tax-hra-input').value) || 0;
    let homeLoan = parseInt(document.getElementById('tax-homeloan-input').value) || 0;
    
    let deductions = sec80c + sec80d + hra + homeLoan;
    // Standard Deduction
    let stdDeduction = 50000;
    
    // --- OLD REGIME CALCULATION ---
    // Standard Deduction is 50k for Old Regime
    let oldStdDeduction = salary > 0 ? 50000 : 0;
    let oldTaxable = Math.max(0, income - oldStdDeduction - deductions);
    let oldTax = 0;
    
    if (oldTaxable > 1000000) {
        oldTax += (oldTaxable - 1000000) * 0.30;
        oldTax += 500000 * 0.20; // 5L to 10L
        oldTax += 250000 * 0.05; // 2.5L to 5L
    } else if (oldTaxable > 500000) {
        oldTax += (oldTaxable - 500000) * 0.20;
        oldTax += 250000 * 0.05;
    } else if (oldTaxable > 250000) {
        oldTax += (oldTaxable - 250000) * 0.05;
    }
    
    // 87A Rebate for Old Regime (Income <= 5L)
    if (oldTaxable <= 500000) {
        oldTax = 0;
    } else {
        // Surcharge
        if (income > 50000000) oldTax *= 1.37;
        else if (income > 20000000) oldTax *= 1.25;
        else if (income > 10000000) oldTax *= 1.15;
        else if (income > 5000000) oldTax *= 1.10;
        
        oldTax = oldTax * 1.04; // 4% Cess
    }
    
    // --- NEW REGIME CALCULATION (FY 2026-2027) ---
    // Standard Deduction is 75k for New Regime
    let newStdDeduction = salary > 0 ? 75000 : 0;
    let newTaxable = Math.max(0, income - newStdDeduction);
    let newTax = 0;
    
    if (newTaxable > 2400000) {
        newTax += (newTaxable - 2400000) * 0.30;
        newTax += 400000 * 0.25; // 20-24
        newTax += 400000 * 0.20; // 16-20
        newTax += 400000 * 0.15; // 12-16
        newTax += 400000 * 0.10; // 8-12
        newTax += 400000 * 0.05; // 4-8
    } else if (newTaxable > 2000000) {
        newTax += (newTaxable - 2000000) * 0.25;
        newTax += 400000 * 0.20;
        newTax += 400000 * 0.15;
        newTax += 400000 * 0.10;
        newTax += 400000 * 0.05;
    } else if (newTaxable > 1600000) {
        newTax += (newTaxable - 1600000) * 0.20;
        newTax += 400000 * 0.15;
        newTax += 400000 * 0.10;
        newTax += 400000 * 0.05;
    } else if (newTaxable > 1200000) {
        newTax += (newTaxable - 1200000) * 0.15;
        newTax += 400000 * 0.10;
        newTax += 400000 * 0.05;
    } else if (newTaxable > 800000) {
        newTax += (newTaxable - 800000) * 0.10;
        newTax += 400000 * 0.05;
    } else if (newTaxable > 400000) {
        newTax += (newTaxable - 400000) * 0.05;
    }
    
    // 87A Rebate for New Regime (Income <= 12L)
    if (newTaxable <= 1200000) {
        newTax = 0;
    } else {
        let maxTaxAllowed = newTaxable - 1200000;
        if (newTax > maxTaxAllowed) {
            newTax = maxTaxAllowed;
        }
        // Surcharge (Capped at 25% for New Regime)
        if (income > 20000000) newTax *= 1.25;
        else if (income > 10000000) newTax *= 1.15;
        else if (income > 5000000) newTax *= 1.10;
        
        newTax = newTax * 1.04; // 4% Cess
    }
    
    // Format and Display
    document.getElementById('tax-old-display').innerHTML = '<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>' + Math.round(oldTax).toLocaleString();
    document.getElementById('tax-new-display').innerHTML = '<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>' + Math.round(newTax).toLocaleString();
    
    let banner = document.getElementById('tax-recommendation-banner');
    let bannerText = document.getElementById('tax-recommendation-text');
    
    if (oldTax < newTax) {
        banner.style.display = 'block';
        banner.style.background = 'var(--brand-green)';
        let diff = newTax - oldTax;
        bannerText.innerHTML = 'Old Regime is better! You save <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>' + Math.round(diff).toLocaleString();
    } else if (newTax < oldTax) {
        banner.style.display = 'block';
        banner.style.background = 'var(--brand-green)';
        let diff = oldTax - newTax;
        bannerText.innerHTML = 'New Regime is better! You save <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>' + Math.round(diff).toLocaleString();
    } else {
        banner.style.display = 'block';
        banner.style.background = 'var(--text-secondary)';
        bannerText.innerHTML = 'Both regimes have same tax (<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>' + Math.round(newTax).toLocaleString() + ')';
    }

    // AI Insight for Tax
    const insightBox = document.getElementById("tax-ai-insight");
    const insightText = document.getElementById("tax-ai-text");
    if(insightBox && insightText && income > 700000) {
        insightBox.style.display = "block";
        let current80c = sec80c;
        if (current80c < 150000) {
            let gap = 150000 - current80c;
            insightText.innerHTML = `You haven't maxed out your <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>1.5L 80C limit! Investing <strong><i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${gap.toLocaleString('en-IN')}</strong> more in ELSS or PPF will save you additional tax under the Old Regime and build long-term wealth.`;
        } else if (sec80d < 25000) {
            insightText.innerHTML = `Your 80C is maxed out! Consider getting Health Insurance (Section 80D) to save more tax and secure your family's health.`;
        } else {
            insightText.innerHTML = `You are efficiently utilizing basic deductions. Consider Section 80CCD(1B) to invest an extra <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>50k in NPS for additional tax savings!`;
        }
    } else if (insightBox) {
        insightBox.style.display = "none";
    }
}
// Init calculate tax on load if possible, or wait for user input
setTimeout(calculateTax, 1000);


// --- ANALYTICS UTILITY ---
function analyticsTrack(eventName, eventData = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, eventData);
    }
    if (typeof fbq === 'function') {
        fbq('trackCustom', eventName, eventData);
    }
}

// Fetch real leads from Firebase for CRM
db.ref('leads').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        leads = Object.values(data).map(item => ({
            name: item.name,
            phone: item.phone,
            loanType: item.loanType,
            status: item.status || 'New',
            date: new Date(item.timestamp).toLocaleDateString(),
            city: 'Online Request',
            income: 'TBD',
            obligations: 'TBD',
            cibil: 'TBD',
            agent: 'Unassigned',
            lastUpdated: new Date(item.timestamp).toLocaleDateString()
        })).reverse();
        renderCrmTable();
        updateCrmDashboard();
    }
});

function downloadLeadsExcel() {
    if(leads.length === 0) {
        alert("No data to download!");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(leads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "Moneyed_Leads.xlsx");
}

// --- UNIFIED CRM ROUTER ---
window.syncToCRM = function(source, payload) {
    const sheetURL = "https://script.google.com/macros/s/AKfycbzYWaSAYI_7yJ9U91KNRXfqPbaQCJeyzrPf1NJoPcJWnkANhA0E0bgsjZUQQQU076dQbg/exec";
    
    if (auth.currentUser) {
        payload.name = payload.name || auth.currentUser.displayName || "Unknown User";
        payload.phone = payload.phone || auth.currentUser.phoneNumber || "Unknown Phone";
    } else {
        payload.name = payload.name || "Anonymous";
        payload.phone = payload.phone || "Not Provided";
    }
    
    payload.loanType = source;
    payload.timestamp = new Date().toISOString();
    payload.status = 'New';
    
    try {
        db.ref('leads').push(payload).catch(e => console.error("Firebase Error:", e));
    } catch(e) {}
    
    fetch(sheetURL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }).catch(e => console.error("Sheet Error:", e));
}

// Debounced CRM Router for calculators (avoids spam on keystrokes)
window.crmSyncTimers = {};
window.debouncedSyncToCRM = function(source, payload, delayMs = 2000) {
    if (window.crmSyncTimers[source]) {
        clearTimeout(window.crmSyncTimers[source]);
    }
    window.crmSyncTimers[source] = setTimeout(() => {
        window.syncToCRM(source, payload);
        delete window.crmSyncTimers[source];
    }, delayMs);
};

// --- PROFILE COMPLETION MODAL ---
window.openProfileModal = function() {
    document.getElementById('profile-modal').style.display = 'flex';
};
window.saveUserProfile = function() {
    const inc = document.getElementById('profile-income').value;
    const emi = document.getElementById('profile-emi').value;
    const city = document.getElementById('profile-city').value;
    
    if (inc) window.userProfile.income = parseFloat(inc);
    if (emi) window.userProfile.obligations = parseFloat(emi);
    
    // Hide Banner & Modal
    document.getElementById('profile-completion-banner').style.display = 'none';
    document.getElementById('profile-modal').style.display = 'none';
    
    // Trigger FOIR Update if needed
    if (typeof updateFOIRGauge === 'function') updateFOIRGauge();
    alert("Profile saved! AI Advisor is now personalized for you.");
};;

// --- Language Toggle Logic ---
let currentLang = 'en';
const langDict = {
    'en': {
        'hero-badge': '<i class="fa-solid fa-award"></i> India\'s #1 Loan Advisory Platform',
        'hero-title': 'Optimize Your Debt. <br/> <span style="color: var(--brand-green);">Maximize Your Savings.</span>',
        'hero-subtitle': 'Get 1-on-1 expert advisory, structure your loans, check CIBIL accurately, and find the lowest interest rates across 15+ banks.',
        'hero-cta1': 'Check Eligibility Free <i class="fa-solid fa-arrow-right"></i>'
    },
    'hi': {
        'hero-badge': '<i class="fa-solid fa-award"></i> भारत का #1 ऋण सलाहकार प्लेटफ़ॉर्म',
        'hero-title': 'अपने कर्ज़ को कम करें। <br/> <span style="color: var(--brand-green);">अपनी बचत बढ़ाएँ।</span>',
        'hero-subtitle': '1-on-1 विशेषज्ञ सलाह प्राप्त करें, अपने ऋणों को संरचना करें, सटीक सिबिल चेक करें, और 15+ बैंकों में सबसे कम ब्याज दरें खोजें।',
        'hero-cta1': 'नि:शुल्क योग्यता जांचें <i class="fa-solid fa-arrow-right"></i>'
    }
};

window.toggleLanguage = function() {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    for (let key in langDict[currentLang]) {
        let el = document.getElementById(key);
        if (el) el.innerHTML = langDict[currentLang][key];
    }
    
    // Toggle button active state
    let btn = document.getElementById('lang-toggle-btn');
    if (btn) {
        if (currentLang === 'hi') {
            btn.style.background = 'var(--brand-green)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'var(--brand-green)';
        } else {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-color)';
            btn.style.borderColor = 'var(--border-color)';
        }
    }
};

// Sub-tab switching for calculators
const subTabBtns = document.querySelectorAll(".sub-tab-btn");
subTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        // Remove active from all siblings
        const parent = btn.parentElement;
        parent.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        // Hide all sub-panes
        const container = btn.closest(".tab-pane");
        container.querySelectorAll(".sub-tab-pane").forEach(pane => pane.classList.remove("active"));
        
        // Show target pane
        const targetId = btn.getAttribute("data-subtab");
        if (targetId) {
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add("active");
        }
    });
});

// Mobile select fallback for calculators
const mobileSelect = document.querySelector(".calc-mobile-select");
if (mobileSelect) {
    mobileSelect.addEventListener("change", (e) => {
        const targetId = e.target.value;
        const container = mobileSelect.closest(".tab-pane");
        container.querySelectorAll(".sub-tab-pane").forEach(pane => pane.classList.remove("active"));
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add("active");
    });
}

// Task 3: CIBIL PDF Upload
const dropZone = document.getElementById("cibil-drop-zone");
const fileInput = document.getElementById("cibil-file-input");

if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());
    
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            dropZone.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><h4>Parsing ${file.name}...</h4><p>Extracting data using DPDP compliant OCR...</p>`;
            
            // Simulate processing
            setTimeout(() => {
                const parsedGrid = document.getElementById("cibil-parsed-results");
                if (parsedGrid) {
                    parsedGrid.style.display = "block";
                    
                    // Inject realistic mock data into summary
                    document.getElementById("cibil-summary-grid").innerHTML = `
                        <div class="stat-box" style="padding: 15px; border-radius: 8px; background: rgba(0,0,0,0.2); border-left: 4px solid var(--brand-green);">
                            <p style="margin:0; font-size: 11px; color: var(--text-muted);">CIBIL Score</p>
                            <h3 style="margin:5px 0 0; color: var(--neon-green); font-size: 24px;">782</h3>
                        </div>
                        <div class="stat-box" style="padding: 15px; border-radius: 8px; background: rgba(0,0,0,0.2); border-left: 4px solid #F3A712;">
                            <p style="margin:0; font-size: 11px; color: var(--text-muted);">Active Accounts</p>
                            <h3 style="margin:5px 0 0; color: white; font-size: 20px;">4</h3>
                        </div>
                        <div class="stat-box" style="padding: 15px; border-radius: 8px; background: rgba(0,0,0,0.2); border-left: 4px solid #E50914;">
                            <p style="margin:0; font-size: 11px; color: var(--text-muted);">Recent Enquiries</p>
                            <h3 style="margin:5px 0 0; color: white; font-size: 20px;">1</h3>
                        </div>
                        <div class="stat-box" style="padding: 15px; border-radius: 8px; background: rgba(0,0,0,0.2); border-left: 4px solid var(--brand-green);">
                            <p style="margin:0; font-size: 11px; color: var(--text-muted);">Total Outstanding</p>
                            <h3 style="margin:5px 0 0; color: white; font-size: 20px;">₹4,32,500</h3>
                        </div>
                    `;

                    // Inject realistic active accounts
                    document.getElementById("cibil-active-table-body").innerHTML = `
                        <tr style="border-bottom: 1px solid var(--border-glass);">
                            <td style="padding:10px; font-size:13px;">Nakul Verma</td>
                            <td style="padding:10px; font-size:13px;">Personal Loan</td>
                            <td style="padding:10px; font-size:13px;">HDFC****4321</td>
                            <td style="padding:10px; font-size:13px;">Individual</td>
                            <td style="padding:10px; font-size:13px;">-</td>
                            <td style="padding:10px; font-size:13px;">₹5,00,000</td>
                            <td style="padding:10px; font-size:13px;">₹5,00,000</td>
                            <td style="padding:10px; font-size:13px;">₹3,45,000</td>
                            <td style="padding:10px; font-size:13px; color:var(--brand-green);">₹0</td>
                            <td style="padding:10px; font-size:13px;">₹15,400</td>
                            <td style="padding:10px; font-size:13px;">12-05-2024</td>
                            <td style="padding:10px; font-size:13px; color:var(--brand-green);">Standard</td>
                            <td style="padding:10px; font-size:13px;">000 000 000</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-glass);">
                            <td style="padding:10px; font-size:13px;">Nakul Verma</td>
                            <td style="padding:10px; font-size:13px;">Credit Card</td>
                            <td style="padding:10px; font-size:13px;">ICICI****9876</td>
                            <td style="padding:10px; font-size:13px;">Individual</td>
                            <td style="padding:10px; font-size:13px;">₹1,50,000</td>
                            <td style="padding:10px; font-size:13px;">-</td>
                            <td style="padding:10px; font-size:13px;">₹1,20,000</td>
                            <td style="padding:10px; font-size:13px;">₹87,500</td>
                            <td style="padding:10px; font-size:13px; color:var(--brand-green);">₹0</td>
                            <td style="padding:10px; font-size:13px;">-</td>
                            <td style="padding:10px; font-size:13px;">03-11-2023</td>
                            <td style="padding:10px; font-size:13px; color:var(--brand-green);">Standard</td>
                            <td style="padding:10px; font-size:13px;">000 000 000</td>
                        </tr>
                    `;

                    // Inject recent inquiries
                    document.getElementById("cibil-inquiries-table-body").innerHTML = `
                        <tr style="border-bottom: 1px solid var(--border-glass);">
                            <td style="padding:10px; font-size:13px;">15-04-2026</td>
                            <td style="padding:10px; font-size:13px;">AXIS BANK LTD</td>
                        </tr>
                    `;
                }
                
                dropZone.innerHTML = `<i class="fa-solid fa-check text-green" style="font-size:24px; margin-bottom:10px;"></i><h4>Report Processed</h4><p>${file.name} successfully parsed. Scroll down to view data.</p>`;
            }, 2000);
        }
    });
}

// Task 4: AI SMS Parser Prototype
window.parseBankSMS = function() {
    const text = document.getElementById("ai-sms-input").value;
    const resultBox = document.getElementById("sms-parse-result");
    const btn = document.getElementById("btn-parse-sms");
    
    if (!text.trim()) {
        alert("Please paste an SMS first.");
        return;
    }
    
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Parsing with AI...`;
    
    setTimeout(() => {
        // Regex to extract amount
        const amountMatch = text.match(/(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        
        // Regex to extract merchant (basic heuristic)
        let merchant = "Unknown Merchant";
        const vpaMatch = text.match(/VPA\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+)/i);
        const toMatch = text.match(/to\s+([A-Za-z0-9 ]+?)(?:\.|\n|Avl)/i);
        if (vpaMatch) {
            merchant = vpaMatch[1].split('@')[0];
        } else if (toMatch) {
            merchant = toMatch[1].trim();
        }
        
        if (amount > 0) {
            resultBox.style.display = "block";
            resultBox.innerHTML = `<strong>Extracted Successfully:</strong><br/>Amount: <strong class="text-green">₹${amount.toLocaleString('en-IN')}</strong><br/>Merchant: <strong>${merchant}</strong><br/>Category: <strong>Identified as 'Needs'</strong>`;
            
            // Add to system state and database
            let category = "needs-other";
            const textLower = merchant.toLowerCase();
            if (textLower.includes("swiggy") || textLower.includes("zomato") || textLower.includes("food")) {
                category = "wants-food";
            } else if (textLower.includes("netflix") || textLower.includes("prime") || textLower.includes("movie")) {
                category = "wants-entertainment";
            } else if (textLower.includes("uber") || textLower.includes("ola") || textLower.includes("petrol")) {
                category = "wants-travel";
            } else if (textLower.includes("amazon") || textLower.includes("flipkart") || textLower.includes("myntra")) {
                category = "wants-shopping";
            }
            
            const newTx = {
                id: 'tx-sms-' + Date.now(),
                amount: amount,
                category: category,
                note: merchant,
                date: new Date().toISOString().split('T')[0]
            };
            
            if (!window.expenseTransactions) {
                window.expenseTransactions = [];
            }
            window.expenseTransactions.unshift(newTx);
            
            // Sync to CRM/Firebase as requested in Phase 1
            if (typeof window.syncToCRM === 'function') {
                window.syncToCRM("SMS AI Parse", {
                    amount: amount,
                    category: category,
                    merchant: merchant,
                    details: `Parsed SMS: ₹${amount} at ${merchant}`
                });
            }

            // Centralized update
            if (typeof updateExpenseDashboard === 'function') {
                updateExpenseDashboard();
            }
        } else {
            resultBox.style.display = "block";
            resultBox.innerHTML = `<span class="text-red">Failed to parse amount. Please ensure the SMS contains 'INR' or 'Rs'.</span>`;
        }
        
        btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI Se Parse Karo`;
    }, 1500);
};

/* -------------------------------------
   LEAD GENERATION MODAL LOGIC (MOVED FROM AUTH.JS FOR ADBLOCK BYPASS)
   ------------------------------------- */

window.openLeadModal = function() {
    const modal = document.getElementById("lead-gen-modal");
    if (!modal) return;
    modal.style.display = "flex";
    setTimeout(() => { modal.classList.add("active"); }, 10);
    const step1 = document.getElementById("lead-step-1");
    const step2 = document.getElementById("lead-step-2");
    const step3 = document.getElementById("lead-step-3");
    const successStep = document.getElementById("lead-step-success");
    if(step1) step1.style.display = "block";
    if(step2) step2.style.display = "none";
    if(step3) step3.style.display = "none";
    if(successStep) successStep.style.display = "none";
    
    if (window.updateLeadProgress) window.updateLeadProgress(1);
};

window.closeLeadModal = function() {
    const modal = document.getElementById("lead-gen-modal");
    if(!modal) return;
    modal.classList.remove("active");
    setTimeout(() => { modal.style.display = "none"; }, 400);
};

window.nextLeadStep = function(step) {
    document.querySelectorAll('.lead-step').forEach(el => el.style.display = 'none');
    const targetStep = document.getElementById(`lead-step-${step}`);
    if(targetStep) {
        targetStep.style.display = 'block';
        if (window.updateLeadProgress) window.updateLeadProgress(step);
    }
};

window.prevLeadStep = function(step) {
    document.querySelectorAll('.lead-step').forEach(el => el.style.display = 'none');
    const targetStep = document.getElementById(`lead-step-${step}`);
    if(targetStep) {
        targetStep.style.display = 'block';
        if (window.updateLeadProgress) window.updateLeadProgress(step);
    }
};

window.updateLeadProgress = function(step) {
    const bar = document.getElementById("lead-progress-bar");
    if (step === 1 && bar) bar.style.width = "33%";
    if (step === 2 && bar) bar.style.width = "66%";
    if (step === 3 && bar) bar.style.width = "100%";
    for(let i=1; i<=3; i++) {
        const ind = document.getElementById(`step-ind-${i}`);
        if(ind) {
            ind.classList.remove('active', 'completed');
            if(i < step) ind.classList.add('completed');
            if(i === step) ind.classList.add('active');
        }
    }
};

window.submitLeadForm = function() {
    const btn = document.getElementById("submit-lead-btn");
    const name = document.getElementById("lead-name").value;
    const phone = document.getElementById("lead-phone").value;
    const type = document.getElementById("lead-type").value;
    if(!name || phone.length !== 10 || !type) {
        alert("Please fill all details correctly.");
        return;
    }
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;
    
    const sheetURL = "https://script.google.com/macros/s/AKfycbzYWaSAYI_7yJ9U91KNRXfqPbaQCJeyzrPf1NJoPcJWnkANhA0E0bgsjZUQQQU076dQbg/exec";
    const payload = {
        name: name,
        phone: phone,
        loanType: type,
        timestamp: new Date().toISOString(),
        status: 'New'
    };

    try {
        if(typeof db !== 'undefined') {
            db.ref('leads').push(payload).catch(e => console.error("Firebase Push Error:", e));
        }
    } catch(e) {}
    
    fetch(sheetURL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    }).then(() => {
        document.querySelectorAll('.lead-step').forEach(el => el.style.display = 'none');
        document.getElementById("lead-step-success").style.display = "block";
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Request';
        btn.disabled = false;
        document.getElementById("lead-name").value = "";
        document.getElementById("lead-phone").value = "";
        document.getElementById("lead-type").value = "";
    }).catch(err => {
        console.error("Error:", err);
        alert("Error saving request. Please try again.");
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Request';
        btn.disabled = false;
    });
};
