# ajounotice
아주대학교 공지사항을 크롤링해 카카오톡 오픈채팅방에 전달하는 봇입니다.

## Prerequisites
* `node` >= v12.0.0

## Installation
```Shell
git clone https://github.com/luftaquila/ajounotice.git
cd ajounotice
npm install
```
## Setup
1. Rename `example.env` to `.env`
2. Set `.env` parameters

|Key|Value|
|---|-----|
|kakaoDevJavascriptKey|[카카오 디벨로퍼스](https://developers.kakao.com/) 내 어플리케이션 Javascript Key|
|kakaoDevWebPlatform|카카오 디벨로퍼스 내 어플리케이션 Web 플랫폼 URL|
|kakaoLoginId|카카오톡 ID|
|kakaoLoginPw|카카오톡 PW|
kakaoLinkTemplateId|카카오 디벨로퍼스 카카오링크 메시지 템플릿 ID|
|kakaoChatroomName|메시지를 보낼 카카오톡 채팅방 이름|
|noticeUrl|크롤링할 URL|
|JSESSIONID|www.ajou.ac.kr 로그인 세션 쿠키 값|

## Run
```
node index.mjs
```
