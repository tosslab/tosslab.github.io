---
layout: post
title: "JANDI CONNECT 개발기"
date: 2016-02-14
description: "'잔디 커넥트'는 협업에서 많이 쓰이는 GitHub, Google Calendar, Trello 등의 외부 서비스를 잔디와 쉽게 연동할 수 있는 기능입니다. 잔디 커넥트를 개발하면서 저희 개발팀이 겪은 여러 값진 경험들을 공유합니다."
author: mk
tags: [jandi, backend, integration, webhook, authentication]
---

지난 1월말, 새해를 맞아 잔디에 새로운 기능이 업데이트 되었습니다. 바로 [잔디 커넥트](http://blog.jandi.com/ko/2016/01/28/jandi-update-news-jan-21/) 에 관한 내용인데요, 협업에서 많이 쓰이는 몇가지 외부 서비스를 잔디와 쉽게 연동해서 보다 효율적인 업무 커뮤니케이션을 할 수 있게 되었습니다. 많은 고객분들이 이번 업데이트를 기다려주신만큼, 저희 개발팀 또한 기대에 보답하고자 지난 몇 주의 스프린트 동안 열심히 준비했습니다. 이번 글에서는 그 과정에서 저희가 겪은 시행착오를 비롯한 여러 값진 경험들을 공유하고자 합니다.

# Integration? 연동! #



### TOC

- 용어 정리: 커넥트 → 인커밍 웹훅
    - 웹훅이란?
        - https://en.wikipedia.org/wiki/Webhook
        - https://developer.github.com/webhooks/
    - Incoming WebHook vs Outgoing WebHook
- 잔디 시스템 아키텍쳐
    - 설계에 앞서 참고할만한 잔디 현재 서비스 아키 소개
    - 웹 서버, API & 파일 & 채팅(소켓) 등의 서비스 서버, 각종 큐 & 워커
- 구현 과정
    - 적정 기술에 대해 고민하다
        - Java+RDB vs NodeJS+MongoDB
        - 서비스 분리를 위한 노력: API, DB 분리
    - 인커밍 웹훅 토큰 관리: http://wiki.tosslab.com/display/~leonard.kim/Incoming+Web+hook
    - 각 서비스 인증 및 연동
    - 웹훅 이벤트 콜백 처리
        - SQS + 다수의 Worker → 대용량 처리 유리
        - webhook event trigger → (queue) → message
        - request limit 처리
- trial and error
    - POC 부족 → 각 서비스 연동을 병렬로 작업하다보니 중복 등의 비효율적인 협업
    - 각 서비스 별 인증 처리 및 삭제(revoked) 처리
    - Google Calendar
        - https://www.evernote.com/shard/s45/sh/bfa1c0da-e9a3-4da9-b490-bf0125950a6b/d3147a54b0e915a3
        - 중복 계정 연동
    - GitHub
        - 중복 또는 이름이 애매한 event 처리
        - 등록된 웹훅 직접 삭제
    - Trello
        - TBU
    - Jira
        - 웹훅을 연동하기 위한 API가 따로 제공되지 않기때문에 별도의 인증 처리가 없어서 Incoming Webhook과 동일하게 구현
    - 커넥트 봇?!
- 못다 한 이야기
    - ...


