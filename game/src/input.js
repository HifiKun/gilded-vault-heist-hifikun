// Keyboard + mouse input. WASD / arrows move, Shift sneaks, P pauses,
// M mutes, R restarts, Enter / Space confirms on menus. Clicking also works
// on the menu buttons (the canvas reports the click position).
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;

  function keyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.key.toLowerCase());
    if (e.key === ' ' || e.key === 'Enter') actions |= ACTION_CONFIRM;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') actions |= ACTION_PAUSE;
    if (e.key === 'm' || e.key === 'M') actions |= ACTION_MUTE;
    if (e.key === 'r' || e.key === 'R') actions |= ACTION_RESTART;
  }
  function keyUp(e) {
    keys.delete(e.key.toLowerCase());
  }
  function mouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    click = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
    actions |= ACTION_CONFIRM;
  }
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousedown', mouseDown);

  return {
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return { x, y, sneak: keys.has('shift') };
    },
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    takeClick() {
      const c = click;
      click = null;
      return c;
    },
    detach() {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('mousedown', mouseDown);
    },
  };
}
