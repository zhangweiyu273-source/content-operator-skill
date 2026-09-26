const ID_KEYS = ['note_id', 'noteId', 'note_id_str', 'noteIdStr'];
const TITLE_KEYS = ['title', 'note_title', 'noteTitle', 'display_title', 'displayTitle'];
const TIME_KEYS = ['publish_time', 'publishTime', 'publish_time_str', 'publishTimeStr', 'post_time', 'postTime', 'create_time', 'createTime'];
const URL_KEYS = ['note_url', 'noteUrl', 'url', 'jump_url', 'jumpUrl'];
const COVER_KEYS = ['cover', 'cover_url', 'coverUrl', 'image', 'image_url', 'imageUrl'];
const METRIC_KEYS = {
  views: ['views', 'view_count', 'viewCount', 'read_count', 'readCount', 'play_count', 'playCount'],
  likes: ['likes', 'like_count', 'likeCount', 'liked_count', 'likedCount'],
  saves: ['saves', 'save_count', 'saveCount', 'collect_count', 'collectCount', 'collected_count', 'collectedCount'],
  comments: ['comments', 'comment_count', 'commentCount'],
};

function first(object, keys) {
  for (const key of keys) if (object[key] !== undefined && object[key] !== null && object[key] !== '') return object[key];
  return null;
}

function scalar(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object') return first(value, ['url', 'src', 'value', 'count']);
  return null;
}

function validNoteId(value) {
  return typeof value === 'string' || typeof value === 'number'
    ? /^[A-Za-z0-9_-]{6,200}$/.test(String(value).trim())
    : false;
}

function noteCandidate(object, path = '') {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return null;
  const explicitId = first(object, ID_KEYS);
  const genericId = object.id;
  const title = scalar(first(object, TITLE_KEYS));
  const publishTime = scalar(first(object, TIME_KEYS));
  const noteUrl = scalar(first(object, URL_KEYS));
  const cover = scalar(first(object, COVER_KEYS));
  const metrics = Object.fromEntries(Object.entries(METRIC_KEYS).map(([name, keys]) => [name, scalar(first(object, keys))]));
  const metricCount = Object.values(metrics).filter(value => value !== null).length;
  const noteContext = /(?:^|[.[\]/_-])(notes?|items?|contents?|posts?|works?)(?:$|[.[\]/_-])/i.test(path)
    || /(?:note|publish|explore)/i.test(String(noteUrl || ''));
  const corroboration = [title, publishTime, noteUrl, cover].filter(value => value !== null).length + metricCount;
  const id = explicitId ?? (noteContext && title && (publishTime || metricCount || noteUrl) ? genericId : null);
  if (!validNoteId(id) || corroboration < 1) return null;
  if (explicitId === null && !(title && (publishTime || metricCount || noteUrl))) return null;
  return {
    note_id: String(id).trim(), note_url: noteUrl, title, publish_time: publishTime, cover,
    status: scalar(first(object, ['status', 'note_status', 'noteStatus', 'audit_status', 'auditStatus'])),
    views: metrics.views, likes: metrics.likes, saves: metrics.saves, comments: metrics.comments,
  };
}

function mergeRaw(base, incoming) {
  const output = { ...(base || {}) };
  for (const [key, value] of Object.entries(incoming || {})) if (value !== null && value !== undefined && value !== '') output[key] = value;
  return output;
}

function extractNotePayload(payload) {
  const notes = new Map();
  const pagination = [];
  const seen = new Set();
  function visit(value, path = '$', depth = 0) {
    if (!value || typeof value !== 'object' || depth > 40 || seen.has(value)) return;
    seen.add(value);
    if (!Array.isArray(value)) {
      const candidate = noteCandidate(value, path);
      if (candidate) notes.set(candidate.note_id, mergeRaw(notes.get(candidate.note_id), candidate));
      const page = {};
      for (const key of ['cursor', 'next_cursor', 'nextCursor', 'has_more', 'hasMore', 'page', 'page_num', 'pageNum', 'total']) {
        if (value[key] !== undefined && (typeof value[key] !== 'object' || value[key] === null)) page[key] = value[key];
      }
      if (Object.keys(page).length) pagination.push({ path, ...page });
    }
    if (Array.isArray(value)) value.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
    else for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`, depth + 1);
  }
  visit(payload);
  return { notes: [...notes.values()], pagination };
}

module.exports = { extractNotePayload, noteCandidate, validNoteId };
