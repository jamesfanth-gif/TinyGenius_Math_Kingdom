/* =========================================================================
   TinyGenius Math HK - Core Gameplay Controller (Modal & Touch Zero-Block Fix)
   ========================================================================= */

let currentGrade = 'k2';
let currentMode = 'k2_add';
let targetAnswer = 0;
let activeQuestionPromptEn = '';
let isInputLocked = false;

// 統計數據
let totalQuestionsAnswered = 0;
let correctAnswersCount = 0;
let currentStars = 0;
let gradeSolvedCounters = { k1: 0, k2: 0, k3: 0, p1: 0 };

// 貼紙位階字典 (0: 未解鎖, 1: 普通, 2: 金箔, 3: 幻彩)
const stickerTierMap = {
  's1': 0, 's2': 0, 's3': 0, 's4': 0, 's5': 0, 's6': 0,
  's7': 0, 's8': 0, 's9': 0, 's10': 0, 's11': 0, 's12': 0
};
let activeShowcaseSticker = null;

// 通用安全 DOM 操作
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}
function safeSetHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function getRandomItem(list) { return list[Math.floor(Math.random() * list.length)]; }
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// 強制重設畫面所有按鈕（解鎖防死鎖）
function forceUnlockAllButtons() {
  isInputLocked = false;
  document.querySelectorAll('button').forEach(btn => {
    btn.disabled = false;
  });
}

// 通用彈窗開啟/關閉管理 (徹底消除透明遮罩擋住螢幕)
function showModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.style.display = 'flex';
    el.classList.remove('hidden');
  }
}

function hideModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.style.display = 'none';
    el.classList.add('hidden');
  }
  forceUnlockAllButtons();
}

function hideAllModals() {
  ['stickerAlbumModal', 'stickerShowcaseModal', 'teacherVoiceModal', 'parentGateModal', 'unlockCelebrationModal'].forEach(id => {
    hideModal(id);
  });
}

/* =========================================================================
   導航與關卡切換 (保證手機輕按即響應)
   ========================================================================= */
window.selectGrade = function(gradeKey) {
  hideAllModals();
  forceUnlockAllButtons();
  if (typeof soundTapPop === 'function') soundTapPop();
  currentGrade = gradeKey;

  const cfg = GRADE_CONFIG[gradeKey];
  if (cfg) {
    safeSetText('activeGradePillIcon', cfg.icon);
    safeSetText('activeGradePillText', cfg.title.split(' ')[0] + ' ' + cfg.title.split(' ')[1]);
    const pill = document.getElementById('activeGradePill');
    if (pill) pill.classList.remove('hidden');
  }

  renderGradeLobby();
};

function renderGradeLobby() {
  hideAllModals();
  forceUnlockAllButtons();
  const cfg = GRADE_CONFIG[currentGrade];
  if (!cfg) return;

  safeSetText('lobbyBadge', `${cfg.icon} ${cfg.title}`);
  safeSetText('lobbyTitle', `${cfg.title} 核心數學模塊`);
  safeSetText('lobbySubtitle', cfg.desc);

  const container = document.getElementById('lobbyCardsContainer');
  if (container) {
    container.innerHTML = '';
    cfg.topics.forEach((topic) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `bouncy-btn clay-card p-4 sm:p-5 flex flex-col items-center text-center cursor-pointer border-b-6 hover:scale-102 transition-all`;
      card.innerHTML = `
        <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr ${topic.color} text-white flex items-center justify-center text-3xl sm:text-4xl mb-2.5 shadow-md pointer-events-none">
          ${topic.icon}
        </div>
        <h3 class="text-base sm:text-lg font-black text-slate-800 pointer-events-none">${topic.title}</h3>
        <span class="text-[11px] font-bold text-slate-500 mt-0.5 pointer-events-none">${topic.subtitle}</span>
        <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full mt-2 pointer-events-none">進入單元 ▶</span>
      `;
      card.onclick = function() {
        launchTopic(topic.id);
      };
      container.appendChild(card);
    });
  }

  const portal = document.getElementById('curriculumPortalScreen');
  const play = document.getElementById('gamePlayScreen');
  const lobby = document.getElementById('gradeLobbyScreen');

  if (portal) portal.style.display = 'none';
  if (play) play.style.display = 'none';
  if (lobby) lobby.style.display = 'flex';

  safeSetText('navBackLabel', "課程選單");
  safeSetText('navBackIcon', "🏛️");
}

window.launchTopic = function(modeId) {
  hideAllModals();
  forceUnlockAllButtons();
  if (typeof soundTapPop === 'function') soundTapPop();
  currentMode = modeId;

  const lobby = document.getElementById('gradeLobbyScreen');
  const play = document.getElementById('gamePlayScreen');

  if (lobby) lobby.style.display = 'none';
  if (play) play.style.display = 'flex';

  safeSetText('navBackLabel', "單元選單");
  safeSetText('navBackIcon', "🔙");

  generateQuestion();
};

window.handleNavigationBack = function() {
  hideAllModals();
  forceUnlockAllButtons();
  if (typeof soundTapPop === 'function') soundTapPop();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  const play = document.getElementById('gamePlayScreen');
  const lobby = document.getElementById('gradeLobbyScreen');
  const portal = document.getElementById('curriculumPortalScreen');

  if (play && play.style.display !== 'none' && !play.classList.contains('hidden')) {
    play.style.display = 'none';
    if (lobby) lobby.style.display = 'flex';
    safeSetText('navBackLabel', "課程選單");
    safeSetText('navBackIcon', "🏛️");
  } else if (lobby && lobby.style.display !== 'none' && !lobby.classList.contains('hidden')) {
    lobby.style.display = 'none';
    if (portal) portal.style.display = 'flex';
    safeSetText('navBackLabel', "課程選單");
    safeSetText('navBackIcon', "🏛️");
  }
};

window.speakCurrentQuestionPrompt = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  if (activeQuestionPromptEn && typeof speakEnglishOnly === 'function') {
    speakEnglishOnly(activeQuestionPromptEn);
  }
};

function hideAllStages() {
  const stageIds = [
    'stageK1Count', 'stageK1Compare', 'stageK1Shape',
    'stageK2Count', 'stageK2Compare', 'stageK2Add', 'stageK2Sub', 'stageAudioListening',
    'stageK3Bonds', 'stageK3Math20', 'stageK3Clock', 'stageK3Coins',
    'stageP1Place', 'stageP1Mental', 'stageP1Money'
  ];
  stageIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  safeSetHtml('numberOptionsRow', '');
}

function generateQuestion() {
  forceUnlockAllButtons();
  hideAllStages();

  switch (currentMode) {
    case 'k1_count': renderK1Counting(); break;
    case 'k1_compare': renderK1Compare(); break;
    case 'k1_shape': renderK1Shape(); break;
    case 'k2_count': renderK2Counting(); break;
    case 'k2_compare': renderK2Compare(); break;
    case 'k2_add': renderK2Addition(); break;
    case 'k2_sub': renderK2Subtraction(); break;
    case 'k2_listening': renderK2NumberListening(); break;
    case 'k3_bonds': renderK3Bonds(); break;
    case 'k3_math20': renderK3Math20(); break;
    case 'k3_clock': renderK3Clock(); break;
    case 'k3_coins': renderK3Coins(); break;
    case 'k3_listening': renderK3StoryMathListening(); break;
    case 'p1_place': renderP1Place(); break;
    case 'p1_mental': renderP1Mental(); break;
    case 'p1_money': renderP1Money(); break;
    case 'p1_listening': renderP1TensMentalListening(); break;
    default: renderK2Addition();
  }

  if (typeof speakEnglishOnly === 'function') {
    speakEnglishOnly(activeQuestionPromptEn);
  }
}

/* =========================================================================
   題目邏輯渲染
   ========================================================================= */

function renderK2NumberListening() {
  const stage = document.getElementById('stageAudioListening');
  if (!stage) return;
  stage.style.display = 'flex';

  const numberWords = [
    { num: 1, word: 'One' }, { num: 2, word: 'Two' }, { num: 3, word: 'Three' },
    { num: 4, word: 'Four' }, { num: 5, word: 'Five' }, { num: 6, word: 'Six' },
    { num: 7, word: 'Seven' }, { num: 8, word: 'Eight' }, { num: 9, word: 'Nine' },
    { num: 10, word: 'Ten' }
  ];
  const target = getRandomItem(numberWords);
  targetAnswer = target.num;

  safeSetText('vocabPillText', `🎧 Number ${target.num}`);
  safeSetText('promptZh', `請聆聽英文發音，挑選出正確的數字！`);
  safeSetText('promptEn', `Listen carefully and pick the number!`);
  activeQuestionPromptEn = `Can you find number ${target.word}? Please tap number ${target.word}!`;

  safeSetText('listeningSceneEmojiArt', '🐰 🎧 🔢 🌸');
  safeSetText('listeningSceneCaption', `"Listen carefully: Which number did the teacher say?"`);

  renderChoiceButtons(targetAnswer, 1, 10);
}

function renderK3StoryMathListening() {
  const stage = document.getElementById('stageAudioListening');
  if (!stage) return;
  stage.style.display = 'flex';

  const isAdd = Math.random() > 0.5;
  if (isAdd) {
    const a = getRandomInt(2, 5);
    const b = getRandomInt(1, 4);
    targetAnswer = a + b;
    safeSetText('vocabPillText', `🎧 Story Addition (加法)`);
    safeSetText('promptZh', `池塘有 ${a} 隻鴨仔，再游來 ${b} 隻，現在共有幾隻？`);
    safeSetText('promptEn', `How many ducks altogether?`);
    activeQuestionPromptEn = `Listen carefully! There are ${a} little ducks in the pond. Then, ${b} more ducks swim in. How many ducks are there now altogether?`;
    safeSetText('listeningSceneEmojiArt', `🌳 ${'🦆 '.repeat(a)} ➕ ${'🦆 '.repeat(b)} 🌊`);
    safeSetText('listeningSceneCaption', `"${a} ducks plus ${b} ducks..."`);
  } else {
    const total = getRandomInt(5, 9);
    const cut = getRandomInt(1, 3);
    targetAnswer = total - cut;
    safeSetText('vocabPillText', `🎧 Story Subtraction (減法)`);
    safeSetText('promptZh', `籃子有 ${total} 個蘋果，小熊吃掉 ${cut} 個，還剩幾個？`);
    safeSetText('promptEn', `How many apples left?`);
    activeQuestionPromptEn = `Listen carefully! Mum puts ${total} apples in the basket. Teddy eats ${cut} apples. How many apples are left in the basket?`;
    safeSetText('listeningSceneEmojiArt', `🧺 ${'🍎 '.repeat(total)} ➔ 😋 走咗 ${cut} 個`);
    safeSetText('listeningSceneCaption', `"${total} apples take away ${cut} apples..."`);
  }

  renderChoiceButtons(targetAnswer, Math.max(1, targetAnswer - 4), targetAnswer + 4);
}

function renderP1TensMentalListening() {
  const stage = document.getElementById('stageAudioListening');
  if (!stage) return;
  stage.style.display = 'flex';

  const a = getRandomInt(2, 6) * 10;
  const b = getRandomInt(1, 3) * 10;
  const isAdd = Math.random() > 0.5;
  targetAnswer = isAdd ? a + b : a - b;

  safeSetText('vocabPillText', `🎧 Tens Mental Math (整十速算)`);
  safeSetText('promptZh', `英文聆聽速算：${a} ${isAdd ? '加' : '減'} ${b} 等於幾多？`);
  safeSetText('promptEn', `Fast mental math listening!`);
  activeQuestionPromptEn = `Listen carefully! What is ${a} ${isAdd ? 'plus' : 'minus'} ${b}? Calculate in your head!`;

  safeSetText('listeningSceneEmojiArt', `⚡ 🔟 ${a} ${isAdd ? '➕' : '➖'} ${b} 🟰 ❓`);
  safeSetText('listeningSceneCaption', `"What is ${a} ${isAdd ? 'plus' : 'minus'} ${b}?"`);

  renderChoiceButtons(targetAnswer, Math.max(10, targetAnswer - 20), targetAnswer + 20);
}

function renderP1Money() {
  const stage = document.getElementById('stageP1Money');
  if (!stage) return;
  stage.style.display = 'flex';

  const count = Math.random() > 0.4 ? 3 : 2;
  const shuffled = [...STORE_ITEMS].sort(() => 0.5 - Math.random());
  const selectedItems = shuffled.slice(0, count);

  targetAnswer = selectedItems.reduce((acc, cur) => acc + cur.price, 0);

  safeSetText('vocabPillText', `HKD Supermarket 超市結算`);
  safeSetText('promptZh', `購物車有 ${count} 件商品，計算總金額並點選正確付款！`);
  safeSetText('promptEn', `Calculate total cost in the shopping cart!`);
  activeQuestionPromptEn = `Let's add up the prices in the shopping cart! What is the total amount?`;

  const cartList = document.getElementById('p1CartItemsList');
  if (cartList) {
    cartList.innerHTML = '';
    selectedItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between bg-white/90 px-3 py-1.5 rounded-xl border border-amber-200 text-xs';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-xl">${item.icon}</span>
          <span class="font-black text-slate-800">${item.nameZh}</span>
        </div>
        <span class="font-extrabold text-amber-900">HK$ ${item.price}</span>
      `;
      cartList.appendChild(row);
    });
  }

  safeSetText('p1CartEquationDisplay', selectedItems.map(i => `$${i.price}`).join(' + ') + ' = ?');

  const choices = [targetAnswer];
  while (choices.length < 4) {
    const cand = targetAnswer + getRandomInt(-6, 7);
    if (cand > 5 && !choices.includes(cand)) choices.push(cand);
  }
  renderCustomChoiceButtons(choices.sort((a,b) => a-b).map(v => `HK$ ${v}`), `HK$ ${targetAnswer}`);
}

function renderP1Place() {
  const stage = document.getElementById('stageP1Place');
  if (!stage) return;
  stage.style.display = 'flex';

  const tens = getRandomInt(1, 5);
  const ones = getRandomInt(1, 8);
  targetAnswer = tens * 10 + ones;

  safeSetText('vocabPillText', `Crystal Gems 水晶能量塔`);
  safeSetText('promptZh', `數一數水晶柱(十位)與閃爍寶石(個位)，代表咩數字？`);
  safeSetText('promptEn', `Count 10-gem towers and single gems!`);
  activeQuestionPromptEn = `Look at the magic crystal gems! How many in total?`;

  const tensCont = document.getElementById('p1TensContainer');
  const onesCont = document.getElementById('p1OnesContainer');
  if (tensCont && onesCont) {
    tensCont.innerHTML = '';
    onesCont.innerHTML = '';

    for (let t = 0; t < tens; t++) {
      const col = document.createElement('div');
      col.className = 'w-7 sm:w-8 py-1 rounded-xl bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-400 border-2 border-indigo-600 flex flex-col items-center justify-between shadow-md h-28';
      col.innerHTML = Array(10).fill('<span class="text-[8px] leading-none">💎</span>').join('');
      tensCont.appendChild(col);
    }

    for (let o = 0; o < ones; o++) {
      const single = document.createElement('div');
      single.className = 'w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-400 to-amber-300 border-2 border-rose-500 flex items-center justify-center text-lg shadow-sm';
      single.innerText = '💎';
      onesCont.appendChild(single);
    }
  }

  renderChoiceButtons(targetAnswer, targetAnswer - 10, targetAnswer + 10);
}

function renderP1Mental() {
  const stage = document.getElementById('stageP1Mental');
  if (!stage) return;
  stage.style.display = 'flex';

  const isAdd = Math.random() > 0.45;
  safeSetText('vocabPillText', `Rocket Speed 兩位數速算`);

  if (isAdd) {
    const a = getRandomInt(2, 6) * 10 + getRandomInt(1, 5);
    const b = getRandomInt(1, 3) * 10;
    targetAnswer = a + b;
    safeSetText('p1MentalA', a);
    safeSetText('p1MentalOp', '➕');
    safeSetText('p1MentalB', b);
    safeSetText('promptZh', `火箭能量注入：${a} 加 ${b} 等於幾多？`);
    safeSetText('promptEn', `Rocket launch math: ${a} plus ${b}?`);
    activeQuestionPromptEn = `Rocket speed! What is ${a} plus ${b}?`;
  } else {
    const a = getRandomInt(4, 8) * 10 + getRandomInt(2, 8);
    const b = getRandomInt(1, 3) * 10;
    targetAnswer = a - b;
    safeSetText('p1MentalA', a);
    safeSetText('p1MentalOp', '➖');
    safeSetText('p1MentalB', b);
    safeSetText('promptZh', `火箭推進校正：${a} 減 ${b} 等於幾多？`);
    safeSetText('promptEn', `Rocket launch math: ${a} minus ${b}?`);
    activeQuestionPromptEn = `Rocket speed! What is ${a} minus ${b}?`;
  }

  renderChoiceButtons(targetAnswer, targetAnswer - 15, targetAnswer + 15);
}

function renderK1Counting() {
  const stage = document.getElementById('stageK1Count');
  if (!stage) return;
  stage.style.display = 'flex';

  const count = getRandomInt(1, 5);
  targetAnswer = count;
  const vocab = getRandomItem(VOCAB_DATABASE.slice(0, 10));

  safeSetText('vocabPillText', `${vocab.en} ${vocab.zh}`);
  safeSetText('promptZh', `數一數草地上有幾多${vocab.unitZh}？`);
  safeSetText('promptEn', `Let's count! How many ${vocab.pluralEn}?`);
  activeQuestionPromptEn = `Let's count! How many ${vocab.pluralEn} are there?`;

  const grid = document.getElementById('k1CountGrid');
  if (grid) {
    grid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'text-6xl sm:text-7xl p-3 cursor-pointer pop-in';
      item.innerText = vocab.emoji;
      item.onclick = () => {
        if (typeof soundTapPop === 'function') soundTapPop();
        if (typeof speakNumberWord === 'function') speakNumberWord(i + 1);
      };
      grid.appendChild(item);
    }
  }

  renderChoiceButtons(targetAnswer, 1, 5);
}

let k1CompareTarget = 'left';
function renderK1Compare() {
  const stage = document.getElementById('stageK1Compare');
  if (!stage) return;
  stage.style.display = 'grid';

  const vocab = getRandomItem(VOCAB_DATABASE);
  safeSetText('vocabPillText', `${vocab.en} ${vocab.zh}`);
  safeSetText('promptZh', `邊一隻${vocab.zh}比較「大」？點擊大嗰隻！`);
  safeSetText('promptEn', `Which one is BIGGER? Tap the big one!`);
  activeQuestionPromptEn = `Which ${vocab.en} is bigger? Tap the big one!`;

  const leftIsBig = Math.random() > 0.5;
  k1CompareTarget = leftIsBig ? 'left' : 'right';

  const leftG = document.getElementById('k1CompareLeftGraphic');
  const rightG = document.getElementById('k1CompareRightGraphic');
  if (leftG && rightG) {
    leftG.className = leftIsBig ? 'text-7xl sm:text-8xl scale-125' : 'text-3xl sm:text-4xl';
    leftG.innerText = vocab.emoji;
    rightG.className = leftIsBig ? 'text-3xl sm:text-4xl' : 'text-7xl sm:text-8xl scale-125';
    rightG.innerText = vocab.emoji;
  }
}

window.submitK1CompareChoice = function(side) {
  if (isInputLocked) return;
  if (side === k1CompareTarget) { lockInteraction(); onAnswerCorrect(); } else onAnswerWrong();
};

const SHAPE_LIST = [
  { id: 'circle', nameZh: '圓形', nameEn: 'Circle', svg: '<svg class="w-24 h-24 text-rose-500 fill-current" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45"/></svg>' },
  { id: 'square', nameZh: '正方形', nameEn: 'Square', svg: '<svg class="w-24 h-24 text-sky-500 fill-current" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="10"/></svg>' },
  { id: 'triangle', nameZh: '三角形', nameEn: 'Triangle', svg: '<svg class="w-24 h-24 text-amber-500 fill-current" viewBox="0 0 100 100"><polygon points="50,10 90,85 10,85"/></svg>' }
];

function renderK1Shape() {
  const stage = document.getElementById('stageK1Shape');
  if (!stage) return;
  stage.style.display = 'flex';

  const targetShape = getRandomItem(SHAPE_LIST);
  safeSetText('vocabPillText', `${targetShape.nameEn} ${targetShape.nameZh}`);
  safeSetText('promptZh', `找出畫面中間相同的「${targetShape.nameZh}」！`);
  safeSetText('promptEn', `Find the matching ${targetShape.nameEn}!`);
  activeQuestionPromptEn = `Find the matching ${targetShape.nameEn}!`;

  safeSetHtml('k1ShapeTargetGraphic', targetShape.svg);
  const optGrid = document.getElementById('k1ShapeOptionsGrid');
  if (optGrid) {
    optGrid.innerHTML = '';
    SHAPE_LIST.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bouncy-btn clay-card p-3 flex flex-col items-center justify-center cursor-pointer border-b-6 border-slate-300';
      btn.innerHTML = `<div class="w-14 h-14 flex items-center justify-center">${s.svg}</div><span class="text-xs font-black text-slate-700 mt-1">${s.nameEn}</span>`;
      btn.onclick = () => {
        if (isInputLocked) return;
        if (s.id === targetShape.id) { lockInteraction(); onAnswerCorrect(); } else onAnswerWrong();
      };
      optGrid.appendChild(btn);
    });
  }
}

function renderK2Counting() {
  const stage = document.getElementById('stageK2Count');
  if (!stage) return;
  stage.style.display = 'flex';

  const count = getRandomInt(1, 9);
  targetAnswer = count;
  const vocab = getRandomItem(VOCAB_DATABASE);

  safeSetText('vocabPillText', `${vocab.en} ${vocab.zh}`);
  safeSetText('promptZh', `數一數畫面上共有幾多${vocab.unitZh}？`);
  safeSetText('promptEn', `How many ${vocab.pluralEn} do you see?`);
  activeQuestionPromptEn = `Let's count! How many ${vocab.pluralEn} do you see?`;

  const grid = document.getElementById('k2CountGrid');
  if (grid) {
    grid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'text-5xl sm:text-6xl p-2.5 cursor-pointer pop-in';
      item.innerText = vocab.emoji;
      item.onclick = () => {
        if (typeof soundTapPop === 'function') soundTapPop();
        if (typeof speakNumberWord === 'function') speakNumberWord(i + 1);
      };
      grid.appendChild(item);
    }
  }

  renderChoiceButtons(targetAnswer, 1, 10);
}

let k2CompareTarget = 'left';
function renderK2Compare() {
  const stage = document.getElementById('stageK2Compare');
  if (!stage) return;
  stage.style.display = 'grid';

  let nA = getRandomInt(2, 7);
  let nB = getRandomInt(2, 7);
  while (nA === nB) nB = getRandomInt(2, 7);
  k2CompareTarget = nA > nB ? 'left' : 'right';

  const vocabA = getRandomItem(VOCAB_DATABASE);
  const vocabB = getRandomItem(VOCAB_DATABASE.filter(v => v.emoji !== vocabA.emoji));

  safeSetText('vocabPillText', `${vocabA.en} vs ${vocabB.en}`);
  safeSetText('promptZh', `哪一邊數量比較多呢？點擊多嗰邊！`);
  safeSetText('promptEn', `Which side has MORE? Tap the bigger group!`);
  activeQuestionPromptEn = `Which group has more items? Tap the side with more!`;

  const leftCont = document.getElementById('k2CompareLeftContainer');
  const rightCont = document.getElementById('k2CompareRightContainer');
  if (leftCont && rightCont) {
    leftCont.innerHTML = '';
    rightCont.innerHTML = '';
    for (let i = 0; i < nA; i++) leftCont.innerHTML += `<span class="text-4xl sm:text-5xl">${vocabA.emoji}</span>`;
    for (let i = 0; i < nB; i++) rightCont.innerHTML += `<span class="text-4xl sm:text-5xl">${vocabB.emoji}</span>`;
  }
}

window.submitK2CompareChoice = function(side) {
  if (isInputLocked) return;
  if (side === k2CompareTarget) { lockInteraction(); onAnswerCorrect(); } else onAnswerWrong();
};

function renderK2Addition() {
  const stage = document.getElementById('stageK2Add');
  if (!stage) return;
  stage.style.display = 'flex';

  const n1 = getRandomInt(1, 5);
  const n2 = getRandomInt(1, 4);
  targetAnswer = n1 + n2;
  const vocab = getRandomItem(VOCAB_DATABASE);

  safeSetText('vocabPillText', `${targetAnswer} ${vocab.pluralEn}`);
  safeSetText('promptZh', `${n1} 加 ${n2}，逐個點擊圖案數總和！`);
  safeSetText('promptEn', `${n1} plus ${n2}. Count total!`);
  activeQuestionPromptEn = `${n1} plus ${n2}. How many altogether?`;

  safeSetText('k2AddLeftDigit', n1);
  safeSetText('k2AddRightDigit', n2);

  const leftBox = document.getElementById('k2AddLeftItems');
  const rightBox = document.getElementById('k2AddRightItems');
  if (leftBox && rightBox) {
    leftBox.innerHTML = '';
    rightBox.innerHTML = '';
    for (let i = 0; i < n1; i++) leftBox.innerHTML += `<span class="text-4xl sm:text-5xl p-1 cursor-pointer" onclick="if(typeof soundTapPop==='function')soundTapPop()">${vocab.emoji}</span>`;
    for (let i = 0; i < n2; i++) rightBox.innerHTML += `<span class="text-4xl sm:text-5xl p-1 cursor-pointer" onclick="if(typeof soundTapPop==='function')soundTapPop()">${vocab.emoji}</span>`;
  }

  renderChoiceButtons(targetAnswer, 2, 9);
}

function renderK2Subtraction() {
  const stage = document.getElementById('stageK2Sub');
  if (!stage) return;
  stage.style.display = 'flex';

  const total = getRandomInt(3, 7);
  const minus = getRandomInt(1, total - 1);
  targetAnswer = total - minus;
  const vocab = getRandomItem(VOCAB_DATABASE);

  safeSetText('vocabPillText', `${vocab.en} ${vocab.zh}`);
  safeSetText('promptZh', `${total} 減 ${minus}，親手劃走 ${minus} 個！`);
  safeSetText('promptEn', `${total} minus ${minus}. Tap to cross out!`);
  activeQuestionPromptEn = `${total} take away ${minus}. How many are left?`;

  safeSetText('k2SubTotalDigit', total);
  safeSetText('k2SubMinusDigit', minus);
  safeSetText('k2SubCutBadge', minus);

  const grid = document.getElementById('k2SubGrid');
  if (grid) {
    grid.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const itemBox = document.createElement('div');
      itemBox.className = 'text-4xl sm:text-5xl p-2 cursor-pointer pop-in';
      itemBox.innerText = vocab.emoji;
      itemBox.onclick = () => {
        itemBox.classList.toggle('cross-marked');
        if (itemBox.classList.contains('cross-marked')) {
          if (typeof soundCrossCut === 'function') soundCrossCut();
        } else {
          if (typeof soundTapPop === 'function') soundTapPop();
        }
      };
      grid.appendChild(itemBox);
    }
  }

  renderChoiceButtons(targetAnswer, 1, 6);
}

function renderK3Bonds() {
  const stage = document.getElementById('stageK3Bonds');
  if (!stage) return;
  stage.style.display = 'flex';

  const given = getRandomInt(1, 9);
  targetAnswer = 10 - given;

  safeSetText('vocabPillText', `Bonds to 10 (凑十法)`);
  safeSetText('promptZh', `10 的分解：${given} 加上幾多等於 10？`);
  safeSetText('promptEn', `${given} plus what makes 10?`);
  activeQuestionPromptEn = `${given} plus what makes 10?`;

  safeSetText('k3BondsGiven', given);
  const tenFrame = document.getElementById('k3TenFrame');
  if (tenFrame) {
    tenFrame.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const cell = document.createElement('div');
      cell.className = 'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 border-amber-200';
      cell.innerHTML = i < given ? '<span class="text-amber-500 font-black text-2xl">●</span>' : '<span class="text-slate-300 font-bold">○</span>';
      tenFrame.appendChild(cell);
    }
  }

  renderChoiceButtons(targetAnswer, 1, 9);
}

function renderK3Math20() {
  const stage = document.getElementById('stageK3Math20');
  if (!stage) return;
  stage.style.display = 'flex';

  const a = getRandomInt(6, 12);
  const b = getRandomInt(3, 8);
  targetAnswer = a + b;

  safeSetText('k3Math20A', a);
  safeSetText('k3Math20Op', '➕');
  safeSetText('k3Math20B', b);
  safeSetText('promptZh', `計算算式：${a} 加 ${b} 等於幾多？`);
  safeSetText('promptEn', `What is ${a} plus ${b}?`);
  activeQuestionPromptEn = `What is ${a} plus ${b}?`;

  renderChoiceButtons(targetAnswer, Math.max(5, targetAnswer - 4), targetAnswer + 4);
}

function renderK3Clock() {
  const stage = document.getElementById('stageK3Clock');
  if (!stage) return;
  stage.style.display = 'flex';

  const isHalf = Math.random() > 0.5;
  const hour = getRandomInt(1, 12);
  const min = isHalf ? 30 : 0;
  targetAnswer = isHalf ? `${hour}:30` : `${hour}:00`;

  safeSetText('vocabPillText', `Telling Time 認識時間`);
  safeSetText('promptZh', `睇下個時鐘，現在是幾點鐘？`);
  safeSetText('promptEn', `Look at the clock face. What time is it?`);
  activeQuestionPromptEn = `What time is it on the clock?`;

  const hourAngle = (hour % 12) * 30 + (min === 30 ? 15 : 0);
  const minAngle = min === 30 ? 180 : 0;

  safeSetHtml('k3ClockSvgContainer', `
    <svg viewBox="0 0 200 200" class="w-full h-full">
      <circle cx="100" cy="100" r="92" fill="#ffffff" stroke="#0284c7" stroke-width="8"/>
      ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n => {
        const rad = ((n * 30) - 90) * Math.PI / 180;
        return `<text x="${100 + 72 * Math.cos(rad)}" y="${100 + 72 * Math.sin(rad) + 5}" font-size="16" font-weight="900" fill="#0f172a" text-anchor="middle">${n}</text>`;
      }).join('')}
      <line x1="100" y1="100" x2="100" y2="45" stroke="#f43f5e" stroke-width="7" stroke-linecap="round" transform="rotate(${hourAngle} 100 100)" />
      <line x1="100" y1="100" x2="100" y2="25" stroke="#0284c7" stroke-width="4.5" stroke-linecap="round" transform="rotate(${minAngle} 100 100)" />
      <circle cx="100" cy="100" r="6" fill="#0f172a" />
    </svg>
  `);

  const choices = [targetAnswer];
  while (choices.length < 4) {
    const rh = getRandomInt(1, 12);
    const rm = Math.random() > 0.5 ? 30 : 0;
    const t = rm === 30 ? `${rh}:30` : `${rh}:00`;
    if (!choices.includes(t)) choices.push(t);
  }
  renderCustomChoiceButtons(choices, targetAnswer);
}

function renderK3Coins() {
  const stage = document.getElementById('stageK3Coins');
  if (!stage) return;
  stage.style.display = 'flex';

  const targetCoin = getRandomItem(HK_COIN_DATA);
  targetAnswer = targetCoin.val;

  safeSetText('vocabPillText', `HK Currency 香港貨幣`);
  safeSetText('promptZh', `畫面中的是香港幾多圓硬幣？`);
  safeSetText('promptEn', `Which Hong Kong coin is this?`);
  activeQuestionPromptEn = `Which Hong Kong coin is shown here?`;

  safeSetHtml('k3CoinTargetDisplay', `
    <div class="hk-coin ${targetCoin.css}">
      <span class="text-xl">${targetCoin.label}</span>
      <span class="text-[9px] font-bold">HONG KONG</span>
    </div>
  `);

  renderCustomChoiceButtons([1, 2, 5, 10].map(v => `$${v}`), `$${targetAnswer}`);
}

/* =========================================================================
   選項生成與互動邏輯
   ========================================================================= */

function renderChoiceButtons(correctVal, minR, maxR) {
  const set = new Set([correctVal]);
  while (set.size < 4) set.add(getRandomInt(minR, maxR));
  const options = Array.from(set).sort((a, b) => a - b);
  const palettes = [
    'from-amber-400 to-amber-500 border-amber-600 text-amber-950',
    'from-sky-400 to-sky-500 border-sky-600 text-sky-950',
    'from-emerald-400 to-emerald-500 border-emerald-600 text-emerald-950',
    'from-pink-400 to-rose-500 border-rose-600 text-rose-950'
  ];

  const row = document.getElementById('numberOptionsRow');
  if (!row) return;
  row.innerHTML = '';

  options.forEach((val, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `option-choice-btn bouncy-btn bg-gradient-to-b ${palettes[idx % palettes.length]} border-b-6 w-16 h-16 sm:w-20 sm:h-20 rounded-3xl text-3xl sm:text-4xl font-black flex items-center justify-center cursor-pointer shadow-lg`;
    btn.innerText = val;
    btn.onclick = () => {
      if (isInputLocked) return;
      if (val === correctVal) { lockInteraction(); onAnswerCorrect(); } else onAnswerWrong();
    };
    row.appendChild(btn);
  });
}

function renderCustomChoiceButtons(labels, correctValue) {
  const palettes = [
    'from-amber-400 to-amber-500 border-amber-600 text-amber-950',
    'from-sky-400 to-sky-500 border-sky-600 text-sky-950',
    'from-emerald-400 to-emerald-500 border-emerald-600 text-emerald-950',
    'from-pink-400 to-rose-500 border-rose-600 text-rose-950'
  ];

  const row = document.getElementById('numberOptionsRow');
  if (!row) return;
  row.innerHTML = '';

  labels.forEach((text, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `option-choice-btn bouncy-btn bg-gradient-to-b ${palettes[idx % palettes.length]} border-b-6 px-4 py-2.5 rounded-2xl text-base sm:text-xl font-black flex items-center justify-center cursor-pointer shadow-md min-w-[75px]`;
    btn.innerText = text;
    btn.onclick = () => {
      if (isInputLocked) return;
      if (text === correctValue) { lockInteraction(); onAnswerCorrect(); } else onAnswerWrong();
    };
    row.appendChild(btn);
  });
}

function lockInteraction() {
  isInputLocked = true;
  document.querySelectorAll('.option-choice-btn, #k1CompareLeftBtn, #k1CompareRightBtn, #k2CompareLeftBtn, #k2CompareRightBtn').forEach(btn => {
    btn.disabled = true;
  });
}

function onAnswerCorrect() {
  if (typeof soundSuccessChime === 'function') soundSuccessChime();
  if (typeof soundCoinJingle === 'function') soundCoinJingle();
  if (typeof speakPraiseEn === 'function') speakPraiseEn();

  totalQuestionsAnswered++;
  correctAnswersCount++;
  gradeSolvedCounters[currentGrade]++;
  currentStars += 1;
  safeSetText('headerStars', currentStars);

  if (typeof confetti === 'function') {
    confetti({ particleCount: 75, spread: 90, origin: { y: 0.6 } });
  }

  safeSetText('promptZh', '太叻啦！答啱啦！🎉');
  safeSetText('promptEn', 'Awesome! That is correct! ⭐');

  if (totalQuestionsAnswered % 4 === 0) {
    setTimeout(triggerNextEvolutionMilestone, 650);
  } else {
    setTimeout(generateQuestion, 1400);
  }
}

function onAnswerWrong() {
  if (typeof soundEncourageTone === 'function') soundEncourageTone();
  if (typeof speakTryAgainEn === 'function') speakTryAgainEn();

  safeSetText('promptZh', '差少少！再試多次啦！💪');
  safeSetText('promptEn', 'Almost! Try again! You can do it! 🐰');

  const banner = document.getElementById('promptDisplayBanner');
  if (banner) {
    banner.classList.add('animate-wiggle');
    setTimeout(() => banner.classList.remove('animate-wiggle'), 400);
  }
}

/* =========================================================================
   貼紙進化與展示系統 (彈窗開關修復)
   ========================================================================= */

function triggerNextEvolutionMilestone() {
  let targetSticker = null;
  let targetNextTier = 1;

  for (let s of STICKER_LIST) {
    if (stickerTierMap[s.id] === 0) { targetSticker = s; targetNextTier = 1; break; }
  }
  if (!targetSticker) {
    for (let s of STICKER_LIST) {
      if (stickerTierMap[s.id] === 1) { targetSticker = s; targetNextTier = 2; break; }
    }
  }
  if (!targetSticker) {
    for (let s of STICKER_LIST) {
      if (stickerTierMap[s.id] === 2) { targetSticker = s; targetNextTier = 3; break; }
    }
  }
  if (!targetSticker) {
    targetSticker = getRandomItem(STICKER_LIST);
    targetNextTier = 3;
  }

  stickerTierMap[targetSticker.id] = targetNextTier;
  updateAlbumBadgeDisplay();
  displayCelebrationModal(targetSticker, targetNextTier);
}

function updateAlbumBadgeDisplay() {
  let unlockedCount = 0;
  STICKER_LIST.forEach(s => { if (stickerTierMap[s.id] > 0) unlockedCount++; });
  safeSetText('albumTierBadge', `${unlockedCount}/12`);
}

function displayCelebrationModal(sticker, tier) {
  const iconContainer = document.getElementById('newStickerBigIconContainer');
  const tierPill = document.getElementById('newStickerTierPill');

  if (iconContainer) {
    iconContainer.innerText = sticker.icon;
    iconContainer.className = 'w-32 h-32 rounded-3xl my-3 flex items-center justify-center text-7xl shadow-lg animate-wiggle';
  }

  if (tier === 3) {
    if (typeof soundRainbowPrismaticChime === 'function') soundRainbowPrismaticChime();
    safeSetText('celebrationTitle', '🌈 幻彩虹光進化！');
    safeSetText('celebrationSubtitle', '貼紙已進化至最高【幻彩虹光】！');
    if (tierPill) tierPill.innerText = '🌈 幻彩全息虹光';
    if (iconContainer) iconContainer.classList.add('tier-rainbow');
    if (typeof speakEnglishOnly === 'function') speakEnglishOnly(`Incredible! Rainbow evolution! Look at the Prismatic ${sticker.name.split(' ')[0]}!`);
  } else if (tier === 2) {
    if (typeof soundGoldUpgradeChime === 'function') soundGoldUpgradeChime();
    safeSetText('celebrationTitle', '✨ 閃爍黃金箔升級！');
    safeSetText('celebrationSubtitle', '貼紙成功升級至【閃耀金箔】版！');
    if (tierPill) tierPill.innerText = '🌟 閃爍黃金 (Gold)';
    if (iconContainer) iconContainer.classList.add('tier-gold');
    if (typeof speakEnglishOnly === 'function') speakEnglishOnly(`Super! Look at the Golden ${sticker.name.split(' ')[0]}! It shines so brightly!`);
  } else {
    if (typeof soundSuccessChime === 'function') soundSuccessChime();
    safeSetText('celebrationTitle', '🎉 解鎖新貼紙！');
    safeSetText('celebrationSubtitle', '太棒了！你的收藏簿又多了一張貼紙！');
    if (tierPill) tierPill.innerText = '⚪ 普通徽章';
    if (iconContainer) iconContainer.classList.add('tier-standard');
    if (typeof speakEnglishOnly === 'function') speakEnglishOnly(`Look! It's the lovely ${sticker.name.split(' ')[0]}! Well done!`);
  }

  safeSetText('newStickerNameText', sticker.name);
  showModal('unlockCelebrationModal');
}

window.closeUnlockModal = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  hideModal('unlockCelebrationModal');
  generateQuestion();
};

window.openStickerModal = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  const container = document.getElementById('stickerGridContainer');
  if (!container) return;
  container.innerHTML = '';
  let unlockedCount = 0;

  STICKER_LIST.forEach(item => {
    const tier = stickerTierMap[item.id] || 0;
    if (tier > 0) unlockedCount++;

    const slot = document.createElement('div');
    let tierClass = 'bg-slate-100 border-2 border-dashed border-slate-300 opacity-40 cursor-not-allowed';
    let tierTag = '<span class="text-[9px] font-bold text-slate-400">未解鎖</span>';

    if (tier === 3) {
      tierClass = 'tier-rainbow shadow-md scale-102 cursor-pointer';
      tierTag = '<span class="text-[8px] font-black text-purple-900 bg-white/90 px-1.5 py-0.2 rounded-full">🌈 幻彩</span>';
    } else if (tier === 2) {
      tierClass = 'tier-gold shadow-sm scale-101 cursor-pointer';
      tierTag = '<span class="text-[8px] font-black text-amber-950 bg-white/90 px-1.5 py-0.2 rounded-full">🌟 金箔</span>';
    } else if (tier === 1) {
      tierClass = 'tier-standard bg-white shadow-xs cursor-pointer';
      tierTag = '<span class="text-[8px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">⚪ 普通</span>';
    }

    slot.className = `p-2 rounded-2xl flex flex-col items-center justify-between min-h-[95px] transition-all relative ${tierClass}`;
    slot.innerHTML = `
      <span class="text-3xl my-auto">${tier > 0 ? item.icon : '🔒'}</span>
      <div class="w-full flex flex-col items-center">
        <span class="text-[9px] font-black text-slate-800 truncate w-full text-center">${tier > 0 ? item.name.split(' ')[0] : 'Locked'}</span>
        ${tierTag}
      </div>
    `;

    if (tier > 0) {
      slot.onclick = () => openShowcaseModal(item, tier);
    }
    container.appendChild(slot);
  });

  safeSetText('albumPrestigeProgress', `${unlockedCount}/12`);
  showModal('stickerAlbumModal');
};

window.closeStickerModal = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  hideModal('stickerAlbumModal');
};

function openShowcaseModal(sticker, tier) {
  if (typeof soundTapPop === 'function') soundTapPop();
  activeShowcaseSticker = { sticker, tier };

  const badgeBox = document.getElementById('showcaseModalBadgeBox');
  const tierPill = document.getElementById('showcaseModalTierPill');

  if (badgeBox) {
    badgeBox.innerText = sticker.icon;
    badgeBox.className = 'w-28 h-28 sm:w-36 sm:h-36 rounded-3xl flex items-center justify-center text-6xl sm:text-7xl shadow-xl animate-gentleFloatWiggle transition-all';
  }

  if (tier === 3) {
    if (badgeBox) badgeBox.classList.add('tier-rainbow');
    if (tierPill) {
      tierPill.innerText = '🌈 幻彩全息虹光 (Prismatic)';
      tierPill.className = 'text-[11px] font-black px-3 py-0.5 rounded-full text-white bg-purple-600 my-1.5';
    }
  } else if (tier === 2) {
    if (badgeBox) badgeBox.classList.add('tier-gold');
    if (tierPill) {
      tierPill.innerText = '🌟 閃爍黃金箔 (Golden Foil)';
      tierPill.className = 'text-[11px] font-black px-3 py-0.5 rounded-full text-amber-950 bg-amber-400 my-1.5';
    }
  } else {
    if (badgeBox) badgeBox.classList.add('tier-standard');
    if (tierPill) {
      tierPill.innerText = '⚪ 普通徽章 (Standard)';
      tierPill.className = 'text-[11px] font-black px-3 py-0.5 rounded-full text-white bg-emerald-500 my-1.5';
    }
  }

  safeSetText('showcaseModalName', sticker.name);
  safeSetText('showcaseModalSpeechText', `"${sticker.desc}"`);

  showModal('stickerShowcaseModal');

  if (typeof speakEnglishOnly === 'function') speakEnglishOnly(sticker.desc);
}

window.replayShowcaseVoice = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  if (activeShowcaseSticker && typeof speakEnglishOnly === 'function') {
    speakEnglishOnly(activeShowcaseSticker.sticker.desc);
  }
};

window.closeShowcaseModal = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  hideModal('stickerShowcaseModal');
};

window.openTeacherVoiceModal = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  const list = document.getElementById('teacherCardsList');
  if (!list) return;
  list.innerHTML = '';

  TEACHER_PROFILES.forEach((t, idx) => {
    const card = document.createElement('div');
    const isSelected = idx === currentTeacherIndex;
    card.className = `p-3 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-slate-50 border-slate-200'}`;
    card.innerHTML = `
      <div class="flex items-center gap-3 text-left">
        <span class="text-3xl">${t.avatar}</span>
        <div>
          <div class="text-sm font-black text-slate-800">${t.name} ${isSelected ? '✅' : ''}</div>
          <div class="text-[11px] font-bold text-slate-500">${t.title}</div>
        </div>
      </div>
      <button type="button" class="bouncy-btn bg-white border border-slate-300 text-slate-700 font-bold text-xs px-2.5 py-1 rounded-xl">試聽</button>
    `;

    card.onclick = () => {
      currentTeacherIndex = idx;
      safeSetText('currentTeacherAvatar', t.avatar);
      safeSetText('currentTeacherNamePill', t.name);
      if (typeof speakEnglishOnly === 'function') speakEnglishOnly(t.intro);
      openTeacherVoiceModal();
    };
    list.appendChild(card);
  });

  showModal('teacherVoiceModal');
};

window.closeTeacherVoiceModal = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  hideModal('teacherVoiceModal');
};

window.toggleAudioMute = function() {
  isSoundOn = !isSoundOn;
  safeSetText('audioMuteIcon', isSoundOn ? '🔊' : '🔇');
  safeSetText('audioMuteLabel', isSoundOn ? '發音' : '靜音');
  if (!isSoundOn && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  if (typeof soundTapPop === 'function') soundTapPop();
};

let parentGateAnswer = 0;
window.openParentGate = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  const a = getRandomInt(7, 12);
  const b = getRandomInt(6, 9);
  parentGateAnswer = a * b;

  safeSetText('parentLockFormula', `${a} × ${b} = ?`);
  const input = document.getElementById('parentLockInput');
  if (input) input.value = '';

  const err = document.getElementById('parentLockError');
  if (err) err.style.display = 'none';

  const ch = document.getElementById('parentLockChallenge');
  if (ch) ch.style.display = 'block';

  const rep = document.getElementById('parentDashboardReport');
  if (rep) rep.style.display = 'none';

  showModal('parentGateModal');
};

window.verifyParentPass = function() {
  const input = document.getElementById('parentLockInput');
  const val = input ? parseInt(input.value, 10) : 0;

  if (val === parentGateAnswer) {
    if (typeof soundSuccessChime === 'function') soundSuccessChime();
    const ch = document.getElementById('parentLockChallenge');
    const rep = document.getElementById('parentDashboardReport');
    if (ch) ch.style.display = 'none';
    if (rep) rep.style.display = 'block';

    safeSetText('statTotalSolved', `${totalQuestionsAnswered} 題`);
    const acc = totalQuestionsAnswered > 0 ? Math.round((correctAnswersCount / totalQuestionsAnswered) * 100) : 100;
    safeSetText('statAccuracy', `${acc}%`);
  } else {
    if (typeof soundEncourageTone === 'function') soundEncourageTone();
    const err = document.getElementById('parentLockError');
    if (err) err.style.display = 'block';
  }
};

window.closeParentGateModal = function() {
  if (typeof soundTapPop === 'function') soundTapPop();
  hideModal('parentGateModal');
};

// 確保手機頁面載入時所有彈窗徹底處於關閉狀態
document.addEventListener('DOMContentLoaded', () => {
  hideAllModals();
  forceUnlockAllButtons();
  updateAlbumBadgeDisplay();
});
