# rtc-backend

gitlab deploy pipeline:

stages:
 - deploy

deploy:
 stage: deploy
 environment:
  name: staging
  url: http://myserver:3000
 tags:
  - node
 script:
  - cp -R ./* /var/www/rtc/backend/
  - cd /var/www/rtc/backend/
  - npm install --progress=false
  - npm stop
  - npm start
 cache:
  key: rtc-backend
