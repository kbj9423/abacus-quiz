// 같이하기: Firestore 방(abacus-rooms/{방 코드})에서 같은 문제를 함께 푼다. 같은 Firebase 프로젝트를 다른 게임들과 함께 쓴다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot, runTransaction, serverTimestamp, Timestamp,
  collection, query, where, limit, getDocs }
  from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDezOLAjvNULnBgCxunb2u1cjqrAIqtQEs",
  authDomain: "arrowgame-e9ac7.firebaseapp.com",
  projectId: "arrowgame-e9ac7",
  storageBucket: "arrowgame-e9ac7.firebasestorage.app",
  messagingSenderId: "1023234573327",
  appId: "1:1023234573327:web:8c11439fdd39dfd3130f7a"
});
const auth = getAuth(app), db = getFirestore(app);
const ROOMS = "abacus-rooms";
const WIN = 3;
const room = code => doc(db, ROOMS, code);
const empty = () => ({host: null, guest: null});

const authReady = new Promise((resolve, reject) => {
  onAuthStateChanged(auth, user => { if (user) resolve(user); });
  signInAnonymously(auth).catch(reject);
});

// 공용 비속어 필터 (app-config/profanity-words)
let badWords = null;
const normalize = t => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
export async function containsProfanity(text){
  if (!badWords) {
    try {
      const snap = await getDoc(doc(db, "app-config", "profanity-words"));
      badWords = snap.exists() ? (snap.data().words || []) : [];
    } catch (e) { badWords = []; }
  }
  return badWords.some(w => normalize(text).includes(normalize(w)));
}

async function uid(){ return (await authReady).uid; }

// 1시간 지난 방을 몇 개씩 지운다. 창을 그냥 닫아 남은 방을 정리하는 용도라 실패해도 넘어간다.
async function cleanup(){
  const old = await getDocs(query(collection(db, ROOMS), where("expireAt", "<", Timestamp.now()), limit(20)));
  await Promise.all(old.docs.map(d => deleteDoc(d.ref)));
}

// 방 만들기: 비어 있는 네 자리 코드를 골라 방을 연다. 1시간 뒤 정리되도록 expireAt 을 넣는다.
export async function create(name, level){
  const me = await uid();
  cleanup().catch(() => {});
  for (;;) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if ((await getDoc(room(code))).exists()) continue;
    await setDoc(room(code), {host: me, hostName: name, guest: null, guestName: "", status: "waiting", level,
      match: 0, round: 0, nums: [], ans: empty(), result: "", score: {host: 0, guest: 0}, winner: "",
      createdAt: serverTimestamp(), expireAt: Timestamp.fromMillis(Date.now() + 3600 * 1000)});
    return code;
  }
}

// 방 들어가기: 기다리는 방이면 손님으로 들어가 첫 문제를 낸다. 실패하면 이유를 글로 돌려준다.
export async function join(code, name, makeNums){
  const me = await uid();
  return runTransaction(db, async t => {
    const r = (await t.get(room(code))).data();
    // 지난 방은 다음에 누가 방을 만들 때 지워지므로, 그 전까지는 없는 방으로 본다
    if (!r || r.expireAt.toMillis() < Date.now()) return "그런 방이 없어요.";
    if (r.host === me) return "내가 만든 방이에요.";
    if (r.status !== "waiting") return "이미 시작한 방이에요.";
    t.update(room(code), {guest: me, guestName: name, status: "playing", round: 1, nums: makeNums(r.level)});
    return "";
  });
}

export const watch = (code, fn) => onSnapshot(room(code), snap => fn(snap.exists() ? snap.data() : null));

// 답 내기 (v=정답 숫자 또는 시간 초과면 null, t=걸린 시간). 두 번째 답이 들어오면 이 판의 승패를 정한다.
// 맞힌 사람 중 빠른 사람이 이기고, 둘 다 틀리면 무승부(점수 없음)
export async function answer(code, me, match, round, v, t){
  return runTransaction(db, async tr => {
    const r = (await tr.get(room(code))).data();
    if (!r || r.status !== "playing" || r.match !== match || r.round !== round || r.ans[me] || r.result) return;
    const ans = {...r.ans, [me]: {v, t}}, next = {ans};
    if (ans.host && ans.guest) {
      const sum = r.nums.reduce((a, b) => a + b, 0), ok = s => ans[s].v === sum;
      let result = "draw";
      if (ok("host") && ok("guest")) result = ans.host.t < ans.guest.t ? "host" : ans.guest.t < ans.host.t ? "guest" : "draw";
      else if (ok("host")) result = "host";
      else if (ok("guest")) result = "guest";
      next.result = result;
      if (result !== "draw") {
        const score = {...r.score, [result]: r.score[result] + 1};
        next.score = score;
        if (score[result] >= WIN) Object.assign(next, {status: "over", winner: result});
      }
    }
    tr.update(room(code), next);
  });
}

// 다음 문제: 이 판의 승패가 정해졌을 때 한 번만 넘어간다
export async function next(code, match, round, nums){
  return runTransaction(db, async t => {
    const r = (await t.get(room(code))).data();
    if (r && r.status === "playing" && r.match === match && r.round === round && r.result)
      t.update(room(code), {round: round + 1, nums, ans: empty(), result: ""});
  });
}

// 다시 하기: 점수를 지우고 새 대결을 시작한다
export async function rematch(code, nums){
  return runTransaction(db, async t => {
    const r = (await t.get(room(code))).data();
    if (r && r.status === "over") t.update(room(code), {status: "playing", match: r.match + 1, round: 1, nums,
      ans: empty(), result: "", score: {host: 0, guest: 0}, winner: ""});
  });
}

export const remove = code => deleteDoc(room(code));
