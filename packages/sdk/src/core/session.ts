const SESSION_STORAGE_KEY = '__fe_obs_session_id__';

/**
 * 生成 UUID v4 格式的会话 ID
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * 从 sessionStorage 读取已有会话 ID
 */
function readStoredSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * 将会话 ID 持久化到 sessionStorage
 */
function persistSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // sessionStorage 不可用时静默忽略
  }
}

/**
 * 获取或创建会话 ID
 * 同一会话标签页内复用已有 ID
 */
export function getOrCreateSessionId(): string {
  const existing = readStoredSessionId();
  if (existing) {
    return existing;
  }

  const sessionId = generateUUID();
  persistSessionId(sessionId);
  return sessionId;
}

/**
 * 重置会话 ID（主要用于测试）
 */
export function resetSessionId(): string {
  const sessionId = generateUUID();
  persistSessionId(sessionId);
  return sessionId;
}
