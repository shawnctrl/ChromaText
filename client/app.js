// Pre-fill default sample text
document.getElementById("textInput").value = 
`The morning sky broke with a radiant gold spark across the ocean.
I felt a terrifying shadow of fear creep through the dark room.
She felt blue, but the quiet garden brought a peaceful green serenity.`;

async function runAIAnalysis() {
  const rawText = document.getElementById("textInput").value;

  if (!rawText.trim()) {
    alert("Please enter some text to analyze.");
    return;
  }

  setLoadingState(true);

  try {
    const response = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Server request failed");
    }

    const aiData = await response.json();
    renderAIResults(rawText, aiData);
    document.getElementById("statusBadge").innerText = "Analysis complete!";

  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
    document.getElementById("statusBadge").innerText = "Failed to process text.";
  } finally {
    setLoadingState(false);
  }
}

function renderAIResults(originalText, aiData) {
  const wordColorMap = {};
  (aiData.wordColors || []).forEach(item => {
    wordColorMap[item.word.toLowerCase()] = item.hexColor;
  });

  const lines = originalText.split('\n');
  let outputHTML = "";

  lines.forEach((line, lineIdx) => {
    if (!line.trim()) {
      outputHTML += "<br>";
      return;
    }

    const sentences = line.match(/[^.!?]+[.!?]*|\s+/g) || [line];

    sentences.forEach(sentence => {
      const cleanSentence = sentence.trim().toLowerCase();
      
      const matchedAiSentence = (aiData.sentences || []).find(s => 
        cleanSentence.includes(s.sentenceText.trim().toLowerCase()) ||
        s.sentenceText.trim().toLowerCase().includes(cleanSentence)
      );

      let words = sentence.split(/\b/);
      let processedSentence = words.map(word => {
        let cleanWord = word.toLowerCase();
        if (wordColorMap[cleanWord]) {
          let hex = wordColorMap[cleanWord];
          let isLight = (hex === "#f8fafc" || hex === "#ffffff" || hex.toLowerCase() === "#e2e8f0");
          let textStyle = isLight ? "color: #0f172a;" : `color: ${hex};`;
          return `<span class="word-tag" style="background-color: ${hex}33; ${textStyle} border: 1px solid ${hex}66;">${word}</span>`;
        }
        return word;
      }).join("");

      if (matchedAiSentence && matchedAiSentence.emotion !== "neutral" && matchedAiSentence.emotionColor) {
        let hex = matchedAiSentence.emotionColor;
        outputHTML += `<span class="emotion-sentence" style="background: ${hex}25; border-bottom: 2px solid ${hex};" title="Emotion: ${matchedAiSentence.emotion.toUpperCase()}">${processedSentence}</span>`;
      } else {
        outputHTML += processedSentence;
      }
    });

    if (lineIdx < lines.length - 1) outputHTML += "<br>";
  });

  document.getElementById("outputPreview").innerHTML = outputHTML;
}

function setLoadingState(isLoading) {
  const btn = document.getElementById("analyzeBtn");
  const spinner = document.getElementById("spinner");
  const btnText = document.getElementById("btnText");
  const status = document.getElementById("statusBadge");

  if (isLoading) {
    btn.disabled = true;
    spinner.style.display = "inline-block";
    btnText.innerText = "Analyzing...";
    status.innerText = "Sending payload to server backend...";
  } else {
    btn.disabled = false;
    spinner.style.display = "none";
    btnText.innerText = "Analyze with AI";
  }
}