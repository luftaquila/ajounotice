import util from 'util'
import https from 'https'
import axios from 'axios'
import dotenv from 'dotenv'
import cheerio from 'cheerio'

import logger from './logger.mjs'
import { client } from './login.mjs'

dotenv.config();

const crawler = {
  // axios config
  config: function(JSESSIONID) {
    return { 
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'Host': 'www.ajou.ac.kr',
        'Cookie': `kr-month=Y; kr-day=Y; kr-30min=Y; locale=ko; JSESSIONID=${JSESSIONID};`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4693.2 Safari/537.36'
      }
    }
  },
  crawl: async function() {
    try {
      // get recent 10 articles from website
      const res = await axios.get(process.env.noticeUrl, this.config(process.env.JSESSIONID));
      const $ = cheerio.load(res.data.replace(/\s\s+/g, ' '));
      let data = [];

      // iterate through each article
      $('table.board-table tbody tr').each((i, tr) => {
        const row = {};
        $('td', tr).each((i, td) => { // iterate through each td
          switch(i) {
            case 0:
              row.index = $(td).text().trim();
              break;

            case 1:
              row.category = $(td).text().trim();
              break;

            case 2:
              row.title = $('a', td).text().trim();
              row.articleNo = $('a', td).attr('href').match(/articleNo=([^&]*)/)[1];
              break;

            case 4:
              row.dep = $(td).text().trim();
              break;
          }
        });
        data.push(row);
      });
      
      logger.info('Crawling success', { data: util.format(data) });
      return data.reverse(); // make older article go first
    }
    catch(e) { logger.error('Crawling failure', { data: util.format(e) }) }
  },

  send: async function(notice) {
    try {
      const articleUrl = `https://www.ajou.ac.kr/kr/ajou/notice.do?mode=view&articleNo=${notice.articleNo}`;

      // get target article image url
      const res = await axios.get(articleUrl, this.config);
      const $ = cheerio.load(res.data.replace(/\s\s+/g, ' '));
      const img = $('img', $('div.b-content-box')).attr('src');
      notice.image = img ? `https://www.ajou.ac.kr/${img}` : 'https://luftaquila.io/ajounotice/logo.png';

      // send message
      const message = await client.sendLink(process.env.kakaoChatroomName, {
        link_ver: '4.0',
        template_id: Number(process.env.kakaoLinkTemplateId),
        template_args: { 
          title: notice.title,
          desc: `${notice.category}/${notice.dep}`,
          link: articleUrl.replace('https://www.ajou.ac.kr/', ''),
          altlink: `ajounotice?url=${encodeURIComponent(articleUrl)}`,
          image: notice.image
        }
      }, 'custom');

      logger.info('Notice sent.', { data: util.format(message) });
    }
    catch(e) { logger.error('Notice send failure.', { data: util.format(e) }) }
  }
}

export default crawler