// 3. CALCULATORS SUITE LOGIC
function setupCalculators() {
    // Calculators Sub-tabs Toggle (Desktop)
    document.querySelectorAll(".sub-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            // Switch tabs
            btn.closest(".calculator-sub-tabs").querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Toggle panes
            const subtabId = btn.getAttribute("data-subtab");
            window.switchSubTab(subtabId);
            
            // Sync mobile dropdown
            const mobileSelect = document.getElementById("calc-mobile-select");
            if (mobileSelect) mobileSelect.value = subtabId;
        });
    });

    // Mobile Dropdown Sub-tab logic
    window.switchSubTab = function(subtabId) {
        document.querySelectorAll(".sub-tab-pane").forEach(pane => {
            if (pane.id === subtabId) {
                pane.classList.add("active");
            } else {
                pane.classList.remove("active");
            }
        });
        
        // Sync desktop buttons if triggered from mobile
        document.querySelectorAll(".sub-tab-btn").forEach(btn => {
            if (btn.getAttribute("data-subtab") === subtabId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    };

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
        const totalMonths = parseFloat(emiTenureVal.value) || 0;

        const monthlyRate = roi / (12 * 100);

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

        // Gamified Text Integration
        const gamifiedText = document.getElementById("gamified-emi-text");
        if(gamifiedText) {
            if (emi < 5000) {
                gamifiedText.innerHTML = `🎉 That's less than a weekend trip to Goa!`;
            } else if (emi >= 5000 && emi < 15000) {
                gamifiedText.innerHTML = `🛵 You can easily manage this (Costs like a new Scooter EMI)`;
            } else if (emi >= 15000 && emi < 30000) {
                gamifiedText.innerHTML = `🚗 Equivalent to a brand new Baleno EMI!`;
            } else if (emi >= 30000 && emi < 60000) {
                gamifiedText.innerHTML = `🚙 You're in the Fortuner EMI territory now!`;
            } else {
                gamifiedText.innerHTML = `🏡 That's a full-sized Villa Mortgage!`;
            }
        }
        
        if (typeof generateEmiSchedule === "function") {
            generateEmiSchedule(principal, monthlyRate, totalMonths, emi);
        }
        
        // AI Insight for EMI
        const insightBox = document.getElementById("emi-ai-insight");
        const insightText = document.getElementById("emi-ai-text");
        if(insightBox && insightText && principal > 0) {
            let stepUpEmi = emi * 1.05;
            let yearsSaved = Math.max(1, Math.round(tenureYrs * 0.3));
            let intSaved = Math.max(10000, Math.round(totalInterest * 0.4));
            
            insightBox.style.display = "block";
            insightText.innerHTML = `If you increase your EMI by just <strong>5% every year</strong> (to <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${Math.round(stepUpEmi).toLocaleString('en-IN')} next year), you will finish your loan <strong>~${yearsSaved} years earlier</strong> and save approx <strong><i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${intSaved.toLocaleString('en-IN')}</strong> in interest!`;
        } else if (insightBox) {
            insightBox.style.display = "none";
        }

        // Auto-sync calculation data to CRM
        if (window.debouncedSyncToCRM) {
            window.debouncedSyncToCRM("EMI Calculator Run", {
                principal: principal,
                roi: roi,
                tenureMonths: totalMonths,
                emi: Math.round(emi),
                totalInterest: Math.round(totalInterest),
                details: `User ran EMI Calculator. Loan: ${principal}, ROI: ${roi}%, Tenure: ${totalMonths}m. EMI: ${Math.round(emi)}, Total Interest: ${Math.round(totalInterest)}`
            });
        }
    }

    // Sync functions with debounce to prevent lag
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    function syncInputRange(input, range, callback) {
        const debouncedCalc = debounce(callback, 50); // 50ms debounce
        input.addEventListener("input", () => {
            range.value = input.value;
            debouncedCalc();
        });
        range.addEventListener("input", () => {
            input.value = range.value;
            debouncedCalc();
        });
    }

    syncInputRange(emiAmountVal, emiAmountRange, runEmiCalc);
    syncInputRange(emiRoiVal, emiRoiRange, runEmiCalc);
    syncInputRange(emiTenureVal, emiTenureRange, runEmiCalc);
    runEmiCalc();

    // Balance Transfer savings calc trigger
    const btInputs = ["bt-current-pos", "bt-current-roi", "bt-current-months", "bt-target-roi", "bt-target-months"];
    btInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateBtSavings);
    });
    calculateBtSavings();

    // FOIR Calc inputs triggers
    const foirInputs = ["foir-income", "foir-rent", "foir-other-emi", "foir-cc-due"];
    foirInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", runFoirCalc);
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
    const odLimitEl = document.getElementById("od-limit");
    const odWithdrawnEl = document.getElementById("od-withdrawn");
    
    // Instant sync for visual feedback
    if (odLimitEl && odWithdrawnEl) {
        odLimitEl.addEventListener("input", () => {
            odWithdrawnEl.value = odLimitEl.value;
        });
    }

    const debouncedOD = debounce(calculateHybridOD, 100);
    const odInputs = ["od-limit", "od-roi", "od-tenure", "od-withdrawn", "od-month-check"];
    odInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", debouncedOD);
    });
    
    if (odLimitEl) calculateHybridOD();
}

// Balance Transfer Savings Logic
function calculateBtSavings() {
    const pos = parseFloat(document.getElementById("bt-current-pos").value) || 0;
    const currentRoi = parseFloat(document.getElementById("bt-current-roi").value) || 0;
    const currentMonths = parseFloat(document.getElementById("bt-current-months").value) || 0;
    const targetRoi = parseFloat(document.getElementById("bt-target-roi").value) || 0;
    const targetMonths = parseFloat(document.getElementById("bt-target-months").value) || 0;

    if (pos <= 0 || currentRoi <= 0 || currentMonths <= 0 || targetRoi <= 0 || targetMonths <= 0) {
        const resultEl = document.getElementById("bt-savings-result");
        if (resultEl) {
            resultEl.textContent = "0";
            document.getElementById("bt-current-emi").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>0`;
            document.getElementById("bt-new-emi").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>0`;
            document.getElementById("bt-monthly-saving").innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>0 / mo`;
        }
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
    
    // Auto-sync calculation data to CRM
    if (window.debouncedSyncToCRM) {
        window.debouncedSyncToCRM("BT Calculator Run", {
            pos: pos,
            currentRoi: currentRoi,
            currentMonths: currentMonths,
            targetRoi: targetRoi,
            targetMonths: targetMonths,
            savings: Math.round(interestSaved),
            details: `User ran Balance Transfer Calculator. POS: ${pos}, Current ROI: ${currentRoi}%, Target ROI: ${targetRoi}%. Est Savings: ${Math.round(interestSaved)}`
        });
    }
}

function applyForBT() {
    const pos = document.getElementById("bt-current-pos").value;
    const currentRoi = document.getElementById("bt-current-roi").value;
    const savings = document.getElementById("bt-savings-result").textContent;

    // Send to CRM
    window.syncToCRM("Balance Transfer Request", {
        pos: pos,
        currentRoi: currentRoi,
        estimatedSavings: savings,
        details: `Customer applied for Balance Transfer. Outstanding: ${pos}, ROI: ${currentRoi}, Savings: ${savings}`
    });

    // Auto set scheduler topic and fill booking info
    document.getElementById("book-topic").value = "Debt Consolidation";
    
    // Auto lead insertion on booking tab click
    switchTab('booking-tab');
    
    // Alert info
    alert(`Transfer request details loaded for ₹${parseFloat(pos).toLocaleString('en-IN')}. Estimated interest savings are ₹${savings}. Please complete consultation booking to submit files.`);
}

// FOIR Calculation Logic
function runFoirCalc() {
    analyticsTrack('calculate_foir_clicked');
    const income = parseFloat(document.getElementById("foir-income").value) || 0;
    const rent = parseFloat(document.getElementById("foir-rent").value) || 0;
    const otherEmi = parseFloat(document.getElementById("foir-other-emi").value) || 0;
    const ccOutstanding = parseFloat(document.getElementById("foir-cc-due").value) || 0;

    if (income <= 0) {
        const obVal = document.getElementById("foir-total-ob-val");
        if(obVal) obVal.textContent = "₹0";
        const resultEl = document.getElementById("foir-result-val");
        if(resultEl) resultEl.textContent = "0%";
        const badgeEl = document.getElementById("foir-status-badge");
        if(badgeEl) { badgeEl.textContent = ""; badgeEl.className = "badge"; }
        const descEl = document.getElementById("foir-alert-text");
        if(descEl) descEl.innerHTML = "Enter your net monthly income and existing obligations to see your FOIR score.";
        const ccHint = document.getElementById("foir-cc-hint");
        if(ccHint) ccHint.innerHTML = "";
        const insightBox = document.getElementById("foir-ai-insight");
        if (insightBox) insightBox.style.display = "none";
        return;
    }

    // Obligations includes 5% of credit card outstandings as standard bank rule
    const ccObligation = ccOutstanding * 0.05;
    const totalObligations = rent + otherEmi + ccObligation;
    const foir = Math.round((totalObligations / income) * 100);

    const ccHint = document.getElementById("foir-cc-hint");
    if (ccHint) {
        if (ccOutstanding > 0) {
            ccHint.innerHTML = `<i class="fa-solid fa-circle-info"></i> Bank assumes 5% (₹${Math.round(ccObligation).toLocaleString('en-IN')}) as your monthly CC obligation.`;
        } else {
            ccHint.innerHTML = "";
        }
    }

    const obVal = document.getElementById("foir-total-ob-val");
    if (obVal) obVal.textContent = `₹${Math.round(totalObligations).toLocaleString('en-IN')}`;

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

    // AI Insight for FOIR
    const insightBox = document.getElementById("foir-ai-insight");
    const insightText = document.getElementById("foir-ai-text");
    if(insightBox && insightText && (rent > 0 || otherEmi > 0 || ccObligation > 0)) {
        insightBox.style.display = "block";
        if (foir > 50) {
            insightText.innerHTML = `Your FOIR is high (${foir}%). <strong>Pro Tip:</strong> Paying off your smallest existing EMI will instantly lower your FOIR and can boost your new loan eligibility by lakhs!`;
        } else {
            insightText.innerHTML = `Your FOIR is safe (${foir}%). You have significant borrowing capacity left for future wealth-building assets like Real Estate.`;
        }
    } else if (insightBox) {
        insightBox.style.display = "none";
    }

    // Auto-sync calculation data to CRM
    if (window.debouncedSyncToCRM) {
        window.debouncedSyncToCRM("FOIR Calculator Run", {
            income: income,
            totalObligations: totalObligations,
            foir: foir,
            status: badgeEl.textContent,
            details: `User ran FOIR Calculator. Income: ${income}, Obligations: ${totalObligations}. FOIR: ${foir}% (${badgeEl.textContent})`
        });
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
    analyticsTrack('calculate_partpayment_clicked');
    const principal = parseFloat(document.getElementById("pp-principal").value) || 0;
    const roi = parseFloat(document.getElementById("pp-roi").value) || 0;
    const months = parseFloat(document.getElementById("pp-months").value) || 0;
    const defaultPartPayment = parseFloat(document.getElementById("pp-amount").value) || 0;

    if (principal <= 0 || roi <= 0 || months <= 0) {
        const resVal = document.getElementById("pp-result-val");
        if(resVal) resVal.textContent = "0";
        const intVal = document.getElementById("pp-interest-saved");
        if(intVal) intVal.textContent = "0";
        const tenVal = document.getElementById("pp-tenure-saved");
        if(tenVal) tenVal.textContent = "0";
        
        const tbody = document.getElementById("pp-schedule-body");
        if (tbody) tbody.innerHTML = "";
        return;
    } 

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
    const monthsSaved = Math.max(0, months - newMonths);

    const savedEl = document.getElementById("pp-interest-saved");
    if (savedEl) savedEl.textContent = Math.round(interestSaved).toLocaleString('en-IN');

    const gamifiedPP = document.getElementById("gamified-pp-text");
    if (gamifiedPP) {
        // Reset animation to trigger it again
        gamifiedPP.classList.remove("gamified-pop");
        void gamifiedPP.offsetWidth; // trigger reflow
        
        if (interestSaved > 0) {
            const gamifiedItems = [
                { t: 10000000, msg: "🚀 Financial Freedom achieved! Early retirement is calling!" },
                { t: 7500000, msg: "🏰 That's a luxury penthouse or a massive villa downpayment!" },
                { t: 5000000, msg: "🏙️ You just saved enough for a 2 BHK apartment in a metro city!" },
                { t: 3000000, msg: "🚘 A premium luxury SUV (like a Mercedes or BMW)!" },
                { t: 2000000, msg: "🏡 A spectacular studio apartment or real estate plot!" },
                { t: 1500000, msg: "🚙 A brand new premium top-model Sedan or SUV!" },
                { t: 1000000, msg: "💍 A dream destination wedding setup!" },
                { t: 750000, msg: "🚗 A solid downpayment for a brand new car!" },
                { t: 500000, msg: "🌍 A spectacular month-long family trip to Europe!" },
                { t: 300000, msg: "🏍️ A brand new premium sports bike!" },
                { t: 200000, msg: "✈️ A luxurious international vacation to Bali or Thailand!" },
                { t: 150000, msg: "💻 A high-end MacBook Pro for your work!" },
                { t: 100000, msg: "📱 A brand new flagship smartphone (like the latest iPhone)!" },
                { t: 75000, msg: "🎮 A massive 65-inch OLED TV plus a PlayStation 5!" },
                { t: 50000, msg: "📺 A premium 55-inch Smart TV for your living room!" },
                { t: 40000, msg: "👗 A completely revamped designer wardrobe!" },
                { t: 30000, msg: "⌚ A high-end smartwatch or fitness tracker!" },
                { t: 20000, msg: "📱 A brand new budget-friendly 5G smartphone!" },
                { t: 15000, msg: "🎧 Premium noise-cancelling headphones!" },
                { t: 10000, msg: "⛰️ A quick weekend getaway to the hills or beach!" },
                { t: 7500, msg: "👟 A pair of premium branded sneakers!" },
                { t: 5000, msg: "⛽ A full tank of petrol for your car!" },
                { t: 3000, msg: "🍝 A fancy weekend dinner date at a luxury restaurant!" },
                { t: 2000, msg: "🍿 6 months of premium Netflix subscription!" },
                { t: 1000, msg: "🍕 That's enough for a whole month of weekend pizza parties!" },
                { t: 500, msg: "🎬 Two premium movie tickets with popcorn combos!" },
                { t: 100, msg: "☕ A couple of fancy coffees at Starbucks!" },
                { t: 0, msg: "💰 Every single rupee saved is a rupee earned!" }
            ];

            const item = gamifiedItems.find(i => interestSaved >= i.t);
            gamifiedPP.innerHTML = item.msg;
            gamifiedPP.classList.add("gamified-pop");
        } else {
            gamifiedPP.innerHTML = ``;
        }
    }

    const oldIntEl = document.getElementById("pp-old-interest");
    if (oldIntEl) oldIntEl.innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em;"></i>${Math.round(originalTotalInterest).toLocaleString('en-IN')}`;
    
    const newIntEl = document.getElementById("pp-new-interest");
    if (newIntEl) newIntEl.innerHTML = `<i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em;"></i>${Math.round(newTotalInterest).toLocaleString('en-IN')}`;
    
    const tenureSavedEl = document.getElementById("pp-tenure-saved");
    if (tenureSavedEl) tenureSavedEl.textContent = `${monthsSaved} Months`;

    // AI Insight for Part Payment
    const insightBox = document.getElementById("partpay-ai-insight");
    const insightText = document.getElementById("partpay-ai-text");
    if(insightBox && insightText && defaultPartPayment > 0) {
        insightBox.style.display = "block";
        let roiVal = roi * 100;
        insightText.innerHTML = `Prepaying <i class="fa-solid fa-indian-rupee-sign" style="font-size: 0.9em; margin-right: 2px;"></i>${defaultPartPayment.toLocaleString('en-IN')} gives you a <strong>risk-free, tax-free return of ${roiVal.toFixed(1)}%</strong>! This is strictly better than keeping this money in a standard 7% FD.`;
    } else if (insightBox) {
        insightBox.style.display = "none";
    }

    // Auto-sync calculation data to CRM
    if (window.debouncedSyncToCRM) {
        window.debouncedSyncToCRM("Part Payment Calculator Run", {
            principal: principal,
            roi: roi,
            months: months,
            partPayment: defaultPartPayment,
            interestSaved: Math.round(interestSaved),
            tenureSaved: Math.ceil(tenureSaved),
            details: `User ran Part-Payment Calculator. Loan: ${principal}, ROI: ${roi}%, Tenure: ${months}m, PP: ${defaultPartPayment}. Saved: ${Math.round(interestSaved)} (${Math.ceil(tenureSaved)}m)`
        });
    }
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
    analyticsTrack('calculate_od_clicked');
    const limit = parseFloat(document.getElementById("od-limit").value) || 0;
    
    const withdrawnEl = document.getElementById("od-withdrawn");
    if(withdrawnEl && withdrawnEl.value != limit) withdrawnEl.value = limit;
    
    const roi = parseFloat(document.getElementById("od-roi").value) || 0;
    let tenure = parseInt(document.getElementById("od-tenure").value) || 0;
    const initialWithdrawn = limit; // Locked to total approved limit
    
    const fixedMonthsSelect = document.getElementById("od-fixed-months");
    const fixedMonths = fixedMonthsSelect ? parseInt(fixedMonthsSelect.value) : 12;
    
    // Auto-calculate check month based on tenure and fixed period
    let checkMonth = Math.max(1, tenure - fixedMonths);
    const monthCheckEl = document.getElementById("od-month-check");
    if(monthCheckEl) monthCheckEl.value = checkMonth;
    
    // Update Fixed Period Display in Results
    const dispFixedEl = document.getElementById("od-disp-fixed-period");
    if(dispFixedEl) dispFixedEl.textContent = fixedMonths + " Months";

    if (limit <= 0 || roi <= 0 || tenure <= 0) {
        const tbody = document.getElementById("od-schedule-body");
        if (tbody) tbody.innerHTML = "";
        const m1El = document.getElementById("od-month1-interest");
        if(m1El) m1El.innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i> 0`;
        const dropEl = document.getElementById("od-disp-drop-amount");
        if(dropEl) dropEl.innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i> 0`;
        const limitDispEl = document.getElementById("od-disp-limit-check");
        if(limitDispEl) limitDispEl.innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i> 0`;
        return;
    }

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

    // Gamified Text for OD
    const gamifiedOD = document.getElementById("gamified-od-text");
    if(gamifiedOD) {
        if (month1Interest < 2000) {
            gamifiedOD.innerHTML = `🍕 Basically the cost of a weekend pizza!`;
        } else if (month1Interest >= 2000 && month1Interest < 10000) {
            gamifiedOD.innerHTML = `📱 Like paying a premium smartphone EMI!`;
        } else if (month1Interest >= 10000 && month1Interest < 25000) {
            gamifiedOD.innerHTML = `💼 A very standard business expense.`;
        } else {
            gamifiedOD.innerHTML = `🏢 Corporate-level funding activated!`;
        }
    }

    // Auto-sync calculation data to CRM
    if (window.debouncedSyncToCRM) {
        window.debouncedSyncToCRM("Hybrid OD Calculator Run", {
            limit: limit,
            roi: roi,
            tenure: tenure,
            initialWithdrawn: initialWithdrawn,
            fixedMonths: fixedMonths,
            month1Interest: Math.round(month1Interest),
            details: `User ran Hybrid OD Calculator. Limit: ${limit}, ROI: ${roi}%, Tenure: ${tenure}m, Fixed: ${fixedMonths}m. Initial Drop: ${initialWithdrawn}. 1st Month Interest: ${Math.round(month1Interest)}`
        });
    }
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

// STEP 1: User uploads PDF — we auto-start parsing
function storeCibilFile(fileObj) {
    window.pendingCibilFile = fileObj;
    handleRealCibilUpload(fileObj);
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
            desc.innerHTML = `Parsing document securely... (${seconds}s)`;
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);

    // Backend API Parsing Logic
    try {
        const formData = new FormData();
        formData.append("pdf", fileObj);
        
        const response = await fetch("http://localhost:5001/api/cibil/upload", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.error || "Parsing failed on backend");
        }
        
        const data = result.data;
        
        clearInterval(timerInterval);
        
        // Restore drop zone with success indicator
        placeholder.innerHTML = `
            <i class="fa-regular fa-file-pdf text-red" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
            <h4 style="color: var(--brand-green);">✅ Successfully Parsed: ${fileName}</h4>
            <p class="text-secondary" style="font-size: 13px;">or click to upload a new PDF</p>
            <div class="secure-badge margin-top-sm">Secure Backend DPDP Parsing</div>
        `;

        const score     = data.score || 0;
        const summary   = {
            enquiries_90d: data.enquiries_90_days || 0,
            total_overdue: data.total_overdue > 0 ? 1 : 0,
            name: data.name || "Applicant",
            pan: data.pan || "N/A"
        };
        const enquiries = summary.enquiries_90d;
        const hasOverdue = summary.total_overdue > 0;
        const accounts  = data.accounts || [];

        // Note: The Python backend returns 'utilization_pct', but we'll recalculate here for UI consistency if needed, 
        // or just use data.utilization_pct directly.
        let ccUtil = data.utilization_pct || 0;

        // Show analysis panel + table
        analyzeCibilData(score, enquiries, hasOverdue ? "yes" : "no", ccUtil);
        document.getElementById("cibil-parsed-results").style.display = "block";
        
        // Pass data struct matching what frontend expects
        if(typeof populateCibilMegaTable === 'function') {
            populateCibilMegaTable(fileName, {score: score, summary: summary, accounts: accounts});
        }

        // Clear pending file
        window.pendingCibilFile = null;

    } catch (error) {
        clearInterval(timerInterval);
        placeholder.innerHTML = `
            <i class="fa-solid fa-circle-exclamation text-red" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
            <h4 style="color: #dc3545;">❌ Error Parsing PDF</h4>
            <p class="text-secondary" style="font-size: 13px;">Ensure backend is running. ${error.message}</p>
        `;
        console.error("CIBIL Parse Failed: ", error);
    }
}

function analyzeCibilData(forcedScore, forcedEnq, forcedOverdue, forcedCcUtil) {
    // If a PDF is pending (user uploaded PDF but hasn't sent it yet), send it now
    if (window.pendingCibilFile && forcedScore === undefined) {
        handleRealCibilUpload(window.pendingCibilFile);
        return;
    }

    const sIn = document.getElementById('cibil-manual-score');
    const score = forcedScore || (sIn ? parseInt(sIn.value) : 700) || 700;
    
    const eIn = document.getElementById('cibil-manual-enq');
    const enquiries = forcedEnq !== undefined ? forcedEnq : (eIn ? parseInt(eIn.value) : 0) || 0;
    
    const oIn = document.getElementById('cibil-manual-overdue');
    const overdue = forcedOverdue || (oIn ? oIn.value : "no") || "no";
    
    const cIn = document.getElementById('cibil-manual-cc-util');
    const ccUtil = forcedCcUtil !== undefined ? forcedCcUtil : (cIn ? parseInt(cIn.value) : 0) || 0;
    
    // Grab Monthly Income explicitly from UI
    const incomeInput = document.getElementById('cibil-manual-income');
    const income = incomeInput ? (parseFloat(incomeInput.value) || 50000) : 50000;
    
    // Estimate mock EMI
    // If no real data is parsed, we use a mock EMI of roughly 50% of 50k (i.e. 25k) as baseline, but adjust if income is vastly different.
    let estimatedEMI = 25000;
    if (income < 25000) estimatedEMI = income * 0.6; // Scale down mock
    if (income > 100000) estimatedEMI = income * 0.4; // Scale up mock
    
    // Adjust mock based on inputs
    if (ccUtil > 60) estimatedEMI += (income * 0.1); 
    if (overdue === "yes") estimatedEMI += (income * 0.2); 
    
    let foirPercentage = Math.round((estimatedEMI / income) * 100);
    if (foirPercentage > 100) foirPercentage = 100;
    
    // Update Dashboard FOIR Gauge (if exists on Home tab)
    const foirBadge = document.getElementById("home-foir-badge");
    const foirBar = document.getElementById("home-foir-bar");
    const foirVal = document.getElementById("home-foir-val");
    
    if (foirBadge && foirBar && foirVal) {
        foirVal.textContent = `${foirPercentage}%`;
        foirBar.style.width = `${foirPercentage}%`;
        if (foirPercentage <= 40) {
            foirBadge.textContent = "Safe Profile";
            foirBadge.className = "badge text-green";
            foirBar.style.background = "var(--brand-green)";
        } else if (foirPercentage <= 60) {
            foirBadge.textContent = "Borderline";
            foirBadge.className = "badge text-yellow";
            foirBar.style.background = "var(--yellow)";
        } else {
            foirBadge.textContent = "High Risk";
            foirBadge.className = "badge text-red";
            foirBar.style.background = "var(--red)";
        }
    }
    
    // Update the NEW CIBIL Results FOIR Box
    const foirBox = document.getElementById("cibil-foir-box");
    const foirTitle = document.getElementById("foir-verdict-title");
    const foirText = document.getElementById("foir-verdict-text");
    
    if (foirBox) {
        foirBox.style.display = "block";
        if (foirPercentage >= 65) {
            foirBox.className = "cibil-verdict-box border-red margin-top-md";
            foirBox.style.background = "rgba(220, 53, 69, 0.05)";
            foirTitle.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--red);"></i> Debt Burden: Critical (Reject / High Risk)`;
            foirText.innerHTML = `Your FOIR is <strong>${foirPercentage}%</strong> (Estimated EMI: ₹${Math.round(estimatedEMI)} on ₹${Math.round(income)} Income). This exceeds standard lending policies (>65%). <strong>Action required:</strong> You must restructure or close existing loans to become eligible.`;
        } else if (foirPercentage >= 50) {
            foirBox.className = "cibil-verdict-box border-yellow margin-top-md";
            foirBox.style.background = "rgba(243, 167, 18, 0.05)";
            foirTitle.innerHTML = `<i class="fa-solid fa-scale-unbalanced" style="color:var(--yellow);"></i> Debt Burden: Borderline`;
            foirText.innerHTML = `Your FOIR is <strong>${foirPercentage}%</strong>. Debt Consolidation is possible to reduce your monthly burden below 50% and free up cash flow.`;
        } else {
            foirBox.className = "cibil-verdict-box border-green margin-top-md";
            foirBox.style.background = "rgba(31, 164, 99, 0.05)";
            foirTitle.innerHTML = `<i class="fa-solid fa-scale-balanced" style="color:var(--brand-green);"></i> Debt Burden: Safe`;
            foirText.innerHTML = `Your FOIR is <strong>${foirPercentage}%</strong>. You have enough headroom for a new loan without violating policy limits. Consolidation may still save you interest.`;
        }
    }

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

    // Sync to unified CRM
    window.syncToCRM("CIBIL Check", {
        cibilScore: score,
        enquiries: enquiries,
        overdue: overdue,
        ccUtilization: ccUtil,
        verdict: status,
        details: `CIBIL checked. Score: ${score}, Enquiries: ${enquiries}, Utilization: ${ccUtil}%`
    });

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
            <div class="cibil-summary-card" style="border-left: 4px solid var(--brand-green);"><label>CIBIL Score</label><div class="value ${scoreColor}">${score || 'Not Found'}</div></div>
            <div class="cibil-summary-card"><label>Active Accounts</label><div class="value">${summary.active_accounts || '-'}</div></div>
            <div class="cibil-summary-card"><label>Recent Enquiries</label><div class="value ${(summary.enquiries_90d || 0) > 3 ? 'text-red' : 'text-green'}">${summary.enquiries_90d || 0}</div></div>
            <div class="cibil-summary-card"><label>Total Outstanding</label><div class="value text-gold">₹${(summary.total_outstanding || 0).toLocaleString('en-IN')}</div></div>
            <div class="cibil-summary-card"><label>Total Overdue</label><div class="value ${(summary.total_overdue || 0) > 0 ? 'text-red' : 'text-green'}">₹${(summary.total_overdue || 0).toLocaleString('en-IN')}</div></div>
            <div class="cibil-summary-card"><label>Total Accounts</label><div class="value" style="font-size: 1.1rem;">${summary.total_accounts || accounts.length}</div></div>
            <div class="cibil-summary-card"><label>CIBIL Date</label><div class="value text-mint" style="font-size: 1.1rem;">${summary.report_date || 'Not Found'}</div></div>
            <div class="cibil-summary-card"><label>Name</label><div class="value" style="font-size: 1.1rem;">${summary.name || 'Not Found'}</div></div>
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

window.generateEMISchedule = function() {
    const principal = parseFloat(document.getElementById("emi-amount-val").value) || 0;
    const roi = parseFloat(document.getElementById("emi-roi-val").value) || 0;
    const totalMonths = parseFloat(document.getElementById("emi-tenure-val").value) || 0;
    const monthlyRate = roi / 12 / 100;
    
    if (principal <= 0 || roi <= 0 || totalMonths <= 0) {
        const resVal = document.getElementById("emi-result-val");
        if(resVal) resVal.textContent = "0";
        const totalIntVal = document.getElementById("emi-total-interest-val");
        if(totalIntVal) totalIntVal.textContent = "0";
        const totalPayVal = document.getElementById("emi-total-payable-val");
        if(totalPayVal) totalPayVal.textContent = "0";
        return;
    }
    
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    
    const tbody = document.querySelector("#emi-schedule-table tbody");
    if (!tbody) return;
    
    let balance = principal;
    let html = "";
    
    for (let month = 1; month <= totalMonths; month++) {
        let interest = balance * monthlyRate;
        let principalPaid = emi - interest;
        
        let opening = balance;
        balance -= principalPaid;
        if (balance < 0) balance = 0;
        
        html += `
            <tr>
                <td>${month}</td>
                <td>₹${Math.round(opening).toLocaleString('en-IN')}</td>
                <td>₹${Math.round(emi).toLocaleString('en-IN')}</td>
                <td class="text-gold">₹${Math.round(interest).toLocaleString('en-IN')}</td>
                <td class="text-green">₹${Math.round(principalPaid).toLocaleString('en-IN')}</td>
                <td>₹${Math.round(balance).toLocaleString('en-IN')}</td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
    
    const container = document.getElementById("emi-schedule-container");
    if (container) {
        container.style.display = "block";
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};
