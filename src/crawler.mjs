import fs from 'fs'
import util from 'util'
import https from 'https'
import axios from 'axios'
import dotenv from 'dotenv'
import moment from 'moment'
import cheerio from 'cheerio'
import ssl from 'ssl-root-cas'

import logger from './logger.mjs'
import { client } from './login.mjs'

dotenv.config();

https.globalAgent.options.ca = ssl.create();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
      const res = await axios.get(`https://www.ajou.ac.kr/kr/ajou/notice.do;jsessionid=${process.env.JSESSIONID}?mode=list&&articleLimit=10`, this.config(process.env.JSESSIONID));
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
        if(isNaN(row.index)) return; // skip if index is not a number
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
      const loginedArticleUrl = `https://www.ajou.ac.kr/kr/ajou/notice.do;jsessionid=${process.env.JSESSIONID}?mode=view&articleNo=${notice.articleNo}`;

      // get target article image url
      const res = await axios.get(loginedArticleUrl, this.config(process.env.JSESSIONID));
      const $ = cheerio.load(res.data.replace(/\s\s+/g, ' '));
      const img = $('img', $('div.b-content-box')).attr('src');
      notice.image = img ? `https://www.ajou.ac.kr/${img}` : 'https://luftaquila.io/ajounotice/assets/logo.png';

      const content = $.html($('div.b-content-box'));
      fs.writeFile(`./assets/articles/${notice.articleNo}`, content, () => {});
      
      // send message
      const message = await client.sendLink(process.env.kakaoChatroomName, {
        link_ver: '4.0',
        template_id: Number(process.env.kakaoLinkTemplateId),
        template_args: { 
          title: notice.title,
          desc: `${notice.category}/${notice.dep}`,
          link: articleUrl.replace('https://www.ajou.ac.kr/', ''),
          altlink: `ajounotice?url=${encodeURIComponent(articleUrl)}&articleNo=${notice.articleNo}`,
          image: notice.image
        }
      }, 'custom');

      logger.info('Notice sent.', { data: util.format(message) });
    }
    catch(e) {
      logger.error('Notice send failure.', { data: util.format(e) });
      throw new Error(e);
    }
  },

  alert: async function() {
    // weather alert
    const weather = await axios.get(`https://ajoumeow.luftaquila.io/res/weather.json`);
    const pm10stat =  Number(weather.data.current.dust.pm10) > 30 ? Number(weather.data.current.dust.pm10) > 80 ? Number(weather.data.current.dust.pm10) > 150 ? '🔴매우 나쁨' : '🟡나쁨' : '🟢보통' : '🔵좋음';
    const pm25stat = Number(weather.data.current.dust.pm25) > 15 ? Number(weather.data.current.dust.pm25) > 35 ? Number(weather.data.current.dust.pm25) > 75 ? '🔴매우 나쁨' : '🟡나쁨' : '🟢보통' : '🔵좋음';

    const weatherMessage = await client.sendLink(process.env.kakaoChatroomName, {
      link_ver: '4.0',
      template_id: 67692,
      template_args: { 
        temp: `${weather.data.current.temp}℃`,
        tempSense: `${weather.data.current.tempSense}℃`,
        pm10: `${weather.data.current.dust.pm10}㎍/㎥, ${pm10stat}`,
        pm25: `${weather.data.current.dust.pm25}㎍/㎥, ${pm25stat}`,
        weatherName: `${weather.data.current.weather}`,
        weatherIcon: `https://luftaquila.io/ajounotice/assets/icons/weather/${weather.data.current.icon}.png`
      }
    }, 'custom');
    
    await delay(1000);

    // calendar alert
    let payload = {}, index = 1;
    const today = moment();
    const calendar = await axios.post(`https://mportal.ajou.ac.kr/portlet/p019/p019List.ajax`, { yyyymm: today.format('YYYYMM') });

    for(const item of calendar.data.p019List) {
      if(today.isSameOrAfter(item.startDt) && today.isSameOrBefore(moment(item.endDt).add(1, 'days'))) {
        payload[`title${index}`] = item.info;
        payload[`desc${index}`] = moment(item.startDt).format(`M월 D일(${item.startDay})`) + ' ~ ' + moment(item.endDt).format(`M월 D일(${item.endDay})`);
        index++;
      }
    }

    if(payload.title1) { // only if there is at least one content
      const calendarMessage = await client.sendLink(process.env.kakaoChatroomName, {
        link_ver: '4.0',
        template_id: 67695,
        template_args: payload
      }, 'custom');
    }
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default crawler