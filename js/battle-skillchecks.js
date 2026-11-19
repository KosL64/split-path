// Circular checks share one timer and lock the turn until the sequence finishes.
const skillCheckSettings = { duration: 900, centerWindow: 0.12, perfectWindow: 0.035, lifeStealCount: 3 };
let activeSkillCheck = null;
let skillCheckTimer = null;

function clearSkillChecks() {
  window.clearTimeout(skillCheckTimer);
  skillCheckTimer = null;
  activeSkillCheck = null;
  document.querySelector('#battle-skillcheck').classList.add('hidden');
  document.querySelector('#skillcheck-hit').disabled = true;
}

function startSkillChecks(kind, count, complete) {
  clearSkillChecks();
  activeSkillCheck = { kind, count, index: 0, bonuses: [], enemy: activeEnemy, complete };
  openSkillCheck();
}

function openSkillCheck() {
  const check = activeSkillCheck;
  if (!check || currentScreen !== 'battle' || check.enemy !== activeEnemy || activeEnemy.restored) {
    clearSkillChecks();
    return;
  }
  const overlay = document.querySelector('#battle-skillcheck');
  const button = document.querySelector('#skillcheck-hit');
  overlay.classList.remove('hidden');
  overlay.classList.toggle('life-steal-check', check.kind === 'lifeSteal');
  const bounds = overlay.getBoundingClientRect();
  const padding = 64;
  const x = check.kind === 'heal' ? bounds.width / 2 : padding + Math.random() * Math.max(0, bounds.width - padding * 2);
  const y = check.kind === 'heal' ? Math.max(padding, bounds.height * 0.3)
    : padding + Math.random() * Math.max(0, bounds.height * 0.7 - padding * 2);
  button.style.left = `${x}px`;
  button.style.top = `${y}px`;
  button.style.setProperty('--check-duration', `${skillCheckSettings.duration}ms`);
  document.querySelector('#skillcheck-label').textContent = `${check.kind === 'heal' ? 'Heal' : 'Life Steal'} ${check.index + 1}/${check.count}`;
  button.disabled = false;
  button.classList.remove('circle-running');
  void button.offsetWidth;
  check.startedAt = performance.now();
  check.deadline = check.startedAt + skillCheckSettings.duration;
  button.classList.add('circle-running');
  skillCheckTimer = window.setTimeout(() => resolveSkillCheck(0), skillCheckSettings.duration);
}

function submitSkillCheck() {
  const check = activeSkillCheck;
  if (!check || currentScreen !== 'battle' || performance.now() >= check.deadline) return;
  const position = (performance.now() - check.startedAt) / skillCheckSettings.duration;
  const distance = Math.abs(position - 0.5);
  resolveSkillCheck(distance <= skillCheckSettings.perfectWindow ? 0.25
    : distance <= skillCheckSettings.centerWindow ? 0.2 : 0);
}

function resolveSkillCheck(bonus) {
  const check = activeSkillCheck;
  if (!check) return;
  window.clearTimeout(skillCheckTimer);
  if (currentScreen !== 'battle' || check.enemy !== activeEnemy || activeEnemy.restored) {
    clearSkillChecks();
    return;
  }
  check.bonuses.push(bonus);
  check.index += 1;
  if (check.index < check.count) {
    openSkillCheck();
    return;
  }
  const average = check.bonuses.reduce((sum, value) => sum + value, 0) / check.count;
  const complete = check.complete;
  clearSkillChecks();
  complete(average);
}
