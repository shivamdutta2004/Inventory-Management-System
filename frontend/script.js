function showSection(id) {
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("addSection").style.display = "none";
    document.getElementById("inventorySection").style.display = "none";

    document.getElementById(id).style.display = "block";
}
const API = "http://localhost:5000/api/items";

const form = document.getElementById("itemForm");
const itemsDiv = document.getElementById("items");

let editId = null;

// LOAD ITEMS
async function loadItems() {
    const res = await fetch(API);
    const data = await res.json();

    // DATE FILTER
const startDate = document.getElementById("startDate")?.value;
const endDate = document.getElementById("endDate")?.value;

let filteredData = data;

if (startDate && endDate) {
    filteredData = data.filter(item => {
        const itemDate = new Date(item.purchaseDate);
        return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
    });
}


    itemsDiv.innerHTML = "";

    // TOTAL COUNT (form side)
    document.getElementById("totalCount").innerText =
        "Total Items: " + data.length;

    // 🔥 DASHBOARD COUNTS
    let working = 0;
    let faulty = 0;

    filteredData.forEach(item => {
        if (item.condition === "Working") working++;
        if (item.condition === "Faulty") faulty++;
    });

    document.getElementById("totalTop").innerText = filteredData.length;
    document.getElementById("workingCount").innerText = working;
    document.getElementById("faultyCount").innerText = faulty;

    // SEARCH FILTER
    const search = document.getElementById("search").value.toLowerCase();

    const filtered = filteredData.filter(item =>
    (item.brand || "").toLowerCase().includes(search) ||
    (item.model || "").toLowerCase().includes(search)
);

    filtered.forEach(item => {
        itemsDiv.innerHTML += `
<div class="bg-white p-5 rounded-xl shadow-md mb-4 border hover:shadow-lg transition">

    <div class="flex justify-between items-start">
        <div>
            <h3 class="text-xl font-bold text-gray-800">${item.category}</h3>
            <p class="text-gray-600">${item.brand} - ${item.model}</p>
        </div>

        <span class="px-3 py-1 text-xs rounded-full 
            ${item.condition === "Working" ? "bg-green-100 text-green-700" :
              item.condition === "Faulty" ? "bg-red-100 text-red-700" :
              "bg-yellow-100 text-yellow-700"}">
            ${item.condition}
        </span>
    </div>

    <div class="mt-3 text-gray-700">
        <p><b>Specs:</b> ${item.specifications || "-"}</p>
        <p><b>Quantity:</b> ${item.quantity || 0}</p>
        <p class="text-sm text-gray-500">
            ${item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : ""}
        </p>
    </div>

    <div class="mt-4 flex gap-3">
        <button onclick="editItem('${item._id}')" 
            class="px-4 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Edit
        </button>

        <button onclick="deleteItem('${item._id}')" 
            class="px-4 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Delete
        </button>
    </div>
</div>
`;
    });
    // DRAW CHART (safe)
if (window.myChartInstance) {
    window.myChartInstance.destroy();
}

const ctx = document.getElementById("myChart");

if (ctx) {
    window.myChartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Working", "Faulty"],
            datasets: [{
                data: [working, faulty],
                backgroundColor: ["#22c55e", "#ef4444"]
            }]
        }
    });
}
// ================= BAR CHART =================
const categoryMap = {};

filteredData.forEach(item => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
});

if (window.barChartInstance) window.barChartInstance.destroy();

const barCtx = document.getElementById("barChart");

if (barCtx) {
    window.barChartInstance = new Chart(barCtx, {
        type: "bar",
        data: {
            labels: Object.keys(categoryMap),
            datasets: [{
                label: "Items per Category",
                data: Object.values(categoryMap)
            }]
        }
    });
}


// ================= LINE CHART =================
const dateMap = {};

filteredData.forEach(item => {
    const date = item.purchaseDate
        ? new Date(item.purchaseDate).toLocaleDateString()
        : "Unknown";

    dateMap[date] = (dateMap[date] || 0) + 1;
});

if (window.lineChartInstance) window.lineChartInstance.destroy();

const lineCtx = document.getElementById("lineChart");

if (lineCtx) {
    window.lineChartInstance = new Chart(lineCtx, {
        type: "line",
        data: {
            labels: Object.keys(dateMap),
            datasets: [{
                label: "Items Over Time",
                data: Object.values(dateMap),
                fill: false
            }]
        }
    });
}
}

// ADD / UPDATE
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const item = {
    category: category.value,
    brand: brand.value,
    model: model.value,
    specifications: specs.value,   // 🔥 FIX
    quantity: Number(quantity.value), // 🔥 FIX (important)
    purchaseDate: date.value,
    condition: condition.value
};

    if (editId) {
        await fetch(`${API}/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
        });
        editId = null;
    } else {
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
        });
        alert("Item added successfully!");
    }

    form.reset();
    loadItems();
});

// DELETE
async function deleteItem(id) {
    if (!confirm("Are you sure you want to delete this item?")) return;

    await fetch(`${API}/${id}`, { method: "DELETE" });
    loadItems();
}

// EDIT
function editItem(id) {
    editId = id;

    fetch(API)
    .then(res => res.json())
    .then(data => {
        const item = data.find(i => i._id === id);

        category.value = item.category;
        brand.value = item.brand;
        model.value = item.model;
        specs.value = item.specifications || "";
        quantity.value = item.quantity;
        date.value = item.purchaseDate;
        condition.value = item.condition;
    });
}

// SEARCH EVENT
document.getElementById("search").addEventListener("input", loadItems);

// INITIAL LOAD
loadItems();

function showSection(id) {
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("addSection").style.display = "none";
    document.getElementById("inventorySection").style.display = "none";

    document.getElementById(id).style.display = "block";
}

showSection("inventorySection");
showSection("dashboardSection");