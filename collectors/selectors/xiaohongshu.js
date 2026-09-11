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
  noteDetail: {
    id: ['[data-note-id]', '[data-testid="note-detail"]'],
    title: ['h1', '[data-testid="note-title"]', '[class*="title"]'],
    publishTime: ['time', '[data-testid="publish-time"]', '[class*="publish-time"]'],
    body: ['[data-testid="note-content"]', '[class*="content"]', '[class*="desc"]'],
    metricLabels: {
      impressions: ['曝光', '曝光量'], views: ['观看', '浏览', '播放'], clicks: ['点击', '点击量'],
      likes: ['点赞', '赞'], saves: ['收藏'], comments: ['评论'], follows: ['涨粉', '新增粉丝', '关注'],
      profile_visits: ['主页访问', '主页访客'], dms: ['私信', '私信咨询'], leads: ['线索', '留资'],
    },
  },
});
