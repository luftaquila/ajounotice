import fs from 'fs'
import util from 'util'
import dotenv from 'dotenv'
import moment from 'moment'
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
  let latest = JSON.parse(process.env.latest); // load latest notice

  scheduledCrawlerJob(); // do first crawl job
  schedule.scheduleJob('*/5 9-19 * * 1-5', scheduledCrawlerJob); // crawl every 5 minutes
  
  async function scheduledCrawlerJob() {
    try {
      // weather alert and academic calendar notification at 9am
      if(moment().hour() == 9 && moment().minute() == 0) crawler.alert();

      const notices = await crawler.crawl(); // crawl notices

      // check if session cookie is expired
      if(Number(latest.index) > Number(notices[notices.length - 1].index) && latest.title != notices[notices.length - 1].title) throw new SessionExpiredError('Session expired');

      // compare result with latest before  
      for(const notice of notices) {
        if(Number(latest.articleNo) < Number(notice.articleNo)) {
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
        await login.siteLogin();
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