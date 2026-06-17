const SHEET_ID = '1N4C766otSSAFLBarWtJqjCav7feGEl0A2z7rG9Px9lM';
// Use the CSV export URL format
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

let quizData = [];
let currentQuestionIndex = 0;
let score = 0;
const MAX_QUESTIONS = 10;

// DOM Elements
const loadingScreen = document.getElementById('loading');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const loadingHelp = document.getElementById('loading-help');

const scoreEl = document.getElementById('score');
const progressEl = document.getElementById('progress');
const currentNumEl = document.getElementById('current-question-num');
const iconImage = document.getElementById('icon-image');
const optionsContainer = document.getElementById('options');
const finalScoreText = document.getElementById('final-score-text');
const restartBtn = document.getElementById('restart-btn');

async function initQuiz() {
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) {
            throw new Error('Network response was not ok. This usually means the sheet is not accessible.');
        }
        const csvText = await response.text();
        
        // Parse CSV to JSON using PapaParse
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    quizData = results.data;
                    // Shuffle the data to get random questions if needed, or just take first MAX_QUESTIONS
                    // quizData = quizData.sort(() => 0.5 - Math.random());
                    
                    startQuiz();
                } else {
                    showError();
                }
            },
            error: function() {
                showError();
            }
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        showError();
    }
}

function showError() {
    loadingHelp.style.display = 'block';
}

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    updateScore();
    showScreen(quizScreen);
    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= quizData.length || currentQuestionIndex >= MAX_QUESTIONS) {
        endQuiz();
        return;
    }

    const q = quizData[currentQuestionIndex];
    iconImage.src = q.ImageURL || '';
    
    currentNumEl.textContent = currentQuestionIndex + 1;
    updateProgress();

    optionsContainer.innerHTML = '';
    
    // Assumes columns are named Option1, Option2, Option3, Option4
    const options = [q.Option1, q.Option2, q.Option3, q.Option4];
    
    options.forEach(optText => {
        if (!optText) return; 
        
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = optText;
        btn.onclick = () => checkAnswer(btn, optText, q.Answer);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedBtn, selectedText, correctAnswer) {
    // Disable all buttons to prevent multiple clicks
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);

    const isCorrect = selectedText.trim() === correctAnswer.trim();

    if (isCorrect) {
        selectedBtn.classList.add('correct');
        score++;
        updateScore();
    } else {
        selectedBtn.classList.add('wrong');
        // Highlight the correct answer as well
        allBtns.forEach(btn => {
            if (btn.textContent.trim() === correctAnswer.trim()) {
                btn.classList.add('correct');
            }
        });
    }

    // Wait a brief moment, then move to the next question
    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1500);
}

function updateScore() {
    scoreEl.textContent = score;
}

function updateProgress() {
    // Calculate progress based on total questions available up to MAX_QUESTIONS
    const total = Math.min(quizData.length, MAX_QUESTIONS);
    const percentage = ((currentQuestionIndex) / total) * 100;
    progressEl.style.width = `${percentage}%`;
}

function endQuiz() {
    progressEl.style.width = '100%';
    const total = Math.min(quizData.length, MAX_QUESTIONS);
    finalScoreText.textContent = `${score} / ${total}`;
    showScreen(resultScreen);
}

function showScreen(screenToShow) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    screenToShow.classList.add('active');
}

restartBtn.addEventListener('click', startQuiz);

// Initialize when the script loads
initQuiz();
