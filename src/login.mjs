import fs from 'fs'
import xvfb from 'xvfb'
import util from 'util'
import dotenv from 'dotenv'
import * as webdriver from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/chrome.js'
import { parse, stringify } from 'envfile'
import { ApiClient, KakaoLinkClient } from 'node-kakaolink'

import logger from './logger.mjs'

dotenv.config();

const client = new KakaoLinkClient();

const login = {
  siteLogin: async function() {
    const display = new xvfb();
    display.startSync();

    const options = await new Options().addArguments(['--incognito', '--no-sandbox']);
    const driver = await new webdriver.Builder().forBrowser('chrome').setChromeOptions(options).build();

    try{
      await driver.get('https://www.ajou.ac.kr/_custom/ajou/_app/sso/login_oia.jsp');
      await driver.findElement(webdriver.By.id('userId')).sendKeys(process.env.ajouLoginId);
      await driver.findElement(webdriver.By.id('password')).sendKeys(process.env.ajouLoginPw);
      await driver.findElement(webdriver.By.id('loginSubmit')).click();
      await delay(3000);
      
      const JSESSIONID = await driver.manage().getCookie('JSESSIONID');
      process.env.JSESSIONID = JSESSIONID.value;
      let envFile = parse(fs.readFileSync('./.env'));
      envFile.JSESSIONID = JSESSIONID.value;
      fs.writeFileSync('./.env', stringify(envFile));
      logger.info('Session login success.', { JSESSIONID: process.env.JSESSIONID });
    } catch(e) { 
      logger.error('Session login failure', { data: util.format(e) });
    } finally { 
      display.stopSync();
      driver.quit();
    }
  },
  kakaoLogin: async function() {
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
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export { login, client }