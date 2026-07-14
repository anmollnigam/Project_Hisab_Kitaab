document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const shopId = document.getElementById("shopId").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("loginError");
  errorEl.hidden = true;

  const result = await loginShop(shopId, password);

  if (result.success) {
    localStorage.setItem("bahi_session", "true");
    localStorage.setItem("bahi_shop_name", result.shopName || shopId);
    window.location.href = "dashboard.html";
  } else {
    errorEl.textContent = result.message || "Login failed. Check your details and try again.";
    errorEl.hidden = false;
  }
});
