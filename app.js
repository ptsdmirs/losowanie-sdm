const $ = (id) => document.getElementById(id);

const peopleEl = $("people");
const resultEl = $("result");
const historyEl = $("history");
const counterEl = $("counter");

const drawBtn = $("draw");
const copyBtn = $("copy");

const noRepeatsEl = $("noRepeats");
const soundEl = $("sound");

const loadDefaultBtn = $("loadDefault");
const resetPoolBtn = $("resetPool");
const clearHistoryBtn = $("clearHistory");
const exportTxtBtn = $("exportTxt");

const LS_KEY = "sdm_draw_new_client_v1";

const DEFAULT_PEOPLE = [
  "Paweł",
  "Paulina",
  "Beata",
  "Krzysiek",
  "Łukasz",
  "Mateusz",
  "Gabi",
  "Monika"
];

let state = {
  used: [],     // wylosowane osoby (gdy bez powtórek)
  history: []   // {name, ts}
};

function parseLines(text){
  return text.split("\n").map(s => s.trim()).filter(Boolean);
}

function pickRandom(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

function setResult(name){
  resultEl.innerHTML = `
    <div class="name">${escapeHtml(name)}</div>
    <div class="meta">Wylosowany SDM dla „Nowy klient”</div>
  `;
}

function renderHistory(){
  historyEl.innerHTML = "";
  [...state.history].reverse().forEach(item => {
    const li = document.createElement("li");
    const d = new Date(item.ts);
    li.textContent = `${item.name}  |  ${d.toLocaleString("pl-PL")}`;
    historyEl.appendChild(li);
  });
  counterEl.textContent = `Losowań: ${state.history.length}`;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}

function save(){
  localStorage.setItem(LS_KEY, JSON.stringify({
    people: peopleEl.value,
    state,
    flags: {
      noRepeats: noRepeatsEl.checked,
      sound: soundEl.checked
    }
  }));
}

function load(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw){
    peopleEl.value = DEFAULT_PEOPLE.join("\n");
    return;
  }
  try{
    const data = JSON.parse(raw);
    peopleEl.value = data.people ?? DEFAULT_PEOPLE.join("\n");
    state = data.state ?? state;
    if(data.flags){
      noRepeatsEl.checked = !!data.flags.noRepeats;
      soundEl.checked = !!data.flags.sound;
    }
  }catch{
    peopleEl.value = DEFAULT_PEOPLE.join("\n");
  }
}

function clickSound(){
  if(!soundEl.checked) return;
  // super-prosty dźwięk "klik"
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.value = 880;
  g.gain.value = 0.05;
  o.connect(g); g.connect(ctx.destination);
  o.start();
  setTimeout(() => { o.stop(); ctx.close(); }, 60);
}

function draw(){
  const people = parseLines(peopleEl.value);
  if(people.length === 0){
    alert("Dodaj przynajmniej jedną osobę do listy SDM.");
    return;
  }

  let pool = people;

  if(noRepeatsEl.checked){
    pool = people.filter(p => !state.used.includes(p));

    // jeśli pula się skończyła, resetujemy cykl (żeby znów można było losować)
    if(pool.length === 0){
      state.used = [];
      pool = people.slice();
    }
  }

  const chosen = pickRandom(pool);

  setResult(chosen);
  state.history.push({ name: chosen, ts: Date.now() });

  if(noRepeatsEl.checked && !state.used.includes(chosen)){
    state.used.push(chosen);
  }

  clickSound();
  save();
  renderHistory();
}

async function copyLast(){
  if(state.history.length === 0) return;
  const last = state.history[state.history.length - 1].name;
  const text = `Nowy klient -> ${last}`;
  try{
    await navigator.clipboard.writeText(text);
  }catch{
    // fallback
    const tmp = document.createElement("textarea");
    tmp.value = text;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand("copy");
    document.body.removeChild(tmp);
  }
}

function resetPool(){
  state.used = [];
  save();
  alert("Pula losowania zresetowana (bez powtórek zaczyna od nowa).");
}

function clearHistory(){
  state.history = [];
  state.used = [];
  setResult("—");
  save();
  renderHistory();
}

function exportTxt(){
  const lines = state.history.map(h => {
    const d = new Date(h.ts);
    return `${d.toLocaleString("pl-PL")} | Nowy klient -> ${h.name}`;
  });
  const blob = new Blob([lines.join("\n") || ""], {type: "text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "historia_losowan_sdm.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// events
drawBtn.addEventListener("click", draw);
copyBtn.addEventListener("click", copyLast);

loadDefaultBtn.addEventListener("click", () => {
  peopleEl.value = DEFAULT_PEOPLE.join("\n");
  save();
});

resetPoolBtn.addEventListener("click", resetPool);
clearHistoryBtn.addEventListener("click", clearHistory);
exportTxtBtn.addEventListener("click", exportTxt);

[peopleEl, noRepeatsEl, soundEl].forEach(el => {
  el.addEventListener("input", save);
  el.addEventListener("change", save);
});

// init
load();
setResult("—");
renderHistory();
save();
