const STORAGE_KEY = "dietFlexTracker:v2";

const $ = (id) => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);

let state = loadState();

$("mealDate").value = today;
$("filterDate").value = today;

function defaultState() {
  return {
    profile: {
      name: "",
      age: 25,
      gender: "male",
      weight: 70,
      height: 170,
      targetWeight: 65,
      activity: "1.375",
      goal: "-500"
    },
    meals: [],
    workouts: []
  };
}

function normalizeState(data) {
  const fallback = defaultState();
  return {
    profile: data?.profile || fallback.profile,
    meals: Array.isArray(data?.meals) ? data.meals : [],
    workouts: Array.isArray(data?.workouts) ? data.workouts : []
  };
}

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState());
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function num(id) {
  return Number($(id).value || 0);
}

function round(value) {
  return Math.round(Number(value) || 0);
}

function fillProfile() {
  const p = state.profile;
  $("name").value = p.name || "";
  $("age").value = p.age || "";
  $("gender").value = p.gender || "male";
  $("weight").value = p.weight || "";
  $("height").value = p.height || "";
  $("targetWeight").value = p.targetWeight || "";
  $("activity").value = p.activity || "1.375";
  $("goal").value = p.goal || "-500";
}

function calculateProfile() {
  const p = state.profile;
  const weight = Number(p.weight);
  const height = Number(p.height);
  const age = Number(p.age);
  const activity = Number(p.activity);
  const goalAdjust = Number(p.goal);

  if (!weight || !height || !age) {
    return {
      bmi: 0,
      bmiStatus: "Isi profil dulu",
      bmr: 0,
      tdee: 0,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0
    };
  }

  const bmr = p.gender === "male"
    ? (10 * weight) + (6.25 * height) - (5 * age) + 5
    : (10 * weight) + (6.25 * height) - (5 * age) - 161;

  const tdee = bmr * activity;
  const calories = Math.max(1000, tdee + goalAdjust);

  const bmi = weight / Math.pow(height / 100, 2);
  const bmiStatus =
    bmi < 18.5 ? "Underweight" :
    bmi < 25 ? "Normal" :
    bmi < 30 ? "Overweight" :
    "Obesitas";

  const protein = weight * 1.8;
  const fatCalories = calories * 0.25;
  const fat = fatCalories / 9;
  const carbs = (calories - (protein * 4) - fatCalories) / 4;

  return {
    bmi,
    bmiStatus,
    bmr,
    tdee,
    calories,
    protein,
    fat,
    carbs: Math.max(0, carbs)
  };
}

function renderProfile() {
  const calc = calculateProfile();

  $("bmi").textContent = calc.bmi ? calc.bmi.toFixed(1) : "-";
  $("bmiStatus").textContent = calc.bmiStatus;
  $("bmr").textContent = calc.bmr ? `${round(calc.bmr)} kkal` : "-";
  $("tdee").textContent = calc.tdee ? `${round(calc.tdee)} kkal` : "-";
  $("targetCalories").textContent = calc.calories ? `${round(calc.calories)} kkal` : "-";
  $("targetProtein").textContent = calc.protein ? `${round(calc.protein)} g` : "-";
  $("targetFat").textContent = calc.fat ? `${round(calc.fat)} g` : "-";
  $("targetCarbs").textContent = calc.carbs ? `${round(calc.carbs)} g` : "-";
}

function selectedMeals() {
  return state.meals.filter((meal) => meal.date === $("filterDate").value);
}

function selectedWorkouts() {
  return (state.workouts || []).filter((workout) => workout.date === $("filterDate").value);
}

function renderMeals() {
  const calc = calculateProfile();
  const meals = selectedMeals();
  const workouts = selectedWorkouts();

  const totals = meals.reduce((acc, meal) => {
    acc.calories += Number(meal.calories || 0);
    acc.protein += Number(meal.protein || 0);
    acc.carbs += Number(meal.carbs || 0);
    acc.fat += Number(meal.fat || 0);
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const burned = workouts.reduce((acc, workout) => acc + Number(workout.calories || 0), 0);
  const net = totals.calories - burned;

  const target = round(calc.calories);
  const remaining = target - totals.calories;
  const percent = target ? Math.round((totals.calories / target) * 100) : 0;

  $("sumCalories").textContent = totals.calories;
  $("burnedCalories").textContent = burned;
  $("netCalories").textContent = net;
  $("remainCalories").textContent = remaining;
  $("sumProtein").textContent = `${totals.protein}g`;
  $("sumCarbs").textContent = `${totals.carbs}g`;
  $("sumFat").textContent = `${totals.fat}g`;
  $("progressText").textContent = `${percent}%`;
  $("progressBar").style.width = `${Math.min(percent, 100)}%`;
  $("progressBar").style.background = percent > 100 ? "#ef4444" : "#22c55e";

  const tbody = $("mealTable");
  tbody.innerHTML = "";

  if (!meals.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Belum ada makanan di tanggal ini.</td></tr>`;
  } else {
    meals.forEach((meal) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(meal.food)}</td>
        <td>${meal.calories}</td>
        <td>${meal.protein}g</td>
        <td>${meal.carbs}g</td>
        <td>${meal.fat}g</td>
        <td><button class="danger" data-delete="${meal.id}">Hapus</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderWorkouts(workouts);
}

function renderWorkouts(workouts = selectedWorkouts()) {
  const tbody = $("workoutTable");
  tbody.innerHTML = "";

  if (!workouts.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Belum ada olahraga di tanggal ini.</td></tr>`;
    return;
  }

  workouts.forEach((workout) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(workout.name)}</td>
      <td>${workout.duration} menit</td>
      <td>${workout.calories} kkal</td>
      <td><button class="danger" data-workout-delete="${workout.id}">Hapus</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function render() {
  renderProfile();
  renderMeals();
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

$("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();

  state.profile = {
    name: $("name").value.trim(),
    age: num("age"),
    gender: $("gender").value,
    weight: num("weight"),
    height: num("height"),
    targetWeight: num("targetWeight"),
    activity: $("activity").value,
    goal: $("goal").value
  };

  saveState();
  render();
});

$("mealForm").addEventListener("submit", (event) => {
  event.preventDefault();

  state.meals.push({
    id: crypto.randomUUID(),
    date: $("mealDate").value,
    food: $("food").value.trim(),
    calories: num("calories"),
    protein: num("protein"),
    carbs: num("carbs"),
    fat: num("fat")
  });

  $("filterDate").value = $("mealDate").value;
  $("food").value = "";
  $("calories").value = "";
  $("protein").value = "0";
  $("carbs").value = "0";
  $("fat").value = "0";

  saveState();
  render();
});

$("workoutForm").addEventListener("submit", (event) => {
  event.preventDefault();

  state.workouts = state.workouts || [];

  state.workouts.push({
    id: crypto.randomUUID(),
    date: $("filterDate").value,
    name: $("workoutName").value.trim(),
    duration: num("workoutDuration"),
    calories: num("workoutCalories")
  });

  $("workoutName").value = "";
  $("workoutDuration").value = "";
  $("workoutCalories").value = "";

  saveState();
  render();
});

$("filterDate").addEventListener("change", renderMeals);

$("mealTable").addEventListener("click", (event) => {
  const id = event.target.dataset.delete;
  if (!id) return;

  state.meals = state.meals.filter((meal) => meal.id !== id);
  saveState();
  renderMeals();
});

$("workoutTable").addEventListener("click", (event) => {
  const id = event.target.dataset.workoutDelete;
  if (!id) return;

  state.workouts = (state.workouts || []).filter((workout) => workout.id !== id);
  saveState();
  renderMeals();
});

$("clearDayBtn").addEventListener("click", () => {
  const date = $("filterDate").value;
  if (!confirm(`Hapus semua log makanan tanggal ${date}?`)) return;

  state.meals = state.meals.filter((meal) => meal.date !== date);
  saveState();
  renderMeals();
});

$("clearWorkoutDayBtn").addEventListener("click", () => {
  const date = $("filterDate").value;
  if (!confirm(`Hapus semua log olahraga tanggal ${date}?`)) return;

  state.workouts = (state.workouts || []).filter((workout) => workout.date !== date);
  saveState();
  renderMeals();
});

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "backup-diet-flex-tracker.json";
  link.click();
  URL.revokeObjectURL(url);
});

$("importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = normalizeState(JSON.parse(text));

    state = imported;
    saveState();
    fillProfile();
    render();
    alert("Data berhasil diimport.");
  } catch {
    alert("Gagal import data.");
  }
});

fillProfile();
render();
