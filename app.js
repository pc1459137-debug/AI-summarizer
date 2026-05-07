// ============================================
//  CONDENSR — AI Text Summarizer
//  Powered by Google Gemini API
// ============================================

const GROQ_API_KEY = "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"; // 🔑 Groq API Key
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // Fast & capable Groq model

// ---- State ----
let selectedLength = "short";
let selectedStyle = "paragraph";

// ---- DOM Refs ----
const inputText     = document.getElementById("inputText");
const charCount     = document.getElementById("charCount");
const summarizeBtn  = document.getElementById("summarizeBtn");
const clearBtn      = document.getElementById("clearBtn");
const outputContent = document.getElementById("outputContent");
const copyBtn       = document.getElementById("copyBtn");
const statusIcon    = document.getElementById("statusIcon");
const errorBanner   = document.getElementById("errorBanner");
const lengthToggle  = document.getElementById("lengthToggle");
const styleToggle   = document.getElementById("styleToggle");

// ---- Toggle Controls ----
lengthToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  lengthToggle.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedLength = btn.dataset.value;
});

styleToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  styleToggle.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedStyle = btn.dataset.value;
});

// ---- Character Count ----
inputText.addEventListener("input", () => {
  const len = inputText.value.length;
  charCount.textContent = len.toLocaleString() + " character" + (len !== 1 ? "s" : "");
});

// ---- Clear ----
clearBtn.addEventListener("click", () => {
  inputText.value = "";
  charCount.textContent = "0 characters";
  resetOutput();
  hideError();
});

// ---- Copy ----
copyBtn.addEventListener("click", () => {
  const text = outputContent.innerText;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = "✓ Copied!";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "⧉ Copy";
      copyBtn.classList.remove("copied");
    }, 2000);
  });
});

// ---- Summarize ----
summarizeBtn.addEventListener("click", summarize);

inputText.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") summarize();
});

async function summarize() {
  const text = inputText.value.trim();

  if (!text) {
    showError("Please paste some text before summarizing.");
    return;
  }

  if (text.split(/\s+/).length < 20) {
    showError("Your text is too short. Please provide at least a few sentences.");
    return;
  }

  if (!GROQ_API_KEY) {
    showError("⚠  Groq API key is missing. Please add your key in app.js.");
    return;
  }

  hideError();
  setLoading(true);

  try {
    const prompt = buildPrompt(text, selectedLength, selectedStyle);
    const summary = await callGroq(prompt);
    renderSummary(summary, selectedStyle);
  } catch (err) {
    showError("Error: " + (err.message || "Something went wrong. Check your API key and try again."));
    resetOutput();
  } finally {
    setLoading(false);
  }
}

// ---- Build Prompt ----
function buildPrompt(text, length, style) {
  const lengthMap = {
    short:    "2–3 sentences",
    medium:   "4–6 sentences",
    detailed: "8–10 sentences with key supporting details"
  };

  const styleInstruction = style === "bullets"
    ? `Format the summary as a clean bullet-point list. Each bullet should be a complete, standalone insight. Do not use markdown asterisks; just start each point on a new line with a dash (-).`
    : `Write the summary as flowing, coherent paragraphs. Do not use headers or bullet points.`;

  return `You are an expert summarizer. Your task is to summarize the provided text.

Length: ${lengthMap[length]}.
${styleInstruction}

Rules:
- Capture the core ideas, key arguments, and essential information only.
- Be concise and precise — no filler phrases like "This text discusses..." or "The author explains..."
- Do not add opinions, commentary, or information not present in the original.
- Output only the summary — no preamble, no explanations, no metadata.

Text to summarize:
---
${text}
---

Summary:`;
}

// ---- Groq API Call ----
async function callGroq(prompt) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ---- Render Summary ----
function renderSummary(text, style) {
  statusIcon.textContent = "✓";
  statusIcon.classList.remove("loading");
  statusIcon.classList.add("done");

  copyBtn.style.display = "flex";

  if (style === "bullets") {
    const lines = text
      .split("\n")
      .map(l => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

    const ul = document.createElement("ul");
    lines.forEach(line => {
      const li = document.createElement("li");
      li.textContent = line;
      ul.appendChild(li);
    });

    const wrapper = document.createElement("div");
    wrapper.className = "summary-text";
    wrapper.appendChild(ul);

    outputContent.innerHTML = "";
    outputContent.appendChild(wrapper);
  } else {
    const wrapper = document.createElement("div");
    wrapper.className = "summary-text";
    wrapper.textContent = text;
    outputContent.innerHTML = "";
    outputContent.appendChild(wrapper);
  }
}

// ---- UI Helpers ----
function setLoading(isLoading) {
  summarizeBtn.disabled = isLoading;

  if (isLoading) {
    statusIcon.textContent = "◌";
    statusIcon.classList.add("loading");
    statusIcon.classList.remove("done");
    copyBtn.style.display = "none";

    outputContent.innerHTML = `
      <div class="loading-shimmer">
        <div class="shimmer-line"></div>
        <div class="shimmer-line"></div>
        <div class="shimmer-line"></div>
        <div class="shimmer-line"></div>
      </div>
    `;
  }
}

function resetOutput() {
  statusIcon.textContent = "⟶";
  statusIcon.classList.remove("loading", "done");
  copyBtn.style.display = "none";
  outputContent.innerHTML = `
    <div class="placeholder-state">
      <div class="placeholder-icon">◈</div>
      <p>Your summary will appear here</p>
    </div>
  `;
}

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.style.display = "block";
}

function hideError() {
  errorBanner.style.display = "none";
  errorBanner.textContent = "";
}
