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

// State variables
let QUESTIONS = [];  // Loaded from obgyn-questions.json
let currentIndex = 0;
let score = 0;
let cardFlipped = false;
let selectedAnswer = null;

// For storing user answers: questionId -> chosen answer
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
 * Fetch questions from obgyn-questions.json, then initialize.
 */
async function fetchQuestionsAndInitialize() {
  try {
    const response = await fetch("obgyn-questions.json");
    const data = await response.json();
    QUESTIONS = data;
    loadStateFromLocalStorage();
    loadQuestion();
  } catch (err) {
    console.error("Error loading obgyn-questions.json:", err);
    if (progressLabel) {
      progressLabel.textContent = "Error loading questions.";
    }
  }
}

/**
 * Load the current question onto the front of the card.
 */
function loadQuestion() {
  if (!QUESTIONS.length) return; 
  if (currentIndex >= QUESTIONS.length) {
    endQuiz();
    return;
  }

  // Reset flipped state if needed
  if (card && cardFlipped) {
    card.classList.remove("flipped");
    cardFlipped = false;
  }

  // Clear previous options
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

  // Render multiple-choice options
  if (radioContainer) {
    q.choices.forEach((choice, idx) => {
      const label = document.createElement("label");
      const input = document.createElement("input");

      input.type = "radio";
      input.name = "answer";
      input.value = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D', etc.
      input.onclick = () => {
        selectedAnswer = input.value;
      };

      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + choice));
      radioContainer.appendChild(label);
    });
  }

  // Button states
  if (submitButton) submitButton.disabled = false;
  if (nextButton) nextButton.disabled = true;
  if (answerText) {
    answerText.textContent = "";
    answerText.className = "answer-text";
  }
}

/**
 * Check the user's selected answer and flip the card with feedback.
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

  // Record this answer
  userAnswers[currentQuestion.id] = selectedAnswer;

  let resultStr;
  let resultClass;
  if (selectedAnswer === correct) {
    score++;
    resultStr = `Correct! You chose ${selectedAnswer}.`;
    resultClass = "result-correct";
  } else {
    resultStr = `Incorrect. You chose ${selectedAnswer}; the correct answer is ${correct}.`;
    resultClass = "result-incorrect";
  }

  if (answerText) {
    answerText.textContent = resultStr;
    answerText.classList.add(resultClass);
  }

  // Flip card
  if (card) {
    card.classList.add("flipped");
    cardFlipped = true;
  }

  // Enable Next
  if (nextButton) {
    nextButton.disabled = false;
  }

  // Save state
  saveStateToLocalStorage();
}

/**
 * Load the next question.
 */
function nextQuestion() {
  currentIndex++;
  saveStateToLocalStorage();
  loadQuestion();
}

/**
 * End of the quiz: show final score.
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
  // Optionally clear local storage here if you want a fresh start each time.
}

// Event listeners for quiz pages
if (submitButton) {
  submitButton.addEventListener("click", submitAnswer);
}
if (nextButton) {
  nextButton.addEventListener("click", nextQuestion);
}

// Auto-initialize quiz if relevant DOM elements exist
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