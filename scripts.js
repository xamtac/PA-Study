"use strict";

/*
=====================================================
  Quiz Functionality for OB/GYN (and potentially others)
=====================================================
*/

// DOM elements (will be null on non-quiz pages)
const progressLabel = document.getElementById("progress-label");
const card = document.getElementById("card");
const cardFront = document.getElementById("card-front");
const cardBack = document.getElementById("card-back");
const questionText = document.getElementById("question-text");
const radioContainer = document.getElementById("radio-container");
const answerText = document.getElementById("answer-text");
const submitButton = document.getElementById("submit-button");
const nextButton = document.getElementById("next-button");
const backButton = document.getElementById("back-button");

// State variables
let QUESTIONS = [];  // Loaded from obgyn-questions.json
let currentIndex = 0;
let score = 0;
let cardFlipped = false;

// For storing user answers and submission states per question:
//   userAnswers[ questionId ] = { chosen: 'A'/'B'/.../null, submitted: bool, correct: bool }
let userAnswers = {};

/**
 * Load quiz state from localStorage.
 */
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

/**
 * Save the current quiz state to localStorage.
 */
function saveStateToLocalStorage() {
  localStorage.setItem("currentIndex", currentIndex);
  localStorage.setItem("score", score);
  localStorage.setItem("userAnswers", JSON.stringify(userAnswers));
}

/**
 * Convert any legacy userAnswers data (where the stored value is just a string)
 * into the new object-based format: { chosen, submitted, correct }.
 */
function migrateLegacyData() {
  let changed = false;

  for (const questionId in userAnswers) {
    const val = userAnswers[questionId];
    // If val is just a string (e.g., "A"), it’s old data:
    if (typeof val === "string") {
      // Find the matching question so we can check correctness
      const questionObj = QUESTIONS.find(q => q.id === questionId);
      if (questionObj) {
        const isCorrect = (val === questionObj.answer);
        // Convert to the new structure
        userAnswers[questionId] = {
          chosen: val,
          submitted: true,   // We assume it was submitted if it was stored
          correct: isCorrect
        };
        changed = true;
      }
    }
  }

  if (changed) {
    console.log("Legacy userAnswers migrated to new object format.");
    saveStateToLocalStorage();
  }
}

/**
 * Fetch questions from obgyn-questions.json, then initialize.
 */
async function fetchQuestionsAndInitialize() {
  try {
    const response = await fetch("obgyn-questions.json");
    const data = await response.json();
    QUESTIONS = data;

    loadStateFromLocalStorage();
    migrateLegacyData();  // <-- Migration step to handle old (string-only) data

    loadQuestion();
  } catch (err) {
    console.error("Error loading obgyn-questions.json:", err);
    if (progressLabel) {
      progressLabel.textContent = "Error loading questions.";
    }
  }
}

/**
 * Load the current question onto the card,
 * restore any previously chosen answer, and if the question
 * was submitted, display the feedback on the back of the card.
 */
function loadQuestion() {
  if (!QUESTIONS.length) return; 
  if (currentIndex >= QUESTIONS.length) {
    endQuiz();
    return;
  }

  const q = QUESTIONS[currentIndex];
  const questionState = userAnswers[q.id] || {
    chosen: null,
    submitted: false,
    correct: false
  };

  // Update progress label
  if (progressLabel) {
    progressLabel.textContent = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
  }

  // Reset card flip state
  if (card) {
    card.classList.remove("flipped");
    cardFlipped = false;
  }

  // Clear previous options & feedback
  if (radioContainer) {
    radioContainer.innerHTML = "";
  }
  if (answerText) {
    answerText.textContent = "";
    answerText.className = "answer-text";
  }

  // Set question text
  if (questionText) {
    questionText.textContent = q.question;
  }

  // (Re)build radio options
  const chosenAnswer = questionState.chosen; // previously chosen
  if (radioContainer) {
    q.choices.forEach((choice, idx) => {
      const label = document.createElement("label");
      const input = document.createElement("input");

      input.type = "radio";
      input.name = "answer";
      input.value = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D', etc.

      // If user had previously selected this option, keep it checked
      if (chosenAnswer === input.value) {
        input.checked = true;
      }

      // Store selection immediately on click
      input.addEventListener("change", () => {
        handleChoiceSelection(input.value);
      });

      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + choice));
      radioContainer.appendChild(label);
    });
  }

  // Enable/disable the Back button
  if (backButton) {
    backButton.disabled = (currentIndex <= 0);
  }
  // Next button: always enabled (to allow skipping without submission)
  if (nextButton) {
    nextButton.disabled = false;
  }

  // If the question was already submitted, flip to the back and show result
  if (questionState.submitted) {
    // Disable submit button once it’s submitted
    if (submitButton) {
      submitButton.disabled = true;
    }
    showSubmittedResult(q, questionState);
  } else {
    // If not submitted yet, re-enable the submit button
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

/**
 * Immediately store the user’s selection in userAnswers,
 * even if they haven’t submitted.
 */
function handleChoiceSelection(choiceValue) {
  const currentQuestion = QUESTIONS[currentIndex];
  if (!userAnswers[currentQuestion.id]) {
    userAnswers[currentQuestion.id] = {
      chosen: null,
      submitted: false,
      correct: false
    };
  }
  userAnswers[currentQuestion.id].chosen = choiceValue;
  // Not yet submitted, so do not mark it correct/incorrect
  saveStateToLocalStorage();
}

/**
 * Helper function to strip a leading "A. ", "B: ", etc. from the text,
 * so we don't show the letter twice.
 */
function removeLeadingChoicePrefix(text, letter) {
  if (!text) return text;
  // Matches patterns like "A. " or "A: " or even "A) " if needed
  const pattern = new RegExp(`^${letter}([\\.:\\)])?\\s?`);
  return text.replace(pattern, "");
}

/**
 * Flip to the back of the card with the feedback, given question state.
 * Displays:
 *   - Full question text
 *   - “You chose C: …” without repeating the letter
 *   - Correct answer
 */
function showSubmittedResult(questionObj, questionState) {
  if (!card) return;
  card.classList.add("flipped");
  cardFlipped = true;

  // Determine user-chosen text and correct text
  const chosenLetter = questionState.chosen || "(none)";
  const correctLetter = questionObj.answer;
  const chosenIndex = chosenLetter.charCodeAt(0) - 65; // 0-based index
  const correctIndex = correctLetter.charCodeAt(0) - 65; // 0-based index

  let chosenText = "";
  let correctText = "";

  if (chosenIndex >= 0 && chosenIndex < questionObj.choices.length) {
    chosenText = questionObj.choices[chosenIndex];
  }
  if (correctIndex >= 0 && correctIndex < questionObj.choices.length) {
    correctText = questionObj.choices[correctIndex];
  }

  // Strip the duplicated letter so we only see "C: Endometrial carcinoma" etc.
  chosenText = removeLeadingChoicePrefix(chosenText, chosenLetter);
  correctText = removeLeadingChoicePrefix(correctText, correctLetter);

  // Construct the HTML for the back of the card
  let resultHtml = `<p><strong>Question:</strong> ${questionObj.question}</p>`;

  if (questionState.correct) {
    resultHtml += `
      <p class="result-correct">
        Correct! You chose ${chosenLetter}: ${chosenText}
      </p>`;
  } else {
    resultHtml += `
      <p class="result-incorrect">
        Incorrect. You chose ${chosenLetter}: ${chosenText}
      </p>
      <p>The correct answer is ${correctLetter}: ${correctText}</p>`;
  }

  if (answerText) {
    answerText.innerHTML = resultHtml;
  }
}

/**
 * Submit the current question, check correctness, and flip the card with feedback.
 */
function submitAnswer() {
  if (!QUESTIONS.length || currentIndex >= QUESTIONS.length) return;

  const currentQuestion = QUESTIONS[currentIndex];
  // Ensure we have a questionState entry
  if (!userAnswers[currentQuestion.id]) {
    userAnswers[currentQuestion.id] = { chosen: null, submitted: false, correct: false };
  }
  const questionState = userAnswers[currentQuestion.id];

  // Check correctness
  const correctAnswer = currentQuestion.answer;
  if (questionState.chosen === correctAnswer) {
    questionState.correct = true;
    score++;
  } else {
    questionState.correct = false;
  }
  questionState.submitted = true;

  // Save updates to localStorage
  userAnswers[currentQuestion.id] = questionState;
  saveStateToLocalStorage();

  // Flip card and show result
  showSubmittedResult(currentQuestion, questionState);

  // Disable submit button once answered
  if (submitButton) {
    submitButton.disabled = true;
  }
}

/**
 * Go to the next question (even if not submitted).
 */
function nextQuestion() {
  if (currentIndex < QUESTIONS.length - 1) {
    currentIndex++;
    saveStateToLocalStorage();
    loadQuestion();
  } else {
    endQuiz();
  }
}

/**
 * Go back to the previous question, restoring its state.
 */
function backQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    saveStateToLocalStorage();
    loadQuestion();
  }
}

/**
 * Show final score and disable controls.
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
  if (backButton) {
    backButton.disabled = true;
  }
  // Optionally clear localStorage if desired
  // localStorage.clear();
}

// Add event listeners if the elements exist
if (submitButton) {
  submitButton.addEventListener("click", submitAnswer);
}
if (nextButton) {
  nextButton.addEventListener("click", nextQuestion);
}
if (backButton) {
  backButton.addEventListener("click", backQuestion);
}

// Initialize if this is the quiz page
if (progressLabel && card) {
  fetchQuestionsAndInitialize();
}

/*
=====================================================
  Reusable Navigation Function
=====================================================
*/
function navigateTo(url) {
  window.location.href = url;
}