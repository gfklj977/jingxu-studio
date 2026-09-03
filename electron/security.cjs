const allowedPublishHosts = new Set(['creator.douyin.com', 'creator.xiaohongshu.com', 'channels.weixin.qq.com'])

function isAllowedPublishUrl(value) {
  try { return new URL(value).protocol === 'https:' && allowedPublishHosts.has(new URL(value).hostname) } catch { return false }
}

module.exports = { isAllowedPublishUrl }
