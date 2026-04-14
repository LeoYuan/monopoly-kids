import './style.css'
import { BaseDirectory, readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs'

// ===================== 类型定义 =====================

type CellType = 'start' | 'property' | 'chance' | 'tax' | 'jail' | 'free_parking' | 'goto_jail'

interface Cell {
  id: number
  type: CellType
  name: string
  icon: string
  price?: number
  rent?: number[]
  color?: string
  colorClass?: string
}

interface Player {
  id: number
  name: string
  avatar: string
  color: string
  money: number
  position: number
  properties: number[]
  jailTurns: number
  isBankrupt: boolean
}

interface LeaderboardEntry {
  name: string
  avatar: string
  total: number
  money: number
  assets: number
  date: string
}

interface PresetPlayer {
  id: string
  name: string
  avatar: string
}

// ===================== 常量配置 =====================

const BOARD_SIZE = 24
const MAX_ROUNDS = 20
const START_MONEY = 2000
const LEADERBOARD_FILE = 'leaderboard.json'
const PRESETS_FILE = 'presets.json'

const CHANCE_CARDS = [
  { name: '生日红包', desc: '收到亲戚的红包，获得 200 元！', effect: 'money', value: 200, icon: '🧧' },
  { name: '捡到钱包', desc: '运气真棒！捡到 150 元。', effect: 'money', value: 150, icon: '👛' },
  { name: '糖果店打折', desc: '省下零花钱 100 元。', effect: 'money', value: 100, icon: '🍬' },
  { name: '丢失玩具', desc: '重新买一个，花费 100 元。', effect: 'money', value: -100, icon: '🧸' },
  { name: '交学费', desc: '课外班缴费 200 元。', effect: 'money', value: -200, icon: '📚' },
  { name: '幸运抽奖', desc: '获得 300 元奖金！', effect: 'money', value: 300, icon: '🎁' },
  { name: '请客吃饭', desc: '请好朋友吃冰淇淋，花费 80 元。', effect: 'money', value: -80, icon: '🍦' },
  { name: '压岁钱', desc: '长辈给的压岁钱 250 元！', effect: 'money', value: 250, icon: '💰' },
]

const AVATARS = ['🐰', '🐻', '🐱', '🐶']
const NAMES = ['小白兔', '小熊熊', '小猫咪', '小狗狗']
const COLORS = ['#ff5252', '#448aff', '#ffab00', '#69f0ae']

const CELLS: Cell[] = [
  { id: 0, type: 'start', name: '起点', icon: '🏁' },
  { id: 1, type: 'property', name: '草莓屋', icon: '🍓', price: 200, rent: [30, 80, 150], color: '#ff9aa2', colorClass: 'property-1' },
  { id: 2, type: 'property', name: '樱桃屋', icon: '🍒', price: 220, rent: [35, 90, 170], color: '#ff9aa2', colorClass: 'property-1' },
  { id: 3, type: 'chance', name: '机会', icon: '❓' },
  { id: 4, type: 'property', name: '柠檬屋', icon: '🍋', price: 240, rent: [40, 100, 190], color: '#ffdac1', colorClass: 'property-2' },
  { id: 5, type: 'property', name: '香蕉屋', icon: '🍌', price: 260, rent: [45, 110, 210], color: '#ffdac1', colorClass: 'property-2' },
  { id: 6, type: 'jail', name: '监狱', icon: '🚔' },
  { id: 7, type: 'property', name: '薄荷屋', icon: '🌿', price: 280, rent: [50, 120, 230], color: '#c7ceea', colorClass: 'property-3' },
  { id: 8, type: 'property', name: '蓝莓屋', icon: '🫐', price: 300, rent: [55, 130, 250], color: '#c7ceea', colorClass: 'property-3' },
  { id: 9, type: 'chance', name: '命运', icon: '🌟' },
  { id: 10, type: 'property', name: '葡萄屋', icon: '🍇', price: 320, rent: [60, 140, 270], color: '#e2f0cb', colorClass: 'property-4' },
  { id: 11, type: 'property', name: '西瓜屋', icon: '🍉', price: 340, rent: [65, 150, 290], color: '#e2f0cb', colorClass: 'property-4' },
  { id: 12, type: 'free_parking', name: '免费停车', icon: '🅿️' },
  { id: 13, type: 'property', name: '桃子屋', icon: '🍑', price: 360, rent: [70, 170, 320], color: '#ff9aa2', colorClass: 'property-1' },
  { id: 14, type: 'property', name: '苹果屋', icon: '🍎', price: 380, rent: [75, 180, 340], color: '#ff9aa2', colorClass: 'property-1' },
  { id: 15, type: 'chance', name: '机会', icon: '❓' },
  { id: 16, type: 'property', name: '橙子屋', icon: '🍊', price: 400, rent: [80, 200, 380], color: '#ffdac1', colorClass: 'property-2' },
  { id: 17, type: 'property', name: '菠萝屋', icon: '🍍', price: 420, rent: [85, 210, 400], color: '#ffdac1', colorClass: 'property-2' },
  { id: 18, type: 'goto_jail', name: '去监狱', icon: '👮' },
  { id: 19, type: 'property', name: '椰子屋', icon: '🥥', price: 440, rent: [90, 220, 420], color: '#c7ceea', colorClass: 'property-3' },
  { id: 20, type: 'property', name: '海浪屋', icon: '🌊', price: 460, rent: [95, 230, 440], color: '#c7ceea', colorClass: 'property-3' },
  { id: 21, type: 'chance', name: '命运', icon: '🌟' },
  { id: 22, type: 'property', name: '彩虹屋', icon: '🌈', price: 500, rent: [110, 260, 500], color: '#e2f0cb', colorClass: 'property-4' },
  { id: 23, type: 'property', name: '星星屋', icon: '⭐', price: 520, rent: [120, 280, 520], color: '#e2f0cb', colorClass: 'property-4' },
]

// ===================== 游戏状态 =====================

let players: Player[] = []
let currentPlayerIndex = 0
let round = 1
let isAnimating = false
let pendingAction: (() => void) | null = null
let selectedPlayerCount = 2
let selectedAvatars: string[] = []

// ===================== DOM 引用 =====================

const app = document.querySelector<HTMLDivElement>('#app')!

// 插入基础 DOM 结构
app.innerHTML = `
  <div id="rotate-hint">
    <div class="rotate-icon">📱</div>
    <p>请横屏游玩，体验更佳哦！</p>
  </div>
  <div id="home-screen" class="screen active">
    <div class="home-content">
      <div class="logo-icon">🎠</div>
      <h1>糖果大富翁</h1>
      <p class="subtitle">和爸爸妈妈一起成为小小富翁吧！</p>
      <div class="player-select">
        <p class="select-title">选择玩家人数</p>
        <div class="player-buttons">
          <button class="btn-player" data-count="2"><span class="icon">👨‍👧</span><span>2 人玩</span></button>
          <button class="btn-player" data-count="3"><span class="icon">👨‍👩‍👧</span><span>3 人玩</span></button>
          <button class="btn-player" data-count="4"><span class="icon">👨‍👩‍👧‍👦</span><span>4 人玩</span></button>
        </div>
      </div>
      <div class="home-actions">
        <button id="btn-rules" class="btn-rules">📖 玩法说明</button>
        <button id="btn-presets" class="btn-rules">👤 常见玩家</button>
        <button id="btn-leaderboard" class="btn-rules">🏆 排行榜</button>
      </div>
    </div>
  </div>
  <div id="name-screen" class="screen">
    <div class="name-content">
      <div class="name-icon">✏️</div>
      <h2>输入玩家姓名</h2>
      <p class="name-subtitle">给小伙伴们起个好听的名字吧~</p>
      <div id="name-inputs"></div>
      <div class="name-buttons">
        <button id="btn-name-back" class="btn-action btn-secondary">← 返回</button>
        <button id="btn-name-start" class="btn-action btn-primary">开始游戏 🎮</button>
      </div>
    </div>
  </div>
  <div id="game-screen" class="screen" tabindex="-1">
    <div class="game-header">
      <div class="game-title">🎠 糖果大富翁</div>
      <button class="btn-back" id="btn-back">↩ 返回首页</button>
    </div>
    <div class="game-layout">
      <div class="side-panel left-panel">
        <div class="panel-title">💰 小金库</div>
        <div id="players-list"></div>
        <div class="game-info">
          <div class="info-item"><span class="info-label">回合</span><span id="round-display" class="info-value">1 / ${MAX_ROUNDS}</span></div>
          <div class="info-item"><span class="info-label">骰子</span><span id="last-dice" class="info-value">-</span></div>
        </div>
      </div>
      <div class="board-container"><div id="board"></div></div>
      <div class="side-panel right-panel">
        <div class="panel-title">🎮 操作</div>
        <div class="action-area">
          <div id="current-player-badge">
            <span id="current-player-icon">🐰</span>
            <span id="current-player-name">小白兔</span>
          </div>
          <button id="btn-roll" class="btn-action btn-primary"><span class="btn-icon">🎲</span><span>掷骰子</span></button>
          <div class="message-area"><p id="game-message">点击掷骰子开始游戏！</p></div>
        </div>
      </div>
    </div>
  </div>
  <div id="end-screen" class="screen">
    <div class="end-content">
      <div class="trophy">🏆</div>
      <h2>游戏结束！</h2>
      <p class="end-subtitle">恭喜小小富翁们！</p>
      <div id="ranking-list"></div>
      <div class="end-buttons">
        <button id="btn-restart" class="btn-action btn-primary btn-large"><span>🔄 再玩一次</span></button>
        <button id="btn-end-home" class="btn-action btn-secondary btn-large"><span>🏠 返回首页</span></button>
      </div>
    </div>
  </div>
  <div id="leaderboard-screen" class="screen">
    <div class="leaderboard-content">
      <div class="leaderboard-icon">🏆</div>
      <h2>小小富翁排行榜</h2>
      <p class="leaderboard-subtitle">看看谁是最厉害的大富翁！</p>
      <div id="leaderboard-list" class="leaderboard-list"></div>
      <div class="leaderboard-empty" id="leaderboard-empty">还没有战绩哦，快来玩一局吧~</div>
      <button id="btn-leaderboard-back" class="btn-action btn-primary btn-large">← 返回首页</button>
    </div>
  </div>
  <div id="rules-modal" class="modal hidden">
    <div class="modal-content rules-modal-content">
      <div class="modal-icon">📖</div>
      <h3>玩法说明</h3>
      <div class="rules-body">
        <div class="rule-section">
          <div class="rule-title">🎯 游戏目标</div>
          <p>在 20 个回合内，通过购买地产、收取租金，成为最富有的小小富翁！</p>
        </div>
        <div class="rule-section">
          <div class="rule-title">🎲 怎么玩</div>
          <ul>
            <li>点击「掷骰子」移动你的棋子</li>
            <li>走到空地产时，可以用零花钱购买</li>
            <li>走到别人的地产时，要交租金哦</li>
            <li>经过起点可以获得 200 元奖励</li>
          </ul>
        </div>
        <div class="rule-section">
          <div class="rule-title">🏠 地产升级</div>
          <p>拥有同颜色 2 间房子 → 租金升级<br>拥有同颜色 4 间房子 → 租金满级</p>
        </div>
        <div class="rule-section">
          <div class="rule-title">❓ 机会卡</div>
          <p>走到「机会」或「命运」格子，会随机获得奖励或遇到小挑战~</p>
        </div>
        <div class="rule-section">
          <div class="rule-title">🚔 监狱规则</div>
          <p>走到「去监狱」要休息 1 回合；路过「监狱」是安全的~</p>
        </div>
      </div>
      <div class="modal-buttons">
        <button id="btn-close-rules" class="btn-action btn-primary">知道了</button>
      </div>
    </div>
  </div>
  <div id="modal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-icon" id="modal-icon">🎁</div>
      <h3 id="modal-title">标题</h3>
      <p id="modal-text">内容</p>
      <div class="modal-buttons" id="modal-buttons"></div>
    </div>
  </div>
  <div id="dice-overlay" class="dice-overlay hidden">
    <div class="dice-animate">🎲</div>
    <div class="dice-number" id="dice-number">3</div>
  </div>
`

// 获取 DOM 元素
const homeScreen = document.querySelector<HTMLDivElement>('#home-screen')!
const nameScreen = document.querySelector<HTMLDivElement>('#name-screen')!
const gameScreen = document.querySelector<HTMLDivElement>('#game-screen')!
const endScreen = document.querySelector<HTMLDivElement>('#end-screen')!
const leaderboardScreen = document.querySelector<HTMLDivElement>('#leaderboard-screen')!
const boardEl = document.querySelector<HTMLDivElement>('#board')!
const playersListEl = document.querySelector<HTMLDivElement>('#players-list')!
const roundDisplay = document.querySelector<HTMLSpanElement>('#round-display')!
const lastDiceEl = document.querySelector<HTMLSpanElement>('#last-dice')!
const currentPlayerIcon = document.querySelector<HTMLSpanElement>('#current-player-icon')!
const currentPlayerName = document.querySelector<HTMLSpanElement>('#current-player-name')!
const btnRoll = document.querySelector<HTMLButtonElement>('#btn-roll')!
const gameMessage = document.querySelector<HTMLParagraphElement>('#game-message')!
const modal = document.querySelector<HTMLDivElement>('#modal')!
const modalIcon = document.querySelector<HTMLDivElement>('#modal-icon')!
const modalTitle = document.querySelector<HTMLHeadingElement>('#modal-title')!
const modalText = document.querySelector<HTMLParagraphElement>('#modal-text')!
const modalButtons = document.querySelector<HTMLDivElement>('#modal-buttons')!
const diceOverlay = document.querySelector<HTMLDivElement>('#dice-overlay')!
const diceNumber = document.querySelector<HTMLDivElement>('#dice-number')!
const rulesModal = document.querySelector<HTMLDivElement>('#rules-modal')!
const btnRules = document.querySelector<HTMLButtonElement>('#btn-rules')!
const btnCloseRules = document.querySelector<HTMLButtonElement>('#btn-close-rules')!
const nameInputsEl = document.querySelector<HTMLDivElement>('#name-inputs')!
const btnPresets = document.querySelector<HTMLButtonElement>('#btn-presets')!
const btnLeaderboard = document.querySelector<HTMLButtonElement>('#btn-leaderboard')!
const leaderboardListEl = document.querySelector<HTMLDivElement>('#leaderboard-list')!
const leaderboardEmptyEl = document.querySelector<HTMLDivElement>('#leaderboard-empty')!

// ===================== 辅助函数 =====================

function renderAvatar(container: HTMLElement, avatar: string, color?: string) {
  container.innerHTML = ''
  if (avatar.startsWith('data:')) {
    const img = document.createElement('img')
    img.src = avatar
    img.alt = 'avatar'
    container.appendChild(img)
  } else {
    container.textContent = avatar
  }
  if (color) {
    container.style.background = color
  }
}

function showScreen(name: 'home' | 'name' | 'game' | 'end' | 'leaderboard') {
  homeScreen.classList.remove('active')
  nameScreen.classList.remove('active')
  gameScreen.classList.remove('active')
  endScreen.classList.remove('active')
  leaderboardScreen.classList.remove('active')
  if (name === 'home') homeScreen.classList.add('active')
  if (name === 'name') nameScreen.classList.add('active')
  if (name === 'game') gameScreen.classList.add('active')
  if (name === 'end') endScreen.classList.add('active')
  if (name === 'leaderboard') leaderboardScreen.classList.add('active')
}

function showModal(opts: { icon: string; title: string; text?: string; html?: string; buttons: { text: string; className?: string; onClick: () => void }[] }) {
  modalIcon.textContent = opts.icon
  modalTitle.textContent = opts.title
  if (opts.html) {
    modalText.innerHTML = opts.html
  } else {
    modalText.textContent = opts.text || ''
  }
  modalButtons.innerHTML = ''
  opts.buttons.forEach((b) => {
    const btn = document.createElement('button')
    btn.className = `btn-action ${b.className || 'btn-primary'}`
    btn.textContent = b.text
    btn.addEventListener('click', () => {
      hideModal()
      b.onClick()
    })
    modalButtons.appendChild(btn)
  })
  modal.classList.remove('hidden')
}

function showModalAsync(opts: { icon: string; title: string; text: string; buttons: { text: string; className?: string; value: unknown }[] }): Promise<unknown> {
  return new Promise((resolve) => {
    modalIcon.textContent = opts.icon
    modalTitle.textContent = opts.title
    modalText.textContent = opts.text
    modalButtons.innerHTML = ''
    opts.buttons.forEach((b) => {
      const btn = document.createElement('button')
      btn.className = `btn-action ${b.className || 'btn-primary'}`
      btn.textContent = b.text
      btn.addEventListener('click', () => {
        hideModal()
        resolve(b.value)
      })
      modalButtons.appendChild(btn)
    })
    modal.classList.remove('hidden')
  })
}

function hideModal() {
  modal.classList.add('hidden')
}

function playSound(type: 'roll' | 'cash' | 'move' | 'win') {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime

    if (type === 'roll') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'cash') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.setValueAtTime(1100, now + 0.1)
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'move') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(200, now)
      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
      osc.start(now)
      osc.stop(now + 0.08)
    } else if (type === 'win') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.setValueAtTime(659.25, now + 0.15)
      osc.frequency.setValueAtTime(783.99, now + 0.3)
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.linearRampToValueAtTime(0.1, now + 0.5)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1)
      osc.start(now)
      osc.stop(now + 1)
    }
  } catch {
    // ignore
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatMoney(n: number) {
  return `¥${n}`
}

// ===================== 排行榜持久化 =====================

async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const fileExists = await exists(LEADERBOARD_FILE, { baseDir: BaseDirectory.AppData })
    if (!fileExists) return []
    const text = await readTextFile(LEADERBOARD_FILE, { baseDir: BaseDirectory.AppData })
    return JSON.parse(text) as LeaderboardEntry[]
  } catch (e) {
    console.error('loadLeaderboard failed:', e)
    return []
  }
}

async function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
    await writeTextFile(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), { baseDir: BaseDirectory.AppData })
  } catch (e) {
    console.error('saveLeaderboard failed:', e)
  }
}

async function addToLeaderboard(entry: LeaderboardEntry) {
  const list = await loadLeaderboard()
  list.push(entry)
  list.sort((a, b) => b.total - a.total)
  await saveLeaderboard(list.slice(0, 50))
}

async function loadPresets(): Promise<PresetPlayer[]> {
  try {
    const fileExists = await exists(PRESETS_FILE, { baseDir: BaseDirectory.AppData })
    if (!fileExists) return []
    const text = await readTextFile(PRESETS_FILE, { baseDir: BaseDirectory.AppData })
    return JSON.parse(text) as PresetPlayer[]
  } catch (e) {
    console.error('loadPresets failed:', e)
    return []
  }
}

async function savePresets(presets: PresetPlayer[]) {
  try {
    await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
    await writeTextFile(PRESETS_FILE, JSON.stringify(presets, null, 2), { baseDir: BaseDirectory.AppData })
  } catch (e) {
    console.error('savePresets failed:', e)
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function renderLeaderboard() {
  const list = await loadLeaderboard()
  leaderboardListEl.innerHTML = ''
  if (list.length === 0) {
    leaderboardListEl.style.display = 'none'
    leaderboardEmptyEl.style.display = 'block'
    return
  }
  leaderboardListEl.style.display = 'flex'
  leaderboardEmptyEl.style.display = 'none'
  const medals = ['🥇', '🥈', '🥉', '🏅']
  list.slice(0, 10).forEach((entry, idx) => {
    const item = document.createElement('div')
    item.className = 'leaderboard-item'
    item.innerHTML = `
      <div class="leaderboard-rank">${medals[idx] || '🏅'}</div>
      <div class="leaderboard-avatar"></div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${entry.name}</div>
        <div class="leaderboard-date">${formatDate(entry.date)}</div>
      </div>
      <div class="leaderboard-score">${formatMoney(entry.total)}</div>
    `
    const avatarEl = item.querySelector('.leaderboard-avatar') as HTMLElement
    renderAvatar(avatarEl, entry.avatar, undefined)
    leaderboardListEl.appendChild(item)
  })
}

// ===================== 常见玩家 =====================

async function renderPresetManager() {
  const presets = await loadPresets()
  let currentPresets = [...presets]
  let newAvatar = AVATARS[0]

  const refreshContent = () => {
    const listHtml = currentPresets.length
      ? currentPresets.map((p) => `
        <div class="preset-item" data-id="${p.id}">
          <div class="preset-avatar"></div>
          <div class="preset-name">${p.name}</div>
          <button class="preset-delete" data-id="${p.id}">删除</button>
        </div>
      `).join('')
      : '<p style="color:#999;font-size:14px;margin:8px 0;">还没有常见玩家，快添加一个吧~</p>'

    modalText.innerHTML = `
      <div class="preset-section">
        <div class="preset-list">${listHtml}</div>
        <div class="preset-add-row">
          <div class="preset-add-avatar" id="preset-add-avatar"></div>
          <input type="text" id="preset-add-name" class="preset-add-input" placeholder="输入姓名" maxlength="8">
          <button id="preset-add-btn" class="btn-action btn-primary" style="width:auto;min-width:80px;padding:10px 16px;font-size:14px;">添加</button>
        </div>
      </div>
    `

    currentPresets.forEach((p) => {
      const el = modalText.querySelector(`.preset-item[data-id="${p.id}"] .preset-avatar`) as HTMLElement
      if (el) renderAvatar(el, p.avatar, undefined)
    })

    const addAvatarEl = modalText.querySelector('#preset-add-avatar') as HTMLElement
    if (addAvatarEl) renderAvatar(addAvatarEl, newAvatar, undefined)

    modalText.querySelectorAll('.preset-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLButtonElement).dataset.id!
        currentPresets = currentPresets.filter((p) => p.id !== id)
        await savePresets(currentPresets)
        refreshContent()
      })
    })

    const addBtn = modalText.querySelector('#preset-add-btn') as HTMLButtonElement
    const addNameInput = modalText.querySelector('#preset-add-name') as HTMLInputElement
    const addAvatarBtn = modalText.querySelector('#preset-add-avatar') as HTMLElement

    if (addAvatarBtn) {
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = 'image/*'
      fileInput.style.display = 'none'
      fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          newAvatar = reader.result as string
          renderAvatar(addAvatarBtn, newAvatar, undefined)
        }
        reader.readAsDataURL(file)
      })
      addAvatarBtn.addEventListener('click', () => fileInput.click())
      modalText.appendChild(fileInput)
    }

    addBtn?.addEventListener('click', async () => {
      const name = addNameInput?.value.trim()
      if (!name) return
      currentPresets.push({ id: crypto.randomUUID(), name, avatar: newAvatar })
      await savePresets(currentPresets)
      newAvatar = AVATARS[0]
      refreshContent()
    })
  }

  showModal({
    icon: '👤',
    title: '常见玩家',
    html: '',
    buttons: [{ text: '关闭', className: 'btn-secondary', onClick: () => {} }],
  })
  refreshContent()
}

function renderPresetSelector(onSelect: (preset: PresetPlayer) => void) {
  loadPresets().then((presets) => {
    if (presets.length === 0) {
      showModal({
        icon: '👤',
        title: '常见玩家',
        text: '还没有保存的常见玩家，先去首页添加吧~',
        buttons: [{ text: '知道了', onClick: () => {} }],
      })
      return
    }

    showModal({
      icon: '👤',
      title: '选择常见玩家',
      html: presets.map((p) => `
        <div class="preset-item preset-selectable" data-id="${p.id}">
          <div class="preset-avatar"></div>
          <div class="preset-name">${p.name}</div>
        </div>
      `).join(''),
      buttons: [{ text: '取消', className: 'btn-secondary', onClick: () => {} }],
    })

    presets.forEach((p) => {
      const el = modalText.querySelector(`.preset-selectable[data-id="${p.id}"] .preset-avatar`) as HTMLElement
      if (el) renderAvatar(el, p.avatar, undefined)
    })

    modalText.querySelectorAll('.preset-selectable').forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.id!
        const preset = presets.find((p) => p.id === id)
        if (preset) {
          hideModal()
          onSelect(preset)
        }
      })
    })
  })
}

// ===================== 姓名输入 =====================

function renderNameInputs(count: number) {
  nameInputsEl.innerHTML = ''
  selectedAvatars = AVATARS.slice(0, count)
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div')
    row.className = 'name-input-row'

    const avatarEl = document.createElement('div')
    avatarEl.className = 'name-input-avatar'
    avatarEl.style.background = COLORS[i]
    avatarEl.textContent = AVATARS[i]
    avatarEl.style.cursor = 'pointer'

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.style.display = 'none'
    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        selectedAvatars[i] = dataUrl
        renderAvatar(avatarEl, dataUrl, COLORS[i])
      }
      reader.readAsDataURL(file)
    })

    avatarEl.addEventListener('click', () => fileInput.click())

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'name-input'
    input.id = `name-input-${i}`
    input.placeholder = NAMES[i]
    input.maxLength = 8
    input.value = NAMES[i]

    const selectBtn = document.createElement('button')
    selectBtn.className = 'btn-preset-select'
    selectBtn.textContent = '👤'
    selectBtn.title = '从常见玩家选择'
    selectBtn.addEventListener('click', () => {
      renderPresetSelector((preset) => {
        input.value = preset.name
        selectedAvatars[i] = preset.avatar
        renderAvatar(avatarEl, preset.avatar, COLORS[i])
      })
    })

    row.appendChild(avatarEl)
    row.appendChild(fileInput)
    row.appendChild(input)
    row.appendChild(selectBtn)
    nameInputsEl.appendChild(row)
  }
}

// ===================== 棋盘渲染 =====================

function getGridPosition(index: number): { row: number; col: number } {
  if (index <= 7) return { row: 5, col: index }
  if (index <= 11) return { row: 12 - index, col: 7 }
  if (index <= 19) return { row: 0, col: 19 - index }
  return { row: index - 19, col: 0 }
}

function renderBoard() {
  boardEl.innerHTML = ''
  const grid: (Cell | null)[][] = Array.from({ length: 6 }, () => Array(8).fill(null))

  CELLS.forEach((cell) => {
    const pos = getGridPosition(cell.id)
    grid[pos.row][pos.col] = cell
  })

  grid.forEach((row) => {
    row.forEach((cell) => {
      const el = document.createElement('div')
      el.className = 'cell'
      if (cell) {
        const corner = [0, 6, 12, 18].includes(cell.id)
        if (corner) el.classList.add('corner')
        if (cell.colorClass) el.classList.add(cell.colorClass)
        if (cell.type === 'chance') el.classList.add('special')

        const icon = document.createElement('div')
        icon.className = 'cell-icon'
        icon.textContent = cell.icon

        const name = document.createElement('div')
        name.className = 'cell-name'
        name.textContent = cell.name

        const price = document.createElement('div')
        price.className = 'cell-price'
        if (cell.price) price.textContent = formatMoney(cell.price)

        const ownerBar = document.createElement('div')
        ownerBar.className = 'cell-owner-bar'
        ownerBar.id = `owner-bar-${cell.id}`

        const tokens = document.createElement('div')
        tokens.className = 'player-tokens'
        tokens.id = `tokens-${cell.id}`

        el.appendChild(icon)
        el.appendChild(name)
        if (cell.price) el.appendChild(price)
        el.appendChild(ownerBar)
        el.appendChild(tokens)

        el.addEventListener('click', () => {
          if (cell.type === 'property' && cell.price && cell.rent) {
            const owner = players.find((p) => p.properties.includes(cell.id))
            const lines = [
              `购买价格：${formatMoney(cell.price)}`,
              `基础租金：${formatMoney(cell.rent[0])}`,
              `升级租金：${formatMoney(cell.rent[1])}`,
              `满级租金：${formatMoney(cell.rent[2])}`,
            ]
            if (owner) {
              lines.push(``, `当前地主：${owner.name}`)
            }
            showModal({
              icon: cell.icon,
              title: cell.name,
              text: lines.join('\n'),
              buttons: [{ text: '知道了', onClick: () => {} }],
            })
          }
        })
      }
      boardEl.appendChild(el)
    })
  })
}

function updateTokens() {
  CELLS.forEach((cell) => {
    const bar = document.querySelector<HTMLDivElement>(`#owner-bar-${cell.id}`)
    const tokensEl = document.querySelector<HTMLDivElement>(`#tokens-${cell.id}`)
    if (!bar || !tokensEl) return
    bar.innerHTML = ''
    tokensEl.innerHTML = ''

    const owners = new Set<number>()
    const levels = new Map<number, number>()
    players.forEach((p) => {
      const idx = p.properties.indexOf(cell.id)
      if (idx !== -1) {
        const group = CELLS.filter((c) => c.color === cell.color && c.type === 'property')
        const ownGroup = group.filter((c) => p.properties.includes(c.id)).length
        const lvl = ownGroup === 4 ? 2 : ownGroup >= 2 ? 1 : 0
        levels.set(p.id, lvl)
        owners.add(p.id)
      }
    })
    owners.forEach((pid) => {
      const player = players.find((p) => p.id === pid)
      if (!player) return
      const lvl = levels.get(pid) || 0
      const dot = document.createElement('div')
      dot.className = 'owner-dot'
      dot.style.background = player.color
      dot.style.boxShadow = `0 0 0 2px #fff`
      dot.title = `${player.name} 的 ${cell.name}${lvl > 0 ? '（' + ['普通', '升级', '满级'][lvl] + '）' : ''}`
      // 统一圆点外观，用边框粗细区分等级
      dot.style.borderWidth = `${lvl + 1}px`
      dot.style.borderColor = 'rgba(255,255,255,0.6)'
      bar.appendChild(dot)
    })

    players.forEach((p) => {
      if (p.position === cell.id) {
        const t = document.createElement('div')
        t.className = 'token'
        renderAvatar(t, p.avatar, undefined)
        t.style.borderColor = p.color
        tokensEl.appendChild(t)
      }
    })
    // Force reflow for WebKit to ensure tokens render
    if (tokensEl) tokensEl.offsetHeight
  })
}

function renderPlayers() {
  playersListEl.innerHTML = ''
  players.forEach((p, idx) => {
    const card = document.createElement('div')
    card.className = `player-card ${idx === currentPlayerIndex ? 'active' : ''}`

    const avatar = document.createElement('div')
    avatar.className = 'player-avatar'
    renderAvatar(avatar, p.avatar, p.color)

    const info = document.createElement('div')
    info.className = 'player-info'

    const name = document.createElement('div')
    name.className = 'player-name'
    name.textContent = p.name

    const money = document.createElement('div')
    money.className = 'player-money'
    money.textContent = formatMoney(p.money)

    info.appendChild(name)
    info.appendChild(money)
    card.appendChild(avatar)
    card.appendChild(info)
    playersListEl.appendChild(card)
  })
}

function updateCurrentPlayerBadge() {
  const p = players[currentPlayerIndex]
  renderAvatar(currentPlayerIcon, p.avatar, undefined)
  currentPlayerName.textContent = p.name
}

function setMessage(msg: string) {
  gameMessage.textContent = msg
}

// ===================== 游戏核心逻辑 =====================

function initGame(playerCount: number, customNames?: string[]) {
  players = Array.from({ length: playerCount }, (_, i) => ({
    id: i,
    name: customNames?.[i] || NAMES[i],
    avatar: selectedAvatars[i] || AVATARS[i],
    color: COLORS[i],
    money: START_MONEY,
    position: 0,
    properties: [],
    jailTurns: 0,
    isBankrupt: false,
  }))
  currentPlayerIndex = 0
  round = 1
  isAnimating = false
  pendingAction = null
  renderBoard()
  renderPlayers()
  updateTokens()
  updateCurrentPlayerBadge()
  roundDisplay.textContent = `1 / ${MAX_ROUNDS}`
  lastDiceEl.textContent = '-'
  btnRoll.disabled = false
  setMessage('点击掷骰子开始游戏！')
  showScreen('game')
}

async function rollDice(): Promise<number> {
  diceNumber.textContent = ''
  diceOverlay.classList.remove('hidden')
  playSound('roll')
  await sleep(600)
  const result = Math.floor(Math.random() * 6) + 1
  diceNumber.textContent = String(result)
  await sleep(400)
  diceOverlay.classList.add('hidden')
  return result
}

async function movePlayer(p: Player, steps: number) {
  for (let i = 0; i < steps; i++) {
    playSound('move')
    p.position = (p.position + 1) % BOARD_SIZE
    updateTokens()
    await sleep(250)
  }
}

function getUpgradeLevel(player: Player, cellId: number): number {
  const cell = CELLS[cellId]
  if (!cell || !cell.color) return 0
  const group = CELLS.filter((c) => c.color === cell.color && c.type === 'property')
  const ownCount = group.filter((c) => player.properties.includes(c.id)).length
  if (ownCount === 4) return 2
  if (ownCount >= 2) return 1
  return 0
}

function getRent(cell: Cell, owner: Player): number {
  if (!cell.rent) return 0
  const lvl = getUpgradeLevel(owner, cell.id)
  return cell.rent[lvl] || cell.rent[0]
}

async function doBankruptcyCheck() {
  const p = players[currentPlayerIndex]
  if (p.money < 0) {
    p.money = 0
    p.isBankrupt = true
  }
  renderPlayers()
}

async function endTurn() {
  await doBankruptcyCheck()
  currentPlayerIndex++
  if (currentPlayerIndex >= players.length) {
    currentPlayerIndex = 0
    round++
  }

  if (round > MAX_ROUNDS) {
    endGame()
    return
  }

  roundDisplay.textContent = `${round} / ${MAX_ROUNDS}`
  renderPlayers()
  updateCurrentPlayerBadge()
  btnRoll.disabled = false
  setMessage('轮到你了，点击掷骰子！')
}

async function endGame() {
  playSound('win')
  const ranking = players
    .map((p) => {
      const assetValue = p.properties.reduce((sum, cid) => {
        const cell = CELLS[cid]
        return sum + (cell.price || 0)
      }, 0)
      return { ...p, total: p.money + assetValue }
    })
    .sort((a, b) => b.total - a.total)

  // 保存冠军到排行榜
  if (ranking.length > 0) {
    const winner = ranking[0]
    await addToLeaderboard({
      name: winner.name,
      avatar: winner.avatar,
      total: winner.total,
      money: winner.money,
      assets: winner.total - winner.money,
      date: new Date().toISOString(),
    })
  }

  const list = document.querySelector<HTMLDivElement>('#ranking-list')!
  list.innerHTML = ''
  const medals = ['🥇', '🥈', '🥉', '🏅']
  ranking.forEach((p, idx) => {
    const item = document.createElement('div')
    item.className = 'rank-item'
    item.innerHTML = `
      <div class="rank-medal">${medals[idx]}</div>
      <div class="rank-avatar"></div>
      <div class="rank-info">
        <div class="rank-name">${p.name}</div>
        <div class="rank-assets">现金 ${formatMoney(p.money)} + 地产 ${formatMoney(p.total - p.money)} = ${formatMoney(p.total)}</div>
      </div>
    `
    const avatarEl = item.querySelector('.rank-avatar') as HTMLElement
    renderAvatar(avatarEl, p.avatar, undefined)
    list.appendChild(item)
  })

  showScreen('end')
}

async function handleProperty(cell: Cell) {
  const p = players[currentPlayerIndex]
  if (!cell.price || !cell.rent) return

  const owner = players.find((pl) => pl.properties.includes(cell.id))
  if (owner && owner.id !== p.id) {
    const rent = getRent(cell, owner)
    p.money -= rent
    owner.money += rent
    playSound('cash')
    setMessage(`走到 ${cell.name}，支付给 ${owner.name} 租金 ${formatMoney(rent)}`)
    renderPlayers()
    await sleep(800)
  } else if (!owner) {
    const price = cell.price ?? 0
    if (p.money >= price) {
      setMessage(`走到 ${cell.name}，按空格键购买！`)
      let resolvePurchase: (() => void) | null = null
      pendingAction = () => {
        p.money -= price
        p.properties.push(cell.id)
        playSound('cash')
        setMessage(`成功购买 ${cell.name}！`)
        renderPlayers()
        updateTokens()
        hideModal()
        if (resolvePurchase) resolvePurchase()
      }
      showModal({
        icon: cell.icon,
        title: `是否购买 ${cell.name}？`,
        text: `价格 ${formatMoney(price)}，租金 ${formatMoney(cell.rent?.[0] ?? 0)} 起。\n按空格键快速购买！`,
        buttons: [
          {
            text: '购买',
            className: 'btn-primary',
            onClick: () => {
              if (pendingAction) {
                pendingAction()
                pendingAction = null
              }
            },
          },
          {
            text: '不买',
            className: 'btn-secondary',
            onClick: () => {
              pendingAction = null
              hideModal()
              setMessage(`放弃了 ${cell.name}`)
              if (resolvePurchase) resolvePurchase()
            },
          },
        ],
      })
      await Promise.race([
        new Promise<void>((resolve) => { resolvePurchase = resolve }),
        sleep(10000)
      ])
      pendingAction = null
    } else {
      setMessage(`钱不够买 ${cell.name}，继续加油哦！`)
      await sleep(600)
    }
  } else {
    setMessage(`${cell.name} 是你自己的地盘，休息一下吧~`)
    await sleep(600)
  }
}

async function handleChance() {
  const p = players[currentPlayerIndex]
  const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)]
  p.money += card.value
  playSound('cash')
  setMessage(`抽到机会卡：${card.name}`)
  renderPlayers()
  await showModalAsync({
    icon: card.icon,
    title: card.name,
    text: card.desc,
    buttons: [{ text: '收下', value: true }],
  })
}

async function handleSpecial(cell: Cell) {
  const p = players[currentPlayerIndex]
  if (cell.type === 'goto_jail') {
    setMessage('哎呀！要去监狱休息一回合~')
    p.position = 6
    p.jailTurns = 1
    updateTokens()
    await sleep(600)
  } else if (cell.type === 'jail') {
    if (p.jailTurns > 0) {
      setMessage('在监狱里休息一回合~')
      p.jailTurns--
      await sleep(600)
    } else {
      setMessage('只是路过监狱，安全~')
      await sleep(400)
    }
  } else if (cell.type === 'free_parking') {
    setMessage('免费停车场！不用交钱，真开心~')
    await sleep(400)
  } else if (cell.type === 'start') {
    p.money += 200
    playSound('cash')
    setMessage('经过起点！获得奖励 200 元')
    renderPlayers()
    await sleep(400)
  }
}

async function playTurn() {
  if (isAnimating) return
  isAnimating = true
  btnRoll.disabled = true
  btnRoll.blur()
  gameScreen.focus()
  pendingAction = null

  const p = players[currentPlayerIndex]

  if (p.jailTurns > 0 && p.position === 6) {
    setMessage(`${p.name} 还在监狱休息，本回合跳过~`)
    await sleep(600)
    p.jailTurns--
    isAnimating = false
    endTurn()
    return
  }

  const dice = await rollDice()
  lastDiceEl.textContent = String(dice)

  await movePlayer(p, dice)

  const cell = CELLS[p.position]

  if (cell.type === 'property') {
    await handleProperty(cell)
  } else if (cell.type === 'chance') {
    await handleChance()
  } else {
    await handleSpecial(cell)
  }

  isAnimating = false
  endTurn()
}

// ===================== 事件绑定 =====================

document.querySelectorAll<HTMLButtonElement>('.btn-player').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedPlayerCount = parseInt(btn.dataset.count || '2', 10)
    renderNameInputs(selectedPlayerCount)
    showScreen('name')
  })
})

document.querySelector<HTMLButtonElement>('#btn-name-back')!.addEventListener('click', () => {
  showScreen('home')
})

document.querySelector<HTMLButtonElement>('#btn-name-start')!.addEventListener('click', () => {
  const names: string[] = []
  for (let i = 0; i < selectedPlayerCount; i++) {
    const input = document.querySelector<HTMLInputElement>(`#name-input-${i}`)
    const name = input?.value.trim() || NAMES[i]
    names.push(name)
  }
  initGame(selectedPlayerCount, names)
})

btnRoll.addEventListener('click', () => {
  playTurn()
})

function handleSpace(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault()
    if (e.repeat) return
    if (!gameScreen.classList.contains('active')) return
    if (!modal.classList.contains('hidden')) {
      const primaryBtn = modalButtons.querySelector('.btn-primary') as HTMLButtonElement | null
      if (primaryBtn) primaryBtn.click()
      return
    }
    if (pendingAction) {
      pendingAction()
      pendingAction = null
      return
    }
    if (!btnRoll.disabled && !isAnimating) {
      playTurn()
    }
  }
}

window.addEventListener('keydown', handleSpace)

document.querySelector<HTMLButtonElement>('#btn-restart')!.addEventListener('click', () => {
  renderNameInputs(selectedPlayerCount)
  showScreen('name')
})

document.querySelector<HTMLButtonElement>('#btn-end-home')!.addEventListener('click', () => {
  showScreen('home')
})

document.querySelector<HTMLButtonElement>('#btn-back')!.addEventListener('click', () => {
  showScreen('home')
})

btnRules.addEventListener('click', () => {
  rulesModal.classList.remove('hidden')
})

btnCloseRules.addEventListener('click', () => {
  rulesModal.classList.add('hidden')
})

rulesModal.addEventListener('click', (e) => {
  if (e.target === rulesModal) {
    rulesModal.classList.add('hidden')
  }
})

btnPresets.addEventListener('click', () => {
  renderPresetManager()
})

btnLeaderboard.addEventListener('click', async () => {
  await renderLeaderboard()
  showScreen('leaderboard')
})

document.querySelector<HTMLButtonElement>('#btn-leaderboard-back')!.addEventListener('click', () => {
  showScreen('home')
})

window.addEventListener('resize', () => {
  // 可在此做额外适配
})

// 初始显示首页
showScreen('home')
