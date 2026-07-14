if (localStorage.getItem("bahi_session") !== "true") window.location.href = "index.html";
const $ = (id) => document.getElementById(id);
const shopName = localStorage.getItem("bahi_shop_name") || "Shop";
$("shopNameDisplay").textContent = shopName;
$("heroShopName").textContent = shopName;
$("todayDate").textContent = new Intl.DateTimeFormat("en-IN", { weekday:"long", day:"numeric", month:"short" }).format(new Date());
$("logoutBtn").addEventListener("click", () => { localStorage.removeItem("bahi_session"); window.location.href="index.html"; });
let currentPhone = null;
function money(n){ return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0); }

async function refreshStats() { 
  const r = await getAllCustomers(); 
  if (r.success) { 
    const list = r.customers; 
    $("statCustomers").textContent = list.length; 
    $("statOutstanding").textContent = money(list.reduce((s,x) => s + Math.max(0, Number(x.balance) || 0), 0)); 
  } 
}

function message(el,text,type="success"){ el.textContent=text; el.className=type==="error"?"form-error":"form-message"; el.hidden=false; setTimeout(()=>el.hidden=true,3500); }
refreshStats();

$("closeModalBtn").addEventListener("click", () => {
  $("successModal").hidden = true;
});

$("addCustomerBtn").addEventListener("click", async()=>{ 
  const name=$("newCustomerName").value.trim(), phone=$("newCustomerPhone").value.trim(), msg=$("addCustomerMsg"); 
  if(!name||!/^[0-9]{10}$/.test(phone)) return message(msg,"Enter a name and a valid 10-digit phone number.","error"); 
  
  const r=await addCustomer(name,phone); 
  
  if(r.success){ 
    $("modalMessage").textContent = `${name} has been added to the ledger successfully.`;
    $("successModal").hidden = false;
    
    $("newCustomerName").value=""; 
    $("newCustomerPhone").value=""; 
    refreshStats(); 
  } else {
    message(msg, r.message, "error");
  }
});

async function doSearch(){ 
  const phone=$("searchPhone").value.trim(), msg=$("searchMsg"); 
  if(!/^[0-9]{10}$/.test(phone)) return message(msg,"Enter a valid 10-digit phone number.","error"); 
  
  const r = await searchCustomerByPhone(phone); 
  if(!r.success){ message(msg,r.message,"error"); $("resultCard").hidden=true; return; } 
  
  msg.hidden=true; 
  currentPhone=phone; 
  showCustomer(r.customer, r.history); 
  $("resultCard").scrollIntoView({behavior:"smooth",block:"center"}); 
}

$("searchBtn").addEventListener("click",doSearch); 
$("searchPhone").addEventListener("keydown",e=>{if(e.key==="Enter")doSearch();});

function showCustomer(c, history = []){
  $("resultName").textContent = c.name;
  const balance = Number(c.balance) || 0;
  const labelEl = $("balanceLabel");
  
  if (balance < 0) {
    labelEl.textContent = "Advance payment";
    $("resultBalance").textContent = money(Math.abs(balance));
  } else {
    labelEl.textContent = "Total udhaar remaining";
    $("resultBalance").textContent = money(balance);
  }
  
  // --- Render Transaction History ---
  const listEl = $("transactionHistoryList");
  listEl.innerHTML = ""; 
  
  if (!history || history.length === 0) {
    listEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 10px;">No transactions yet.</p>`;
  } else {
    history.forEach(tx => {
      
      // 1. Format the date (FIXED: Added timeZone: 'UTC' to stop browser from shifting the day)
      const d = new Date(tx.created_at);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
      
      // 2. Set colors and labels
      const isAdd = tx.transaction_type === "add";
      const color = isAdd ? "var(--danger)" : "var(--success)"; 
      const sign = isAdd ? "+" : "-";
      const reasonText = tx.reason ? tx.reason : (isAdd ? "Added to Udhaar" : "Payment Received");
      
      // 3. Create the list item UI
      const div = document.createElement("div");
      div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border-soft); border-radius: 8px;";
      
      div.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-weight: 700; font-size: 0.9rem; color: var(--text);">${reasonText}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</span>
        </div>
        <span style="font-family: var(--font-mono); font-weight: 700; font-size: 1rem; color: ${color};">
          ${sign}${money(tx.amount)}
        </span>
      `;
      listEl.appendChild(div);
    });
  }
  
  $("resultCard").hidden = false;
}

$("addUdhaarBtn").addEventListener("click",()=>handleUpdate("add")); 
$("subtractUdhaarBtn").addEventListener("click",()=>handleUpdate("subtract"));

async function handleUpdate(type){ 
  const id = type === "add" ? "addAmount" : "subtractAmount";
  const amount = Number($(id).value); 
  const reason = $("transactionReason").value.trim(); 
  
  if(!amount||amount<=0){ $(id).focus(); return; } 
  
  const r = await updateUdhaar(currentPhone, amount, type, reason); 
  
  if(r.success){ 
    const freshData = await searchCustomerByPhone(currentPhone);
    if(freshData.success) {
      showCustomer(freshData.customer, freshData.history);
    } else {
      showCustomer(r.customer);
    }
    
    $(id).value=""; 
    $("transactionReason").value=""; 
    refreshStats(); 
  }
}

$("newSearchBtn").addEventListener("click",()=>{ $("resultCard").hidden=true; $("searchPhone").value=""; $("searchPhone").focus(); $("transactionReason").value=""; });