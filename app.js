// --- ENVIRONMENT CONFIGURATION (PRODUCTION READINESS) ---
// The system auto-detects if you are running locally or on the live Vercel domain.
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "";
const API_BASE_URL = "https://moneyed-backend.onrender.com"; // CONNECTED TO RENDER

// --- FIREBASE DATABASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCNvpsTa9fd_IcVgbw_FVxTa_sATilRIRc",
  authDomain: "moneyedweb.web.app",
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

// Mock Initial Leads for CRM Demonstration
const mockLeads = [
    {
        id: "L-1024",
        name: "Amit Sharma",
        phone: "9876543210",
        city: "Delhi NCR",
        empType: "salaried",
        income: 85000,
        company: "TCS",
        companyCat: "A",
        loanReq: 500000,
        cibil: 745,
        obligations: 20000,
        pincode: "110001",
        source: "Eligibility Check",
        status: "New",
        date: "2026-05-23",
        remarks: "Customer has a high interest personal loan with HDFC. Looking for Balance Transfer options.",
        history: [{ date: "2026-05-23", text: "Lead registered via online Eligibility form." }]
    },
    {
        id: "L-1025",
        name: "Priya Patel",
        phone: "9812345678",
        city: "Mumbai",
        empType: "salaried",
        income: 120000,
        company: "Google India",
        companyCat: "A",
        loanReq: 1500000,
        cibil: 790,
        obligations: 15000,
        pincode: "400001",
        source: "CIBIL Analyzer",
        status: "Approved",
        date: "2026-05-22",
        remarks: "Excellent credit score. Matches HDFC & Bajaj policies perfectly. Axis approved interest rate at 10.25%.",
        history: [
            { date: "2026-05-22", text: "Lead registered via CIBIL Analyzer manual entry." },
            { date: "2026-05-23", text: "Axis loan pre-approved. Sent options to client." }
        ]
    },
    {
        id: "L-1026",
        name: "Vikram Singh",
        phone: "8899001122",
        city: "Jaipur",
        empType: "self-employed",
        income: 60000,
        company: "Singh Trading Corp",
        companyCat: "D",
        loanReq: 300000,
        cibil: 610,
        obligations: 30000,
        pincode: "302001",
        source: "Booking Consultation",
        status: "Follow-Up",
        date: "2026-05-21",
        remarks: "FOIR is high at 50%. CIBIL is weak due to past write-off in credit card. Advised CIBIL consolidation call.",
        history: [
            { date: "2026-05-21", text: "Lead created via call booking request." },
            { date: "2026-05-22", text: "Called client. Explained high-FOIR risk. Scheduled debt restructing discussion." }
        ]
    }
];

// Document Ready Initialization
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
    setupCalculators();
    setupCibilUpload();
    setupBookingCalendar();
});

// App Base Configuration
function initApp() {
    // Load leads database from LocalStorage
    const storedLeads = localStorage.getItem("moneyed_leads");
    if (storedLeads) {
        leads = JSON.parse(storedLeads);
    } else {
        leads = [...mockLeads];
        localStorage.setItem("moneyed_leads", JSON.stringify(leads));
    }
    
    // Update global CRM metrics
    updateCrmStats();
    renderCrmTable();
    
    // Load cities database
    loadCities();
    
    // Initialize Theme
    initTheme();
}

async function loadCities() {
    try {
        const response = await fetch('cities.json');
        indiaCities = await response.json();
        setupCityAutocomplete();
    } catch (e) {
        console.error("Failed to load cities JSON:", e);
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
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            switchTab(tabId);
            
            // Close mobile menu if open
            const sidebar = document.getElementById("app-sidebar");
            if (sidebar.classList.contains("menu-open")) {
                sidebar.classList.remove("menu-open");
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
    currentTab = tabId;
    
    // Toggle Active State in Navigation List
    document.querySelectorAll(".nav-item").forEach(item => {
        if (item.getAttribute("data-tab") === tabId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Toggle Visible Tab Pane
    document.querySelectorAll(".tab-pane").forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add("active");
        } else {
            pane.classList.remove("active");
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
            subtitleEl.textContent = "Reserve a 1-on-1 call with Nakul Verma to structure your loans.";
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

// 3. CALCULATORS SUITE LOGIC
function setupCalculators() {
    // Calculators Sub-tabs Toggle
    document.querySelectorAll(".sub-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const container = btn.closest(".calculator-sub-tabs").nextElementSibling;
            
            // Switch tabs
            btn.closest(".calculator-sub-tabs").querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Toggle panes
            const subtabId = btn.getAttribute("data-subtab");
            document.querySelectorAll(".sub-tab-pane").forEach(pane => {
                if (pane.id === subtabId) {
                    pane.classList.add("active");
                } else {
                    pane.classList.remove("active");
                }
            });
        });
    });

    // EMI Calculator sync inputs
    const emiAmountRange = document.getElementById("emi-amount");
    const emiAmountVal = document.getElementById("emi-amount-val");
    const emiRoiRange = document.getElementById("emi-roi");
    const emiRoiVal = document.getElementById("emi-roi-val");
    const emiTenureRange = document.getElementById("emi-tenure");
    const emiTenureVal = document.getElementById("emi-tenure-val");

    function runEmiCalc() {
        const principal = parseFloat(emiAmountVal.value) || 0;
        const roi = parseFloat(emiRoiVal.value) || 0;
        const tenureYrs = parseFloat(emiTenureVal.value) || 0;

        const monthlyRate = roi / (12 * 100);
        const totalMonths = tenureYrs * 12;

        let emi = 0;
        if (monthlyRate > 0) {
            emi = principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
        } else {
            emi = principal / totalMonths;
        }

        const totalPayable = emi * totalMonths;
        const totalInterest = totalPayable - principal;

        document.getElementById("calc-emi-result").textContent = Math.round(emi).toLocaleString('en-IN');
        document.getElementById("calc-principal-result").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(principal).toLocaleString('en-IN')}`;
        document.getElementById("calc-interest-result").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(totalInterest).toLocaleString('en-IN')}`;
        document.getElementById("calc-payable-result").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(totalPayable).toLocaleString('en-IN')}`;
        
        if (typeof generateEmiSchedule === "function") {
            generateEmiSchedule(principal, monthlyRate, totalMonths, emi);
        }
    }

    // Sync functions
    function syncInputRange(input, range, callback) {
        input.addEventListener("input", () => {
            range.value = input.value;
            callback();
        });
        range.addEventListener("input", () => {
            input.value = range.value;
            callback();
        });
    }

    syncInputRange(emiAmountVal, emiAmountRange, runEmiCalc);
    syncInputRange(emiRoiVal, emiRoiRange, runEmiCalc);
    syncInputRange(emiTenureVal, emiTenureRange, runEmiCalc);
    runEmiCalc();

    // Balance Transfer savings calc trigger
    const btInputs = ["bt-current-pos", "bt-current-roi", "bt-current-months", "bt-target-roi", "bt-target-months"];
    btInputs.forEach(id => {
        document.getElementById(id).addEventListener("input", calculateBtSavings);
    });
    calculateBtSavings();

    // FOIR Calc inputs triggers
    const foirInputs = ["foir-income", "foir-rent", "foir-other-emi", "foir-cc-due"];
    foirInputs.forEach(id => {
        document.getElementById(id).addEventListener("input", runFoirCalc);
    });
    runFoirCalc();
    
    // Part-Payment listeners
    const ppInputs = ["pp-principal", "pp-roi", "pp-months", "pp-amount"];
    ppInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculatePartPayment);
    });
    if (document.getElementById("pp-principal")) calculatePartPayment();
    
    // Hybrid OD listeners
    const odInputs = ["od-limit", "od-roi", "od-tenure", "od-withdrawn", "od-month-check"];
    odInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateHybridOD);
    });
    if (document.getElementById("od-limit")) calculateHybridOD();
}

// Balance Transfer Savings Logic
function calculateBtSavings() {
    const pos = parseFloat(document.getElementById("bt-current-pos").value) || 0;
    const currentRoi = parseFloat(document.getElementById("bt-current-roi").value) || 0;
    const currentMonths = parseFloat(document.getElementById("bt-current-months").value) || 0;
    const targetRoi = parseFloat(document.getElementById("bt-target-roi").value) || 0;
    const targetMonths = parseFloat(document.getElementById("bt-target-months").value) || 0;

    if (pos <= 0 || currentRoi <= 0 || currentMonths <= 0 || targetRoi <= 0 || targetMonths <= 0) {
        return;
    }

    // Calculate current EMI
    const rCurrent = currentRoi / (12 * 100);
    const emiCurrent = pos * rCurrent * Math.pow(1 + rCurrent, currentMonths) / (Math.pow(1 + rCurrent, currentMonths) - 1);
    const totalPayableCurrent = emiCurrent * currentMonths;
    const totalInterestCurrent = totalPayableCurrent - pos;

    // Calculate target EMI
    const rTarget = targetRoi / (12 * 100);
    const emiTarget = pos * rTarget * Math.pow(1 + rTarget, targetMonths) / (Math.pow(1 + rTarget, targetMonths) - 1);
    const totalPayableTarget = emiTarget * targetMonths;
    const totalInterestTarget = totalPayableTarget - pos;

    const interestSaved = Math.max(0, totalInterestCurrent - totalInterestTarget);
    const monthlySaving = Math.max(0, emiCurrent - emiTarget);

    document.getElementById("bt-savings-result").textContent = Math.round(interestSaved).toLocaleString('en-IN');
    document.getElementById("bt-current-emi").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(emiCurrent).toLocaleString('en-IN')}`;
    document.getElementById("bt-new-emi").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(emiTarget).toLocaleString('en-IN')}`;
    document.getElementById("bt-monthly-saving").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(monthlySaving).toLocaleString('en-IN')} / mo`;

    // Update global state & Dashboard Opportunity Card
    userProfile.savings = Math.round(interestSaved);
    document.getElementById("home-savings-val").textContent = Math.round(interestSaved).toLocaleString('en-IN');
}

function applyForBT() {
    const pos = document.getElementById("bt-current-pos").value;
    const currentRoi = document.getElementById("bt-current-roi").value;
    const savings = document.getElementById("bt-savings-result").textContent;

    // Auto set scheduler topic and fill booking info
    document.getElementById("book-topic").value = "Debt Consolidation";
    
    // Auto lead insertion on booking tab click
    switchTab('booking-tab');
    
    // Alert info
    alert(`Transfer request details loaded for ₹${parseFloat(pos).toLocaleString('en-IN')}. Estimated interest savings are ₹${savings}. Please complete consultation booking to submit files.`);
}

// FOIR Calculation Logic
function runFoirCalc() {
    const income = parseFloat(document.getElementById("foir-income").value) || 0;
    const rent = parseFloat(document.getElementById("foir-rent").value) || 0;
    const otherEmi = parseFloat(document.getElementById("foir-other-emi").value) || 0;
    const ccOutstanding = parseFloat(document.getElementById("foir-cc-due").value) || 0;

    if (income <= 0) return;

    // Obligations includes 5% of credit card outstandings as standard bank rule
    const ccObligation = ccOutstanding * 0.05;
    const totalObligations = rent + otherEmi + ccObligation;
    const foir = Math.round((totalObligations / income) * 100);

    const resultEl = document.getElementById("foir-result-val");
    const badgeEl = document.getElementById("foir-status-badge");
    const descEl = document.getElementById("foir-alert-text");

    resultEl.textContent = `${foir}%`;
    
    if (foir <= 40) {
        badgeEl.textContent = "Safe Profile";
        badgeEl.className = "badge text-green";
        descEl.innerHTML = `Your fixed obligations constitute <strong>${foir}%</strong> of your net income. This is considered healthy, and you have significant borrowing bandwidth.`;
    } else if (foir <= 55) {
        badgeEl.textContent = "Moderate Risk";
        badgeEl.className = "badge text-yellow";
        descEl.innerHTML = `Obligations are at <strong>${foir}%</strong>. Bajaj & HDFC might approve your loan but require Category A employer verification.`;
    } else {
        badgeEl.textContent = "Critical Overload";
        badgeEl.className = "badge text-red";
        descEl.innerHTML = `Obligations are high at <strong>${foir}%</strong>. It's difficult to get approved for standard personal loans. A debt consolidation call with Nakul Verma is highly recommended.`;
    }
}

function syncFoirToDashboard() {
    const foirText = document.getElementById("foir-result-val").textContent;
    const foirVal = parseInt(foirText);
    
    userProfile.foir = foirVal;
    document.getElementById("home-foir-val").textContent = foirText;
    
    const foirBar = document.getElementById("home-foir-bar");
    foirBar.style.width = `${Math.min(100, foirVal)}%`;
    
    const dashboardBadge = document.getElementById("home-foir-badge");
    if (foirVal <= 40) {
        foirBar.style.backgroundColor = "var(--brand-green)";
        dashboardBadge.textContent = "Safe Profile";
        dashboardBadge.className = "badge text-green";
    } else if (foirVal <= 55) {
        foirBar.style.backgroundColor = "var(--accent-yellow)";
        dashboardBadge.textContent = "Moderate Risk";
        dashboardBadge.className = "badge text-yellow";
    } else {
        foirBar.style.backgroundColor = "#dc3545";
        dashboardBadge.textContent = "Critical Overload";
        dashboardBadge.className = "badge text-red";
    }
    
    alert("FOIR Score synced to Home Dashboard successfully!");
}

// Part-Payment Savings Calculator Logic
function calculatePartPayment() {
    const principal = parseFloat(document.getElementById("pp-principal").value) || 0;
    const roi = parseFloat(document.getElementById("pp-roi").value) || 0;
    const months = parseFloat(document.getElementById("pp-months").value) || 0;
    const defaultPartPayment = parseFloat(document.getElementById("pp-amount").value) || 0;

    if (principal <= 0 || roi <= 0 || months <= 0) return;

    const r = roi / (12 * 100);
    const emi = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
    const originalTotalInterest = (emi * months) - principal;

    window.ppCustomPayments = window.ppCustomPayments || {};
    if (window.lastDefaultPP !== defaultPartPayment) {
        window.ppCustomPayments = {};
        window.lastDefaultPP = defaultPartPayment;
    }

    const tbody = document.getElementById("pp-schedule-body");
    let balance = principal;
    let schedule = [];
    let newTotalInterest = 0;
    let newMonths = 0;

    if (tbody) tbody.innerHTML = "";

    for (let m = 1; m <= months; m++) {
        let interest = balance * r;
        let principalPaid = emi - interest;
        
        let ppThisMonth = window.ppCustomPayments[m] !== undefined ? window.ppCustomPayments[m] : (m === 1 ? defaultPartPayment : 0);
        let totalPaidThisMonth = principalPaid + ppThisMonth;
        
        if (balance - totalPaidThisMonth < 0) {
            totalPaidThisMonth = balance;
            ppThisMonth = Math.max(0, totalPaidThisMonth - principalPaid);
        }
        
        let closing = balance - totalPaidThisMonth;
        if (closing < 0) closing = 0;
        
        schedule.push({
            Month: m,
            Opening: balance,
            EMI: emi,
            PartPayment: ppThisMonth,
            Interest: interest,
            Principal: totalPaidThisMonth,
            Closing: closing
        });
        
        newTotalInterest += interest;
        newMonths = m;

        let isEditable = document.getElementById("pp-toggle") ? document.getElementById("pp-toggle").value === 'yes' : false;
        let disabledAttr = isEditable ? '' : 'disabled';

        if (tbody) {
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${m}</td>
                <td>${formatCurrency(balance)}</td>
                <td>${formatCurrency(emi)}</td>
                <td>
                    <input type="number" class="table-inline-input" value="${ppThisMonth === 0 ? '' : ppThisMonth}" placeholder="0" data-month="${m}" onchange="updateCustomPP(this.getAttribute('data-month'), this.value)" ${disabledAttr}>
                </td>
                <td>${formatCurrency(interest)}</td>
                <td>${formatCurrency(totalPaidThisMonth)}</td>
                <td>${formatCurrency(closing)}</td>
            `;
            tbody.appendChild(tr);
        }
        
        balance = closing;
        if (balance <= 0) break;
    }
    window.scheduleData.pp = schedule;

    const interestSaved = Math.max(0, originalTotalInterest - newTotalInterest);
    const tenureSaved = Math.max(0, months - newMonths);

    document.getElementById("pp-interest-saved").textContent = Math.round(interestSaved).toLocaleString('en-IN');
    document.getElementById("pp-old-interest").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(originalTotalInterest).toLocaleString('en-IN')}`;
    document.getElementById("pp-new-interest").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(newTotalInterest).toLocaleString('en-IN')}`;
    document.getElementById("pp-tenure-saved").textContent = `${Math.ceil(tenureSaved)} Months`;
}

window.togglePP = function() {
    calculatePartPayment();
    if(document.getElementById('pp-toggle').value === 'yes') {
        document.getElementById('pp-schedule-container').scrollIntoView({behavior: 'smooth', block: 'start'});
    }
}

window.updateCustomPP = function(month, val) {
    let amount = parseFloat(val) || 0;
    
    if (window.scheduleData && window.scheduleData.pp && window.scheduleData.pp[month - 1]) {
        const maxAllowed = 0.99 * window.scheduleData.pp[month - 1].Opening;
        if (amount > maxAllowed) {
            amount = maxAllowed;
            alert("Part-payment cannot exceed 99% of the outstanding balance (₹ " + Math.round(maxAllowed).toLocaleString('en-IN') + ")");
        }
    }
    
    window.ppCustomPayments = window.ppCustomPayments || {};
    window.ppCustomPayments[month] = amount;
    calculatePartPayment();
}

// Hybrid Dropline Overdraft Logic
function updateODFixedText() {
    const select = document.getElementById("od-fixed-months");
    const display = document.getElementById("od-fixed-text-display");
    if (select && display) {
        display.textContent = select.options[select.selectedIndex].text;
    }
}
function calculateHybridOD() {
    const limit = parseFloat(document.getElementById("od-limit").value) || 0;
    const roi = parseFloat(document.getElementById("od-roi").value) || 0;
    let tenure = parseInt(document.getElementById("od-tenure").value) || 0;
    const initialWithdrawn = parseFloat(document.getElementById("od-withdrawn").value) || 0;
    
    const fixedMonthsSelect = document.getElementById("od-fixed-months");
    const fixedMonths = fixedMonthsSelect ? parseInt(fixedMonthsSelect.value) : 12;
    
    // Auto-calculate check month based on tenure and fixed period
    let checkMonth = Math.max(1, tenure - fixedMonths);
    const monthCheckEl = document.getElementById("od-month-check");
    if(monthCheckEl) monthCheckEl.value = checkMonth;
    
    // Update Fixed Period Display in Results
    const dispFixedEl = document.getElementById("od-disp-fixed-period");
    if(dispFixedEl) dispFixedEl.textContent = fixedMonths + " Months";

    if (limit <= 0 || roi <= 0 || tenure <= 0) return;

    window.odCustomWithdrawals = window.odCustomWithdrawals || {};
    window.odCustomDeposits = window.odCustomDeposits || {};
    if (window.lastInitialWithdrawn !== initialWithdrawn) {
        window.odCustomWithdrawals = {};
        window.odCustomDeposits = {};
        window.lastInitialWithdrawn = initialWithdrawn;
    }

    const tbody = document.getElementById("od-schedule-body");
    if (tbody) tbody.innerHTML = "";

    let dropAmount = 0;
    if (tenure > fixedMonths) {
        dropAmount = limit / (tenure - fixedMonths);
    }

    let schedule = [];
    let currentLimit = limit;
    let balance = initialWithdrawn; 
    let limitAtMonth = limit;
    let month1Interest = 0;

    for (let m = 1; m <= tenure; m++) {
        if (m > fixedMonths) {
            currentLimit = Math.max(0, currentLimit - dropAmount);
        }
        
        let userWithdrawal = window.odCustomWithdrawals[m] !== undefined ? window.odCustomWithdrawals[m] : 0;
        let userDeposit = window.odCustomDeposits[m] !== undefined ? window.odCustomDeposits[m] : 0;
        
        let limitDropThisMonth = m > fixedMonths ? dropAmount : 0;
        let availableLimit = Math.max(0, currentLimit - balance);
        
        let opening = balance;
        balance += userWithdrawal - userDeposit;
        
        let forcedDeposit = 0;
        if (balance > currentLimit) {
            forcedDeposit = balance - currentLimit;
            balance = currentLimit;
        }
        
        let interest = balance * (roi / 100) / 12;
        if (m === 1) month1Interest = interest;
        if (m === checkMonth) limitAtMonth = currentLimit;
        
        let installment = interest + forcedDeposit;
        
        schedule.push({
            Month: m,
            Limit: currentLimit,
            LimitDrop: limitDropThisMonth,
            AvailableLimit: availableLimit,
            Opening: opening + forcedDeposit,
            Withdrawal: userWithdrawal - forcedDeposit,
            PartPayment: userDeposit,
            Installment: installment,
            Principal: forcedDeposit,
            Interest: interest,
            Closing: balance
        });
        
        let isEditable = document.getElementById("od-toggle") ? document.getElementById("od-toggle").value === 'yes' : false;
        let disabledAttr = isEditable ? '' : 'disabled';

        if (tbody) {
            let tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${m}</td>
                <td>${formatCurrency(currentLimit)}</td>
                <td>${formatCurrency(limitDropThisMonth)}</td>
                <td>${formatCurrency(availableLimit)}</td>
                <td>${formatCurrency(opening + forcedDeposit)}</td>
                <td>
                    <input type="number" class="table-inline-input ${forcedDeposit > 0 ? 'text-red' : ''}" 
                           value="${userWithdrawal !== 0 ? userWithdrawal : ''}" 
                           placeholder="${forcedDeposit > 0 ? '-'+Math.round(forcedDeposit) : '0'}" 
                           data-month="${m}" 
                           onchange="updateCustomODWithdrawal(this.getAttribute('data-month'), this.value)" ${disabledAttr}>
                </td>
                <td>
                    <input type="number" class="table-inline-input" 
                           value="${userDeposit !== 0 ? userDeposit : ''}" 
                           placeholder="0" 
                           data-month="${m}" 
                           onchange="updateCustomODDeposit(this.getAttribute('data-month'), this.value)" ${disabledAttr}>
                </td>
                <td>${formatCurrency(installment)}</td>
                <td>${formatCurrency(forcedDeposit)}</td>
                <td>${formatCurrency(interest)}</td>
                <td>${formatCurrency(balance)}</td>
            `;
            tbody.appendChild(tr);
        }
        
        if (currentLimit <= 0 && balance <= 0 && m > fixedMonths) break;
    }
    window.scheduleData.od = schedule;

    document.getElementById("od-monthly-interest").textContent = Math.round(month1Interest).toLocaleString('en-IN');
    document.getElementById("od-disp-month").textContent = checkMonth;
    document.getElementById("od-limit-at-month").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(limitAtMonth).toLocaleString('en-IN')}`;
    document.getElementById("od-drop-amount").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(dropAmount).toLocaleString('en-IN')}`;
}

window.toggleOD = function() {
    calculateHybridOD();
    if(document.getElementById('od-toggle').value === 'yes') {
        document.getElementById('od-schedule-container').scrollIntoView({behavior: 'smooth', block: 'start'});
    }
}

window.updateCustomODWithdrawal = function(month, val) {
    let amount = parseFloat(val) || 0;
    if (window.scheduleData && window.scheduleData.od && window.scheduleData.od[month - 1]) {
        const row = window.scheduleData.od[month - 1];
        const maxWithdrawal = row.AvailableLimit;
        if (amount > maxWithdrawal) {
            amount = maxWithdrawal;
            alert("Withdrawal cannot exceed Available Limit (₹ " + Math.round(maxWithdrawal).toLocaleString('en-IN') + ")");
        }
    }
    window.odCustomWithdrawals = window.odCustomWithdrawals || {};
    window.odCustomWithdrawals[month] = amount;
    calculateHybridOD();
}

window.updateCustomODDeposit = function(month, val) {
    let amount = parseFloat(val) || 0;
    if (window.scheduleData && window.scheduleData.od && window.scheduleData.od[month - 1]) {
        const row = window.scheduleData.od[month - 1];
        const maxDeposit = 0.99 * row.Opening;
        if (amount > maxDeposit) {
            amount = maxDeposit;
            alert("Part-payment cannot exceed 99% of the outstanding balance (₹ " + Math.round(maxDeposit).toLocaleString('en-IN') + ")");
        }
    }
    window.odCustomDeposits = window.odCustomDeposits || {};
    window.odCustomDeposits[month] = amount;
    calculateHybridOD();
}

// Global variable to store uploaded PDF file (sent only when user clicks "Run CIBIL Assessment")
window.pendingCibilFile = null;

function setupCibilUpload() {
    const dropZone = document.getElementById("cibil-drop-zone");
    const fileInput = document.getElementById("cibil-file-input");

    dropZone.addEventListener("click", () => fileInput.click());

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--brand-green)";
        dropZone.style.backgroundColor = "rgba(31, 164, 99, 0.05)";
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.style.borderColor = "rgba(15, 92, 59, 0.3)";
        dropZone.style.backgroundColor = "rgba(15, 92, 59, 0.01)";
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "rgba(15, 92, 59, 0.3)";
        dropZone.style.backgroundColor = "rgba(15, 92, 59, 0.01)";
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === "application/pdf") {
            storeCibilFile(files[0]);
        } else {
            alert("Only PDF format report uploads are supported.");
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            storeCibilFile(fileInput.files[0]);
        }
    });
}

// STEP 1: User uploads PDF — we just store it and show confirmation
function storeCibilFile(fileObj) {
    window.pendingCibilFile = fileObj;
    const placeholder = document.getElementById("cibil-placeholder");
    placeholder.innerHTML = `
        <i class="fa-regular fa-file-pdf text-red" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
        <h4 style="color: var(--brand-green);">✅ PDF Ready: ${fileObj.name}</h4>
        <p class="text-secondary" style="font-size: 13px;">Click <strong>"Run CIBIL Assessment"</strong> below to extract data</p>
        <div class="secure-badge margin-top-sm">Secure DPDP Parsing</div>
    `;
}

// STEP 2: User clicks "Run CIBIL Assessment" — NOW we send to backend
async function handleRealCibilUpload(fileObj) {
    const fileName = fileObj.name;
    const placeholder = document.getElementById("cibil-placeholder");

    placeholder.innerHTML = `
        <div class="spinner-container">
            <i class="fa-solid fa-circle-notch fa-spin spinner-icon" style="color:var(--brand-green); font-size: 2.5rem;"></i>
            <h4 class="margin-top-md">Analyzing CIBIL PDF...</h4>
            <p id="upload-status-desc" style="color:var(--brand-gold); font-weight:600;">Extracting data... (0s)</p>
        </div>
    `;

    // Real-time animation timer
    let seconds = 0;
    const timerInterval = setInterval(() => {
        seconds++;
        const desc = document.getElementById("upload-status-desc");
        if (desc) {
            if (seconds < 10) desc.innerHTML = `Uploading securely... (${seconds}s)`;
            else if (seconds < 35) desc.innerHTML = `Server is waking up (Free tier takes ~40s)... (${seconds}s)`;
            else desc.innerHTML = `Almost done parsing document... (${seconds}s)`;
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);

    const formData = new FormData();
    formData.append("file", fileObj);

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload-cibil`, {
            method: "POST",
            body: formData,
        });

        clearInterval(timerInterval);

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const data = await response.json();
        console.log("✅ CIBIL Backend Response:", data);

        // Restore drop zone with success indicator
        placeholder.innerHTML = `
            <i class="fa-regular fa-file-pdf text-red" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
            <h4 style="color: var(--brand-green);">✅ Parsed: ${fileName}</h4>
            <p class="text-secondary" style="font-size: 13px;">or click to upload a new PDF</p>
            <div class="secure-badge margin-top-sm">Secure DPDP Parsing</div>
        `;

        if (data.error && !data.score) {
            alert("⚠️ " + data.error);
            return;
        }

        const score     = data.score || 0;
        const summary   = data.summary || {};
        const enquiries = summary.enquiries_90d || 0;
        const hasOverdue = (summary.total_overdue || 0) > 0;
        const accounts  = data.accounts || [];

        // CC Utilization
        let ccUtil = 0;
        const ccAccounts = accounts.filter(a => a.AccountType && a.AccountType.toLowerCase().includes('credit card'));
        if (ccAccounts.length > 0) {
            const totalLimit = ccAccounts.reduce((s, a) => s + (a.CreditLimit || a.SanctionedAmount || 0), 0);
            const totalBal   = ccAccounts.reduce((s, a) => s + (a.CurrentBalance || 0), 0);
            if (totalLimit > 0) ccUtil = Math.round((totalBal / totalLimit) * 100);
        }

        // Auto-fill form fields with parsed values
        document.getElementById("cibil-manual-score").value   = score;
        document.getElementById("cibil-manual-enq").value     = enquiries;
        document.getElementById("cibil-manual-overdue").value = hasOverdue ? "yes" : "no";
        document.getElementById("cibil-manual-cc-util").value = ccUtil;

        // Show analysis panel + table
        analyzeCibilData(score, enquiries, hasOverdue ? "yes" : "no", ccUtil);
        document.getElementById("cibil-parsed-results").style.display = "block";
        populateCibilMegaTable(fileName, data);

        // Clear pending file
        window.pendingCibilFile = null;

    } catch (err) {
        clearInterval(timerInterval);
        console.error("CIBIL upload error:", err);
        placeholder.innerHTML = `
            <i class="fa-regular fa-file-pdf text-red" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
            <h4>Drag & Drop CIBIL PDF Report</h4>
            <p class="text-secondary" style="font-size: 13px;">or click to select file from device</p>
            <div class="secure-badge margin-top-sm">Secure DPDP Parsing</div>
        `;
        alert("⚠️ Backend server is starting up. Please wait 30 seconds and click 'Run CIBIL Assessment' again.");
        window.pendingCibilFile = fileObj; // Keep file so user can retry
    }
}

function analyzeCibilData(forcedScore, forcedEnq, forcedOverdue, forcedCcUtil) {
    // If a PDF is pending (user uploaded PDF but hasn't sent it yet), send it now
    if (window.pendingCibilFile && forcedScore === undefined) {
        handleRealCibilUpload(window.pendingCibilFile);
        return;
    }

    const score = forcedScore || parseInt(document.getElementById("cibil-manual-score").value) || 700;
    const enquiries = forcedEnq !== undefined ? forcedEnq : parseInt(document.getElementById("cibil-manual-enq").value) || 0;
    const overdue = forcedOverdue || document.getElementById("cibil-manual-overdue").value;
    const ccUtil = forcedCcUtil !== undefined ? forcedCcUtil : parseInt(document.getElementById("cibil-manual-cc-util").value) || 0;

    // Show results panel
    document.getElementById("cibil-placeholder").classList.add("hidden");
    document.getElementById("cibil-results-pane").classList.remove("hidden");

    // Update UI elements
    const scoreBadge = document.getElementById("cibil-score-badge");
    scoreBadge.textContent = score;

    const verdictBox = document.getElementById("cibil-verdict-box");
    const verdictText = document.getElementById("cibil-verdict-text");

    let status = "Excellent";
    let borderClass = "border-green";
    
    if (score >= 750) {
        status = "Excellent - Super Prime";
        borderClass = "border-green";
        verdictText.textContent = "Your credit history is strong. You will easily get the lowest ROI rates on balance transfer and fresh personal loans.";
    } else if (score >= 700) {
        status = "Good Credit Standing";
        borderClass = "border-green";
        verdictText.textContent = "Your credit rating is healthy. Lenders will approve standard loans, though some premium features might check employer categorizations.";
    } else if (score >= 650) {
        status = "Average Credit rating";
        borderClass = "border-yellow";
        verdictText.textContent = "You show moderate loan risk. Lenders may request bank statement proof or limit loan eligibility. Restructuring advice recommended.";
    } else {
        status = "Weak Credit Profile";
        borderClass = "border-red";
        verdictText.textContent = "High default risk flagged. Active overdues or delayed payments are impacting score. Traditional banks will reject directly. Debt consolidation structured via NBFC is best option.";
    }

    verdictBox.className = `cibil-verdict-box ${borderClass}`;
    verdictBox.querySelector("strong").innerHTML = `<i class="fa-solid fa-circle-info"></i> Credit Score Verdict: ${status}`;

    // Render flags
    const flagsList = document.getElementById("cibil-flags-list");
    flagsList.innerHTML = "";

    const tipsList = document.getElementById("cibil-tips-list");
    tipsList.innerHTML = "";

    let hasFlags = false;

    if (overdue === "yes") {
        hasFlags = true;
        flagsList.innerHTML += `<li class="flag-red"><i class="fa-solid fa-circle-exclamation"></i> <strong>Critical Default:</strong> Overdue amount or settled/written-off accounts found in report history.</li>`;
        tipsList.innerHTML += `<li><i class="fa-solid fa-triangle-exclamation text-yellow"></i> <p>Request a <strong>NOC (No Objection Certificate)</strong> by paying the settlement outstanding amount immediately.</p></li>`;
    }

    if (ccUtil > 50) {
        hasFlags = true;
        flagsList.innerHTML += `<li class="flag-yellow"><i class="fa-solid fa-triangle-exclamation"></i> <strong>High Card Limit Utilization:</strong> Cards utilized at ${ccUtil}%. Ideal limit is under 30%.</li>`;
        tipsList.innerHTML += `<li><i class="fa-solid fa-circle-arrow-up"></i> <p>Try to prepay card dues before the statement date to lower report utilization percentage.</p></li>`;
    }

    if (enquiries > 4) {
        hasFlags = true;
        flagsList.innerHTML += `<li class="flag-yellow"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Hard Enquiries Overload:</strong> ${enquiries} inquiries found in last 90 days. Indicates credit hunger.</li>`;
        tipsList.innerHTML += `<li><i class="fa-solid fa-calendar-minus"></i> <p>Avoid making multiple direct loan applications on portal sites. It triggers hard pulls and drops score.</p></li>`;
    }

    if (!hasFlags) {
        flagsList.innerHTML = `<li class="text-green"><i class="fa-solid fa-check-circle"></i> Clean report. No negative flags found.</li>`;
        tipsList.innerHTML = `<li><i class="fa-solid fa-arrow-trend-up"></i> <p>Continue maintaining current payment discipline.</p></li>`;
    }

    tipsList.innerHTML += `<li><i class="fa-solid fa-circle-check"></i> <p>Review active loan statements once a year to ensure zero reporting errors from banks.</p></li>`;
    // Sync to Dashboard and apply theme
    userProfile.cibil = score;
    applyCibilTheme(score);
    document.getElementById("home-cibil-val").textContent = score;
    
    const scorePct = Math.max(0, Math.min(100, ((score - 300) / 600) * 100));
    const dashOffset = 126 - (126 * (scorePct / 100));
    document.getElementById("cibil-dial-fill").style.strokeDashoffset = dashOffset;
    document.getElementById("home-cibil-desc").innerHTML = `Your credit history is rated <strong>${status.split(" ")[0]}</strong>. Parser identified ${enquiries} recent inquiries.`;

    // Also show the accounts table section (if not already visible from PDF upload)
    const parsedResultsSection = document.getElementById("cibil-parsed-results");
    if (parsedResultsSection) {
        parsedResultsSection.style.display = "block";
        // If table is still empty (no PDF uploaded), show a helpful guide row
        const tbody = document.getElementById("cibil-mega-table-body");
        if (tbody && tbody.innerHTML.trim() === "") {
            const summaryGrid = document.getElementById("cibil-summary-grid");
            if (summaryGrid && summaryGrid.innerHTML.trim() === "") {
                summaryGrid.innerHTML = `
                    <div class="form-group"><label>CIBIL Score (Manual)</label><div class="${score >= 750 ? 'text-green' : score >= 700 ? 'text-gold' : 'text-red'}" style="font-weight:700; font-size:1.3em;">${score}</div></div>
                    <div class="form-group"><label>Enquiries (90 days)</label><div class="${enquiries > 3 ? 'text-red' : 'text-green'}">${enquiries}</div></div>
                    <div class="form-group"><label>Overdue Status</label><div class="${overdue === 'yes' ? 'text-red' : 'text-green'}">${overdue === 'yes' ? '⚠ Active Overdue' : '✓ Clean'}</div></div>
                    <div class="form-group"><label>CC Utilization</label><div class="${ccUtil > 50 ? 'text-red' : 'text-green'}">${ccUtil}%</div></div>
                `;
            }
            tbody.innerHTML = `
                <tr><td colspan="30" style="text-align:center; padding:40px; color: var(--text-secondary);">
                    <i class="fa-solid fa-file-arrow-up text-gold" style="font-size:2rem; display:block; margin-bottom:12px;"></i>
                    <strong>Upload your CIBIL PDF above</strong> to auto-extract all account rows into this table.<br>
                    <small style="margin-top:8px; display:block;">Manual mode shows score analysis only. PDF upload extracts full account-wise data.</small>
                </td></tr>
            `;
        }
    }
}

function populateCibilMegaTable(fileName, data) {
    const summary  = (data && data.summary)  || {};
    const accounts = (data && data.accounts) || [];
    const score    = data && data.score;
    const today    = new Date().toLocaleDateString('en-IN');

    // 1. Fill Summary Dashboard with REAL data
    const summaryGrid = document.getElementById("cibil-summary-grid");
    if (summaryGrid) {
        const scoreColor = score >= 750 ? 'text-green' : score >= 700 ? 'text-gold' : 'text-red';
        summaryGrid.innerHTML = `
            <div class="form-group"><label>Report Parsed On</label><div class="text-gold" style="font-weight:600;">${today}</div></div>
            <div class="form-group"><label>CIBIL Pulled Date</label><div class="text-mint" style="font-weight:600;">${summary.report_date || 'Not Found'}</div></div>
            <div class="form-group"><label>CIBIL Score</label><div class="${scoreColor}" style="font-weight:700; font-size:1.3em;">${score || 'Not Found'}</div></div>
            <div class="form-group"><label>Name</label><div style="font-weight:600;">${summary.name || 'Not Found'}</div></div>
            <div class="form-group"><label>PAN Card No</label><div>${summary.pan || 'Not Found'}</div></div>
            <div class="form-group"><label>Date of Birth</label><div>${summary.dob || 'Not Found'}</div></div>
            <div class="form-group"><label>Mobile</label><div>${summary.mobile || 'Not Found'}</div></div>
            <div class="form-group"><label>Total Accounts</label><div>${summary.total_accounts || accounts.length}</div></div>
            <div class="form-group"><label>Active Accounts</label><div>${summary.active_accounts || '-'}</div></div>
            <div class="form-group"><label>Total Outstanding</label><div class="text-gold" style="font-weight:600;">₹${(summary.total_outstanding || 0).toLocaleString('en-IN')}</div></div>
            <div class="form-group"><label>Total Overdue</label><div class="${(summary.total_overdue || 0) > 0 ? 'text-red' : 'text-green'}" style="font-weight:600;">₹${(summary.total_overdue || 0).toLocaleString('en-IN')}</div></div>
            <div class="form-group"><label>Enquiries (90 days)</label><div class="${(summary.enquiries_90d || 0) > 3 ? 'text-red' : 'text-green'}">${summary.enquiries_90d || 0} Enquiries</div></div>
            <div class="form-group"><label>Source File</label><div style="font-size:12px; word-break:break-all;">${fileName}</div></div>
        `;
    }

    // 2. Fill Enquiries Table
    const inqTbody = document.getElementById("cibil-inquiries-table-body");
    const recentEnquiries = summary.recent_enquiries || [];
    if (inqTbody) {
        if (recentEnquiries.length === 0) {
            inqTbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:15px; color:var(--text-secondary);">No recent inquiries found.</td></tr>`;
        } else {
            inqTbody.innerHTML = recentEnquiries.map(eq => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding:10px;">${eq.Date}</td>
                    <td style="padding:10px; font-weight:600;">${eq.Institution}</td>
                </tr>
            `).join('');
        }
    }

    // 3. Fill Active & All Tables
    const activeTbody = document.getElementById("cibil-active-table-body");
    const allTbody = document.getElementById("cibil-all-table-body");
    if (!activeTbody || !allTbody) return;

    if (accounts.length === 0) {
        activeTbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--text-secondary);">No active accounts found.</td></tr>`;
        allTbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--text-secondary);">No accounts found.</td></tr>`;
        return;
    }

    const fmt = (n) => n > 0 ? '₹' + Number(n).toLocaleString('en-IN') : '-';
    
    // Helper to format DPD (Payment History)
    const formatDPD = (historyStr) => {
        if (!historyStr || historyStr === "-") return "-";
        const blocks = historyStr.split(' ');
        return blocks.map(b => {
            // Check if it's a number > 000
            const isLate = /^[0-9]{3}$/.test(b) && b !== "000";
            if (isLate) return `<span style="background:rgba(255,0,0,0.25); color:#ff6b6b; padding:2px 4px; border-radius:3px; margin:1px; display:inline-block; font-size:11px;">${b}</span>`;
            return `<span style="color:var(--text-secondary); margin:1px; display:inline-block; font-size:11px;">${b}</span>`;
        }).join('');
    };

    let activeHTML = "";
    let allHTML = "";

    accounts.forEach(a => {
        const isClosed   = (a.PaymentStatus || '').toLowerCase().includes('closed');
        const isNPA      = ['sub-standard','doubtful','loss','written off','settled', 'settlement'].some(s => (a.PaymentStatus || '').toLowerCase().includes(s));
        
        let rowStyle = "border-bottom: 1px solid rgba(255,255,255,0.05);";
        if (isNPA) {
            rowStyle += " background: rgba(139, 0, 0, 0.4) !important; color: #ffe5e5;";
        }
        
        const statusClass = isClosed ? 'text-charcoal' : isNPA ? 'text-red' : 'text-green';
        
        const rowHTMLActive = `
        <tr style="${rowStyle}">
            <td style="padding:10px; font-weight:600;">${a.BankName || '-'}</td>
            <td style="padding:10px;">${a.AccountType || '-'}</td>
            <td style="padding:10px; font-family:monospace;">${a.AccountNumber || '-'}</td>
            <td style="padding:10px;">${a.Ownership || 'Individual'}</td>
            <td style="padding:10px;">${fmt(a.CreditLimit)}</td>
            <td style="padding:10px;">${fmt(a.SanctionedAmount)}</td>
            <td style="padding:10px;">${fmt(a.HighCredit)}</td>
            <td style="padding:10px; font-weight:bold;">${fmt(a.CurrentBalance)}</td>
            <td style="padding:10px; color:${a.AmountOverdue > 0 ? 'var(--red)' : 'inherit'}; font-weight:${a.AmountOverdue > 0 ? '700' : 'normal'}">${fmt(a.AmountOverdue)}</td>
            <td style="padding:10px;">${fmt(a.EMI)}</td>
            <td style="padding:10px;">${a.DateOpened || '-'}</td>
            <td style="padding:10px;"><span class="badge ${statusClass}" style="${isNPA ? 'background:rgba(255,0,0,0.3); border-color:rgba(255,0,0,0.5);' : ''}">${a.PaymentStatus || '-'}</span></td>
            <td style="padding:10px; max-width:250px; line-height:1.4;">${formatDPD(a.PaymentHistory)}</td>
        </tr>`;

        const rowHTMLAll = `
        <tr style="${rowStyle}">
            <td style="padding:10px; font-weight:600;">${a.BankName || '-'}</td>
            <td style="padding:10px;">${a.AccountType || '-'}</td>
            <td style="padding:10px; font-family:monospace;">${a.AccountNumber || '-'}</td>
            <td style="padding:10px;">${a.Ownership || 'Individual'}</td>
            <td style="padding:10px;">${fmt(a.CreditLimit)}</td>
            <td style="padding:10px;">${fmt(a.SanctionedAmount)}</td>
            <td style="padding:10px;">${fmt(a.HighCredit)}</td>
            <td style="padding:10px; font-weight:bold;">${fmt(a.CurrentBalance)}</td>
            <td style="padding:10px; color:${a.AmountOverdue > 0 ? 'var(--red)' : 'inherit'}; font-weight:${a.AmountOverdue > 0 ? '700' : 'normal'}">${fmt(a.AmountOverdue)}</td>
            <td style="padding:10px;">${fmt(a.EMI)}</td>
            <td style="padding:10px;">${a.DateOpened || '-'}</td>
            <td style="padding:10px;">${a.DateClosed || '-'}</td>
            <td style="padding:10px;"><span class="badge ${statusClass}" style="${isNPA ? 'background:rgba(255,0,0,0.3); border-color:rgba(255,0,0,0.5);' : ''}">${a.PaymentStatus || '-'}</span></td>
            <td style="padding:10px; max-width:250px; line-height:1.4;">${formatDPD(a.PaymentHistory)}</td>
        </tr>`;

        if (!isClosed) activeHTML += rowHTMLActive;
        allHTML += rowHTMLAll;
    });

    activeTbody.innerHTML = activeHTML || `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--text-secondary);">No active accounts.</td></tr>`;
    allTbody.innerHTML = allHTML || `<tr><td colspan="15" style="text-align:center; padding:30px; color:var(--text-secondary);">No accounts found.</td></tr>`;
}

function exportCibilToExcel(type) {
    if (!window.XLSX) {
        alert("Export module not loaded. Please wait.");
        return;
    }
    
    // Default to active if type not provided
    type = type || 'active';
    const tableId = type === 'active' ? "cibil-active-table" : "cibil-all-table";
    let table = document.getElementById(tableId);
    if (!table) return;

    // Use SheetJS table_to_book helper
    let wb = XLSX.utils.table_to_book(table, {sheet: type === 'active' ? "Live Accounts" : "All Accounts"});
    XLSX.writeFile(wb, `Moneyed_CIBIL_${type}_Accounts.xlsx`);
}

// 5. WALNUT-STYLE EXPENSE TRACKER
window.expenseTransactions = [];

function autoCategorizeExpense() {
    const noteEl = document.getElementById("exp-note");
    const catEl = document.getElementById("exp-category");
    if (!noteEl || !catEl) return;
    
    const text = noteEl.value.toLowerCase();
    const wantsKeywords = ['zomato', 'swiggy', 'netflix', 'amazon', 'movie', 'game', 'party', 'dinner', 'shopping', 'myntra', 'flipkart'];
    const needsKeywords = ['uber', 'ola', 'petrol', 'fuel', 'rent', 'electricity', 'water', 'bill', 'grocery', 'blinkit', 'milk'];
    
    let isWant = wantsKeywords.some(kw => text.includes(kw));
    let isNeed = needsKeywords.some(kw => text.includes(kw));
    
    if (isWant) catEl.value = 'wants';
    else if (isNeed) catEl.value = 'needs';
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
        if (sums[tx.category] !== undefined) {
            sums[tx.category] += tx.amount;
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
        filteredTxs = window.expenseTransactions.filter(tx => tx.category === filterVal);
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
            let catName = tx.category.charAt(0).toUpperCase() + tx.category.slice(1);
            let icon = 'fa-wallet';
            if (tx.category === 'needs') icon = 'fa-bolt';
            if (tx.category === 'wants') icon = 'fa-gift';
            if (tx.category === 'savings') icon = 'fa-piggy-bank';
            
            return `
                <div class="transaction-item">
                    <div class="tx-left">
                        <div class="tx-icon ${tx.category}">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div class="tx-details">
                            <strong>${tx.note || catName}</strong>
                            <span>${new Date(tx.date).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} • ${catName}</span>
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

        console.log("AI Coach Data Loaded", window.aiCoachData);
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
    let greeting = "Namaste! I am the Moneyed AI Coach, backed by the financial expertise of Founder Nakul Verma and Co-Founder Priyanka Verma. Ask me any personal finance or loan queries in English, Hindi, or Hinglish!";
    
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

    if (!selectedBookingDate || !selectedBookingSlot) {
        alert("Please select both advisory date and available time slot.");
        return;
    }
    if (!name || !phone) {
        alert("Please provide contact details to reserve phone slot.");
        return;
    }

    // Save lead booking into database
    const newBookingLead = {
        id: `L-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name,
        phone: phone,
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

    leads.unshift(newBookingLead);
    localStorage.setItem("moneyed_leads", JSON.stringify(leads));

    alert(`Consultation Scheduled! Nakul Verma's team will call you on ${selectedBookingDate} during the slot: ${selectedBookingSlot}. Confirmation SMS sent to ${phone}.`);
    
    // Clean fields
    document.getElementById("book-name").value = "";
    document.getElementById("book-phone").value = "";
    document.querySelectorAll(".date-btn, .slot-btn").forEach(b => b.classList.remove("active"));
    selectedBookingDate = "";
    selectedBookingSlot = "";

    // Sync CRM
    updateCrmStats();
    renderCrmTable();
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

function clearAllLeads() {
    if (confirm("Are you sure you want to restore initial mock leads database? This deletes custom items.")) {
        localStorage.removeItem("moneyed_leads");
        // Clear theme class on reset
        document.body.className = "";
        initApp();
        alert("Database reset completed.");
    }
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
        let interest = balance * monthlyRate;
        let principalPaid = emi - interest;
        
        // Handle last month rounding
        if (m === totalMonths || balance - principalPaid < 0) {
            principalPaid = balance;
            emi = principalPaid + interest;
        }
        
        let closing = balance - principalPaid;
        if (closing < 0) closing = 0;
        
        schedule.push({
            Month: m,
            Opening: balance,
            EMI: emi,
            Interest: interest,
            Principal: principalPaid,
            Closing: closing
        });
        
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
function initTheme() {
    const savedTheme = localStorage.getItem('moneyed_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
        document.getElementById('theme-toggle-btn').innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove('theme-dark');
        document.getElementById('theme-toggle-btn').innerHTML = '<i class="fa-solid fa-moon"></i>';
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
}



// 9. GOOGLE AUTH & UI UPDATES
function openLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function updateUIOnLogin(user) {
    // Update the Sidebar Button
    const loginContainer = document.getElementById('login-btn-container');
    if (loginContainer) {
        loginContainer.innerHTML = `
            <a class="nav-link" style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${user.photoURL}" style="width:24px; height:24px; border-radius:50%;">
                    <span style="font-size:12px;">${user.displayName.split(' ')[0]}</span>
                </div>
                <i class="fa-solid fa-right-from-bracket" title="Logout" onclick="logoutUser(event)" style="color:var(--text-secondary); cursor:pointer;"></i>
            </a>
        `;
        loginContainer.onclick = null; // Remove the openLoginModal click
    }

    // Admin Check for CRM Console
    const adminEmails = ["nakulsverma@gmail.com", "help@moneyed.co.in"];
    if (adminEmails.includes(user.email)) {
        const crmItem = document.getElementById('nav-crm-item');
        if (crmItem) crmItem.style.display = 'block';
    }
}

function logoutUser(e) {
    if(e) e.stopPropagation();
    auth.signOut().then(() => {
        window.location.reload();
    });
}

// Listen for auth state changes (Keeps user logged in after refresh)
auth.onAuthStateChanged((user) => {
    if (user) {
        updateUIOnLogin(user);
    }
});

function initiateGoogleLogin() {
    document.getElementById('firebase-notice').style.display = 'none'; 
    
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            const user = result.user;
            
            // Save user to Firebase Realtime Database
            db.ref('users/' + user.uid).set({
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                lastLogin: new Date().toISOString()
            });

            closeLoginModal();
            updateUIOnLogin(user);
            
            setTimeout(() => {
                alert(`Welcome to Moneyed, ${user.displayName}! A welcome email will be dispatched shortly.`);
            }, 100);
            
        })
        .catch((error) => {
            console.error("Firebase Login Error:", error);
            alert("Login failed: " + error.message);
        });
}
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('desktop-sidebar-toggle');
    const appContainer = document.querySelector('.app-container');
    if (toggleBtn && appContainer) {
        toggleBtn.addEventListener('click', () => {
            appContainer.classList.toggle('sidebar-collapsed');
        });
    }
});
