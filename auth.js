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
        let photo = user.photoURL || 'https://ui-avatars.com/api/?name=User&background=1fa463&color=fff';
        let name = user.displayName ? user.displayName.split(' ')[0] : (user.phoneNumber || 'User');
        
        loginContainer.innerHTML = `
            <a class="nav-link" style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${photo}" style="width:24px; height:24px; border-radius:50%;">
                    <span style="font-size:12px; font-weight: 600; color: var(--text-color);">${name}</span>
                </div>
                <div class="logout-btn" onclick="logoutUser(event)" style="cursor:pointer; background:rgba(255,59,48,0.1); padding:4px 8px; border-radius:6px; color:var(--red);">
                    <i class="fa-solid fa-power-off" title="Logout"></i>
                </div>
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

    // Show Profile Completion Banner
    const profileBanner = document.getElementById('profile-completion-banner');
    if (profileBanner) profileBanner.style.display = 'flex';
    
    // Explicitly hide login modal just in case
    closeLoginModal();
}

function logoutUser(e) {
    if(e) e.stopPropagation();
    auth.signOut().then(() => {
        window.location.reload();
    });
}

// Listen for auth state changes (Keeps user logged in after refresh)
if (typeof auth !== 'undefined' && auth !== null) {
    try {
        auth.onAuthStateChanged((user) => {
            if (user) {
                updateUIOnLogin(user);
            }
        });
    } catch(e) {
        console.warn("Firebase Auth Error:", e);
    }
}

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
            
        })
        .catch((error) => {
            console.error("Firebase Login Error:", error);
            alert("Login failed: " + error.message);
        });
}


// --- Authentication UI Flow (V4) ---

let appVerifier;
let confirmationResult;

function initRecaptcha() {
    if (!appVerifier) {
        appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible'
        });
        appVerifier.render().catch(console.error);
    }
}

function requestOTP() {
    const phoneInput = document.getElementById("auth-phone-input").value;
    const errorSpan = document.getElementById("auth-phone-error");
    
    if (phoneInput.length !== 10) {
        if(errorSpan) {
            errorSpan.style.display = "block";
        } else {
            alert("Please enter a valid 10-digit mobile number.");
        }
        return;
    }
    if(errorSpan) errorSpan.style.display = "none";
    
    initRecaptcha();
    
    const phoneNumber = "+91" + phoneInput;
    const btn = document.querySelector("button[onclick='requestOTP()']");
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;
    btn.disabled = true;
    
    auth.signInWithPhoneNumber(phoneNumber, appVerifier)
        .then((result) => {
            confirmationResult = result;
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            // Switch to step 2
            document.getElementById("auth-display-phone").textContent = "+91 " + phoneInput;
            document.getElementById("auth-step-1").style.display = "none";
            document.getElementById("auth-step-2").style.display = "block";
            
            // Focus first OTP box
            setTimeout(() => {
                document.querySelector(".otp-box").focus();
            }, 100);
        })
        .catch((error) => {
            console.error("Error sending OTP:", error);
            alert("Error sending OTP: " + error.message + "\n\nMake sure Phone Auth is enabled in Firebase Console.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            if(appVerifier) {
                appVerifier.render().then(widgetId => grecaptcha.reset(widgetId)).catch(console.error);
            }
        });
}

function editPhone() {
    document.getElementById("auth-step-2").style.display = "none";
    document.getElementById("auth-step-1").style.display = "block";
}

function moveToNextOTP(current, index) {
    if (current.value.length === 1) {
        const nextBox = document.querySelectorAll(".otp-box")[index];
        if (nextBox) nextBox.focus();
    }
}

function verifyOTP(current) {
    if (current.value.length === 1) {
        const inputs = document.querySelectorAll(".otp-box");
        let code = "";
        inputs.forEach(input => code += input.value);
        
        if (code.length === 6) {
            confirmationResult.confirm(code).then((result) => {
                const user = result.user;
                closeLoginModal();
                updateUIOnLogin(user);
            }).catch((error) => {
                console.error("OTP Verification Error:", error);
                alert("Invalid OTP. Please try again.");
                inputs.forEach(input => input.value = '');
                inputs[0].focus();
            });
        }
    }
}

function mockBiometricLogin() {
    // In a real app, this would trigger WebAuthn
    const btn = document.querySelector(".auth-bio-btn");
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Scanning Face ID...`;
    
    setTimeout(() => {
        btn.innerHTML = `<i class="fa-solid fa-check" style="color: var(--brand-green);"></i> Verified`;
        setTimeout(() => {
            unlockDashboard();
        }, 500);
    }, 1500);
}

function unlockDashboard() {
    const overlay = document.getElementById("auth-overlay");
    overlay.classList.remove("active");
    setTimeout(() => {
        // Welcome notification
        showNotification("Welcome back! Your data is synced.", "success");
    }, 400); // Wait for transition
}

function openAuthModal() {
    const overlay = document.getElementById("auth-overlay");
    overlay.classList.add("active");
    // Reset to step 1
    document.getElementById("auth-step-2").style.display = "none";
    document.getElementById("auth-step-1").style.display = "block";
    document.getElementById("auth-phone-input").value = "";
}

function closeAuthModal() {
    const overlay = document.getElementById("auth-overlay");
    overlay.classList.remove("active");
}

/* -------------------------------------
   LEAD GENERATION MODAL LOGIC (V5)
   ------------------------------------- */

function openLeadModal() {
    console.log("openLeadModal triggered");
    const modal = document.getElementById("lead-gen-modal");
    if (!modal) {
        console.error("lead-gen-modal not found in DOM");
        return;
    }
    modal.style.display = "flex";
    
    // Slight delay for animation
    setTimeout(() => {
        modal.classList.add("active");
    }, 10);
    
    // Reset to step 1
    const step1 = document.getElementById("lead-step-1");
    const step2 = document.getElementById("lead-step-2");
    const step3 = document.getElementById("lead-step-3");
    const successStep = document.getElementById("lead-step-success");
    
    if(step1) step1.style.display = "block";
    if(step2) step2.style.display = "none";
    if(step3) step3.style.display = "none";
    if(successStep) successStep.style.display = "none";
    
    updateLeadProgress(1);
}

function closeLeadModal() {
    const modal = document.getElementById("lead-gen-modal");
    modal.classList.remove("active");
    
    setTimeout(() => {
        modal.style.display = "none";
    }, 400); // Wait for CSS transition
}

function nextLeadStep(step) {
    document.querySelectorAll('.lead-step').forEach(el => el.style.display = 'none');
    const targetStep = document.getElementById(`lead-step-${step}`);
    if(targetStep) {
        targetStep.style.display = 'block';
        updateLeadProgress(step);
    }
}

function prevLeadStep(step) {
    document.querySelectorAll('.lead-step').forEach(el => el.style.display = 'none');
    const targetStep = document.getElementById(`lead-step-${step}`);
    if(targetStep) {
        targetStep.style.display = 'block';
        updateLeadProgress(step);
    }
}

function updateLeadProgress(step) {
    const bar = document.getElementById("lead-progress-bar");
    const totalSteps = 3;
    
    // Update width
    if (step === 1 && bar) bar.style.width = "33%";
    if (step === 2 && bar) bar.style.width = "66%";
    if (step === 3 && bar) bar.style.width = "100%";
    
    // Update indicators
    for(let i=1; i<=totalSteps; i++) {
        const ind = document.getElementById(`step-ind-${i}`);
        if(ind) {
            ind.classList.remove('active', 'completed');
            if(i < step) ind.classList.add('completed');
            if(i === step) ind.classList.add('active');
        }
    }
}

function submitLeadForm() {
    const btn = document.getElementById("submit-lead-btn");
    
    // Get values
    const name = document.getElementById("lead-name").value;
    const phone = document.getElementById("lead-phone").value;
    const type = document.getElementById("lead-type").value;
    
    if(!name || phone.length !== 10 || !type) {
        alert("Please fill all details correctly.");
        return;
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;
    
    // Save to Firebase and Google Sheets
    const sheetURL = "https://script.google.com/macros/s/AKfycbzYWaSAYI_7yJ9U91KNRXfqPbaQCJeyzrPf1NJoPcJWnkANhA0E0bgsjZUQQQU076dQbg/exec";
    const payload = {
        name: name,
        phone: phone,
        loanType: type,
        timestamp: new Date().toISOString(),
        status: 'New'
    };

    try {
        db.ref('leads').push(payload).catch(e => console.log("Firebase DB Error:", e));
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
        console.error("Sheets Error:", err);
        alert("Error saving request. Please try again.");
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Request';
        btn.disabled = false;
    });
}

