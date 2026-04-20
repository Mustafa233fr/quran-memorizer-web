let quranData = [];
let currentAnswers = {};

// 1. Translation of your canonicalize logic
function canonicalize(text) {
    if (!text) return "";
    
    // Remove diacritics (Tashkeel)
    let t = text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
    t = t.trim();
    
    // Remove 'Surah' prefixes
    t = t.replace(/^(سورة|سورت|س)\s*/, '');
    
    // Normalize Alef, Ya, Waw, and Ta Marbuta
    const mapping = {
        'أ': 'ا', 'إ': 'ا', 'آ': 'ا',
        'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و',
        'ة': 'ه'
    };
    t = t.replace(/[أإآىئؤة]/g, match => mapping[match]);
    
    // Keep only Arabic letters, numbers, and spaces
    t = t.replace(/[^ء-ي0-9\s]/g, '');
    
    // Remove extra spaces
    return t.replace(/\s+/g, ' ').trim();
}

// 2. Fetch API Data (Translation of get_clean_quran)
async function fetchQuranData() {
    try {
        const response = await fetch("https://api.alquran.cloud/v1/quran/quran-uthmani");
        const data = await response.json();
        
        const besm_allah = "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ";

        quranData = data.data.surahs.map(surah => {
            const cleaned_verses = surah.ayahs.map((verse, index) => {
                let text = verse.text;
                // Remove Bismillah from the first ayah of every surah except Al-Fatiha
                if (index === 0 && text.startsWith(besm_allah) && surah.number !== 1) {
                    text = text.replace(besm_allah, "").trim();
                }
                return text;
            });

            return {
                id: surah.number,
                name: surah.name,
                verses: cleaned_verses
            };
        });

        // Hide loading, show quiz
        document.getElementById('loading').style.display = 'none';
        document.getElementById('quiz-section').style.display = 'block';
        
        generateQuestion(); // Start the first round

    } catch (error) {
        document.getElementById('loading').innerText = "❌ فشل تحميل بيانات القرآن. يرجى تحديث الصفحة.";
        console.error(error);
    }
}

// 3. Start a new quiz round
function generateQuestion() {
    // Clear old inputs and results
    document.getElementById('q-surah').value = '';
    document.getElementById('q-prev').value = '';
    document.getElementById('q-next').value = '';
    document.getElementById('q-ayah').value = '';
    document.getElementById('results').innerHTML = '';
    
    // Toggle buttons
    document.getElementById('submit-btn').style.display = 'inline-block';
    document.getElementById('next-btn').style.display = 'none';

    // Randomize Surah and Ayah (Defaulting to the whole Quran for now)
    const s_idx = Math.floor(Math.random() * quranData.length);
    const surah = quranData[s_idx];
    const v_idx = Math.floor(Math.random() * surah.verses.length);
    const verseText = surah.verses[v_idx];

    // Display Ayah
    document.getElementById('ayah-text').innerText = `✨ ${verseText} ✨`;

    // Determine Answers safely
    const prevSurahName = (s_idx > 0) ? quranData[s_idx - 1].name : "بداية المصحف";
    const nextSurahName = (s_idx < quranData.length - 1) ? quranData[s_idx + 1].name : "نهاية المصحف";
    
    let nextVerseText;
    if (v_idx < surah.verses.length - 1) {
        nextVerseText = surah.verses[v_idx + 1];
    } else if (s_idx < quranData.length - 1) {
        nextVerseText =` بداية سورة ${quranData[s_idx+1].name}`;
    } else {
        nextVerseText = "نهاية المصحف";
    }

    // Store correct answers in memory to check later
    currentAnswers = {
        surah: surah.name,
        prev: prevSurahName,
        next: nextSurahName,
        ayah: nextVerseText
    };
}

// 4. Validate user inputs
function checkAnswers() {
    const userSurah = document.getElementById('q-surah').value;
    const userPrev = document.getElementById('q-prev').value;
    const userNext = document.getElementById('q-next').value;
    const userAyah = document.getElementById('q-ayah').value;

    let resultsHTML = "<h3>النتائج:</h3><ul style='list-style-type: none; padding: 0;'>";
    let score = 0;

    // Helper function to check and build HTML
    function check(label, userInput, correctAnswer, isAyah = false) {
        const canUser = canonicalize(userInput);
        const canCorrect = canonicalize(correctAnswer);
        let isCorrect = false;

        // Simple include check for the Ayah since users might not type the whole thing perfectly
        if (isAyah) {
            isCorrect = canCorrect.includes(canUser) && canUser.length > 5; // Must type at least a bit of it
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

    resultsHTML += check("اسم السورة", userSurah, currentAnswers.surah);
    resultsHTML += check("السورة السابقة", userPrev, currentAnswers.prev);
    resultsHTML += check("السورة التالية", userNext, currentAnswers.next);
    resultsHTML += check("الآية التالية", userAyah, currentAnswers.ayah, true);

    resultsHTML += `</ul><h4>النتيجة: ${score} / 4</h4>`;

    // Show results and toggle buttons
    document.getElementById('results').innerHTML = resultsHTML;
    document.getElementById('submit-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
}

// Start the app!
fetchQuranData();