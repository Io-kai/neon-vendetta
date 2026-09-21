/** Small, defensive local casebook. Storage failure never prevents play. */
export interface StoryProgress { unlocked: number; endings: string[] }
const KEY = 'neon-vendetta.casebook.v3';
const VALID_ENDINGS = ['back-on'];
let session: StoryProgress = { unlocked: 0, endings: [] };
export function readProgress(): StoryProgress {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (value && Number.isInteger(value.unlocked) && value.unlocked >= 0 && value.unlocked <= 6 && Array.isArray(value.endings)) {
      session = { unlocked: Math.max(session.unlocked, value.unlocked), endings: [...new Set([...session.endings, ...value.endings.filter((e: unknown) => typeof e === 'string' && VALID_ENDINGS.includes(e))])] };
    }
  } catch { /* Private browsing or malformed saves: keep the in-memory casebook. */ }
  return { unlocked: session.unlocked, endings: [...session.endings] };
}
export function unlockStory(chapter: number, ending?: string): StoryProgress {
  const previous = readProgress();
  session = { unlocked: Math.max(previous.unlocked, Math.min(6, Math.max(0, chapter))), endings: previous.endings };
  if (ending && VALID_ENDINGS.includes(ending) && !session.endings.includes(ending)) session.endings.push(ending);
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* Nonessential persistence. */ }
  return readProgress();
}
