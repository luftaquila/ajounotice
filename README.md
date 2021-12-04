# ajounotice
아주대학교 공지사항을 크롤링해 카카오톡 오픈채팅방에 전달하는 봇입니다.

로그인된 사용자에게만 보이는 게시물을 불러오기 위해 Selenium으로 로그인 세션이 만료될 때마다 다시 로그인합니다. 공지사항 목록과 게시글 세부 내용(이미지 링크 등)을 불러오는 데는 axios를 사용합니다. 카카오링크 전송에는 node-kakaolink를 이용합니다. node-schedule 모듈을 통해 평일 08시부터 21시까지에만 5분에 한 번씩 주기적으로 크롤링을 수행합니다.
## Prerequisites
* `node` >= v12.0.0
* [카카오 디벨로퍼스](https://developers.kakao.com/) 어플리케이션

## Installation
```Shell
git clone https://github.com/luftaquila/ajounotice.git
cd ajounotice
npm install
```
## Setup
1. Write your own `.env` environment variables file.

|Key|Value|
|---|-----|
|kakaoDevJavascriptKey|[카카오 디벨로퍼스](https://developers.kakao.com/) 어플리케이션 Javascript Key|
|kakaoDevWebPlatform|카카오 디벨로퍼스 어플리케이션 Web 플랫폼 URL|
|kakaoLoginId|카카오톡 ID|
|kakaoLoginPw|카카오톡 PW|
kakaoLinkTemplateId|카카오 디벨로퍼스 카카오링크 메시지 템플릿 ID|
|kakaoChatroomName|메시지를 보낼 카카오톡 채팅방 이름|
|ajouLoginId|아주대학교 포탈 ID|
|ajouLoginPw|아주대학교 포탈 PW|

## Run
```
node index.mjs
```
