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

  // 'Asia/Dhaka' টাইমজোন ব্যবহার করে সঠিক বাংলাদেশি সময় ও অংশগুলো বের করা
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
    if (part.type === "month") month = part.value.toLowerCase(); // ছোট হাতের মাসের নাম (যেমন: aug)
    if (part.type === "year") year = part.value;
    if (part.type === "hour") hour = part.value;
    if (part.type === "minute") minute = part.value;
    if (part.type === "dayPeriod") dayPeriod = part.value.toLowerCase(); // am/pm
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
}

// প্রোফাইল লোড এবং ইউআই আপডেট করার ফাংশন
async function fetchUserProfile() {
  if (!currentUserId) return;
  const { data, error } = await _supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUserId)
    .single();

  if (error) return;

  if (data) {
    const profileNameEl = document.getElementById("user-profile-name");
    if (profileNameEl)
      profileNameEl.innerText = `User: ${data.full_name || "Member"}`;

    const profFullName = document.getElementById("prof-full-name");
    const profUsername = document.getElementById("prof-username");
    const profFund = document.getElementById("prof-fund");
    const profRole = document.getElementById("prof-role");

    if (profFullName) profFullName.innerText = data.full_name || "N/A";
    if (profUsername) profUsername.innerText = data.username || "N/A";
    if (profFund) profFund.innerText = (data.fund || 0) + " BDT";
    if (profRole) profRole.innerText = data.role || "member";
  }
}

// এক্সেল ফাইল রিড এবং একাউন্ট অ্যারে তৈরি করার ফাংশন
let extractedAccountsArray = [];
let uploadedFileName = "";

const excelFileInput = document.getElementById("excel-file");
if (excelFileInput) {
  excelFileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    uploadedFileName = file.name;

    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      extractedAccountsArray = json
        .map((row) => {
          const keys = Object.keys(row);
          return {
            username:
              row.username ||
              row.Username ||
              row.USER_NAME ||
              row.User ||
              row[keys[0]] ||
              "",
            password:
              row.password ||
              row.Password ||
              row.PASSWORD ||
              row.Pass ||
              row[keys[1]] ||
              "",
            fa2:
              row.fa2 ||
              row["2fa"] ||
              row["2FA"] ||
              row.FA2 ||
              row[keys[2]] ||
              "",
          };
        })
        .filter((item) => String(item.username).trim() !== "");

      const finalCount =
        extractedAccountsArray.length > 0
          ? extractedAccountsArray.length
          : json.length;

      const accountCountEl = document.getElementById("account-count");
      if (accountCountEl) accountCountEl.innerText = finalCount;
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

  // ক্যাটাগরি ভ্যালু চেক করা
  const selectedCategory = document.getElementById(
    "submission-category",
  )?.value;
  if (!selectedCategory) {
    alert("Please select a category!");
    return;
  }

  // সিলেক্ট করা তারিখের সাথে বর্তমান বাস্তব সময় (Hours, Minutes, Seconds) যুক্ত করা
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const fullDateTime = `${selectedDate}T${hours}:${minutes}:${seconds}`;

  const btn = document.getElementById("excelSubmitBtn");
  if (btn) btn.disabled = true;

  const totalCount = extractedAccountsArray.length;

  const { data, error } = await _supabase.from("file_submissions").insert([
    {
      user_id: currentUserId.toString(),
      file_name: uploadedFileName,
      account_count: totalCount,
      accounts_data: extractedAccountsArray,
      good_count: 0,
      bad_count: 0,
      total_amount: 0,
      status: "pending",
      created_at: fullDateTime, // তারিখ ও সঠিক সময় একসাথে সেভ হবে
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

    // ফর্ম রিসেট করা
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
// ফাইল হিস্টোরি ফেচ করার ফাংশন
// ফাইল হিস্টোরি ফেচ এবং রেন্ডার করার সংশোধিত ফাংশন
async function fetchFileHistory() {
  if (!currentUserId) return;
  const { data, error } = await _supabase
    .from("file_submissions")
    .select("*")
    .eq("user_id", currentUserId.toString())
    .order("created_at", { ascending: false });

  if (error) return;

  // টেবিল বডির সঠিক আইডি সিলেক্ট করা
  const tbody =
    document.getElementById("file-history-table") ||
    document.getElementById("file-history-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  data.forEach((row) => {
    const formattedDateTime = formatDateTime(row.created_at);
    const displayCategory = row.category ? row.category.toUpperCase() : "N/A";

    tbody.innerHTML += `
        <tr class="border-b hover:bg-slate-50/50 text-xs">
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
async function fetchDashboardAndHistory() {
  if (!currentUserId) return;

  // ১. file_submissions টেবিল থেকে বর্তমান ইউজারের সব ডেটা ফেচ করা
  let query = _supabase.from("file_submissions").select("*");

  if (currentUserId) {
    query = query.eq("user_id", currentUserId.toString());
  }

  const { data: submissions, error: subError } = await query;

  if (subError) {
    console.error("Supabase Fetch Error:", subError);
    return;
  }

  // ২. ড্যাশবোর্ডের কার্ডগুলোর জন্য ক্যাটাগরি অনুযায়ী টোটাল অবজেক্ট তৈরি
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
      // ক্যাটাগরি নাম ছোট হাতের ও ট্রিম করে নেওয়া যাতে কোনো মিসম্যাচ না হয়
      const cat = (sub.category || "").toLowerCase().trim();

      if (stats[cat]) {
        stats[cat].total += Number(sub.account_count || 0);
        stats[cat].good += Number(sub.good_count || 0);
        stats[cat].bad += Number(sub.bad_count || 0);
        stats[cat].amount += Number(sub.total_amount || 0);
      }
    });
  }

  // ৩. ড্যাশবোর্ড কার্ডের আইডি গুলোর সাথে ক্যাটাগরির ম্যাপিং
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

  // ড্যাশবোর্ডের কার্ডগুলোতে ডেটা বসানো
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

  // ৪. File History টেবিলে সঠিক ক্যাটাগরি সহ ডেটা রেন্ডার করা
  const tableBody = document.getElementById("file-history-body");
  if (tableBody) {
    tableBody.innerHTML = "";

    submissions.forEach((sub) => {
      let tr = document.createElement("tr");
      tr.className = "border-b border-slate-50 hover:bg-slate-50/50 text-xs";

      // ক্যাটাগরি নামটি বড়হাতের অক্ষরে সুন্দরভাবে দেখানোর জন্য
      const displayCategory = sub.category ? sub.category.toUpperCase() : "N/A";

      tr.innerHTML = `
        <td class="py-3 px-4 text-slate-600">${sub.created_at ? new Date(sub.created_at).toLocaleString() : "N/A"}</td>
        <td class="py-3 px-4 font-semibold text-indigo-600">${displayCategory}</td>
        <td class="py-3 px-4 text-slate-700 font-medium">${sub.file_name || "Report File"}</td>
        <td class="py-3 px-4 font-extrabold text-slate-700">${sub.account_count || 0}</td>
        <td class="py-3 px-4 font-extrabold text-emerald-600">${sub.good_count || 0}</td>
        <td class="py-3 px-4 font-extrabold text-rose-500">${sub.bad_count || 0}</td>
        <td class="py-3 px-4 font-bold text-purple-600">${sub.total_amount || 0} BDT</td>
        <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded text-[10px] font-bold uppercase ${sub.account_stock === "success" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}">
                ${sub.account_stock || "pending"}
            </span>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }
}
// উইথড্র সাবমিট করার ফাংশন
async function handleWithdrawSubmit() {
  const goodCount = document.getElementById("withdraw-good-count")?.value || 0;
  const income = document.getElementById("withdraw-income")?.value || 0;
  const bkashNumber = document.getElementById("bkash-number")?.value;

  if (!bkashNumber || bkashNumber.length < 11) {
    alert("Please enter a valid bKash number!");
    return;
  }

  const { error } = await _supabase.from("withdrawals").insert([
    {
      user_id: currentUserId.toString(),
      good_count: goodCount,
      income: income,
      bkash_number: bkashNumber,
      status: "pending",
    },
  ]);

  if (error) {
    alert("Withdraw failed: " + error.message);
  } else {
    alert("Withdraw request submitted successfully!");
    const bkashInput = document.getElementById("bkash-number");
    if (bkashInput) bkashInput.value = "";
  }
}

function showApp() {
  document.getElementById("login-container")?.classList.add("hidden");
  document.getElementById("app-container")?.classList.remove("hidden");
  fetchUserProfile();
  fetchFileHistory();
  fetchDashboardAndHistory();
  setDefaultDate(); // <-- এটি এখানে বসিয়ে দিন
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

  // ইনপুট বক্সে দেখাবে
  document.getElementById("display-date").value = `${day} ${month} ${year}`;
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
  if (dateInput && displayInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    dateInput.value = `${yyyy}-${mm}-${mm ? "" : ""}${yyyy}-${mm}-${dd}`; // ব্যাকএন্ডের জন্য ISO ফরম্যাট
    dateInput.value = `${yyyy}-${mm}-${dd}`;

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
