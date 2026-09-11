module.exports = Object.freeze({
  identity: {
    nickname: ['[data-testid="user-name"]', '[class*="user-name"]', '[class*="nickname"]', '.name'],
    accountId: ['[data-user-id]', '[data-account-id]', '[class*="user-id"]', '[class*="account-id"]'],
    avatar: ['[data-testid="avatar"] img', '[class*="avatar"] img'],
  },
  account: {
    bio: ['[data-testid="bio"]', '[class*="desc"]', '[class*="bio"]'],
  },
  notes: {
    cards: ['[data-note-id]', '[data-testid="note-card"]', '[class*="note-card"]', '[class*="content-card"]'],
  },
});
