const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play-icon lucide-play"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>`;
const PAUSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause-icon lucide-pause"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>`;
const SKIP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-skip-forward-icon lucide-skip-forward"><path d="M21 4v16"/><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"/></svg>`;
const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon-icon lucide-moon"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>`;
const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun-icon lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;

let quranData = [];       // Uthmani display data
let quranSimpleData = [];  // Simple checking data
let currentAnswers = {};
let currentMode = "random";
let currentJuzNumber = 1;
let currentJuzDisplayData = [];
let currentJuzSimpleData = [];
let juzCache = {};
let currentAudioSurah = 1;
let currentAudioAyah = 1;

function displaySurahName(name) {
    return String(name || "")
        .replace(/^سورة\s+/g, "")
        .replace(/^سوره\s+/g, "")
        .trim();
}

function stripBasmala(text, surahNumber, numberInSurah, basmala) {
    if (
        numberInSurah === 1 &&
        surahNumber !== 1 &&
        typeof text === "string" &&
        text.startsWith(basmala)
    ) {
        return text.replace(basmala, "").trim();
    }
    return text;
}

function canonicalize(text) {
    if (text == null) return "";

    let t = String(text).trim();

    // Remove tashkeel / Quran marks / tatweel / invisible marks
    t = t.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
    t = t.replace(/[\u0640\u200C\u200D\u200E\u200F]/g, "");

    // Remove "سورة" so users can type just the surah name
    t = t.replace(/(?:^|\s)سورة\s*/g, " ");
    t = t.replace(/(?:^|\s)سوره\s*/g, " ");

    // Normalize common Arabic variants
    t = t.replace(/[أإآٱ]/g, "ا");
    t = t.replace(/ى/g, "ي");
    t = t.replace(/ؤ/g, "و");
    t = t.replace(/ئ/g, "ي");
    t = t.replace(/ة/g, "ه");

    // Remove spaces and punctuation
    t = t.replace(/[^ء-ي0-9]/g, "");

    return t;
}

async function fetchQuranData() {
    try {
        const [uthmaniRes, simpleRes] = await Promise.all([
            fetch("https://api.alquran.cloud/v1/quran/quran-uthmani"),
            fetch("https://api.alquran.cloud/v1/quran/ar.simple")
        ]);

        const uthmaniData = await uthmaniRes.json();
        const simpleData = await simpleRes.json();

        const besm_allah_uthmani = "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ";
        const besm_allah_simple = "بسم الله الرحمن الرحيم";

        const surahSelect = document.getElementById("surah-select");
        const juzSelect = document.getElementById("juz-select");

        if (surahSelect.options.length === 0) {
            quranData = uthmaniData.data.surahs.map((surah) => {
                const option = document.createElement("option");
                option.value = surah.number - 1;
                option.text = displaySurahName(surah.name);
                surahSelect.appendChild(option);

                const cleanedVerses = surah.ayahs.map((verse, index) => {
                    let text = verse.text;

                    if (
                        index === 0 &&
                        text.startsWith(besm_allah_uthmani) &&
                        surah.number !== 1
                    ) {
                        text = text.replace(besm_allah_uthmani, "").trim();
                    }

                    return { text: text, page: verse.page };
                });

                return {
                    id: surah.number,
                    name: displaySurahName(surah.name),
                    verses: cleanedVerses
                };
            });
        }

        if (quranSimpleData.length === 0) {
            quranSimpleData = simpleData.data.surahs.map((surah) => {
                return {
                    verses: surah.ayahs.map((verse, index) => {
                        let text = verse.text;

                        if (
                            index === 0 &&
                            text.startsWith(besm_allah_simple) &&
                            surah.number !== 1
                        ) {
                            text = text.replace(besm_allah_simple, "").trim();
                        }

                        return text;
                    })
                };
            });
        }

        if (juzSelect.options.length === 0) {
            for (let i = 1; i <= 30; i++) {
                const option = document.createElement("option");
                option.value = i;
                option.text = "الجزء " + i;
                juzSelect.appendChild(option);
            }
        }

        document.getElementById("loading").style.display = "none";
        document.getElementById("quiz-section").style.display = "block";
        await generateQuestion();
    } catch (error) {
        document.getElementById("loading").innerText =
            "حدث خطأ أثناء تحميل الآيات. يرجى إعادة تحميل الصفحة.";
        console.error(error);
    }
}

function switchMode(mode, btnElement) {
    currentMode = mode;

    document
        .querySelectorAll(".tab-btn")
        .forEach((btn) => btn.classList.remove("active"));
    btnElement.classList.add("active");

    document.getElementById("controls-page").style.display = "none";
    document.getElementById("controls-surah").style.display = "none";
    document.getElementById("controls-juz").style.display = "none";

    const titleObj = document.getElementById("main-title");
    const q1Container = document.getElementById("q1-container");

    if (mode === "random") {
        titleObj.innerText = "آية عشوائية من القرآن";
        q1Container.style.display = "block";
    } else if (mode === "page") {
        titleObj.innerText = "اختبار من صفحات محددة";
        document.getElementById("controls-page").style.display = "flex";
        q1Container.style.display = "block";
    } else if (mode === "surah") {
        titleObj.innerText = "اختبار من سورة محددة";
        document.getElementById("controls-surah").style.display = "flex";
        q1Container.style.display = "none";
    } else if (mode === "juz") {
        titleObj.innerText = "اختبار من جزء محدد";
        document.getElementById("controls-juz").style.display = "flex";
        q1Container.style.display = "block";
    }

    generateQuestion();
}

async function ensureJuzData(juzNumber) {
    if (juzCache[juzNumber]) {
        currentJuzDisplayData = juzCache[juzNumber].display;
        currentJuzSimpleData = juzCache[juzNumber].simple;
        return;
    }

    const [uthmaniRes, simpleRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/juz/${juzNumber}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/juz/${juzNumber}/ar.simple`)
    ]);

    const uthmaniData = await uthmaniRes.json();
    const simpleData = await simpleRes.json();

    const besm_allah_uthmani = "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ";
    const besm_allah_simple = "بسم الله الرحمن الرحيم";

    const displayAyahs = (uthmaniData.data.ayahs || []).map((ayah) => {
        return {
            text: stripBasmala(
                ayah.text,
                ayah.surah.number,
                ayah.numberInSurah,
                besm_allah_uthmani
            ),
            surahNumber: ayah.surah.number,
            numberInSurah: ayah.numberInSurah,
            surahName: displaySurahName(ayah.surah.name)
        };
    });

    const simpleAyahs = (simpleData.data.ayahs || []).map((ayah) => {
        return {
            text: stripBasmala(
                ayah.text,
                ayah.surah.number,
                ayah.numberInSurah,
                besm_allah_simple
            ),
            surahNumber: ayah.surah.number,
            numberInSurah: ayah.numberInSurah,
            surahName: displaySurahName(ayah.surah.name)
        };
    });

    currentJuzDisplayData = displayAyahs;
    currentJuzSimpleData = simpleAyahs;
    juzCache[juzNumber] = {
        display: displayAyahs,
        simple: simpleAyahs
    };
}

async function generateQuestion() {
    document.getElementById("q-surah").value = "";
    document.getElementById("q-prev").value = "";
    document.getElementById("q-next").value = "";
    document.getElementById("q-ayah").value = "";
    document.getElementById("results").innerHTML = "";
    document.getElementById("submit-btn").style.display = "inline-block";
    document.getElementById("next-btn").style.display = "none";

    let validAyahsPool = [];

    if (currentMode === "juz") {
        currentJuzNumber = parseInt(
            document.getElementById("juz-select").value,
            10
        ) || 1;

        await ensureJuzData(currentJuzNumber);

        if (currentJuzDisplayData.length === 0) {
            document.getElementById("ayah-text").innerText =
                "لم يتم العثور على آيات في هذا الجزء.";
            return;
        }

        currentJuzDisplayData.forEach((_, index) => {
            validAyahsPool.push({ index });
        });
    } else if (currentMode === "surah") {
        const selectedIndex = parseInt(
            document.getElementById("surah-select").value,
            10
        );
        const s = quranData[selectedIndex];

        s.verses.forEach((_, v_idx) => {
            validAyahsPool.push({
                s_idx: selectedIndex,
                v_idx: v_idx
            });
        });
    } else {
        let startPage = 1;
        let endPage = 604;

        if (currentMode === "page") {
            const p1 =
                parseInt(document.getElementById("page-start").value, 10) || 1;
            const p2 =
                parseInt(document.getElementById("page-end").value, 10) || 604;
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
        document.getElementById("ayah-text").innerText =
            "لم يتم العثور على آيات في هذا النطاق.";
        return;
    }

    const randomChoice =
        validAyahsPool[Math.floor(Math.random() * validAyahsPool.length)];

    let s_idx;
    let v_idx;
    let verseText;

    if (currentMode === "juz") {
        const chosenAyah = currentJuzDisplayData[randomChoice.index];
        s_idx = chosenAyah.surahNumber - 1;
        v_idx = chosenAyah.numberInSurah - 1;
        verseText = chosenAyah.text;
    } else {
        s_idx = randomChoice.s_idx;
        v_idx = randomChoice.v_idx;
        verseText = quranData[s_idx].verses[v_idx].text;
    }

    const surah = quranData[s_idx];
    document.getElementById("ayah-text").innerText = `${verseText}`;

    currentAudioSurah = s_idx + 1;
    currentAudioAyah = v_idx + 1;

    const audioEl = document.getElementById("ayah-audio");
    if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
        document.getElementById("play-btn").innerHTML = PLAY_ICON;
    }

    const isFirstSurah = s_idx === 0;
    const isLastSurah = s_idx === quranData.length - 1;
    const isLastAyah = v_idx === surah.verses.length - 1;

    document.getElementById("q1-container").style.display =
        currentMode === "surah" ? "none" : "block";
    document.getElementById("q2-container").style.display =
        isFirstSurah ? "none" : "block";
    document.getElementById("q3-container").style.display =
        isLastSurah ? "none" : "block";
    document.getElementById("q4-container").style.display =
        isLastAyah ? "none" : "block";

    currentAnswers = {
        surah: surah.name,
        prev: isFirstSurah ? "" : quranData[s_idx - 1].name,
        next: isLastSurah ? "" : quranData[s_idx + 1].name,
        ayah: isLastAyah ? "" : quranSimpleData[s_idx].verses[v_idx + 1],
        askSurah: currentMode !== "surah",
        askPrev: !isFirstSurah,
        askNext: !isLastSurah,
        askAyah: !isLastAyah
    };
}

function checkAnswers() {
    const userSurah = document.getElementById("q-surah").value;
    const userPrev = document.getElementById("q-prev").value;
    const userNext = document.getElementById("q-next").value;
    const userAyah = document.getElementById("q-ayah").value;

    let resultsHTML =
        "<h3>النتائج:</h3><ul style='list-style-type: none; padding: 0;'>";
    let score = 0;
    let totalQuestions = 0;

    function check(label, userInput, correctAnswer) {
        const canUser = canonicalize(userInput);
        const canCorrect = canonicalize(correctAnswer);
        const isCorrect = canUser.length > 0 && canUser === canCorrect;

        if (isCorrect) {
            score++;
            return `<li>${label}: <span class="correct">صحيح</span></li>`;
        } else {
            return `<li>${label}: <span class="incorrect">خطأ</span>، الإجابة الصحيحة: <strong>${correctAnswer}</strong></li>`;
        }
    }

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
        resultsHTML += check("الآية التالية", userAyah, currentAnswers.ayah);
        totalQuestions++;
    }

    resultsHTML += `</ul><h4>النتيجة: ${score} / ${totalQuestions}</h4>`;

    document.getElementById("results").innerHTML = resultsHTML;
    document.getElementById("submit-btn").style.display = "none";
    document.getElementById("next-btn").style.display = "inline-block";
}

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById("theme-toggle");

    if (body.getAttribute("data-theme") === "light") {
        body.removeAttribute("data-theme");
        themeBtn.innerHTML = MOON_ICON;
    } else {
        body.setAttribute("data-theme", "light");
        themeBtn.innerHTML = SUN_ICON;
    }
}

function padNumber(num) {
    return num.toString().padStart(3, "0");
}

function playAyahAudio() {
    const sheikhFolder = document.getElementById("sheikh-select").value;
    const audioEl = document.getElementById("ayah-audio");
    const playBtn = document.getElementById("play-btn");

    if (!audioEl.paused) {
        audioEl.pause();
        playBtn.innerHTML = PLAY_ICON;
        return;
    }

    const surahStr = padNumber(currentAudioSurah);
    const ayahStr = padNumber(currentAudioAyah);
    const audioUrl = `https://everyayah.com/data/${sheikhFolder}/${surahStr}${ayahStr}.mp3`;

    if (audioEl.src !== audioUrl) {
        audioEl.src = audioUrl;
    }

    audioEl.play();
    playBtn.innerHTML = PAUSE_ICON;

    audioEl.onended = function () {
        playBtn.innerHTML = PLAY_ICON;
    };
}

fetchQuranData();