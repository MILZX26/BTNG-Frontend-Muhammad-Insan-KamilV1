/*
  MILZ AUTO - Vanilla JavaScript
  API resmi dncc: https://api-web.dnccudinus.org/api/mobil

*/
const API_URL = "https://api-web.dnccudinus.org/api/mobil";

// EDIT nomor WhatsApp konsultasi di sini. Gunakan kode negara, tanpa tanda + atau spasi.
const WHATSAPP_NUMBER = "6285879509344";

const carGrid = document.querySelector("#carGrid");
const statusPanel = document.querySelector("#statusPanel");
const resultCount = document.querySelector("#resultCount");
const searchInput = document.querySelector("#searchInput");
const brandFilter = document.querySelector("#brandFilter");
const resetFilters = document.querySelector("#resetFilters");
const emptyState = document.querySelector("#emptyState");
const carDialog = document.querySelector("#carDialog");
const dialogContent = document.querySelector("#dialogContent");
const dialogClose = document.querySelector("#dialogClose");
const contactButton = document.querySelector("#contactButton");
const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");

let allCars = [];
let filteredCars = [];

// Gambar fallback hanya digunakan jika API tidak menyediakan URL gambar yang valid.
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80";

document.querySelector("#currentYear").textContent = new Date().getFullYear();
contactButton.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Halo MILZ AUTO, saya ingin konsultasi mengenai mobil.")}`;

function setStatus(message, type = "loading") {
  statusPanel.className = "status-panel";
  if (type === "error") statusPanel.classList.add("error");
  if (type === "success") statusPanel.classList.add("success");

  statusPanel.replaceChildren();

  if (type === "loading") {
    const loader = document.createElement("span");
    loader.className = "loader";
    statusPanel.append(loader);
  }

  const text = document.createElement("span");
  text.textContent = message;
  statusPanel.append(text);
  statusPanel.classList.toggle("hidden", type === "success");
}

/* Mengambil nilai pertama yang tersedia dari kemungkinan nama field API. */
function firstValue(object, keys, fallback = "") {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

/* Normalisasi beberapa format respons API umum menjadi array mobil. */
function extractCarArray(payload) {
  if (Array.isArray(payload)) return payload;

  const possibleArrays = [
    payload?.data,
    payload?.mobil,
    payload?.cars,
    payload?.results,
    payload?.items,
    payload?.data?.data,
    payload?.data?.mobil,
    payload?.data?.cars,
    payload?.data?.items
  ];

  return possibleArrays.find(Array.isArray) || null;
}

/* Pemetaan field API -> properti yang dipakai antarmuka.
   Sesuaikan daftar key jika nama field pada API panitia berbeda. */
function getCarFields(car, index) {
  const brand = firstValue(car, ["merek", "brand", "merk", "manufacturer", "nama_merek"], "Mobil");
  const model = firstValue(car, ["model", "nama", "nama_mobil", "name", "tipe", "title"], `Kendaraan ${index + 1}`);
  const year = firstValue(car, ["tahun", "year", "tahun_produksi", "production_year"], "—");
  const transmission = firstValue(car, ["transmisi", "transmission", "jenis_transmisi"], "—");
  const fuel = firstValue(car, ["bahan_bakar", "fuel", "fuel_type", "jenis_bahan_bakar"], "—");
  const price = firstValue(car, ["harga", "price", "harga_jual", "price_value"], null);
  const mileage = firstValue(car, ["kilometer", "kilometres", "mileage", "km"], "—");
  const category = firstValue(car, ["kategori", "category", "jenis", "tipe_mobil", "body_type"], String(brand));
  const description = firstValue(car, ["deskripsi", "description", "keterangan", "detail"], "Informasi lebih lanjut mengenai kendaraan ini dapat ditanyakan kepada tim MILZ AUTO.");
  const image = firstValue(car, ["gambar", "foto", "image", "image_url", "foto_mobil", "url_gambar", "thumbnail", "url"], "");
  const id = firstValue(car, ["id", "mobil_id", "uuid", "slug"], index);

  return {
    id: String(id),
    brand: String(brand),
    model: String(model),
    year: String(year),
    transmission: String(transmission),
    fuel: String(fuel),
    price,
    mileage: String(mileage),
    category: String(category),
    description: String(description),
    image: normalizeImageUrl(image),
    raw: car
  };
}

function normalizeImageUrl(value) {
  if (!value || typeof value !== "string") return FALLBACK_IMAGE;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  // Path relatif pada API: gunakan origin API sebagai basis URL.
  try {
    return new URL(trimmed, API_URL).href;
  } catch {
    return FALLBACK_IMAGE;
  }
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "Hubungi kami";
  if (typeof value === "string" && /rp|idr|juta|miliar|million|billion/i.test(value)) return value;
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return String(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeSpec(label, value) {
  const box = makeElement("div", "dialog-spec");
  box.append(makeElement("small", "", label), makeElement("strong", "", value || "—"));
  return box;
}

function createCarCard(car, index) {
  const card = makeElement("article", "car-card");

  const imageWrap = makeElement("div", "car-image-wrap");
  const image = makeElement("img", "car-image");
  image.src = car.image;
  image.alt = `${car.brand} ${car.model}`;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    if (image.src !== FALLBACK_IMAGE) image.src = FALLBACK_IMAGE;
  }, { once: true });

  const tag = makeElement("span", "car-tag", car.category || "Featured");
  imageWrap.append(image, tag);

  const body = makeElement("div", "car-card-body");
  body.append(
    makeElement("p", "car-brand", car.brand),
    makeElement("h3", "car-title", car.model)
  );

  const meta = makeElement("div", "car-meta");
  meta.append(
    makeElement("span", "", car.year),
    makeElement("span", "", car.transmission),
    makeElement("span", "", car.fuel)
  );

  const footer = makeElement("div", "car-card-footer");
  footer.append(makeElement("p", "car-price", formatPrice(car.price)));

  const detailsButton = makeElement("button", "details-button", "LIHAT DETAIL →");
  detailsButton.type = "button";
  detailsButton.addEventListener("click", () => openCarDetails(car, index));
  footer.append(detailsButton);

  body.append(meta, footer);
  card.append(imageWrap, body);
  return card;
}

function renderCars(cars) {
  carGrid.replaceChildren();
  const fragment = document.createDocumentFragment();

  cars.forEach((car) => {
    const originalIndex = allCars.indexOf(car);
    fragment.append(createCarCard(car, originalIndex >= 0 ? originalIndex : 0));
  });

  carGrid.append(fragment);
  resultCount.textContent = `${cars.length} mobil ditemukan`;
  emptyState.classList.toggle("hidden", cars.length !== 0);
  statusPanel.classList.add("hidden");
}

function populateBrandFilter(cars) {
  const current = brandFilter.value;
  const brands = [...new Set(cars.map((car) => car.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id"));

  brandFilter.replaceChildren(new Option("Semua merek", "all"));
  brands.forEach((brand) => brandFilter.add(new Option(brand, brand)));
  brandFilter.value = brands.includes(current) ? current : "all";
}

function applyFilters() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  const selectedBrand = brandFilter.value;

  filteredCars = allCars.filter((car) => {
    const searchable = [
      car.brand, car.model, car.year, car.transmission,
      car.fuel, car.category, car.description
    ].join(" ").toLocaleLowerCase("id");

    const matchesQuery = searchable.includes(query);
    const matchesBrand = selectedBrand === "all" || car.brand === selectedBrand;
    return matchesQuery && matchesBrand;
  });

  renderCars(filteredCars);
}

function openCarDetails(car, index) {
  dialogContent.replaceChildren();

  const image = makeElement("img", "dialog-image");
  image.src = car.image;
  image.alt = `${car.brand} ${car.model}`;
  image.addEventListener("error", () => { image.src = FALLBACK_IMAGE; }, { once: true });

  const body = makeElement("div", "dialog-body");
  body.append(
    makeElement("p", "car-brand", car.brand),
    makeElement("h2", "", car.model),
    makeElement("p", "dialog-price", formatPrice(car.price)),
    makeElement("p", "dialog-description", car.description)
  );

  const specs = makeElement("div", "dialog-specs");
  specs.append(
    makeSpec("TAHUN", car.year),
    makeSpec("TRANSMISI", car.transmission),
    makeSpec("BAHAN BAKAR", car.fuel),
    makeSpec("KILOMETER", car.mileage),
    makeSpec("KATEGORI", car.category),
    makeSpec("ID DATA", car.id)
  );

  const consult = makeElement("a", "button button-red", "TANYAKAN MOBIL INI ↗");
  consult.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Halo MILZ AUTO, saya ingin bertanya tentang ${car.brand} ${car.model}.`)}`;
  consult.target = "_blank";
  consult.rel = "noopener noreferrer";

  body.append(specs, consult);
  dialogContent.append(image, body);

  if (typeof carDialog.showModal === "function") {
    carDialog.showModal();
  } else {
    alert(`${car.brand} ${car.model}\nHarga: ${formatPrice(car.price)}\nTahun: ${car.year}`);
  }
}

async function loadCars() {
  setStatus("Menghubungkan ke API resmi panitia...", "loading");
  resultCount.textContent = "Memuat mobil...";
  carGrid.replaceChildren();
  emptyState.classList.add("hidden");

  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Server merespons HTTP ${response.status}.`);
    }

    const payload = await response.json();
    const rawCars = extractCarArray(payload);

    if (!rawCars) {
      console.error("Format respons API tidak dikenali:", payload);
      throw new Error("Respons API diterima, tetapi format daftar mobil belum dikenali. Periksa struktur JSON di Console.");
    }

    allCars = rawCars.map((car, index) => getCarFields(car, index));
    populateBrandFilter(allCars);

    if (allCars.length === 0) {
      resultCount.textContent = "0 mobil ditemukan";
      setStatus("API berhasil dihubungi, tetapi belum ada data mobil.", "success");
      emptyState.classList.remove("hidden");
      return;
    }

    setStatus(`Berhasil memuat ${allCars.length} data mobil dari API.`, "success");
    applyFilters();
  } catch (error) {
    console.error("Gagal mengambil data mobil:", error);
    resultCount.textContent = "Data tidak tersedia";
    setStatus(
      `Gagal memuat data API. ${error.message} Periksa koneksi, status server, dan CORS. Buka Console (F12) untuk detail.`,
      "error"
    );
    carGrid.replaceChildren();
    emptyState.classList.add("hidden");
  }
}

searchInput.addEventListener("input", applyFilters);
brandFilter.addEventListener("change", applyFilters);

resetFilters.addEventListener("click", () => {
  searchInput.value = "";
  brandFilter.value = "all";
  applyFilters();
});

dialogClose.addEventListener("click", () => carDialog.close());
carDialog.addEventListener("click", (event) => {
  if (event.target === carDialog) carDialog.close();
});

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "×" : "☰";
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

// Mulai mengambil data ketika halaman siap.
loadCars();
