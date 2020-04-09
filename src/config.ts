export default {
  albion: {
    apiBaseUrl: process.env.ALBION_API_BASE || 'https://gameinfo.albiononline.com/api/gameinfo'
  },
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    playingGame: process.env.DISCORD_PLAYING_GAME || 'Albion Online',
    username: process.env.DISCORD_PLAYING_GAME || 'ao-bot',
    admins: `${process.env.DISCORD_ADMINS}`.split(',') || []
  }
};
