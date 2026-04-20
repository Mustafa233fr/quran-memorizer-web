let quranData = [];
let currentAnswers = {};
let currentMode = 'random'; // Can be 'random', 'page', or 'surah'

function canonicalize(text) {
    if (!text) return "";
    let t = text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
    t = t.trim().replace(/^(سورة|سورت|س)\s*/, '');
    const mapping = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و', 'ة': 'ه' };
    t = t.replace(/[أإآىئؤة]/g, match => mapping[match]);
    t = t.replace(/[^ء-ي0-9\s]/g, '');
    return t.replace(/\s+/g, ' ').trim();
}

async function fetchQuranData() {
    try {
        const response = await fetch("https://api.alquran.cloud/v1/quran/quran-uthmani");
        const data = await response.json();
        const besm_allah = "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ";

        const surahSelect = document.getElementById('surah-select');

        quranData = data.data.surahs.map(surah => {
            // Populate the Surah dropdown for Tab 3
            let option = document.createElement('option');
            option.value = surah.number - 1; // Array index
            option.text = surah.name;
            surahSelect.appendChild(option);

            const cleaned_verses = surah.ayahs.map((verse, index) => {
                let text = verse.text;
                if (index === 0 && text.startsWith(besm_allah) && surah.number !== 1) {
                    text = text.replace(besm_allah, "").trim();
                }
                // We now keep the text AND the page number!
                return { text: text, page: verse.page };
            });

            return {
                id: surah.number,
                name: surah.name,
                verses: cleaned_verses
            };
        });

        document.getElementById('loading').style.display = 'none';
        document.getElementById('quiz-section').style.display = 'block';
        generateQuestion(); 

    } catch (error) {
        document.getElementById('loading').innerText = "❌ فشل تحميل بيانات القرآن. يرجى تحديث الصفحة.";
        console.error(error);
    }
}

// Handle switching between the 3 tabs
function switchMode(mode, btnElement) {
    currentMode = mode;
    
    // Update active button colors
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    // Hide all controls initially
    document.getElementById('controls-page').style.display = 'none';
    document.getElementById('controls-surah').style.display = 'none';
    
    // Show specific controls and update UI
    const titleObj = document.getElementById('main-title');
    const q1Container = document.getElementById('q1-container');

    if (mode === 'random') {
        titleObj.innerText = "🕋 آية عشوائية من القرآن 🕋";
        q1Container.style.display = 'block';
    } 
    else if (mode === 'page') {
        titleObj.innerText = "🕋 اختبار حسب الصفحات 🕋";
        document.getElementById('controls-page').style.display = 'flex';
        q1Container.style.display = 'block';
    } 
    else if (mode === 'surah') {
        titleObj.innerText = "🕋 اختبار سورة محددة 🕋";
        document.getElementById('controls-surah').style.display = 'flex';
        // Hide the "What is the Surah?" question because they already selected it!
        q1Container.style.display = 'none';
    }

    generateQuestion();
}

function generateQuestion() {
    // Clear old inputs
    document.getElementById('q-surah').value = '';
    document.getElementById('q-prev').value = '';
    document.getElementById('q-next').value = '';
    document.getElementById('q-ayah').value = '';
    document.getElementById('results').innerHTML = '';
    document.getElementById('submit-btn').style.display = 'inline-block';
    document.getElementById('next-btn').style.display = 'none';

    let validAyahsPool = [];

    // Filter the Quran based on the active tab
    if (currentMode === 'surah') {
        const selectedIndex = document.getElementById('surah-select').value;
        const s = quranData[selectedIndex];
        s.verses.forEach((v, v_idx) => validAyahsPool.push({ s_idx: parseInt(selectedIndex), v_idx: v_idx }));
    } 
    else {
        let startPage = 1;
        let endPage = 604;

        if (currentMode === 'page') {
            const p1 = parseInt(document.getElementById('page-start').value) || 1;
            const p2 = parseInt(document.getElementById('page-end').value) || 604;
            startPage = Math.min(p1, p2); 
            endPage = Math.max(p1, p2);
        }

        quranData.forEach((surah, s_idx) => {
            surah.verses.forEach((verse, v_idx) => {
                if (verse.page >= startPage && verse.page <= endPage) {
                    validAyahsPool.push({ s_idx: s_idx, v_idx: v_idx });
                }
            });
        });
    }

    if (validAyahsPool.length === 0) {
        document.getElementById('ayah-text').innerText = "⚠️ لم يتم العثور على آيات في هذا النطاق.";
        return;
    }

    // Pick a random Ayah
    const randomChoice = validAyahsPool[Math.floor(Math.random() * validAyahsPool.length)];
    const s_idx = randomChoice.s_idx;
    const v_idx = randomChoice.v_idx;
    
    const surah = quranData[s_idx];
    const verseText = surah.verses[v_idx].text;

    document.getElementById('ayah-text').innerText = `✨ ${verseText} ✨`;

    // EDGE CASE LOGIC (Checking if we are at the beginning/end)
    const isFirstSurah = (s_idx === 0); // Al-Fatihah
    const isLastSurah = (s_idx === quranData.length - 1); // An-Nas
    const isLastAyah = (v_idx === surah.verses.length - 1); // Last Ayah of current Surah

    // Show/Hide question boxes dynamically
    document.getElementById('q1-container').style.display = (currentMode === 'surah') ? 'none' : 'block';
    document.getElementById('q2-container').style.display = isFirstSurah ? 'none' : 'block';
    document.getElementById('q3-container').style.display = isLastSurah ? 'none' : 'block';
    document.getElementById('q4-container').style.display = isLastAyah ? 'none' : 'block';

    // Store correct answers AND which questions were actually asked
    currentAnswers = {
        surah: surah.name,
        prev: isFirstSurah ? "" : quranData[s_idx - 1].name,
        next: isLastSurah ? "" : quranData[s_idx + 1].name,
        ayah: isLastAyah ? "" : surah.verses[v_idx + 1].text,
        askSurah: (currentMode !== 'surah'),
        askPrev: !isFirstSurah,
        askNext: !isLastSurah,
        askAyah: !isLastAyah
    };
}

function checkAnswers() {
    const userSurah = document.getElementById('q-surah').value;
    const userPrev = document.getElementById('q-prev').value;
    const userNext = document.getElementById('q-next').value;
    const userAyah = document.getElementById('q-ayah').value;

    let resultsHTML = "<h3>النتائج:</h3><ul style='list-style-type: none; padding: 0;'>";
    let score = 0;
    let totalQuestions = 0; // We will calculate this dynamically now!

    function check(label, userInput, correctAnswer, isAyah = false) {
        const canUser = canonicalize(userInput);
        const canCorrect = canonicalize(correctAnswer);
        let isCorrect = false;

        if (isAyah) {
            isCorrect = canCorrect.includes(canUser) && canUser.length > 5;
            if (userInput.trim() === "") isCorrect = false;
        } else {
            isCorrect = (canUser === canCorrect);
        }

        if (isCorrect) {
            score++;
            return `<li>✅ ${label}: <span class="correct">صحيح</span></li>`;
        } else {
            return `<li>❌ ${label}: <span class="incorrect">خطأ</span> — الإجابة الصحيحة: <strong>${correctAnswer}</strong></li>`;
        }
    }

    // Only grade the questions that were actually displayed to the user
    if (currentAnswers.askSurah) {
        resultsHTML += check("اسم السورة", userSurah, currentAnswers.surah);
        totalQuestions++;
    }
    if (currentAnswers.askPrev) {
        resultsHTML += check("السورة السابقة", userPrev, currentAnswers.prev);
        totalQuestions++;
    }
    if (currentAnswers.askNext) {
        resultsHTML += check("السورة التالية", userNext, currentAnswers.next);
        totalQuestions++;
    }
    if (currentAnswers.askAyah) {
        resultsHTML += check("الآية التالية", userAyah, currentAnswers.ayah, true);
        totalQuestions++;
    }

    resultsHTML += `</ul><h4>النتيجة: ${score} / ${totalQuestions}</h4>`;

    document.getElementById('results').innerHTML = resultsHTML;
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
}

fetchQuranData();