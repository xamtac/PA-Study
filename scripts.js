/*
=====================================================
  Existing Quiz Functionality (Preserved)
=====================================================
*/

// DOM elements (These will be null on index.html, but that's harmless)
const progressLabel = document.getElementById("progress-label");
const card = document.getElementById("card");
const cardFront = document.getElementById("card-front");
const cardBack = document.getElementById("card-back");
const questionText = document.getElementById("question-text");
const radioContainer = document.getElementById("radio-container");
const answerText = document.getElementById("answer-text");
const submitButton = document.getElementById("submit-button");
const nextButton = document.getElementById("next-button");

// State variables
let QUESTIONS = [];         // Will fetch from questions.json
let currentIndex = 0;
let score = 0;
let cardFlipped = false;
let selectedAnswer = null;

// For storing user answers: questionId -> chosen answer
let userAnswers = {};

// Load any saved state from localStorage
function loadStateFromLocalStorage() {
  const savedIndex = localStorage.getItem("currentIndex");
  const savedScore = localStorage.getItem("score");
  const savedAnswers = localStorage.getItem("userAnswers");
  
  if (savedIndex !== null) {
    currentIndex = parseInt(savedIndex, 10);
  }
  if (savedScore !== null) {
    score = parseInt(savedScore, 10);
  }
  if (savedAnswers) {
    userAnswers = JSON.parse(savedAnswers);
  }
}

// Save the current quiz state to localStorage
function saveStateToLocalStorage() {
  localStorage.setItem("currentIndex", currentIndex);
  localStorage.setItem("score", score);
  localStorage.setItem("userAnswers", JSON.stringify(userAnswers));
}

// Load questions from questions.json, then initialize quiz
async function fetchQuestionsAndInitialize() {
  try {
    const response = await fetch("obgyn-questions.json");
    const data = await response.json();
    QUESTIONS = data;
    loadStateFromLocalStorage();
    loadQuestion();
  } catch (err) {
    console.error("Error loading questions.json:", err);
    if (progressLabel) {
      progressLabel.textContent = "Error loading questions.";
    }
  }
}

/**
 * Load the current question onto the front of the card.
 */
function loadQuestion() {
  if (!QUESTIONS.length) return; // If no questions loaded, just bail out
  if (currentIndex >= QUESTIONS.length) {
    endQuiz();
    return;
  }

  // If the card is flipped from the previous question, reset it
  if (card && cardFlipped) {
    card.classList.remove("flipped");
    cardFlipped = false;
  }

  // Clear previous radio buttons
  if (radioContainer) {
    radioContainer.innerHTML = "";
  }
  selectedAnswer = null;

  const q = QUESTIONS[currentIndex];
  if (progressLabel) {
    progressLabel.textContent = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
  }
  if (questionText) {
    questionText.textContent = q.question;
  }

  // Create radio buttons for each choice
  if (radioContainer) {
    q.choices.forEach((choice, idx) => {
      const label = document.createElement("label");
      label.style.cursor = "pointer";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "answer";
      input.value = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D', 'E'
      input.onclick = () => {
        selectedAnswer = input.value;
      };

      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + choice));
      radioContainer.appendChild(label);
    });
  }

  // Buttons
  if (submitButton) submitButton.disabled = false;
  if (nextButton) nextButton.disabled = true;
  if (answerText) {
    answerText.textContent = "";
    answerText.className = "answer-text";
  }
}

/**
 * Check the user's answer and flip the card to show correct/incorrect.
 */
function submitAnswer() {
  if (selectedAnswer === null) {
    if (progressLabel) {
      progressLabel.textContent = "Please select an answer.";
    }
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
  }

  const currentQuestion = QUESTIONS[currentIndex];
  const correct = currentQuestion.answer;

  // Record this answer in userAnswers
  userAnswers[currentQuestion.id] = selectedAnswer;

  let resultStr, resultClass;
  if (selectedAnswer === correct) {
    score++;
    resultStr = `Correct! You chose ${selectedAnswer}.`;
    resultClass = "result-correct";
  } else {
    resultStr = `Incorrect. You chose ${selectedAnswer}, correct is ${correct}.`;
    resultClass = "result-incorrect";
  }

  // Fill the back side with result
  if (answerText) {
    answerText.textContent = resultStr;
    answerText.classList.add(resultClass);
  }

  // Flip the card
  if (card) {
    card.classList.add("flipped");
    cardFlipped = true;
  }

  // Enable Next button
  if (nextButton) {
    nextButton.disabled = false;
  }

  // Save state (currentIndex, score, userAnswers)
  saveStateToLocalStorage();
}

/**
 * Move on to the next question.
 */
function nextQuestion() {
  currentIndex++;
  saveStateToLocalStorage();
  loadQuestion();
}

/**
 * Show final score and disable further interactions.
 */
function endQuiz() {
  if (progressLabel) {
    progressLabel.textContent = "Quiz Complete!";
  }
  if (questionText) {
    questionText.textContent = `Final Score: ${score} / ${QUESTIONS.length}`;
  }
  if (radioContainer) {
    radioContainer.innerHTML = "";
  }
  if (answerText) {
    answerText.textContent = "Thanks for playing!";
    answerText.className = "answer-text";
  }
  if (submitButton) {
    submitButton.disabled = true;
  }
  if (nextButton) {
    nextButton.disabled = true;
  }
  
  // Optionally clear or keep state:
  // localStorage.clear(); // Uncomment if you want a fresh start each time
}

// Event listeners (only relevant on quiz pages)
if (submitButton) {
  submitButton.addEventListener("click", submitAnswer);
}
if (nextButton) {
  nextButton.addEventListener("click", nextQuestion);
}

// Initialize quiz if relevant elements exist (for OB/GYN page, etc.)
if (progressLabel && card) {
  fetchQuestionsAndInitialize();
}

/*
=====================================================
  New Function for index.html Navigation
=====================================================
*/
function navigateTo(url) {
  window.location.href = url;
}