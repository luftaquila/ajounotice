import util from 'util'
import dotenv from 'dotenv'
import schedule from 'node-schedule'
import { ApiClient, KakaoLinkClient } from 'node-kakaolink'

import logger from './logger.mjs'
import crawler from './crawler.mjs'

dotenv.config();

const client = new KakaoLinkClient();
init();

async function init() {
  logger.info('Program startup.');
  await login();

  main();
}

async function login() {
  // KakaoLink Login for messaging
  try {
    const api = await ApiClient.create(process.env.kakaoDevJavascriptKey, process.env.kakaoDevWebPlatform);
    const res = await api.login({ email: process.env.kakaoLoginId, password: process.env.kakaoLoginPw, keeplogin: true });
    if(!res.success) throw new Error(`Kakaolink Login failure: ${util.format(res)}`);
    await client.login(res.result);
    
    logger.info('Kakaolink Login success.', { data: res });
  }
  catch(e) { logger.error('Kakaolink Login failure.', { data: util.format(e) }) }
}

async function main() {
  // latest notice found before
  let latest = { index: null, category: null, title: null, dep: null, articleNo: null };
  
  // crawl every 5 minutes
  schedule.scheduleJob('*/5 7-22 * * *', async () => {
    try {
      // crawl notices
      const notices = await crawler.crawl();

      // compare result with latest before
      for(const notice of notices) {
        if(latest.articleNo && latest.articleNo < notice.articleNo) {
          crawler.send(notice); // send message
          await delay(1000);
        }
      }

      // update latest
      latest = notices[notices.length - 1];

      logger.info('Crawling success', { data: util.format(latest) });
    }
    catch(e) { logger.error('Crawling failure', { data: util.format(e) }) }
  });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default client