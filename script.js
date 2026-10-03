/* ==========================================================
   The Right Job For Right Person — Shared Script
   ใช้ร่วมกันทุกหน้า: product.html / order.html / admin.html
   ========================================================== */
 
// ----- ตั้งค่าตรงนี้ -----
const SUPABASE_URL = "https://oipujbpvoddemtjafgiq.supabase.co"; // URL โปรเจกต์ Supabase ของ mini-pos
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcHVqYnB2b2RkZW10amFmZ2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTY5NTAsImV4cCI6MjEwNjQ3Mjk1MH0.DAtTsbE9AE-50su62RdbZoiXubuZjGuEjrRP2__tDJE";                // anon public key (Supabase > Project Settings > API)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrcRL0XpvGN6Ef5E7NrZrYzkoBfAHS2aLJA9oO3nlN1j3fi7vcjwWzvhw_eRo9NJMvEw/exec";
const MINI_POS_URL = "https://mini-pos-omega-mauve.vercel.app"; // mini-pos address (for Telegram alerts)
const CSV_URL = "https://script.google.com/macros/s/AKfycbxrcRL0XpvGN6Ef5E7NrZrYzkoBfAHS2aLJA9oO3nlN1j3fi7vcjwWzvhw_eRo9NJMvEw/exec";                 // URL ของ Google Sheet ที่ Publish เป็น CSV (สำหรับหน้า admin)
const PRODUCTS_JSON_URL = "products.json";
 
// รายการตัวกรองตาม Aptitude
const APTITUDE_FILTERS = [
  { label: "ทั้งหมด", value: "all" },
  { label: "Calculate", value: "Calculate" },
  { label: "Remember", value: "Remember" },
  { label: "Code", value: "Code" },
  { label: "Act", value: "Act" },
];
 
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) {
    initProductPage();
  }
  if (document.getElementById("orderForm")) {
    initOrderPage();
  }
  if (document.querySelector("#ordersTable tbody")) {
    initAdminPage();
  }
  if (document.getElementById("quizForm")) {
    initQuizPage();
  }
 
  initFloatingApplicationButton();
});
 
/* ==========================================================
   1) product.html — แสดงรายการงาน + ตัวกรอง Aptitude
   ========================================================== */
function initProductPage() {
  const listEl = document.getElementById("product-list");
  const filterBarEl = document.getElementById("filter-bar");
 
  fetch(PRODUCTS_JSON_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
      return res.json();
    })
    .then((products) => {
      const urlParams = new URLSearchParams(window.location.search);
      const initialFilter = urlParams.get("Aptitude") || "all";
 
      renderFilterBar(filterBarEl, initialFilter, (selected) => {
        renderProductList(listEl, products, selected);
      });
 
      renderProductList(listEl, products, initialFilter);
    })
    .catch((err) => {
      console.error(err);
      listEl.innerHTML =
        '<p class="text-center">ไม่สามารถโหลดรายการงานได้ในขณะนี้</p>';
    });
}
 
function renderFilterBar(filterBarEl, activeValue, onChange) {
  if (!filterBarEl) return;
  filterBarEl.innerHTML = "";
 
  APTITUDE_FILTERS.forEach((filter) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn filter-btn";
    btn.textContent = filter.label;
    btn.dataset.value = filter.value;
 
    if (filter.value === activeValue) {
      btn.classList.add("filter-btn--active");
    }
 
    btn.addEventListener("click", () => {
      filterBarEl
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("filter-btn--active"));
      btn.classList.add("filter-btn--active");
      onChange(filter.value);
    });
 
    filterBarEl.appendChild(btn);
  });
}
 
function renderProductList(listEl, products, filterValue) {
  if (!listEl) return;
 
  const filtered =
    filterValue === "all"
      ? products
      : products.filter((p) => p.Aptitude === filterValue);
 
  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="text-center">ไม่พบรายการงานในหมวดนี้</p>';
    return;
  }
 
  listEl.innerHTML = filtered
    .map((product) => {
      const jobName = `${product.name}(${product.type} - ${product.Aptitude})`;
      const orderUrl = `order.html?job=${encodeURIComponent(
        jobName
      )}&price=${encodeURIComponent(product.price)}&sku=${encodeURIComponent(product.sku || "")}`;
 
      return `
        <article class="card">
          <div class="card__image-wrap">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(
        jobName
      )}" loading="lazy">
          </div>
          <div class="card__body">
            <div class="card__type">${escapeHtml(product.type)}</div>
            <h3 class="card__title">${escapeHtml(product.name)}</h3>
            <span class="aptitude aptitude--${product.Aptitude.toLowerCase()}">${escapeHtml(
        product.Aptitude
      )}</span>
            <p class="card__desc">${escapeHtml(product.description || "")}</p>
            <div class="card__footer">
              <span class="card__price">${formatNumber(product.price)}</span>
              <a class="btn btn--solid" href="${orderUrl}">สมัคร</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}
 
/* ==========================================================
   2) order.html — ฟอร์มสั่งซื้อ / สมัคร
   ========================================================== */
function initOrderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const job = urlParams.get("job") || "";
  const price = urlParams.get("price") || "";
 
  const jobEl = document.getElementById("job");
  const totalEl = document.getElementById("total");
  const itemsEl = document.getElementById("items");
 
  // เติมชื่องานลงช่อง job (ถ้ามี element นี้ในหน้า)
  // รองรับทั้งกรณีเป็น <input>/<textarea> (ใช้ .value) และ <span>/<div> อื่นๆ (ใช้ textContent)
  if (jobEl) {
    const isFormField = jobEl.tagName === "INPUT" || jobEl.tagName === "TEXTAREA";
    if (isFormField) {
      jobEl.value = job;
    } else {
      jobEl.textContent = job || "—";
    }
  }
 
  // เติมชื่องานลงช่อง items ด้วย (ใช้เป็นค่าที่จะถูกส่งไปเป็น payload.items)
  if (itemsEl) {
    itemsEl.value = job;
  }
 
  // สำคัญ: ต้องเติมราคาลงช่อง total เสมอ ห้ามเว้นว่าง
  if (totalEl) {
    totalEl.value = price;
  }
 
  const form = document.getElementById("orderForm");
  form.dataset.sku = urlParams.get("sku") || "";
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleOrderSubmit(form);
  });
}
 
async function handleOrderSubmit(form) {
  const getValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
 
  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
 
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
  const rest = `${SUPABASE_URL}/rest/v1`;
 
  try {
    const sku = form.dataset.sku;
    if (!sku) throw new Error("ไม่พบรหัสตำแหน่งงาน กรุณาเลือกตำแหน่งจากหน้าตำแหน่งงานอีกครั้ง");
 
    // 1) หาสินค้าใน mini-pos จาก SKU
    const pRes = await fetch(
      `${rest}/products?sku=eq.${encodeURIComponent(sku)}&select=id,name,price,stock`,
      { headers }
    );
    if (!pRes.ok) throw new Error("โหลดข้อมูลตำแหน่งงานไม่สำเร็จ");
    const [product] = await pRes.json();
    if (!product) throw new Error("ไม่พบตำแหน่งงานนี้ในระบบ");
    if (product.stock < 1) {
      alert("ขออภัย ตำแหน่งนี้เต็มแล้ว");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
 
    // 2) หักสต็อก 1 (เงื่อนไข stock=ค่าเดิม กันคนสมัครชนกัน)
    const sRes = await fetch(
      `${rest}/products?id=eq.${product.id}&stock=eq.${product.stock}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ stock: product.stock - 1 }),
      }
    );
    const updated = sRes.ok ? await sRes.json() : [];
    if (updated.length === 0) throw new Error("มีผู้สมัครพร้อมกัน กรุณากดสมัครอีกครั้ง");
 
    // 3) บันทึกรายการลงตาราง sales (จะไปโผล่ที่หน้า /history ของ mini-pos)
    const saleRes = await fetch(`${rest}/sales`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        total_price: Number(product.price),
        customer_name: getValue("customerName"),
        contact: getValue("contact"),
        note: getValue("note"),
      }),
    });
    if (!saleRes.ok) {
      // บันทึกไม่สำเร็จ: คืนสต็อกกลับ
      await fetch(`${rest}/products?id=eq.${product.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stock: product.stock }),
      });
      throw new Error("บันทึกการสมัครไม่สำเร็จ");
    }
     // Copy the application to Google Sheet (a failure here doesn't affect the application)
    if (APPS_SCRIPT_URL.startsWith("http")) {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify({
            customerName: getValue("customerName"),
            contact: getValue("contact"),
            items: getValue("items"),
            total: getValue("total"),
            note: getValue("note"),
          }),
        });
      } catch (e) {
        console.warn("Google Sheet save failed:", e);
      }
    }
    window.location.href = "thankyou.html";
  } catch (error) {
    console.error(error);
    alert(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    if (submitBtn) submitBtn.disabled = false;
  }
}
 
/* ==========================================================
   3) admin.html — ตารางออเดอร์จาก Google Sheet (CSV)
   ========================================================== */
function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
 
  fetch(CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลดข้อมูลออเดอร์ไม่สำเร็จ");
      return res.text();
    })
    .then((csvText) => {
      const rows = parseCSV(csvText);
      if (rows.length <= 1) {
        tbody.innerHTML = '<tr><td colspan="6">ยังไม่มีรายการสั่งซื้อ</td></tr>';
        return;
      }
 
      // แถวแรกคือ header ตัดออก
      const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell !== ""));
 
      // เรียงล่าสุดขึ้นก่อน โดยอิงคอลัมน์แรก (วันเวลา) ถ้า parse เป็นวันที่ได้
      dataRows.sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        const validA = !isNaN(dateA.getTime());
        const validB = !isNaN(dateB.getTime());
        if (validA && validB) return dateB - dateA;
        return 0;
      });
      if (!dataRows.some((r) => !isNaN(new Date(r[0]).getTime()))) {
        // ถ้า parse วันที่ไม่ได้เลย ให้กลับลำดับแถวแทน (ล่าสุดมักอยู่ท้ายชีท)
        dataRows.reverse();
      }
 
      tbody.innerHTML = dataRows
        .map((row) => {
          const [timestamp, customerName, contact, items, total, note] = row;
          return `
            <tr>
              <td>${escapeHtml(timestamp || "")}</td>
              <td>${escapeHtml(customerName || "")}</td>
              <td>${escapeHtml(contact || "")}</td>
              <td>${escapeHtml(items || "")}</td>
              <td>${escapeHtml(total || "")}</td>
              <td>${escapeHtml(note || "")}</td>
            </tr>
          `;
        })
        .join("");
    })
    .catch((err) => {
      console.error(err);
      tbody.innerHTML =
        '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลออเดอร์ได้ในขณะนี้</td></tr>';
    });
}
 
// CSV parser แบบง่าย รองรับ field ที่ครอบด้วย double quote และ comma/newline ภายใน quote
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
 
  // normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
 
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];
 
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }
 
  // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
 
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
 
/* ==========================================================
   4) quiz.html — แบบทดสอบความถนัด (Calculate / Code / Act / Remember)
   ========================================================== */
 
// เฉลยคำตอบที่ถูกต้องของแต่ละคำถาม (ชื่อ input -> ค่าที่ถูก)
const QUIZ_ANSWER_KEY = {
  // Calculus 1 -> Calculate
  calc1: "b",
  calc2: "b",
  calc3: "c",
  calc4: "c",
  calc5: "b",
  // Coding C/C++/Python -> Code
  code1: "b",
  code2: "c",
  code3: "c",
  code4: "b",
  code5: "c",
  // การแก้ไขปัญหาเชิงวิศวกรรม -> Act
  eng1: "a",
  eng2: "b",
  eng3: "b",
  eng4: "a",
  eng5: "a",
  // การจำ -> Remember
  mem1: "b",
  mem2: "b",
  mem3: "a",
  mem4: "b",
  mem5: "b",
};
 
// ชื่อ prefix ของคำถามแต่ละหมวด -> ค่า Aptitude ที่ใช้กรองใน product.html
const QUIZ_PREFIX_TO_APTITUDE = {
  calc: "Calculate",
  code: "Code",
  eng: "Act",
  mem: "Remember",
};
 
function initQuizPage() {
  const form = document.getElementById("quizForm");
 
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleQuizSubmit(form);
  });
}
 
function handleQuizSubmit(form) {
  // นับคะแนนถูกของแต่ละหมวด โดยดูจาก prefix ของชื่อคำถาม (calc/code/eng/mem)
  const scores = { Calculate: 0, Code: 0, Act: 0, Remember: 0 };
 
  Object.keys(QUIZ_ANSWER_KEY).forEach((questionName) => {
    const selected = form.querySelector(
      `input[name="${questionName}"]:checked`
    );
    if (!selected) return;
 
    const prefix = questionName.replace(/[0-9]+$/, "");
    const aptitude = QUIZ_PREFIX_TO_APTITUDE[prefix];
    if (!aptitude) return;
 
    if (selected.value === QUIZ_ANSWER_KEY[questionName]) {
      scores[aptitude] += 1;
    }
  });
 
  // หาหมวดที่ได้คะแนนสูงสุด (ถ้าคะแนนเท่ากันหลายหมวด จะเลือกหมวดแรกที่เจอ)
  let topAptitude = "Calculate";
  let topScore = -1;
  Object.keys(scores).forEach((aptitude) => {
    if (scores[aptitude] > topScore) {
      topScore = scores[aptitude];
      topAptitude = aptitude;
    }
  });
 
  // แสดงผลลัพธ์แบบทดสอบ พร้อมแนะนำงาน 1-2 ตำแหน่งที่เหมาะสมที่สุด (ไม่บล็อกงานอื่น)
  showQuizResult(topAptitude);
}
 
function showQuizResult(aptitude) {
  const formWrap = document.getElementById("quizFormWrap");
  const resultEl = document.getElementById("quizResult");
  if (!resultEl) return;
 
  if (formWrap) {
    formWrap.style.display = "none";
  }
  resultEl.style.display = "block";
  resultEl.innerHTML = '<p class="text-center">กำลังประมวลผล...</p>';
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
 
  fetch(PRODUCTS_JSON_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
      return res.json();
    })
    .then((products) => {
      const matches = products.filter((p) => p.Aptitude === aptitude);
      const recommended = pickRecommendedJobs(matches);
      renderQuizResult(resultEl, aptitude, recommended);
    })
    .catch((err) => {
      console.error(err);
      resultEl.innerHTML =
        '<p class="text-center">ไม่สามารถโหลดคำแนะนำได้ในขณะนี้ ลองดูตำแหน่งงานทั้งหมดแทนได้ที่ <a href="product.html">หน้าตำแหน่งงาน</a></p>';
    });
}
 
// เลือกงานแนะนำ 1-2 ตำแหน่ง: พยายามหาให้ได้ทั้งสาย Build และ Research อย่างละ 1 ถ้ามี
function pickRecommendedJobs(matches) {
  const buildJob = matches.find((p) => p.type === "Build");
  const researchJob = matches.find((p) => p.type === "Research");
 
  const picks = [];
  if (buildJob) picks.push(buildJob);
  if (researchJob && researchJob.id !== (buildJob && buildJob.id)) {
    picks.push(researchJob);
  }
 
  matches.forEach((p) => {
    if (picks.length >= 2) return;
    if (!picks.some((picked) => picked.id === p.id)) {
      picks.push(p);
    }
  });
 
  return picks.slice(0, 2);
}
 
function renderQuizResult(resultEl, aptitude, recommended) {
  const cardsHtml = recommended
    .map((product) => {
      const jobName = `${product.name}(${product.type} - ${product.Aptitude})`;
      const orderUrl = `order.html?job=${encodeURIComponent(
        jobName
      )}&price=${encodeURIComponent(product.price)}&sku=${encodeURIComponent(product.sku || "")}`;
 
      return `
        <article class="card">
          <div class="card__image-wrap">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(
        jobName
      )}" loading="lazy">
          </div>
          <div class="card__body">
            <div class="card__type">${escapeHtml(product.type)}</div>
            <h3 class="card__title">${escapeHtml(product.name)}</h3>
            <span class="aptitude aptitude--${product.Aptitude.toLowerCase()}">${escapeHtml(
        product.Aptitude
      )}</span>
            <p class="card__desc">${escapeHtml(product.description || "")}</p>
            <div class="card__footer">
              <span class="card__price">${formatNumber(product.price)}</span>
              <a class="btn btn--solid" href="${orderUrl}">สมัคร</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
 
  resultEl.innerHTML = `
    <p class="eyebrow text-center" style="display:block;">ผลการวิเคราะห์ของคุณ</p>
    <h2 class="text-center" style="margin-bottom:var(--space-sm);">
      คุณเหมาะกับสาย <span class="aptitude aptitude--${aptitude.toLowerCase()}">${escapeHtml(
    aptitude
  )}</span>
    </h2>
    <p class="lede text-center" style="margin-bottom:var(--space-lg);">
      นี่คือตำแหน่งงานที่เราแนะนำสำหรับคุณเป็นพิเศษ แต่คุณยังเลือกตำแหน่งอื่นได้ตามใจชอบ
    </p>
    <div class="product-grid" style="margin-bottom:var(--space-lg);">
      ${cardsHtml}
    </div>
    <div class="text-center">
      <a href="product.html?Aptitude=${encodeURIComponent(
        aptitude
      )}" class="btn" style="margin-right:var(--space-sm);">ดูงานทั้งหมดในสายนี้</a>
      <a href="product.html" class="btn btn--ghost">ดูตำแหน่งงานทั้งหมด</a>
    </div>
  `;
}
 
/* ==========================================================
   5) ปุ่มลอย "Application" มุมขวาล่าง — เปิดลิงก์ YouTube ในแท็บใหม่
   ========================================================== */
function initFloatingApplicationButton() {
  // กันไม่ให้สร้างซ้ำถ้ามีอยู่แล้ว
  if (document.querySelector(".floating-apply-btn")) return;
 
  const btn = document.createElement("a");
  btn.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  btn.textContent = "Application";
  btn.className = "btn btn--solid floating-apply-btn";
 
  document.body.appendChild(btn);
}
 
/* ==========================================================
   Utilities
   ========================================================== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
 
function formatNumber(num) {
  const n = Number(num);
  if (isNaN(n)) return `${num} บาท`;
  return `${n.toLocaleString("th-TH")} บาท`;
}
