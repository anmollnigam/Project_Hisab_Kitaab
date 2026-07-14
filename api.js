const DEMO_MODE = false;
const API_BASE_URL = "http://localhost:3000/api"; 

// ---------- demo storage helpers (only used in DEMO_MODE) ----------
function _demoGetCustomers() {
  return JSON.parse(localStorage.getItem("bahi_customers") || "{}");
}
function _demoSaveCustomers(data) {
  localStorage.setItem("bahi_customers", JSON.stringify(data));
}

// ---------- Auth ----------
async function loginShop(shopId, password) {
  if (DEMO_MODE) {
    if (shopId.trim() && password.trim()) {
      return { success: true, shopName: shopId };
    }
    return { success: false, message: "Enter your shop ID and password." };
  }

  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shopId, password }),
  });
  return res.json();
}

// ---------- Add customer ----------
async function addCustomer(name, phone) {
  if (DEMO_MODE) {
    const customers = _demoGetCustomers();
    if (customers[phone]) {
      return { success: false, message: "A customer with this number already exists." };
    }
    customers[phone] = { name, phone, balance: 0 };
    _demoSaveCustomers(customers);
    return { success: true };
  }

  const res = await fetch(`${API_BASE_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone }),
  });
  return res.json();
}

// ---------- Search customer by phone ----------
async function searchCustomerByPhone(phone) {
  if (DEMO_MODE) {
    const customers = _demoGetCustomers();
    const customer = customers[phone];
    if (!customer) {
      return { success: false, message: "No customer found with this number." };
    }
    return { success: true, customer };
  }

  const res = await fetch(`${API_BASE_URL}/customers/${phone}`);
  return res.json();
}

// ---------- Add / subtract udhaar ----------
// FIXED: Added 'reason' to the parameters here
async function updateUdhaar(phone, amount, type, reason) {
  if (DEMO_MODE) {
    const customers = _demoGetCustomers();
    const customer = customers[phone];
    if (!customer) return { success: false, message: "Customer not found." };

   customer.balance =
      type === "add" ? customer.balance + amount : customer.balance - amount;

    _demoSaveCustomers(customers);
    return { success: true, customer };
  }

  const res = await fetch(`${API_BASE_URL}/customers/${phone}/udhaar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    // FIXED: Added 'reason' to the body so it gets sent to Python
    body: JSON.stringify({ amount, type, reason }),
  });
  return res.json();
}

// ---------- Get all customers (for stats) ----------
async function getAllCustomers() {
  if (DEMO_MODE) {
    return { success: true, customers: Object.values(_demoGetCustomers()) };
  }
  const res = await fetch(`${API_BASE_URL}/customers`);
  return res.json();
}