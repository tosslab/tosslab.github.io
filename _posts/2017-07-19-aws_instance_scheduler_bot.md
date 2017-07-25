---
layout: post
title: "AWS Instance Scheduler Bot 적용기"
description: "AWS Instance Scheduler를 손쉽게 컨트롤하기 위하여 JANDI의 Outgoing Webhook을 이용한 Bot을 적용하였습니다. 사용법과 작동 내용에 대해서 공유합니다."
author: ali
categories: [backend]
tags: [aws, webhook, bot]
fullview: true
---

이 포스팅은 총 2부로 이어지며 현재는 2부입니다.

> 1. [1부 : AWS 비용 얼마까지 줄여봤니?](/backend/2017/07/18/aws_instance_scheduler.html)
> 2. [2부 : AWS Instance Scheduler Bot 적용기](/backend/2017/07/19/aws_instance_scheduler_bot.html)

1부에서 AWS 비용을 절감하기 위한 Instance Scheduler에 대한 소개를 하였습니다. 2부에서는 Instance Scheduler의 설정을 손쉽게 변경하기 위한 Bot을 적용한 사례에 대해서 소개합니다.

# Bot의 필요성

Instance Scheduler의 설정을 변경하기 위해서는 정보를 담고 있는 Dynamo DB 의 데이터를 변경해야 합니다. AWS Console을 이용하여 직접 수정할 수도 있지만 여전히 불편하고 느립니다. 더군다나 이를 이용하는 사용자가 DB Table의 구조와 AWS Console 사용법을 알고 있어야 하고 비 개발자라면 더 쉽지 않은 문제입니다. 하지만 Bot을 이용하면 사용자는 어려운 DB Query나 구조를 알아야 할 필요도 없고 손쉽게 채팅 메시지를 통해 Bot에게 질의하고 처리 결과를 응답받을 수 있습니다.

# Outgoing Webhook

JANDI에서는 Incoming Webhook과 반대되는 개념으로 Outgoing Webhook을 제공합니다. 특정 키워드로 시작하는 메시지가 있을 경우 내용을 설정된 URL Endpoint에 POST로 Webhook을 보내줍니다. Webhook을 수신한 곳에서는 일련의 처리 후 메시지 데이터 형식을 맞춰 응답하게 되면 채팅창에 메시지를 표시하게 됩니다. 이를 통해 다른 외부 시스템과 연동할 수 있습니다.

## POST Data

예를 들어 `날씨` 키워드로 Outgoing Webhook을 생성했다면 `/날씨` 메시지가 시작될 때 다음과 같은 데이터가 Webhook으로 발송됩니다.

```json
{
    "token": "YE1ronbbuoZkq7h3J5KMI4Tn",
    "teamName": "Toss Lab, Inc.",
    "roomName": "토스랩 코리아",
    "writerName": "Gloria",
    "text": "/날씨 서울",
    "keyword": "날씨",
    "createdAt": "2017-07-19T14:49:11.266Z"
}
```

token을 이용하여 요청의 유효성 체크를 할 수 있고 text를 적절히 파싱 하여 요청에 부합하는 처리를 할 수 있습니다.

## Response

POST Data를 적절히 처리 후 결과를 채팅창에 응답 메시지를 표시하고 싶다면 아래와 같은 JSON Data를 Response body에 넣어주면 됩니다.

```json
{
    "body" : "서울의 현재 날씨",
    "connectColor" : "#FAC11B",
    "connectInfo" : [{
        "title" : "온도",
        "description" : "최고:28.00, 최저:24.00, 현재: 24.30"
    },
    {
        "title": "날씨",
        "description": "흐리고 비"
    }]
}
```

> ![](/assets/media/post_images/bot_weather.png)

이를 이용하여 Instance Scheduler에도 적용해봤습니다.

# Schedule Bot

Schedule Bot은 Instance Scheduler의 Lambda 함수에 함께 포함되어 작동하며 스케쥴 조회 / 예외 설정, 서버 강제 시작/중지, 서버 상태 조회 등의 기능을 수행합니다.

![](/assets/media/post_images/scheduler_bot.png)

API Gateway와 Lambda 함수를 연결하여 Endpoint URL을 생성하고 Outgoing Webhook URL로 설정하여 Webhook으로 Lambda 함수가 실행될 수 있도록 하였습니다.
Lambda 함수는 Cloudwatch를 통해서 실행되면 Scheduler가 작동되고 API Gateway를 통해 실행되면 Schedule Bot이 작동됩니다.

## Schedule Bot 명령어

Schedule Bot은 다음과 같은 명령어를 수행합니다.

```text
/서버 help : 도움말
/서버 [스케쥴명] status : 현재 서버 상태 조회
/서버 [스케쥴명] info : 오늘의 스케쥴 조회
/서버 [스케쥴명] info [YYYY-MM-DD] : 특정일 스케쥴 조회
/서버 [스케쥴명] exception info : 오늘의 스케쥴 예외 조회
/서버 [스케쥴명] exception info [YYYY-MM-DD] : 특정일 스케쥴 예외 조회
/서버 [스케쥴명] exception set [YYYY-MM-DD] [start|stop] [h:m] : 예외 설정
/서버 [스케쥴명] exception del [YYYY-MM-DD] [start|stop] : 예외 삭제
/서버 [스케쥴명] force_start : 서버 강제 실행
/서버 [스케쥴명] force_stop : 서버 강제 중지
```

## Schedule Bot 작동 화면

Schedule Bot은 서버병이라는 컨셉으로 인격화(?)에 힘썼습니다.

> **스케쥴 정보 조회**

![](/assets/media/post_images/bot_info.png)

> **서버 상태 조회**

![](/assets/media/post_images/bot_status.png)

> **서버 강제 시작/중지**

![](/assets/media/post_images/bot_start_stop.png)

> **명령어 오류**

![](/assets/media/post_images/bot_error.png)

# 마무리

AWS 기반의 서비스를 운영하는 스타트업이라면 더욱더 현실적으로 부딪히는 비용 문제에 대해서 저희가 고민한 내용과 솔루션에 대해서 공유하였습니다.

아직 적용기간이 길지 않아 절감비용에 대해 수치적인 데이터를 언급하기는 힘들지만 많은 금액이 절감될 거라 예상하고 있습니다.

저희와 같은 고민을 하고 있다면 Instance Scheduler를 적극 권장합니다.