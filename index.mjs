import fs from 'fs'
import util from 'util'
import dotenv from 'dotenv'
import { parse, stringify } from 'envfile'
import schedule from 'node-schedule'

import logger from './src/logger.mjs'
import crawler from './src/crawler.mjs'
import { login, client } from './src/login.mjs'

dotenv.config();

init();

async function init() {
  logger.info('Program startup.');
  await login.siteLogin();
  await login.kakaoLogin();
  main();
}

async function main() {
  // load latest notice
  let latest = JSON.parse(process.env.latest);

  // do very first crawl job
  scheduledCrawlerJob();
  
  // crawl every 5 minutes
  schedule.scheduleJob('*/5 7-20 * * 1-5', scheduledCrawlerJob);

  async function scheduledCrawlerJob() {
    try {
      const notices = await crawler.crawl(); // crawl notices

      // check if session cookie is expired
      if(latest.index > notices[notices.length - 1].index) throw new SessionExpiredError('Session expired');

      // compare result with latest before
      for(const notice of notices) {
        if(latest.articleNo < notice.articleNo) {
          crawler.send(notice); // send message
          await delay(1000);
        }
      }

       // update latest
      latest = notices[notices.length - 1];
      let envFile = parse(fs.readFileSync('./.env'));
      envFile.latest = JSON.stringify(latest);
      fs.writeFileSync('./.env', stringify(envFile));
    } catch(e) {
      if(e instanceof SessionExpiredError) {
        logger.info('Session expired.');
        await siteLogin();
        scheduledCrawlerJob();
      }
      else logger.error('Scheduled job failure', { data: util.format(e) });
    } // end catch
  }
}

class SessionExpiredError extends Error {
  constructor(args) {
    super(args);
    this.name = 'SessionExpiredError'
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default client