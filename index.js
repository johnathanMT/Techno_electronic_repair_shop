// TECHNO MYO THANT - main js (shared by all pages)
// frontend only project so im using localStorage to fake a database
// note: no inline onclick anywhere, everything uses addEventListener
// each init() checks if its element exists first so it doesnt error on other pages


// ===== helpers + storage =====
const formatMMK = (amount) => Number(amount || 0).toLocaleString("en-US") + " MMK";

// little wrappers so i dont repeat JSON.parse everywhere
const DB = {
  getCart: () => JSON.parse(localStorage.getItem("tmt_cart") || "[]"),
  setCart: (v) => localStorage.setItem("tmt_cart", JSON.stringify(v)),
  getUser: () => JSON.parse(localStorage.getItem("tmt_user") || "null"),
  setUser: (v) => localStorage.setItem("tmt_user", JSON.stringify(v)),
  clearUser: () => localStorage.removeItem("tmt_user"),
  getOrders: () => JSON.parse(localStorage.getItem("tmt_orders") || "[]"),
  setOrders: (v) => localStorage.setItem("tmt_orders", JSON.stringify(v)),
  getRepairs: () => JSON.parse(localStorage.getItem("tmt_repairs") || "null"),
  setRepairs: (v) => localStorage.setItem("tmt_repairs", JSON.stringify(v)),
};

const COMMERCIAL_TAX = 0.05; // 5% tax
const REPAIR_STATUSES = ["Diagnosing", "Waiting for Parts", "Completed"];

// checkout page sets this so the cart +/- buttons can refresh its totals
let checkoutRefresh = null;


// ===== dummy data =====
const PRODUCTS = [
  { id: "p1", name: '43" Smart TV', category: "TVs", price: 189000, image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80", specs: "4K UHD • Wi-Fi • 2× HDMI • Remote included" },
  { id: "p2", name: '55" LED TV', category: "TVs", price: 299000, image: "https://images.unsplash.com/photo-1600003263720-95b45a4035d5?auto=format&fit=crop&w=600&q=80", specs: "Full HD • Slim bezel • Wall-mount ready" },
  { id: "p3", name: '32" LED TV', category: "TVs", price: 149000, image: "https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=600&q=80", specs: "HD Ready • USB media • Great for bedrooms" },
  { id: "p4", name: '24" LED Monitor', category: "Monitors", price: 75000, image: "https://images.unsplash.com/photo-1546538915-a9e2c8d0f8f6?auto=format&fit=crop&w=600&q=80", specs: "1080p • 75Hz • HDMI + VGA" },
  { id: "p5", name: '27" IPS Monitor', category: "Monitors", price: 120000, image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80", specs: "2K QHD • IPS panel • Slim stand" },
];

// put some fake repairs in storage first time so dashboard isnt empty
const seedRepairsIfEmpty = () => {
  if (DB.getRepairs() === null) {
    DB.setRepairs([
      { deviceId: "#TV-Sony-49in-8821", device: 'Sony 49" LED TV', issue: "No Power", status: "Waiting for Parts", received: "2026-06-20", warranty: "" },
      { deviceId: "#MON-Dell-24in-3390", device: 'Dell 24" Monitor', issue: "No Display", status: "Completed", received: "2026-05-10", warranty: "2027-05-10" },
      { deviceId: "#TV-LG-55in-1204", device: 'LG 55" Smart TV', issue: "Backlight problem", status: "Diagnosing", received: "2026-07-12", warranty: "" },
    ]);
  }
};


// ===== navbar cart btn + login/logout =====
const cartButtonHTML = () => `
  <button class="cart-open relative inline-flex items-center gap-1 text-gray-300 hover:text-gold transition-all duration-300">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3M17 13l2 2M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/></svg>
    Cart <span class="cart-count bg-gold text-metal text-xs font-bold rounded-full px-1.5 py-0.5">0</span>
  </button>`;

// fill the nav (shows Login OR Dashboard+Logout depending on user)
const renderNavActions = () => {
  const user = DB.getUser();
  const authHTML = user
    ? `<a href="dashboard.html" class="text-gray-300 hover:text-gold transition-all duration-300">Dashboard</a>
       <button class="logout-btn bg-maroon text-white font-bold px-4 py-1.5 rounded-md hover:bg-maroon-light transition-all duration-300">Logout</button>`
    : `<a href="login.html" class="bg-gold text-metal font-bold px-4 py-1.5 rounded-md hover:bg-gold-light transition-all duration-300">Login</a>`;

  const desktop = document.getElementById("navActions");
  if (desktop) desktop.innerHTML = `<span class="flex items-center gap-4">${cartButtonHTML()}${authHTML}</span>`;

  const mobile = document.getElementById("navActionsMobile");
  if (mobile) mobile.innerHTML = `<div class="flex items-center gap-4 pt-3 mt-2 border-t border-metal-700">${cartButtonHTML()}${authHTML}</div>`;

  document.querySelectorAll(".cart-open").forEach((b) => b.addEventListener("click", openCart));
  document.querySelectorAll(".logout-btn").forEach((b) => b.addEventListener("click", logoutUser));

  updateCartCount();
};


// ===== shopping cart (with +/- stepper) =====
// build the slide out cart once and stick it on the page
const buildCartDrawer = () => {
  if (document.getElementById("cartDrawer")) return;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div id="cartOverlay" class="hidden fixed inset-0 bg-black/60 z-[60]"></div>
    <aside id="cartDrawer" class="fixed top-0 right-0 h-full w-80 max-w-full bg-metal-light border-l border-metal-700 z-[70] translate-x-full transition-transform duration-300 flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-metal-700">
        <h3 class="text-lg font-bold text-white">Your Cart</h3>
        <button id="cartClose" class="text-gray-400 hover:text-gold text-2xl leading-none">&times;</button>
      </div>
      <div id="cartItems" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
      <div class="p-4 border-t border-metal-700">
        <div class="flex justify-between text-sm mb-3">
          <span class="text-gray-400">Subtotal</span>
          <span id="cartSubtotal" class="text-gold font-bold">0 MMK</span>
        </div>
        <a href="checkout-steps.html" class="block text-center bg-gold text-metal font-bold py-3 rounded-md hover:bg-gold-light transition-all duration-300">Checkout</a>
      </div>
    </aside>`;
  document.body.appendChild(wrap);

  document.getElementById("cartClose").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);

  // one listener for remove + the qty buttons (items are made by js)
  document.getElementById("cartItems").addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove]");
    const incBtn = e.target.closest("[data-inc]");
    const decBtn = e.target.closest("[data-dec]");
    if (removeBtn) removeFromCart(removeBtn.dataset.remove);
    if (incBtn) changeQty(incBtn.dataset.inc, +1);
    if (decBtn) changeQty(decBtn.dataset.dec, -1);
  });
};

const openCart = () => {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (!drawer) return;
  renderCartItems();
  overlay.classList.remove("hidden");
  drawer.classList.remove("translate-x-full");
};
const closeCart = () => {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (!drawer) return;
  drawer.classList.add("translate-x-full");
  overlay.classList.add("hidden");
};

// add product, if already in cart just +1
const addToCart = (productId) => {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const cart = DB.getCart();
  const line = cart.find((item) => item.id === productId);
  if (line) {
    line.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
  }
  DB.setCart(cart);
  afterCartChange();
};

// change qty by +1 or -1, if it hits 0 remove the line
const changeQty = (productId, delta) => {
  const cart = DB.getCart();
  const line = cart.find((item) => item.id === productId);
  if (!line) return;

  line.qty += delta;
  if (line.qty <= 0) {
    DB.setCart(cart.filter((item) => item.id !== productId));
  } else {
    DB.setCart(cart);
  }
  afterCartChange();
};

const removeFromCart = (productId) => {
  DB.setCart(DB.getCart().filter((item) => item.id !== productId));
  afterCartChange();
};

// run after any cart change (badge + drawer + checkout)
const afterCartChange = () => {
  updateCartCount();
  renderCartItems();
  if (checkoutRefresh) checkoutRefresh(); // refresh checkout if were on it
};

const cartCount = () => DB.getCart().reduce((sum, item) => sum + item.qty, 0);
const cartSubtotal = () => DB.getCart().reduce((sum, item) => sum + item.price * item.qty, 0);

const updateCartCount = () => {
  document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = cartCount()));
};

// draw the cart items inside the drawer
const renderCartItems = () => {
  const box = document.getElementById("cartItems");
  const subtotalEl = document.getElementById("cartSubtotal");
  if (!box) return;

  const cart = DB.getCart();
  if (cart.length === 0) {
    box.innerHTML = `<p class="text-gray-500 text-center mt-8">Your cart is empty.</p>`;
  } else {
    box.innerHTML = cart
      .map(
        (item) => `
        <div class="flex gap-3 items-center bg-metal border border-metal-700 rounded-lg p-2">
          <img src="${item.image}" alt="${item.name}" class="w-14 h-14 object-cover rounded" />
          <div class="flex-1">
            <p class="text-white text-sm font-semibold">${item.name}</p>
            <p class="text-gold text-sm">${formatMMK(item.price)}</p>
            <!-- Quantity stepper -->
            <div class="flex items-center gap-2 mt-1">
              <button data-dec="${item.id}" aria-label="Decrease" class="w-6 h-6 rounded bg-metal-700 text-white font-bold hover:bg-maroon transition-all duration-300">−</button>
              <span class="text-white text-sm w-5 text-center">${item.qty}</span>
              <button data-inc="${item.id}" aria-label="Increase" class="w-6 h-6 rounded bg-metal-700 text-white font-bold hover:bg-gold hover:text-metal transition-all duration-300">+</button>
            </div>
          </div>
          <button data-remove="${item.id}" aria-label="Remove" class="text-gray-500 hover:text-maroon-light text-xl leading-none self-start">&times;</button>
        </div>`
      )
      .join("");
  }
  if (subtotalEl) subtotalEl.textContent = formatMMK(cartSubtotal());
};


// ===== sale items page (grid + filter + detail modal) =====
// build the product popup once
const buildProductModal = () => {
  if (document.getElementById("productModal")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div id="productModal" class="hidden fixed inset-0 z-[80] bg-black/70 flex items-center justify-center px-4">
      <div class="bg-metal-light border border-gold rounded-2xl max-w-md w-full overflow-hidden">
        <div class="relative">
          <img id="pmImage" src="" alt="" class="w-full h-48 object-cover" />
          <button id="pmClose" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white text-xl">&times;</button>
        </div>
        <div class="p-6">
          <span id="pmCategory" class="text-xs text-gold font-semibold uppercase"></span>
          <h3 id="pmName" class="text-xl font-bold text-white mt-1"></h3>
          <p id="pmSpecs" class="text-sm text-gray-400 mt-2"></p>
          <p id="pmPrice" class="text-2xl font-black text-gold mt-4"></p>
          <button id="pmAdd" class="mt-5 w-full bg-gold text-metal font-bold py-3 rounded-md hover:bg-gold-light transition-all duration-300">Add to Cart</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  document.getElementById("pmClose").addEventListener("click", closeProductModal);
  document.getElementById("productModal").addEventListener("click", (e) => {
    if (e.target.id === "productModal") closeProductModal();
  });
  document.getElementById("pmAdd").addEventListener("click", (e) => {
    addToCart(e.target.dataset.id);
    closeProductModal();
    openCart();
  });
};

// fill popup with the clicked product info
const openProductModal = (productId) => {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) return;
  document.getElementById("pmImage").src = p.image;
  document.getElementById("pmCategory").textContent = p.category;
  document.getElementById("pmName").textContent = p.name;
  document.getElementById("pmSpecs").textContent = p.specs;
  document.getElementById("pmPrice").textContent = formatMMK(p.price);
  document.getElementById("pmAdd").dataset.id = p.id;
  document.getElementById("productModal").classList.remove("hidden");
};
const closeProductModal = () => document.getElementById("productModal")?.classList.add("hidden");

const initSaleItems = () => {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  buildProductModal();

  // make the product cards
  const render = (list) => {
    grid.innerHTML = list
      .map(
        (p) => `
        <div class="bg-metal-light border border-metal-700 rounded-xl overflow-hidden hover:border-gold transition-all duration-300">
          <img src="${p.image}" alt="${p.name}" class="w-full h-48 object-cover" />
          <div class="p-4">
            <span class="text-xs text-gold font-semibold uppercase">${p.category}</span>
            <h3 class="text-white font-bold mt-1">${p.name}</h3>
            <p class="text-gold font-bold mt-1">${formatMMK(p.price)}</p>
            <div class="flex gap-2 mt-3">
              <button data-details="${p.id}" class="flex-1 border border-gold text-gold text-sm font-bold py-2 rounded-md hover:bg-gold hover:text-metal transition-all duration-300">Details</button>
              <button data-add="${p.id}" class="flex-1 bg-gold text-metal text-sm font-bold py-2 rounded-md hover:bg-gold-light transition-all duration-300">Add to Cart</button>
            </div>
          </div>
        </div>`
      )
      .join("");
  };

  // filter btns - filter products by category
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.filter;
      const list = category === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
      render(list);
      buttons.forEach((b) => {
        b.classList.remove("bg-gold", "text-metal");
        b.classList.add("bg-metal-light", "text-gray-300");
      });
      button.classList.add("bg-gold", "text-metal");
      button.classList.remove("bg-metal-light", "text-gray-300");
    });
  });

  // one grid listener for details + add buttons
  grid.addEventListener("click", (e) => {
    const details = e.target.closest("[data-details]");
    const add = e.target.closest("[data-add]");
    if (details) openProductModal(details.dataset.details);
    if (add) { addToCart(add.dataset.add); openCart(); }
  });

  render(PRODUCTS);
};


// ===== checkout page (needs login + 5% tax) =====
const initCheckout = () => {
  const list = document.getElementById("checkoutItems");
  if (!list) return; // only checkout page

  // must be logged in - save where we were then send to login
  if (!DB.getUser()) {
    localStorage.setItem("tmt_redirect", "checkout-steps.html");
    window.location.href = "login.html";
    return;
  }

  const subtotalEl = document.getElementById("coSubtotal");
  const taxEl = document.getElementById("coTax");
  const totalEl = document.getElementById("coTotal");
  const form = document.getElementById("deliveryForm");
  const emptyMsg = document.getElementById("emptyCart");
  const success = document.getElementById("orderSuccess");

  // draw cart list + work out the totals
  const draw = () => {
    const cart = DB.getCart();

    if (cart.length === 0) {
      list.innerHTML = "";
      if (emptyMsg) emptyMsg.classList.remove("hidden");
      if (form) form.classList.add("hidden");
    } else {
      if (emptyMsg) emptyMsg.classList.add("hidden");
      if (form) form.classList.remove("hidden");
      list.innerHTML = cart
        .map(
          (item) => `
          <div class="flex items-center gap-3 border-b border-metal-700 py-3">
            <img src="${item.image}" alt="${item.name}" class="w-14 h-14 object-cover rounded" />
            <div class="flex-1">
              <p class="text-white text-sm font-semibold">${item.name}</p>
              <div class="flex items-center gap-2 mt-1">
                <button data-dec="${item.id}" class="w-6 h-6 rounded bg-metal-700 text-white font-bold hover:bg-maroon transition-all duration-300">−</button>
                <span class="text-white text-sm w-5 text-center">${item.qty}</span>
                <button data-inc="${item.id}" class="w-6 h-6 rounded bg-metal-700 text-white font-bold hover:bg-gold hover:text-metal transition-all duration-300">+</button>
              </div>
            </div>
            <span class="text-gold font-bold text-sm">${formatMMK(item.price * item.qty)}</span>
          </div>`
        )
        .join("");
    }

    const subtotal = cartSubtotal();
    const tax = Math.round(subtotal * COMMERCIAL_TAX); // 5%
    if (subtotalEl) subtotalEl.textContent = formatMMK(subtotal);
    if (taxEl) taxEl.textContent = formatMMK(tax);
    if (totalEl) totalEl.textContent = formatMMK(subtotal + tax);
  };

  // +/- buttons in the checkout list
  list.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    if (inc) changeQty(inc.dataset.inc, +1);
    if (dec) changeQty(dec.dataset.dec, -1);
  });

  // let the drawer redraw this page when qty changes there
  checkoutRefresh = draw;
  draw();

  // place order
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (DB.getCart().length === 0) { alert("Your cart is empty."); return; }
      const address = document.getElementById("deliveryAddress").value.trim();
      if (address === "") { alert("Please enter your delivery address."); return; }

      const subtotal = cartSubtotal();
      const tax = Math.round(subtotal * COMMERCIAL_TAX);

      // save order into history
      const orders = DB.getOrders();
      orders.unshift({
        orderId: "ORD-" + Date.now().toString().slice(-6),
        date: new Date().toISOString().slice(0, 10),
        items: DB.getCart(),
        total: subtotal + tax,
      });
      DB.setOrders(orders);

      DB.setCart([]); // empty the cart
      updateCartCount();

      document.getElementById("checkoutMain").classList.add("hidden");
      success.classList.remove("hidden");
      success.classList.add("animate-pop");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
};


// ===== login / register =====
const makeCustomerId = () => "CUST-" + Math.floor(1000 + Math.random() * 9000);

// fake login - just make a user obj and save it
const loginUser = (email, name) => {
  const user = { email, name: name || email.split("@")[0], custId: makeCustomerId() };
  DB.setUser(user);
  return user;
};

const logoutUser = () => {
  DB.clearUser();
  window.location.href = "index.html";
};

// after login go back to checkout if thats where we came from
const redirectAfterLogin = () => {
  const dest = localStorage.getItem("tmt_redirect") || "dashboard.html";
  localStorage.removeItem("tmt_redirect");
  window.location.href = dest;
};

const initAuthPage = () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  if (!loginForm && !registerForm) return;

  // login/register tab switch
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.auth;
      tabs.forEach((t) => {
        const on = t.dataset.auth === target;
        t.classList.toggle("bg-gold", on);
        t.classList.toggle("text-metal", on);
        t.classList.toggle("text-gray-300", !on);
      });
      loginForm.classList.toggle("hidden", target !== "login");
      registerForm.classList.toggle("hidden", target !== "register");
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const pass = document.getElementById("loginPassword").value.trim();
      if (email === "" || pass === "") { alert("Please enter your email and password."); return; }
      loginUser(email);
      redirectAfterLogin();
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("regName").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const pass = document.getElementById("regPassword").value.trim();
      if (name === "" || email === "" || pass === "") { alert("Please fill in all fields."); return; }
      loginUser(email, name);
      redirectAfterLogin();
    });
  }
};


// ===== dashboard (profile + history + repair tracking) =====
// builds the little Diagnosing -> Waiting -> Completed tracker
const statusTrackerHTML = (status) => {
  const current = REPAIR_STATUSES.indexOf(status);
  return REPAIR_STATUSES.map((label, i) => {
    const done = i <= current;
    const dot = done ? "bg-gold text-metal" : "bg-metal-700 text-gray-400";
    const line = i < REPAIR_STATUSES.length - 1
      ? `<span class="flex-1 h-px ${i < current ? "bg-gold" : "bg-metal-700"}"></span>`
      : "";
    return `
      <div class="flex items-center gap-1">
        <span class="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${dot}">${i + 1}</span>
        <span class="text-xs ${done ? "text-gold" : "text-gray-500"}">${label}</span>
      </div>${line}`;
  }).join("");
};

const initDashboard = () => {
  const page = document.getElementById("dashboardPage");
  if (!page) return;

  // kick out to login if not signed in
  const user = DB.getUser();
  if (!user) { window.location.href = "login.html"; return; }

  // profile info
  const nameEl = document.getElementById("dashName");
  const idEl = document.getElementById("dashId");
  const emailEl = document.getElementById("dashEmail");
  if (nameEl) nameEl.textContent = user.name;
  if (idEl) idEl.textContent = user.custId;
  if (emailEl) emailEl.textContent = user.email;

  // tab switching
  const tabButtons = document.querySelectorAll(".dash-tab");
  const panels = document.querySelectorAll(".dash-panel");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.panel;
      tabButtons.forEach((b) => {
        const on = b.dataset.panel === target;
        b.classList.toggle("bg-gold", on);
        b.classList.toggle("text-metal", on);
        b.classList.toggle("text-gray-300", !on);
      });
      panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== target));
    });
  });

  // purchase history
  const historyList = document.getElementById("historyList");
  if (historyList) {
    const orders = DB.getOrders();
    historyList.innerHTML = orders.length === 0
      ? `<p class="text-gray-500">No purchases yet. Visit the shop to buy something!</p>`
      : orders
        .map(
          (o) => `
          <div class="bg-metal border border-metal-700 rounded-lg p-4">
            <div class="flex justify-between items-center">
              <span class="text-white font-bold">${o.orderId}</span>
              <span class="text-gray-400 text-sm">${o.date}</span>
            </div>
            <p class="text-sm text-gray-400 mt-1">${o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</p>
            <p class="text-gold font-bold mt-2">${formatMMK(o.total)}</p>
          </div>`
        )
        .join("");
  }

  // repair tracking + search by device id
  const repairList = document.getElementById("repairList");
  const search = document.getElementById("repairSearch");

  const drawRepairs = (filterText = "") => {
    if (!repairList) return;
    const text = filterText.trim().toLowerCase();
    const repairs = DB.getRepairs() || [];
    const shown = text === "" ? repairs : repairs.filter((r) => r.deviceId.toLowerCase().includes(text));

    repairList.innerHTML = shown.length === 0
      ? `<p class="text-gray-500">No repairs found for that Device ID.</p>`
      : shown
        .map(
          (r) => `
          <div class="bg-metal border border-metal-700 rounded-lg p-4">
            <div class="flex flex-wrap justify-between items-center gap-2">
              <span class="text-gold font-bold">${r.deviceId}</span>
              <span class="text-xs px-2 py-1 rounded-full ${r.status === "Completed" ? "bg-gold text-metal" : "bg-maroon text-white"}">${r.status}</span>
            </div>
            <p class="text-white text-sm mt-1">${r.device} — <span class="text-gray-400">${r.issue}</span></p>
            <div class="flex items-center gap-1 mt-4">${statusTrackerHTML(r.status)}</div>
            ${r.status === "Completed" && r.warranty
              ? `<p class="text-xs text-gray-400 mt-3">✅ Warranty valid until <span class="text-gold font-semibold">${r.warranty}</span></p>`
              : `<p class="text-xs text-gray-500 mt-3">Received: ${r.received}</p>`}
          </div>`
        )
        .join("");
  };

  drawRepairs();
  if (search) search.addEventListener("input", () => drawRepairs(search.value));

  document.querySelectorAll(".logout-btn").forEach((b) => b.addEventListener("click", logoutUser));
};


// ===== repair booking wizard (3 steps) =====
const initRepairWizard = () => {
  const wizard = document.getElementById("repairWizard");
  if (!wizard) return;

  // price for each fault (MMK)
  const ISSUE_COSTS = {
    "Screen broken / cracked": 120000,
    "No Power": 45000,
    "No Display / Lines on screen": 65000,
    "Audio issue": 30000,
    "Backlight problem": 80000,
  };
  // pickup fee by zone (MMK)
  const ZONE_FEES = {
    "Zone A – City centre": 5000,
    "Zone B – Suburbs": 8000,
    "Zone C – Outside city": 12000,
  };

  const state = { step: 1, repairCost: 0, deliveryFee: 0 };
  const totalSteps = 3;

  // grab everything
  const steps = wizard.querySelectorAll(".wizard-step");
  const dots = wizard.querySelectorAll(".step-dot");
  const issueSelect = document.getElementById("issue");
  const estimateBox = document.getElementById("estimateBox");
  const estimateValue = document.getElementById("estimateValue");
  const fulfilRadios = wizard.querySelectorAll('input[name="fulfilment"]');
  const pickupBlock = document.getElementById("pickupBlock");
  const zoneSelect = document.getElementById("zone");
  const addressInput = document.getElementById("address");
  const sumIssue = document.getElementById("sumIssue");
  const sumRepair = document.getElementById("sumRepair");
  const sumDelivery = document.getElementById("sumDelivery");
  const sumTotal = document.getElementById("sumTotal");

  // show a step + colour the dots
  const showStep = (n) => {
    state.step = n;
    steps.forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === n));
    dots.forEach((d) => {
      const done = Number(d.dataset.dot) <= n;
      d.classList.toggle("bg-gold", done);
      d.classList.toggle("text-metal", done);
      d.classList.toggle("bg-metal-700", !done);
      d.classList.toggle("text-gray-400", !done);
    });
    wizard.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // show estimate when a fault is picked
  issueSelect.addEventListener("change", () => {
    state.repairCost = ISSUE_COSTS[issueSelect.value] || 0;
    estimateValue.textContent = formatMMK(state.repairCost);
    estimateBox.classList.remove("hidden");
    estimateBox.classList.add("animate-pop");
  });

  // pickup shows address + adds zone fee, dropoff = free
  const updateDelivery = () => {
    const choice = wizard.querySelector('input[name="fulfilment"]:checked');
    const isPickup = choice && choice.value === "pickup";
    pickupBlock.classList.toggle("open", isPickup);
    state.deliveryFee = isPickup ? (ZONE_FEES[zoneSelect.value] || 0) : 0;
  };
  fulfilRadios.forEach((r) => r.addEventListener("change", updateDelivery));
  zoneSelect.addEventListener("change", updateDelivery);

  // fill the summary on step 3
  const updateSummary = () => {
    sumIssue.textContent = issueSelect.value || "—";
    sumRepair.textContent = formatMMK(state.repairCost);
    sumDelivery.textContent = state.deliveryFee > 0 ? formatMMK(state.deliveryFee) : "Free (drop-off)";
    sumTotal.textContent = formatMMK(state.repairCost + state.deliveryFee);
  };

  // check inputs before moving on
  const validateStep = (n) => {
    if (n === 1) {
      if (document.getElementById("brand").value.trim() === "") { alert("Please enter the TV brand/model."); return false; }
      if (issueSelect.value === "") { alert("Please choose what is broken."); return false; }
    }
    if (n === 2) {
      const choice = wizard.querySelector('input[name="fulfilment"]:checked');
      if (choice && choice.value === "pickup" && addressInput.value.trim() === "") { alert("Please enter your pick-up address."); return false; }
    }
    return true;
  };

  // next / back btns
  wizard.querySelectorAll("[data-next]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (!validateStep(state.step)) return;
      const next = Math.min(state.step + 1, totalSteps);
      if (next === 3) updateSummary();
      showStep(next);
    })
  );
  wizard.querySelectorAll("[data-back]").forEach((btn) =>
    btn.addEventListener("click", () => showStep(Math.max(state.step - 1, 1)))
  );

  // submit
  document.getElementById("repairForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("custName").value.trim();
    const email = document.getElementById("custEmail").value.trim();
    if (name === "" || email === "") { alert("Please enter your name and email."); return; }

    // save repair so it shows up in the dashboard
    const brand = document.getElementById("brand").value.trim();
    const size = document.getElementById("size").value.trim();
    const repairs = DB.getRepairs() || [];
    repairs.unshift({
      deviceId: "#TV-" + (brand.split(" ")[0] || "Device") + "-" + (size || "NA") + "in-" + Math.floor(1000 + Math.random() * 9000),
      device: brand + (size ? ` ${size}"` : ""),
      issue: issueSelect.value,
      status: "Diagnosing",
      received: new Date().toISOString().slice(0, 10),
      warranty: "",
    });
    DB.setRepairs(repairs);

    wizard.classList.add("hidden");
    const success = document.getElementById("successCard");
    success.classList.remove("hidden");
    success.classList.add("animate-pop");
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  showStep(1);
};


// ===== homepage quick booking + mobile menu =====
const initQuickBooking = () => {
  const form = document.getElementById("quickBookingForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("qbName").value.trim();
    const item = document.getElementById("qbItem").value;
    if (name === "") { alert("Please enter your name."); return; }
    alert(`Thank you, ${name}! Your booking for a ${item} has been received. We will contact you soon.`);
    form.reset();
  });
};

// mobile menu toggle (also swaps the ☰ / ✕ icons)
const initMobileMenu = () => {
  const button = document.getElementById("hamburger");
  const menu = document.getElementById("mobileMenu");
  if (!button || !menu) return;
  button.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("hidden") === false;
    const iconOpen = document.getElementById("icon-open");
    const iconClose = document.getElementById("icon-close");
    if (iconOpen && iconClose) {
      iconOpen.classList.toggle("hidden", isOpen);
      iconClose.classList.toggle("hidden", !isOpen);
    }
    button.setAttribute("aria-expanded", isOpen);
  });
};


// ===== run everything when page loads =====
document.addEventListener("DOMContentLoaded", () => {
  seedRepairsIfEmpty();
  buildCartDrawer();
  renderNavActions();

  initMobileMenu();
  initQuickBooking();
  initSaleItems();
  initCheckout();
  initAuthPage();
  initDashboard();
  initRepairWizard();
});
