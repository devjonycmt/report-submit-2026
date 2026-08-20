// Supabase Configuration
const SUPABASE_URL = "https://gyybjzmbxmymajnpcqwv.supabase.co";
const SUPABASE_KEY = "sb_publishable_olnbtN1yKc3i_F_EL6GNzw_JZZZKMkb";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserId = localStorage.getItem("member_user_id");

// পেজ লোড হওয়ার সময় চেক করা ইউজার লগইন করা কি না
window.onload = function () {
  if (currentUserId) {
    showApp();
  } else {
    showLogin();
  }
};

function showLogin() {
  document.getElementById("login-container")?.classList.remove("hidden");
  document.getElementById("app-container")?.classList.add("hidden");
}

function showApp() {
  document.getElementById("login-container")?.classList.add("hidden");
  document.getElementById("app-container")?.classList.remove("hidden");
  fetchUserProfile();
  fetchFileHistory();
  fetchDashboardAndHistory();
  fetchWithdrawStats(); // এখানে যোগ করুন
  setDefaultDate();
}

// লগইন হ্যান্ডেল করার ফাংশন
async function handleLogin() {
  const usernameInput = document.getElementById("login-username").value.trim();
  const passwordInput = document.getElementById("login-password").value.trim();

  if (!usernameInput || !passwordInput) {
    alert("Please enter username and password!");
    return;
  }

  const { data, error } = await _supabase
    .from("profiles")
    .select("*")
    .eq("username", usernameInput)
    .eq("password", passwordInput)
    .single();

  if (error || !data) {
    alert("Invalid username or password!");
    return;
  }

  // লগইন সফল হলে আইডি লোকালস্টোরেজে সেভ করা
  localStorage.setItem("member_user_id", data.id);
  currentUserId = data.id;
  showApp();
}

// লগআউট হ্যান্ডেল করার ফাংশন
function handleLogout() {
  localStorage.removeItem("member_user_id");
  currentUserId = null;
  showLogin();
}

// বাংলাদেশি সময় নিশ্চিত করার জন্য ডেট ও টাইম ফরম্যাট ফাংশন
function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const parts = formatter.formatToParts(d);
  let day = "",
    month = "",
    year = "",
    hour = "",
    minute = "",
    dayPeriod = "";

  for (let part of parts) {
    if (part.type === "day") day = part.value;
    if (part.type === "month") month = part.value.toLowerCase();
    if (part.type === "year") year = part.value;
    if (part.type === "hour") hour = part.value;
    if (part.type === "minute") minute = part.value;
    if (part.type === "dayPeriod") dayPeriod = part.value.toLowerCase();
  }

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`;
}

// ট্যাব পরিবর্তনের ফাংশন
function switchTab(tabName) {
  const tabs = ["dashboard", "profile", "submit", "withdraw"];
  tabs.forEach((t) => {
    const tabEl = document.getElementById(`tab-${t}`);
    const btnEl = document.getElementById(`btn-${t}`);
    if (tabEl) tabEl.classList.add("hidden");
    if (btnEl) btnEl.classList.remove("bg-indigo-800");
  });

  const activeTab = document.getElementById(`tab-${tabName}`);
  const activeBtn = document.getElementById(`btn-${tabName}`);

  if (activeTab) activeTab.classList.remove("hidden");
  if (activeBtn) activeBtn.classList.add("bg-indigo-800");

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.innerText = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  }

  // Withdraw ট্যাবে গেলে ডেটা ফেচ হবে
  if (tabName === "withdraw") {
    fetchWithdrawStats();
  }
}

// প্রোফাইল লোড এবং ইউআই আপডেট করার ফাংশন
async function fetchUserProfile() {
  if (!currentUserId) return;

  // ১. ইউজারের বেসিক প্রোফাইল ফেচ করা
  const { data: profileData, error: profileError } = await _supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUserId)
    .single();

  if (profileError) return;

  if (profileData) {
    const profileNameEl = document.getElementById("user-profile-name");
    if (profileNameEl)
      profileNameEl.innerText = `User: ${profileData.full_name || "Member"}`;

    const profFullName = document.getElementById("prof-full-name");
    const profUsername = document.getElementById("prof-username");
    const profRole = document.getElementById("prof-role");

    if (profFullName) profFullName.innerText = profileData.full_name || "N/A";
    if (profUsername) profUsername.innerText = profileData.username || "N/A";
    if (profRole) profRole.innerText = profileData.role || "member";
  }

  // ২. file_submissions টেবিল থেকে ডেটা ফেচ করা
  const { data: submissions, error: subError } = await _supabase
    .from("file_submissions")
    .select("current_fund, good_count, bad_count, total_amount")
    .eq("user_id", currentUserId.toString());

  let totalIncome = 0;
  if (!subError && submissions) {
    let totalCurrentFund = 0;
    let lifetimeGood = 0;
    let badAccount = 0;

    submissions.forEach((row) => {
      totalCurrentFund += Number(row.current_fund || 0);
      lifetimeGood += Number(row.good_count || 0);
      badAccount += Number(row.bad_count || 0);
      totalIncome += Number(row.total_amount || 0);
    });

    // UI-তে অন্যান্য মানগুলো বসানো
    const profFund = document.getElementById("prof-fund");
    if (profFund) profFund.innerText = totalCurrentFund + " BDT";

    const lifetimeGoodEl = document.getElementById("lifetime-good-count");
    if (lifetimeGoodEl) lifetimeGoodEl.innerText = lifetimeGood;

    const badAccountEl = document.getElementById("bad-account-count");
    if (badAccountEl) badAccountEl.innerText = badAccount;

    const totalIncomeEl = document.getElementById("total-income");
    if (totalIncomeEl) totalIncomeEl.innerText = totalIncome + " BDT";
  }

  // ৩. উইথড্র টেবিল থেকে সফল উইথড্রগুলো ফেচ করা
  const { data: withdraws, error: withdrawError } = await _supabase
    .from("withdraws")
    .select("amount, status")
    .eq("user_id", currentUserId.toString());

  let totalSuccessWithdraw = 0;
  if (!withdrawError && withdraws) {
    withdraws.forEach((row) => {
      if (row.status === "success") {
        totalSuccessWithdraw += Number(row.amount || 0);
      }
    });
  }

  // ৪. Current Balance হিসাব করা এবং UI তে বসানো
  const currentBalance = totalIncome - totalSuccessWithdraw;
  const balanceEl = document.getElementById("prof-current-balance"); // এখানে আপনার HTML-এর ID টি দিবেন
  if (balanceEl) {
    balanceEl.innerText = currentBalance + " BDT";
  }
}

// এক্সেল ফাইল রিড এবং একাউন্ট অ্যারে তৈরি করার ফাংশন (১টি অ্যাকাউন্ট কম আসার সমস্যা সমাধান করা হয়েছে)
let extractedAccountsArray = [];
let uploadedFileName = "";

const excelFileInput = document.getElementById("excel-file");
if (excelFileInput) {
  excelFileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    uploadedFileName = file.name;

    // Show loading view & hide others
    document.getElementById("upload-default-view")?.classList.add("hidden");
    document.getElementById("upload-success-view")?.classList.add("hidden");
    const loadingView = document.getElementById("upload-loading-view");
    loadingView?.classList.remove("hidden");

    let progress = 0;
    const progressBar = document.getElementById("upload-progress-bar");
    const progressText = document.getElementById("upload-progress-text");

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      if (progressBar) progressBar.style.width = progress + "%";
      if (progressText) progressText.innerText = progress + "%";
    }, 40);

    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      extractedAccountsArray = json
        .map((row) => {
          return {
            username: row[0] ? String(row[0]).trim() : "",
            password: row[1] ? String(row[1]).trim() : "",
            fa2: row[2] ? String(row[2]).trim() : "",
          };
        })
        .filter((item) => item.username !== "");

      const finalCount = extractedAccountsArray.length;

      const accountCountEl = document.getElementById("account-count");
      if (accountCountEl) accountCountEl.innerText = finalCount + " টি";

      // Display colorful success view after loading
      setTimeout(() => {
        loadingView?.classList.add("hidden");
        const successView = document.getElementById("upload-success-view");
        successView?.classList.remove("hidden");

        const successFileNameEl = document.getElementById("success-file-name");
        if (successFileNameEl) successFileNameEl.innerText = uploadedFileName;

        const successTotalCountEl = document.getElementById(
          "success-total-count",
        );
        if (successTotalCountEl)
          successTotalCountEl.innerText = finalCount + " টি";
      }, 500);
    };
    reader.readAsArrayBuffer(file);
  });
}
async function handleExcelSubmit() {
  if (extractedAccountsArray.length === 0) {
    alert("Please upload a valid Excel file first!");
    return;
  }

  const selectedDate = document.getElementById("submission-date")?.value;
  if (!selectedDate) {
    alert("Please select a date!");
    return;
  }

  const selectedCategory = document.getElementById(
    "submission-category",
  )?.value;
  if (!selectedCategory) {
    alert("Please select a category!");
    return;
  }

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const fullDateTime = `${selectedDate}T${hours}:${minutes}:${seconds}`;

  const btn = document.getElementById("excelSubmitBtn");
  if (btn) btn.disabled = true;

  const totalCount = extractedAccountsArray.length;

  const { error } = await _supabase.from("file_submissions").insert([
    {
      user_id: currentUserId.toString(),
      file_name: uploadedFileName,
      account_count: totalCount,
      accounts_data: extractedAccountsArray,
      good_count: 0,
      bad_count: 0,
      total_amount: 0,
      status: "pending",
      created_at: fullDateTime,
      category: selectedCategory,
    },
  ]);

  if (btn) btn.disabled = false;

  if (error) {
    alert("Error submitting file: " + error.message);
  } else {
    alert("File submitted successfully!");
    extractedAccountsArray = [];
    uploadedFileName = "";

    const fileInput = document.getElementById("excel-file");
    if (fileInput) fileInput.value = "";
    const accountCountEl = document.getElementById("account-count");
    if (accountCountEl) accountCountEl.innerText = "0";
    const categorySelect = document.getElementById("submission-category");
    if (categorySelect) categorySelect.selectedIndex = 0;

    setDefaultDate();
    fetchFileHistory();
    fetchDashboardAndHistory();
  }
}

// ফাইল হিস্টোরি ফেচ এবং রেন্ডার করার ফাংশন
async function fetchFileHistory() {
  if (!currentUserId) return;
  const { data, error } = await _supabase
    .from("file_submissions")
    .select("*")
    .eq("user_id", currentUserId.toString())
    .order("created_at", { ascending: false });

  if (error) return;

  const tbody =
    document.getElementById("file-history-body") ||
    document.getElementById("file-history-table");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (data && data.length > 0) {
    data.forEach((row) => {
      const formattedDateTime = formatDateTime(row.created_at);
      const displayCategory = row.category ? row.category.toUpperCase() : "N/A";

      tbody.innerHTML += `
        <tr class="border-b border-slate-50 hover:bg-slate-50/50 text-xs">
            <td class="py-3 px-4 text-slate-600">${formattedDateTime}</td>
            <td class="py-3 px-4 font-semibold text-indigo-600">${displayCategory}</td>
            <td class="py-3 px-4 text-slate-700 font-medium">${row.file_name || "Report File"}</td>
            <td class="py-3 px-4 font-extrabold text-slate-700">${row.account_count || 0}</td>
            <td class="py-3 px-4 font-extrabold text-emerald-600">${row.good_count || 0}</td>
            <td class="py-3 px-4 font-extrabold text-rose-500">${row.bad_count || 0}</td>
            <td class="py-3 px-4 font-bold text-purple-600">${row.total_amount || 0} BDT</td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded text-[10px] font-bold uppercase ${row.account_stock === "success" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}">
                    ${row.account_stock || row.status || "pending"}
                </span>
            </td>
        </tr>
      `;
    });
  }
}

// ড্যাশবোর্ড এবং হিস্টোরি ডেটা আপডেট করার ফাংশন
async function fetchDashboardAndHistory() {
  if (!currentUserId) return;

  let query = _supabase.from("file_submissions").select("*");
  if (currentUserId) {
    query = query.eq("user_id", currentUserId.toString());
  }

  const { data: submissions, error: subError } = await query;

  if (subError) {
    console.error("Supabase Fetch Error:", subError);
    return;
  }

  let stats = {
    "instagram 2fa": { total: 0, good: 0, bad: 0, amount: 0 },
    "facebook 2f cookies": { total: 0, good: 0, bad: 0, amount: 0 },
    "facebook 2fa": { total: 0, good: 0, bad: 0, amount: 0 },
    "instagram cookies": { total: 0, good: 0, bad: 0, amount: 0 },
    textnow: { total: 0, good: 0, bad: 0, amount: 0 },
    textplus: { total: 0, good: 0, bad: 0, amount: 0 },
    textme: { total: 0, good: 0, bad: 0, amount: 0 },
    linkedin: { total: 0, good: 0, bad: 0, amount: 0 },
  };

  if (submissions && submissions.length > 0) {
    submissions.forEach((sub) => {
      const cat = (sub.category || "").toLowerCase().trim();

      if (stats[cat]) {
        stats[cat].total += Number(sub.account_count || 0);
        stats[cat].good += Number(sub.good_count || 0);
        stats[cat].bad += Number(sub.bad_count || 0);
        stats[cat].amount += Number(sub.total_amount || 0);
      }
    });
  }

  const mapping = {
    "instagram 2fa": "ig-2fa",
    "facebook 2f cookies": "fb-2f-cookies",
    "facebook 2fa": "fb-2fa",
    "instagram cookies": "ig-cookies",
    textnow: "textnow",
    textplus: "textplus",
    textme: "textme",
    linkedin: "linkedin",
  };

  for (const [catKey, domPrefix] of Object.entries(mapping)) {
    const data = stats[catKey];

    const totalEl = document.getElementById(`${domPrefix}-total`);
    const goodEl = document.getElementById(`${domPrefix}-good`);
    const badEl = document.getElementById(`${domPrefix}-bad`);
    const amountEl = document.getElementById(`${domPrefix}-amount`);

    if (totalEl) totalEl.innerText = data.total;
    if (goodEl) goodEl.innerText = data.good;
    if (badEl) badEl.innerText = data.bad;
    if (amountEl) amountEl.innerText = data.amount + " BDT";
  }

  // এখানে টেবিল আপডেট করার মূল কাজটি fetchFileHistory এর মাধ্যমেই হ্যান্ডেল করা হচ্ছে যাতে ডাবল রেন্ডারিং কনফ্লিক্ট না হয়।
}

// Total Withdraw এবং Total Income হিসাব করে কার্ডে দেখানোর ফাংশন
// Total Withdraw এবং Total Income হিসাব করে কার্ডে দেখানোর ফাংশন
async function fetchWithdrawStats() {
  if (!currentUserId) return;

  // ১. Total Income ফেচ করা (payment_requests টেবিল থেকে)
  const { data: payments, error: paymentError } = await _supabase
    .from("payment_requests")
    .select("total_amount")
    .eq("user_id", currentUserId.toString());

  let totalIncomeSum = 0;
  if (!paymentError && payments) {
    payments.forEach((row) => {
      totalIncomeSum += Number(row.total_amount || 0);
    });
  }
  const incomeEl = document.getElementById("summary-total-income");
  if (incomeEl) {
    incomeEl.innerText = totalIncomeSum + " BDT";
  }

  // ২. Total Withdraw ফেচ করা (withdraws টেবিল থেকে - শুধুমাত্র 'success' গুলো)
  const { data: withdraws, error: withdrawError } = await _supabase
    .from("withdraws")
    .select("amount, status") // এখানে status ফিল্ডটি সিলেক্ট করা হয়েছে
    .eq("user_id", currentUserId.toString());

  let totalWithdrawSum = 0;
  if (!withdrawError && withdraws) {
    withdraws.forEach((row) => {
      // শুধুমাত্র 'success' স্ট্যাটাস হলে তবেই যোগ হবে
      if (row.status === "success") {
        totalWithdrawSum += Number(row.amount || 0);
      }
    });
  }
  const withdrawEl = document.getElementById("summary-total-withdraw");
  if (withdrawEl) {
    withdrawEl.innerText = totalWithdrawSum + " BDT";
  }

  // ৩. Current Balance আপডেট (Income - Total Successful Withdraw)
  const balanceEl = document.getElementById("summary-current-balance");
  if (balanceEl) {
    balanceEl.innerText = totalIncomeSum - totalWithdrawSum + " BDT";
  }

  fetchWithdrawHistory();
}
async function handleWithdrawSubmit() {
  if (!currentUserId) {
    alert("Please log in first!");
    return;
  }

  const amountInput = document.getElementById("withdraw-amount-input");
  const bkashInput = document.getElementById("bkash-number");

  const amount = Number(amountInput.value);
  const bkashNumber = bkashInput.value.trim();

  if (!amount || amount <= 0) {
    alert("Please enter a valid withdraw amount.");
    return;
  }

  // bKash নাম্বার চেক (শুধুমাত্র সংখ্যা এবং নিশ্চিতভাবে ১১ ডিজিট হতে হবে)
  const bkashRegex = /^[0-9]{11}$/;
  if (!bkashRegex.test(bkashNumber)) {
    alert(
      "দয়া করে সঠিক ১১ ডিজিটের bKash নাম্বার দিন (শুধুমাত্র সংখ্যা গ্রহণযোগ্য)।",
    );
    return;
  }

  // ১. বর্তমান ইউজারের Total Income বের করা
  const { data: payments, error: paymentError } = await _supabase
    .from("payment_requests")
    .select("total_amount")
    .eq("user_id", currentUserId.toString());

  let totalIncomeSum = 0;
  if (!paymentError && payments) {
    payments.forEach((row) => {
      totalIncomeSum += Number(row.total_amount || 0);
    });
  }

  // ২. বর্তমান ইউজারের Total Withdraw বের করা (শুধুমাত্র 'success' স্ট্যাটাস হিসাব হবে)
  const { data: withdraws, error: withdrawError } = await _supabase
    .from("withdraws")
    .select("amount, status")
    .eq("user_id", currentUserId.toString());

  let totalWithdrawSum = 0;
  if (!withdrawError && withdraws) {
    withdraws.forEach((row) => {
      if (row.status === "success") {
        totalWithdrawSum += Number(row.amount || 0);
      }
    });
  }

  // ৩. Current Balance হিসাব করা (Total Income - Total Withdraw)
  const currentBalance = totalIncomeSum - totalWithdrawSum;

  // ৪. উইথড্র অ্যামাউন্ট কারেন্ট ব্যালেন্সের চেয়ে বেশি হলে চেক করা
  if (amount > currentBalance) {
    alert("টাকা কম আছে! আপনার পর্যাপ্ত ব্যালেন্স নেই।");
    return;
  }

  // ৫. ব্যালেন্স ঠিক থাকলে Supabase-এর 'withdraws' টেবিলে ডেটা সেভ করা (status: pending)
  const { error: insertError } = await _supabase.from("withdraws").insert([
    {
      user_id: currentUserId.toString(),
      amount: amount,
      bkash_number: bkashNumber,
      status: "pending",
    },
  ]);

  if (insertError) {
    console.error("Error submitting withdraw request:", insertError);
    alert("Failed to submit withdraw request. Please try again.");
    return;
  }

  alert("Withdraw request submitted successfully!");

  // ইনপুট ফিল্ড খালি করা
  amountInput.value = "";
  bkashInput.value = "";

  // কার্ডগুলোর ডেটা রিফ্রেশ/আপডেট করা
  fetchWithdrawStats();
  fetchWithdrawHistory();
}

// ডেট পরিবর্তনের সময় ইনপুটে কাঙ্ক্ষিত ফরম্যাট দেখানোর ফাংশন
function onDateChange(input) {
  if (!input.value) return;
  const d = new Date(input.value);
  const day = d.getDate();
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  const displayDateEl = document.getElementById("display-date");
  if (displayDateEl) {
    displayDateEl.value = `${day} ${month} ${year}`;
  }
}

// তারিখ ফরম্যাট করার ফাংশন
function formatCustomDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// ডেট প্রিভিউ আপডেট করার ফাংশন
function updateDatePreview() {
  const dateInput = document.getElementById("submission-date")?.value;
  const previewEl = document.getElementById("date-preview");
  if (previewEl && dateInput) {
    previewEl.innerText = formatCustomDate(dateInput);
  }
}

// ডিফল্টভাবে আজকের তারিখ সেট করার ফাংশন
function setDefaultDate() {
  const dateInput = document.getElementById("submission-date");
  const displayInput = document.getElementById("display-date");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  // submission-date ফিল্ড থাকলে মান সেট হবে
  if (dateInput) {
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // display-date ফিল্ড থাকলে সেখানেও ফরম্যাট করে মান বসবে
  if (displayInput) {
    const day = today.getDate();
    const months = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const month = months[today.getMonth()];
    const year = today.getFullYear();

    displayInput.value = `${day} ${month} ${year}`;
  }
}

// উইথড্র ফর্ম সাবমিট হ্যান্ডলার
document
  .getElementById("submit-withdraw-btn")
  ?.addEventListener("click", async function (e) {
    e.preventDefault();

    if (!currentUserId) {
      alert("Please log in first!");
      return;
    }

    const amountInput = document.getElementById("withdraw-amount");
    const bkashInput = document.getElementById("withdraw-bkash");

    const amount = Number(amountInput.value);
    const bkashNumber = bkashInput.value.trim();

    if (!amount || amount <= 0) {
      alert("Please enter a valid withdraw amount.");
      return;
    }

    if (!bkashNumber) {
      alert("Please enter your bKash number.");
      return;
    }

    // Supabase-এর 'withdraws' টেবিলে ডেটা সেভ করা
    const { data, error } = await _supabase.from("withdraws").insert([
      {
        user_id: currentUserId.toString(),
        amount: amount,
        bkash_number: bkashNumber,
        status: "Pending",
      },
    ]);

    if (error) {
      console.error("Error submitting withdraw request:", error);
      alert("Failed to submit withdraw request. Please try again.");
      return;
    }

    alert("Withdraw request submitted successfully!");

    // ইনপুট ফিল্ড খালি করুন
    amountInput.value = "";
    bkashInput.value = "";

    // কার্ডের টোটাল উইথড্র আপডেট করুন
    fetchWithdrawStats();
  });

// bKash মডাল বন্ধ করার ফাংশন
function closeBkashModal() {
  const modal = document.getElementById("bkash-success-modal");
  if (modal) modal.classList.add("hidden");
}

// উইথড্র হিস্ট্রি ফেচ এবং পেমেন্ট সাকসেস হলে bKash পপআপ দেখানোর ফাংশন
async function fetchWithdrawHistory() {
  if (!currentUserId) return;

  const tableBody = document.getElementById("withdraw-history-table-body");
  if (!tableBody) return;

  const { data: withdraws, error } = await _supabase
    .from("withdraws")
    .select("id, created_at, amount, bkash_number, status")
    .eq("user_id", currentUserId.toString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching withdraw history:", error);
    return;
  }

  tableBody.innerHTML = "";

  if (!withdraws || withdraws.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-400">No withdraw history found</td></tr>`;
    return;
  }

  let latestSuccessChecked = false;

  withdraws.forEach((row) => {
    const formattedDate = new Date(row.created_at).toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      hour12: true,
    });

    const statusLower = row.status ? row.status.toLowerCase() : "pending";

    // স্ট্যাটাস অনুযায়ী ব্যাজ কালার
    let statusClass = "bg-amber-50 text-amber-600 border-amber-200";
    if (statusLower === "approved" || statusLower === "success") {
      statusClass = "bg-emerald-50 text-emerald-600 border-emerald-200";

      // যদি স্ট্যাটাস success হয় এবং এই নির্দিষ্ট আইডির পপআপ আগে দেখানো না হয়ে থাকে
      const notifiedKey = `bkash_notified_${row.id}`;
      if (!latestSuccessChecked && !localStorage.getItem(notifiedKey)) {
        latestSuccessChecked = true;
        localStorage.setItem(notifiedKey, "true");

        // calculations (5 BDT charge deduction)
        const reqAmount = Number(row.amount || 0);
        const receivedAmount = reqAmount - 5 > 0 ? reqAmount - 5 : 0;

        // Populate Modal Data
        document.getElementById("modal-req-amount").innerText =
          reqAmount + " BDT";
        document.getElementById("modal-received-amount").innerText =
          receivedAmount + " BDT";
        document.getElementById("modal-bkash-num").innerText =
          row.bkash_number || "N/A";

        // Show bKash Modal
        setTimeout(() => {
          document
            .getElementById("bkash-success-modal")
            ?.classList.remove("hidden");
        }, 500);
      }
    } else if (statusLower === "rejected") {
      statusClass = "bg-rose-50 text-rose-600 border-rose-200";
    }

    const tr = document.createElement("tr");
    tr.className =
      "border-b hover:bg-slate-50/50 transition-all text-xs sm:text-sm";
    tr.innerHTML = `
      <td class="py-3.5 px-4 text-slate-600 font-medium">${formattedDate}</td>
      <td class="py-3.5 px-4 font-bold text-slate-800">${row.amount} BDT</td>
      <td class="py-3.5 px-4 font-semibold text-slate-700 tracking-wider">${row.bkash_number}</td>
      <td class="py-3.5 px-4">
        <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusClass}">
          ${row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}
