module.exports = Object.freeze({
  identity: {
    nickname: ['[data-testid="user-name"]', '[class*="user-name"]', '[class*="nickname"]', '.name'],
    accountId: ['[data-user-id]', '[data-account-id]', '[class*="user-id"]', '[class*="account-id"]'],
    avatar: ['[data-testid="avatar"] img', '[class*="avatar"] img'],
  },
  account: {
    bio: ['[data-testid="bio"]', '[class*="desc"]', '[class*="bio"]'],
    nickname: ['[data-testid="user-name"]', '[class*="user-name"]', '[class*="nickname"]', '.name'],
    accountId: ['[data-user-id]', '[data-account-id]', '[class*="user-id"]', '[class*="account-id"]'],
    metricLabels: {
      followers: ['粉丝', '粉丝数'],
      following: ['关注', '关注数'],
      total_likes_and_saves: ['获赞与收藏', '获赞和收藏', '赞与收藏'],
      note_count: ['笔记', '笔记数', '作品数'],
    },
  },
  notes: {
    cards: ['[data-note-id]', '[data-testid="note-card"]', '[class*="note-card"]', '[class*="content-card"]'],
  },
});
