module.exports = Object.freeze({
  identity: {
    root: ['.home-card-wrapper .personal .base', '.user-info .name-box', '[data-testid="account-profile"]'],
    nickname: ['.home-card-wrapper .personal .base .account-name', '.user-info .name-box', '[data-testid="user-name"]', '[class*="user-name"]', '[class*="nickname"]', '.name'],
    accountId: ['.home-card-wrapper .personal .base .others.description-text', '[data-user-id]', '[data-account-id]', '[class*="user-id"]', '[class*="account-id"]'],
    avatar: ['.home-card-wrapper .personal .base .avatar img', '.user-info img.user_avatar', '[data-testid="avatar"] img', '[class*="avatar"] img'],
  },
  account: {
    metricsRoot: ['.home-card-wrapper .personal .base .static.description-text', '[data-testid="account-metrics"]'],
    bio: ['.home-card-wrapper .personal .base .others.description-text > div:last-child', '[data-testid="bio"]', '[class*="bio"]'],
    nickname: ['.home-card-wrapper .personal .base .account-name', '[data-testid="user-name"]', '[class*="user-name"]', '[class*="nickname"]', '.name'],
    accountId: ['.home-card-wrapper .personal .base .others.description-text', '[data-user-id]', '[data-account-id]', '[class*="user-id"]', '[class*="account-id"]'],
    metricLabels: {
      followers: ['粉丝数', '粉丝'],
      following: ['关注数', '关注'],
      total_likes_and_saves: ['获赞与收藏', '获赞和收藏', '赞与收藏'],
      note_count: ['笔记', '笔记数', '作品数'],
    },
  },
  notes: {
    cards: ['[data-note-id]', '[data-testid="note-card"]', '[class*="note-card"]', '[class*="content-card"]'],
  },
  noteDetail: {
    root: ['.note-overview-card', '[data-testid="note-detail"]', '[data-note-id]'],
    id: ['[data-note-id]', '[data-testid="note-detail"]'],
    title: ['.note-overview-card .note-title', '[data-testid="note-title"]'],
    publishTime: ['.note-overview-card .publish-time', '[data-testid="publish-time"]', 'time[datetime]'],
    body: ['[data-testid="note-content"]', '.note-overview-card .note-content', '.note-overview-card .note-desc'],
    metricLabels: {
      impressions: ['曝光数', '曝光量'], views: ['观看数', '浏览数', '播放数'], clicks: ['点击数', '点击量'],
      likes: ['点赞数'], saves: ['收藏数'], comments: ['评论数'], follows: ['涨粉数', '新增粉丝'],
      profile_visits: ['主页访问', '主页访客'], dms: ['私信', '私信咨询'], leads: ['线索', '留资'],
    },
  },
});
